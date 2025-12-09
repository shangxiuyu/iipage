// Electron API 类型定义
export interface ElectronAPI {
  // 监听来自主进程的新建白板事件
  onNewBoard: (callback: () => void) => void;
  
  // 监听来自主进程的快速输入快捷键事件
  onQuickInput: (callback: () => void) => void;
  
  // 获取白板列表
  getBoardList: () => Promise<Array<{ 
    id: string; 
    title: string; 
    isActive: boolean;
  }>>;
  
  // 创建卡片
  createCard: (boardId: string, content: string) => Promise<boolean>;
  
  // 获取应用版本
  getVersion: () => string;
  
  // 检测是否在 Electron 环境
  isElectron: boolean;
  
  // 平台信息
  platform: string;
}

// 扩展 Window 接口
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    // Zustand store，用于在浏览器上下文中访问
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useBoardStore?: any;
  }
}

export {};
