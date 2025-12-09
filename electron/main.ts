import { app, BrowserWindow, Menu, shell, nativeTheme } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

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
    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff', // 根据系统主题设置背景色
    // macOS 11+ 标题栏覆盖配置，使标题栏适配深色模式
    ...(process.platform === 'darwin' && {
      titleBarStyle: 'hiddenInset', // 使用隐藏标题栏样式
      titleBarOverlay: {
        color: isDarkMode ? '#1a1a1a' : '#ffffff', // 标题栏背景色
        symbolColor: isDarkMode ? '#ffffff' : '#000000', // 标题栏文字颜色
        height: 28, // 标题栏高度
      },
    }),
    show: false, // 等待ready-to-show事件
  });

  // 窗口准备好后再显示，避免闪烁
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 加载应用
  if (VITE_DEV_SERVER_URL) {
    // 开发模式：从 Vite 开发服务器加载
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 创建应用菜单
  createMenu();

  // 监听系统主题变化，动态更新窗口外观
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const isDarkMode = nativeTheme.shouldUseDarkColors;
      // 更新窗口背景色
      mainWindow.setBackgroundColor(isDarkMode ? '#1a1a1a' : '#ffffff');
      
      // macOS 11+ 更新标题栏覆盖配置
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

  // macOS 特殊菜单
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出（Windows & Linux）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 防止硬件加速问题
app.disableHardwareAcceleration();
