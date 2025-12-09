import { contextBridge, ipcRenderer } from 'electron';

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 监听来自主进程的新建白板事件
  onNewBoard: (callback: () => void) => {
    ipcRenderer.on('new-board', callback);
  },
  
  // 监听来自主进程的快速输入快捷键事件
  onQuickInput: (callback: () => void) => {
    ipcRenderer.on('quick-input', callback);
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
    };
  }
}
