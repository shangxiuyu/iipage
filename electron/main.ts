import { app, BrowserWindow, Menu, shell, nativeTheme, screen, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let floatingWindow: BrowserWindow | null = null;

// Mock Data Store
const mockBoards = [
  { id: '1', title: '项目规划', isActive: true },
  { id: '2', title: '灵感收集', isActive: false },
  { id: '3', title: '待办事项', isActive: false },
];

// 开发环境端口
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

function createWindow() {
  // 检测系统主题
  const isDarkMode = nativeTheme.shouldUseDarkColors;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'iiPage - 智能白板',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
    },
    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
    ...(process.platform === 'darwin' && {
      titleBarStyle: 'hiddenInset',
      titleBarOverlay: {
        color: isDarkMode ? '#1a1a1a' : '#ffffff',
        symbolColor: isDarkMode ? '#ffffff' : '#000000',
        height: 28,
      },
    }),
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  createMenu();

  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const isDarkMode = nativeTheme.shouldUseDarkColors;
      mainWindow.setBackgroundColor(isDarkMode ? '#1a1a1a' : '#ffffff');

      if (process.platform === 'darwin') {
        mainWindow.setTitleBarOverlay({
          color: isDarkMode ? '#1a1a1a' : '#ffffff',
          symbolColor: isDarkMode ? '#ffffff' : '#000000',
          height: 28,
        });
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制重新加载', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '开发者工具', accelerator: 'CmdOrCtrl+Shift+I', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: async () => {
            const { dialog } = await import('electron');
            dialog.showMessageBox({
              type: 'info',
              title: '关于 iiPage',
              message: 'iiPage - 智能白板',
              detail: 'Version: 1.0.0\n一个功能强大的智能白板应用',
            });
          },
        },
        {
          label: '访问 GitHub',
          click: () => {
            shell.openExternal('https://github.com/shangxiuyu/iipage');
          },
        },
      ],
    },
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { label: `关于 ${app.name}`, role: 'about' },
        { type: 'separator' },
        { label: '服务', role: 'services' },
        { type: 'separator' },
        { label: `隐藏 ${app.name}`, accelerator: 'Command+H', role: 'hide' },
        { label: '隐藏其他', accelerator: 'Command+Alt+H', role: 'hideOthers' },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        { label: '退出', accelerator: 'Command+Q', role: 'quit' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 创建右侧边缘悬浮条
function createFloatingWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = 400;

  floatingWindow = new BrowserWindow({
    width: windowWidth,
    height: screenHeight,
    x: screenWidth - windowWidth,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // 设置窗口可以响应鼠标事件
  floatingWindow.setIgnoreMouseEvents(true, { forward: true });

  // 监听渲染进程的消息来动态调整鼠标事件穿透区域
  floatingWindow.webContents.on('ipc-message', (_event, channel, data) => {
    if (channel === 'set-ignore-mouse-events') {
      floatingWindow?.setIgnoreMouseEvents(data.ignore, { forward: true });
    }
  });

  // Use loadURL with file protocol and timestamp to avoid caching issues
  const filePath = path.join(__dirname, 'floating-window.html');
  floatingWindow.loadURL(`file://${filePath}?v=${Date.now()}`);

  // 开发模式下打开开发者工具
  // if (VITE_DEV_SERVER_URL) {
  //   floatingWindow.webContents.openDevTools();
  // }

  floatingWindow.on('closed', () => {
    floatingWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('get-board-list', async () => {
  return mockBoards;
});

ipcMain.handle('create-card', async (_event, boardId, content) => {
  console.log(`[New Card] Board: ${boardId}, Content: ${content}`);
  // In a real app, you would save this to the database
  return true;
});

// 浮窗与主窗口通信
ipcMain.on('request-board-name', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('request-board-name');
  }
});

ipcMain.on('respond-board-name', (_event, name) => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.webContents.send('update-board-name', name);
  }
});

ipcMain.on('create-card-from-floating', (_event, content) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('create-card-from-floating', content);
    // 如果主窗口最小化了，恢复并聚焦
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

ipcMain.on('request-board-list', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('request-board-list');
  }
});

ipcMain.on('respond-board-list', (_event, list) => {
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    floatingWindow.webContents.send('update-board-list', list);
  }
});

ipcMain.on('switch-board', (_event, boardId) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('switch-board', boardId);
    // 切换后可能需要恢复主窗口显示？视需求而定，暂时不强制显示
  }
});

app.whenReady().then(() => {
  createWindow();

  setTimeout(() => {
    createFloatingWindow();
  }, 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.disableHardwareAcceleration();
