import { useNodesStore } from './useNodesStore';
import { useConnectionsStore } from './useConnectionsStore';
import { useCanvasStore } from './useCanvasStore';
import { useMemo } from 'react';
import type { NodeData } from './useNodesStore';

// 性能优化的选择器hooks

/**
 * 获取单个节点数据，避免全量nodes变化时重渲染
 */
export const useNodeById = (nodeId: string): NodeData | undefined => {
  return useNodesStore(
    (state) => state.nodes.find(node => node.id === nodeId),
    (prev, next) => {
      // 浅比较优化：只有当前节点数据变化时才重渲染
      if (!prev && !next) return true;
      if (!prev || !next) return false;
      
      // 比较关键属性
      return (
        prev.id === next.id &&
        prev.x === next.x &&
        prev.y === next.y &&
        prev.width === next.width &&
        prev.height === next.height &&
        prev.editing === next.editing &&
        prev.isFlipped === next.isFlipped &&
        prev.lightBackgroundColor === next.lightBackgroundColor &&
        prev.darkBackgroundColor === next.darkBackgroundColor &&
        prev.frosted === next.frosted &&
        prev.shape === next.shape
      );
    }
  );
};

/**
 * 检查节点是否被选中
 */
export const useIsNodeSelected = (nodeId: string): boolean => {
  return useNodesStore((state) => state.selectedNodes.includes(nodeId));
};

/**
 * 获取节点的连接状态
 */
export const useNodeConnections = (nodeId: string) => {
  return useConnectionsStore(
    (state) => ({
      connections: state.connections.filter(
        conn => conn.from === nodeId || conn.to === nodeId
      ),
      isConnecting: state.isConnecting,
      connectingFrom: state.connectingFrom,
      isCurrentConnecting: state.connectingFrom === nodeId,
    }),
    (prev, next) => 
      prev.isConnecting === next.isConnecting &&
      prev.connectingFrom === next.connectingFrom &&
      prev.connections.length === next.connections.length
  );
};

/**
 * 获取画布缩放和平移信息
 */
export const useCanvasTransform = () => {
  return useCanvasStore(
    (state) => ({
      scale: state.scale,
      panX: state.panX,
      panY: state.panY,
    }),
    (prev, next) => 
      prev.scale === next.scale &&
      prev.panX === next.panX &&
      prev.panY === next.panY
  );
};

/**
 * 获取选中的节点数量（用于批量操作UI）
 */
export const useSelectedNodesCount = (): number => {
  return useNodesStore((state) => state.selectedNodes.length);
};

/**
 * 获取是否有编辑中的节点
 */
export const useHasEditingNodes = (): boolean => {
  return useNodesStore(
    (state) => state.nodes.some(node => node.editing),
    (prev, next) => prev === next
  );
};

/**
 * 获取节点的边界框（用于视图适配）
 */
export const useNodesBounds = () => {
  return useNodesStore(
    (state) => {
      if (state.nodes.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
      }
      
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      
      state.nodes.forEach(node => {
        const nodeWidth = node.width || 324;
        const nodeHeight = node.height || 200;
        
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x + nodeWidth);
        maxY = Math.max(maxY, node.y + nodeHeight);
      });
      
      return {
        minX,
        minY,
        maxX,
        maxY,
        width: maxX - minX,
        height: maxY - minY,
      };
    },
    (prev, next) => 
      prev.minX === next.minX &&
      prev.minY === next.minY &&
      prev.maxX === next.maxX &&
      prev.maxY === next.maxY
  );
};

/**
 * 组合选择器：获取节点完整的渲染状态
 */
export const useNodeRenderState = (nodeId: string) => {
  const node = useNodeById(nodeId);
  const isSelected = useIsNodeSelected(nodeId);
  const connections = useNodeConnections(nodeId);
  const canvasTransform = useCanvasTransform();
  
  return useMemo(() => ({
    node,
    isSelected,
    connections,
    canvasTransform,
    // 缓存计算结果
    cardPosition: node ? {
      x: node.pinned ? (node.pinnedX || 0) : node.x,
      y: node.pinned ? (node.pinnedY || 0) : node.y,
      isFixed: !!node.pinned,
    } : null,
  }), [node, isSelected, connections, canvasTransform]);
};

/**
 * 批量操作相关选择器
 */
export const useBatchOperations = () => {
  const selectedNodes = useNodesStore((state) => state.selectedNodes);
  const selectedNodesData = useNodesStore(
    (state) => state.nodes.filter(node => selectedNodes.includes(node.id)),
    (prev, next) => 
      prev.length === next.length &&
      prev.every((node, index) => node.id === next[index]?.id)
  );
  
  return useMemo(() => ({
    selectedNodes,
    selectedNodesData,
    hasSelection: selectedNodes.length > 0,
    isMultiSelection: selectedNodes.length > 1,
    selectionBounds: selectedNodesData.length > 0 ? {
      minX: Math.min(...selectedNodesData.map(n => n.x)),
      minY: Math.min(...selectedNodesData.map(n => n.y)),
      maxX: Math.max(...selectedNodesData.map(n => n.x + (n.width || 324))),
      maxY: Math.max(...selectedNodesData.map(n => n.y + (n.height || 200))),
    } : null,
  }), [selectedNodes, selectedNodesData]);
}; 