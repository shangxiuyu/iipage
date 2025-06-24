import React from 'react';
import type { NodeData } from '../../store/useBoardStore';

interface NodeCardResizeHandlesProps {
  node: NodeData;
  isBack?: boolean;
  onResizeMouseDown: (e: React.MouseEvent, direction: 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se') => void;
  backEditMode?: 'rich' | 'markdown';
}

const NodeCardResizeHandles: React.FC<NodeCardResizeHandlesProps> = ({
  node,
  isBack = false,
  onResizeMouseDown,
  backEditMode = 'rich',
}) => {
  // 只在选中或编辑状态下显示调整手柄
  if (!node.selected && !node.editing) return null;

  return (
    <>
      {/* 左上角调整区域 */}
      {!(isBack && node.editing && backEditMode === 'rich') && (
        <div
          style={{
            position: 'absolute',
            top: -8,
            left: -8,
            width: 20,
            height: 20,
            cursor: 'nw-resize',
            zIndex: node.editing ? 1001 : 100,
            background: 'transparent',
            border: 'none',
            opacity: 1,
          }}
          onMouseDown={(e) => onResizeMouseDown(e, 'nw')}
          title="拖拽调整大小"
        />
      )}
      
      {/* 上边调整区域 */}
      <div
        style={{
          position: 'absolute',
          top: -6,
          left: 10,
          width: 'calc(100% - 40px)',
          height: 12,
          cursor: 'n-resize',
          zIndex: node.editing ? 1000 : 99,
          background: 'transparent',
          border: 'none',
          opacity: 1,
        }}
        onMouseDown={(e) => onResizeMouseDown(e, 'n')}
        title="拖拽调整高度"
      />
      
      {/* 右上角调整区域 */}
      <div
        style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 20,
          height: 20,
          cursor: 'ne-resize',
          zIndex: node.editing ? 1001 : 100,
          background: 'transparent',
          border: 'none',
          opacity: 1,
        }}
        onMouseDown={(e) => onResizeMouseDown(e, 'ne')}
        title="拖拽调整大小"
      />
      
      {/* 左边调整区域 */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: -6,
          width: 12,
          height: 'calc(100% - 40px)',
          cursor: 'w-resize',
          zIndex: node.editing ? 1000 : 99,
          background: 'transparent',
          border: 'none',
          opacity: 1,
        }}
        onMouseDown={(e) => onResizeMouseDown(e, 'w')}
        title="拖拽调整宽度"
      />
      
      {/* 右边调整区域 */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: -6,
          width: 12,
          height: 'calc(100% - 40px)',
          cursor: 'e-resize',
          zIndex: node.editing ? 1000 : 99,
          background: 'transparent',
          border: 'none',
          opacity: 1,
        }}
        onMouseDown={(e) => onResizeMouseDown(e, 'e')}
        title="拖拽调整宽度"
      />
      
      {/* 左下角调整区域 */}
      <div
        style={{
          position: 'absolute',
          bottom: -8,
          left: -8,
          width: 20,
          height: 20,
          cursor: 'sw-resize',
          zIndex: node.editing ? 1001 : 100,
          background: 'transparent',
          border: 'none',
          opacity: 1,
        }}
        onMouseDown={(e) => onResizeMouseDown(e, 'sw')}
        title="拖拽调整大小"
      />
      
      {/* 下边调整区域 */}
      <div
        style={{
          position: 'absolute',
          bottom: -6,
          left: 10,
          width: 'calc(100% - 40px)',
          height: 12,
          cursor: 's-resize',
          zIndex: node.editing ? 1000 : 99,
          background: 'transparent',
          border: 'none',
          opacity: 1,
        }}
        onMouseDown={(e) => onResizeMouseDown(e, 's')}
        title="拖拽调整高度"
      />
      
      {/* 右下角调整区域 */}
      <div
        style={{
          position: 'absolute',
          bottom: -8,
          right: -8,
          width: 20,
          height: 20,
          cursor: 'se-resize',
          zIndex: node.editing ? 1001 : 100,
          background: 'transparent',
          border: 'none',
          opacity: 1,
        }}
        onMouseDown={(e) => onResizeMouseDown(e, 'se')}
        title="拖拽调整大小"
      />
    </>
  );
};

export default NodeCardResizeHandles; 