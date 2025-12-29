// Electron API 类型定义
export interface ElectronAPI {
  // 监听来自主进程的新建白板事件
  onNewBoard: (callback: () => void) => void;

  // 监听来自主进程的快速输入快捷键事件
  onQuickInput: (callback: () => void) => () => void;

  // 获取白板列表
  getBoardList: () => Promise<Array<{ id: string; title: string; isActive: boolean }>>;

  // 创建卡片
  createCard: (boardId: string, content: string) => Promise<boolean>;

  // 获取应用版本
  getVersion: () => string;

  // 检测是否在 Electron 环境
  isElectron: boolean;

  // 平台信息
  platform: string;

  // 设置鼠标事件穿透
  setIgnoreMouseEvents: (ignore: boolean) => void;

  // 浮窗相关 API
  requestBoardName: () => void;
  onUpdateBoardName: (callback: (event: any, name: string) => void) => void;
  createCardFromFloating: (content: string) => void;
  onGetBoardName: (callback: () => void) => () => void;
  sendBoardName: (name: string) => void;
  onCreateCardFromFloating: (callback: (event: any, content: string) => void) => () => void;

  // 白板切换相关 API
  requestBoardList: () => void;
  onUpdateBoardList: (callback: (event: any, list: any[]) => void) => () => void;
  switchBoard: (boardId: string) => void;
  onGetBoardList: (callback: () => void) => () => void;
  sendBoardList: (list: any[]) => void;
  onSwitchBoard: (callback: (event: any, boardId: string) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
