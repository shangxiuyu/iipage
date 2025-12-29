import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 监听来自主进程的新建白板事件
  onNewBoard: (callback: () => void) => {
    ipcRenderer.on('new-board', callback);
  },

  // 监听来自主进程的快速输入快捷键事件
  onQuickInput: (callback: () => void) => {
    const subscription = (_event: any) => callback();
    ipcRenderer.on('quick-input', subscription);
    return () => {
      ipcRenderer.removeListener('quick-input', subscription);
    };
  },

  // 获取白板列表
  getBoardList: () => {
    return ipcRenderer.invoke('get-board-list');
  },

  // 创建卡片
  createCard: (boardId: string, content: string) => {
    return ipcRenderer.invoke('create-card', boardId, content);
  },

  // 获取应用版本
  getVersion: () => {
    return '1.0.0';
  },

  // 检测是否在 Electron 环境
  isElectron: true,

  // 平台信息
  platform: process.platform,

  // 设置鼠标事件穿透
  setIgnoreMouseEvents: (ignore: boolean) => {
    ipcRenderer.send('set-ignore-mouse-events', { ignore });
  },

  // 浮窗请求获取白板名称
  requestBoardName: () => {
    ipcRenderer.send('request-board-name');
  },

  // 浮窗监听白板名称更新
  onUpdateBoardName: (callback: (event: any, name: string) => void) => {
    ipcRenderer.on('update-board-name', callback);
  },

  // 浮窗创建卡片
  createCardFromFloating: (content: string) => {
    ipcRenderer.send('create-card-from-floating', content);
  },

  // 主窗口监听获取白板名称请求
  onGetBoardName: (callback: () => void) => {
    const subscription = (_event: any) => callback();
    ipcRenderer.on('request-board-name', subscription);
    return () => {
      ipcRenderer.removeListener('request-board-name', subscription);
    };
  },

  // 主窗口发送白板名称
  sendBoardName: (name: string) => {
    ipcRenderer.send('respond-board-name', name);
  },

  // 主窗口监听创建卡片请求
  onCreateCardFromFloating: (callback: (event: any, content: string) => void) => {
    const subscription = (event: any, content: string) => callback(event, content);
    ipcRenderer.on('create-card-from-floating', subscription);
    return () => {
      ipcRenderer.removeListener('create-card-from-floating', subscription);
    };
  },

  // 浮窗请求获取白板列表
  requestBoardList: () => {
    ipcRenderer.send('request-board-list');
  },

  // 浮窗监听白板列表更新
  onUpdateBoardList: (callback: (event: any, list: any[]) => void) => {
    const subscription = (event: any, list: any[]) => callback(event, list);
    ipcRenderer.on('update-board-list', subscription);
    return () => {
      ipcRenderer.removeListener('update-board-list', subscription);
    };
  },

  // 浮窗切换白板
  switchBoard: (boardId: string) => {
    ipcRenderer.send('switch-board', boardId);
  },

  // 主窗口监听获取白板列表请求
  onGetBoardList: (callback: () => void) => {
    const subscription = (_event: any) => callback();
    ipcRenderer.on('request-board-list', subscription);
    return () => {
      ipcRenderer.removeListener('request-board-list', subscription);
    };
  },

  // 主窗口发送白板列表
  sendBoardList: (list: any[]) => {
    ipcRenderer.send('respond-board-list', list);
  },

  // 主窗口监听切换白板请求
  onSwitchBoard: (callback: (event: any, boardId: string) => void) => {
    const subscription = (event: any, boardId: string) => callback(event, boardId);
    ipcRenderer.on('switch-board', subscription);
    return () => {
      ipcRenderer.removeListener('switch-board', subscription);
    };
  },
});

// 类型声明
declare global {
  interface Window {
    electronAPI: {
      onNewBoard: (callback: () => void) => void;
      onQuickInput: (callback: () => void) => void;
      getBoardList: () => Promise<Array<{ id: string; title: string; isActive: boolean }>>;
      createCard: (boardId: string, content: string) => Promise<boolean>;
      getVersion: () => string;
      isElectron: boolean;
      platform: string;
      setIgnoreMouseEvents: (ignore: boolean) => void;
      requestBoardName: () => void;
      onUpdateBoardName: (callback: (event: any, name: string) => void) => void;
      createCardFromFloating: (content: string) => void;
      onGetBoardName: (callback: () => void) => void;
      sendBoardName: (name: string) => void;
      onCreateCardFromFloating: (callback: (event: any, content: string) => void) => void;
    };
  }
}
