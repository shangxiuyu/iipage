// ModernProjectManager 模块导出

// 工具函数
export * from './utils/iconUtils';
export * from './utils/boardStorage';

// Hooks
export { useBoardManager } from './hooks/useBoardManager';
export type { UseBoardManagerReturn } from './hooks/useBoardManager';

// UI 组件
export { default as IconSelectorModal } from './IconSelectorModal';
export { default as NewBoardDialog } from './NewBoardDialog';
export { default as DeleteConfirmDialog } from './DeleteConfirmDialog';
export { default as BoardItem } from './BoardItem';
