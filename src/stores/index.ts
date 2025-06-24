// 新的模块化 stores
export { useNodesStore, type NodeData, defaultContent } from './useNodesStore';
export { useConnectionsStore, type Connection } from './useConnectionsStore';
export { useCanvasStore, type BackgroundMode, type InteractiveTheme } from './useCanvasStore';

// 性能优化和选择器
export * from './selectors';
export * from './performance';

// 导入用于组合hook
import { useNodesStore } from './useNodesStore';
import { useConnectionsStore } from './useConnectionsStore';
import { useCanvasStore } from './useCanvasStore';
import { defaultContent } from './useNodesStore';

// 颜色配置（从原store中迁移）
export const LIGHT_CARD_COLORS = [
  { id: 'default', name: '默认', color: '#ffffff', borderColor: '#e0e0e0', textColor: '#222' },
  { id: 'red', name: '红色', color: '#fee2e2', borderColor: '#fca5a5', textColor: '#991b1b' },
  { id: 'orange', name: '橙色', color: '#fed7aa', borderColor: '#fdba74', textColor: '#9a3412' },
  { id: 'yellow', name: '黄色', color: '#fef3c7', borderColor: '#fcd34d', textColor: '#92400e' },
  { id: 'green', name: '绿色', color: '#dcfce7', borderColor: '#86efac', textColor: '#166534' },
  { id: 'blue', name: '蓝色', color: '#dbeafe', borderColor: '#93c5fd', textColor: '#1e40af' },
  { id: 'purple', name: '紫色', color: '#ede9fe', borderColor: '#c4b5fd', textColor: '#6b21a8' },
  { id: 'pink', name: '粉色', color: '#fce7f3', borderColor: '#f9a8d4', textColor: '#be185d' },
  { id: 'gray', name: '灰色', color: '#f3f4f6', borderColor: '#d1d5db', textColor: '#374151' },
];

export const DARK_CARD_COLORS = [
  { id: 'dark-default', name: '默认', color: '#1f2937', borderColor: '#374151', textColor: '#e5e7eb' },
  { id: 'dark-red', name: '红色', color: '#7f1d1d', borderColor: '#991b1b', textColor: '#fca5a5' },
  { id: 'dark-orange', name: '橙色', color: '#9a3412', borderColor: '#c2410c', textColor: '#fdba74' },
  { id: 'dark-yellow', name: '黄色', color: '#92400e', borderColor: '#a16207', textColor: '#fcd34d' },
  { id: 'dark-green', name: '绿色', color: '#14532d', borderColor: '#166534', textColor: '#86efac' },
  { id: 'dark-blue', name: '蓝色', color: '#1e3a8a', borderColor: '#1e40af', textColor: '#93c5fd' },
  { id: 'dark-purple', name: '紫色', color: '#581c87', borderColor: '#6b21a8', textColor: '#c4b5fd' },
  { id: 'dark-pink', name: '粉色', color: '#9d174d', borderColor: '#be185d', textColor: '#f9a8d4' },
  { id: 'dark-gray', name: '灰色', color: '#374151', borderColor: '#4b5563', textColor: '#d1d5db' },
];

// 为了向后兼容，提供一个组合的hook
export const useBoardStore = () => {
  const nodesStore = useNodesStore();
  const connectionsStore = useConnectionsStore();
  const canvasStore = useCanvasStore();

  return {
    // 节点相关
    ...nodesStore,
    
    // 连线相关
    ...connectionsStore,
    
    // 画布相关
    ...canvasStore,
    
    // 便捷方法
    deleteNodeWithConnections: (nodeId: string) => {
      nodesStore.deleteNode(nodeId);
      connectionsStore.removeNodeConnections(nodeId);
    },
    
    deleteSelectedNodesWithConnections: () => {
      const selectedNodes = nodesStore.selectedNodes;
      selectedNodes.forEach((nodeId: string) => {
        connectionsStore.removeNodeConnections(nodeId);
      });
      nodesStore.deleteSelectedNodes();
    },

    // 常量
    LIGHT_CARD_COLORS,
    DARK_CARD_COLORS,
    defaultContent: defaultContent,
  };
}; 