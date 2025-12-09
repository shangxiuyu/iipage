import { app, BrowserWindow, Menu, shell, globalShortcut, screen, ipcMain, nativeTheme } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let quickInputWindow: BrowserWindow | null = null;

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

// 创建快速输入浮动窗口
function createQuickInputWindow() {
  if (quickInputWindow) {
    quickInputWindow.show();
    quickInputWindow.focus();
    return;
  }

  quickInputWindow = new BrowserWindow({
    width: 680,
    height: 320,
    frame: false, // 无边框
    transparent: true, // 透明背景
    alwaysOnTop: true, // 始终置顶
    skipTaskbar: true, // 不显示在任务栏
    resizable: false,
    movable: true, // 允许拖动
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // 显示在右上角（距离右边和上边各 60 像素）
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  quickInputWindow.setPosition(screenWidth - 680 - 60, 60);

  // 加载现代风格的快速输入页面（Raycast 风格，长方形多行输入）
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quick Input</title>
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    
    body {
      width: 100vw;
      height: 100vh;
      background-color: transparent;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
      -webkit-app-region: drag;
    }
    
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 8px;
    }
    
    .input-box {
      flex: 1;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(40px) saturate(180%);
      -webkit-backdrop-filter: blur(40px) saturate(180%);
      border-radius: 12px;
      box-shadow: 
        0 0 0 1px rgba(0, 0, 0, 0.04),
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 24px 64px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      -webkit-app-region: no-drag;
    }
    
    .input-box:focus-within {
      box-shadow: 
        0 0 0 1px rgba(59, 130, 246, 0.3),
        0 8px 32px rgba(59, 130, 246, 0.15),
        0 24px 64px rgba(0, 0, 0, 0.12);
    }
    
    .board-selector {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .board-selector-label {
      font-size: 13px;
      color: #6b7280;
      font-weight: 500;
    }
    
    select {
      flex: 1;
      padding: 6px 10px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.8);
      font-size: 13px;
      color: #1f2937;
      outline: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    select:hover {
      border-color: rgba(59, 130, 246, 0.3);
      background: rgba(255, 255, 255, 1);
    }
    
    select:focus {
      border-color: rgba(59, 130, 246, 0.5);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    textarea {
      flex: 1;
      padding: 16px;
      border: none;
      outline: none;
      background: transparent;
      font-size: 15px;
      color: #1f2937;
      font-weight: 400;
      letter-spacing: -0.01em;
      resize: none;
      line-height: 1.6;
    }
    
    textarea::placeholder {
      color: #9ca3af;
      font-weight: 400;
    }
    
    .footer {
      padding: 12px 16px;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .hint {
      font-size: 12px;
      color: #9ca3af;
    }
    
    .send-btn {
      padding: 8px 20px;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0.95;
    }
    
    .send-btn:hover {
      opacity: 1;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .send-btn:active {
      transform: translateY(0);
    }
    
    .send-btn svg {
      width: 14px;
      height: 14px;
    }
    
    /* 深色模式支持 */
    @media (prefers-color-scheme: dark) {
      .input-box {
        background: rgba(30, 30, 30, 0.95);
      }
      
      .board-selector {
        border-bottom-color: rgba(255, 255, 255, 0.06);
      }
      
      .board-selector-label {
        color: #9ca3af;
      }
      
      select {
        background: rgba(50, 50, 50, 0.8);
        border-color: rgba(255, 255, 255, 0.1);
        color: #f3f4f6;
      }
      
      select:hover {
        background: rgba(50, 50, 50, 1);
      }
      
      textarea {
        color: #f3f4f6;
      }
      
      textarea::placeholder {
        color: #6b7280;
      }
      
      .footer {
        border-top-color: rgba(255, 255, 255, 0.06);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="input-box">
      <div class="board-selector">
        <span class="board-selector-label">白板:</span>
        <select id="boardSelect">
          <option value="">加载中...</option>
        </select>
      </div>
      
      <textarea 
        id="input" 
        placeholder="输入卡片内容... (回车发送, Shift+回车换行)"
        autofocus
        spellcheck="false"
      ></textarea>
      
      <div class="footer">
        <span class="hint">↩ 发送 · ⇧↩ 换行 · ESC 关闭</span>
        <button class="send-btn" onclick="createCard()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          发送
        </button>
      </div>
    </div>
  </div>
  
  <script>
    const textarea = document.getElementById('input');
    const boardSelect = document.getElementById('boardSelect');
    
    // 从主进程获取真实的白板列表
    async function loadBoardList() {
      try {
        const boards = await window.electronAPI.getBoardList();
        if (boards && boards.length > 0) {
          boardSelect.innerHTML = boards.map(board => 
            \`<option value="\${board.id}" \${board.isActive ? 'selected' : ''}>\${board.title}</option>\`
          ).join('');
          
          // 如果有活跃的白板，默认选中它
          const activeBoard = boards.find(b => b.isActive);
          if (activeBoard) {
            boardSelect.value = activeBoard.id;
          } else {
            // 恢复上次选中的白板
            const lastBoard = localStorage.getItem('lastSelectedBoard');
            if (lastBoard && boards.some(b => b.id === lastBoard)) {
              boardSelect.value = lastBoard;
            }
          }
        } else {
          boardSelect.innerHTML = '<option value="">暂无白板</option>';
        }
      } catch (error) {
        console.error('加载白板列表失败:', error);
        boardSelect.innerHTML = '<option value="">加载失败</option>';
      }
    }
    
    loadBoardList();
    
    // 保存白板选择
    boardSelect.addEventListener('change', () => {
      localStorage.setItem('lastSelectedBoard', boardSelect.value);
    });
    
    // 快捷键支持
    textarea.addEventListener('keydown', (e) => {
      // 回车直接发送（Shift+回车换行）
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        createCard();
      }
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.close();
      }
    });
    
    async function createCard() {
      const content = textarea.value.trim();
      const selectedBoard = boardSelect.value;
      
      if (content && selectedBoard) {
        console.log('创建卡片:', { content, board: selectedBoard });
        try {
          const success = await window.electronAPI.createCard(selectedBoard, content);
          if (success) {
            console.log('✅ 卡片创建成功');
            textarea.value = '';
            window.close();
          } else {
            console.error('❌ 卡片创建失败');
            alert('创建卡片失败，请重试');
          }
        } catch (error) {
          console.error('创建卡片出错:', error);
          alert('创建卡片出错: ' + error.message);
        }
      } else {
        if (!content) {
          alert('请输入内容');
        } else if (!selectedBoard) {
          alert('请选择白板');
        }
      }
    }
    
    // 自动聚焦
    setTimeout(() => textarea.focus(), 100);
  </script>
</body>
</html>
  `;

  quickInputWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  // 失去焦点时隐藏窗口
  quickInputWindow.on('blur', () => {
    if (quickInputWindow && !quickInputWindow.isDestroyed()) {
      quickInputWindow.hide();
    }
  });

  quickInputWindow.on('closed', () => {
    quickInputWindow = null;
  });
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '快速创建卡片',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            console.log('📤 发送 quick-input 事件到渲染进程');
            if (mainWindow) {
              mainWindow.webContents.send('quick-input');
              console.log('✅ 事件已发送');
            } else {
              console.log('❌ mainWindow 不存在');
            }
          },
        },
        { type: 'separator' },
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

// 应用准备就绪
// IPC 处理器：获取白板列表
ipcMain.handle('get-board-list', async () => {
  try {
    if (mainWindow && mainWindow.webContents) {
      // 向主窗口请求白板列表
      const boardList = await mainWindow.webContents.executeJavaScript(`
        (function() {
          try {
            const boards = [];
            // 从 localStorage 读取所有白板数据
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('whiteboard-data-')) {
                const data = localStorage.getItem(key);
                if (data) {
                  try {
                    const boardData = JSON.parse(data);
                    boards.push({
                      id: key.replace('whiteboard-data-', ''),
                      title: boardData.title || '未命名白板',
                      isActive: boardData.isActive || false
                    });
                  } catch (e) {
                    console.warn('解析白板数据失败:', key, e);
                  }
                }
              }
            });
            
            // 如果没有白板,返回默认白板
            if (boards.length === 0) {
              return [{
                id: 'current',
                title: '当前白板',
                isActive: true
              }];
            }
            
            // 按活跃状态排序,活跃的在前
            boards.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
            console.log('找到白板列表:', boards);
            return boards;
          } catch (error) {
            console.error('获取白板列表失败:', error);
            return [{
              id: 'current',
              title: '当前白板',
              isActive: true
            }];
          }
        })()
      `);
      return boardList;
    }
    return [];
  } catch (error) {
    console.error('IPC 获取白板列表失败:', error);
    return [];
  }
});

// IPC 处理器：创建卡片
ipcMain.handle('create-card', async (event, boardId: string, content: string) => {
  try {
    if (mainWindow && mainWindow.webContents) {
      // 安全地转义内容,避免 JavaScript 注入
      const escapedBoardId = boardId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const escapedContent = content.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      
      // 向主窗口发送创建卡片的请求
      const success = await mainWindow.webContents.executeJavaScript(`
        (function() {
          try {
            const boardId = '${escapedBoardId}';
            const content = '${escapedContent}';
            
            console.log('尝试在白板创建卡片:', { boardId, content });
            
            // 检查是否需要切换白板
            const storageKey = 'whiteboard-data-' + boardId;
            const boardData = localStorage.getItem(storageKey);
            
            if (!boardData) {
              console.error('白板不存在:', boardId);
              return false;
            }
            
            const board = JSON.parse(boardData);
            console.log('目标白板:', board);
            
            // 如果不是当前活跃白板,需要先加载该白板
            if (!board.isActive && window.useBoardStore) {
              console.log('切换到白板:', boardId);
              const store = window.useBoardStore.getState();
              store.loadBoard(board);
            }
            
            // 使用 Zustand store 来创建卡片
            if (window.useBoardStore) {
              // 调用 store 的 addNodeWithMarkdown 方法
              window.useBoardStore.getState().addNodeWithMarkdown(content);
              
              console.log('✅ 卡片创建成功');
              return true;
            }
            
            console.error('❌ useBoardStore 未找到');
            return false;
          } catch (error) {
            console.error('创建卡片失败:', error);
            return false;
          }
        })()
      `);
      return success;
    }
    return false;
  } catch (error) {
    console.error('IPC 创建卡片失败:', error);
    return false;
  }
});

app.whenReady().then(() => {
  createWindow();

  // 注册系统级全局快捷键 Command+N
  // 这会在系统任何地方都生效，弹出浮动窗口覆盖在当前应用之上
  const ret = globalShortcut.register('CommandOrControl+N', () => {
    console.log('🌐 全局快捷键被触发!');
    createQuickInputWindow();
  });

  if (!ret) {
    console.log('❌ 全局快捷键注册失败');
  } else {
    console.log('✅ 全局快捷键注册成功: Command/Ctrl+N');
  }

  // 检查快捷键是否已注册
  console.log('快捷键是否已注册:', globalShortcut.isRegistered('CommandOrControl+N'));

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

// 应用退出时注销全局快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// 防止硬件加速问题
app.disableHardwareAcceleration();
