import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  useNodesStore,
  useConnectionsStore,
  useCanvasStore,
  useNodesBounds,
  useOptimizedEventHandler,
  useDebounce,
  useThrottle,
  useBatchUpdate,
  usePerformanceMonitor,
  useVirtualization
} from '../stores';
import NodeCard from './NodeCard';

interface OptimizedCanvasProps {
  width: number;
  height: number;
}

/**
 * 优化的Canvas组件
 * 展示如何使用新的性能优化工具
 */
const OptimizedCanvas: React.FC<OptimizedCanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { schedule } = useBatchUpdate();
  const performanceMonitor = usePerformanceMonitor('Canvas Render');
  
  // 使用选择器获取必要数据，避免不必要的重渲染
  const nodes = useNodesStore((state) => state.nodes);
  const { scale, panX, panY, setPan, setScale } = useCanvasStore();
  const nodesBounds = useNodesBounds();
  
  // 虚拟化设置（假设每个节点平均高度为250px）
  const [scrollTop, setScrollTop] = React.useState(0);
  const virtualizedNodes = useVirtualization(
    nodes,
    height,
    250, // 平均节点高度
    scrollTop
  );

  // 优化的平移处理
  const handlePan = useOptimizedEventHandler(
    (deltaX: number, deltaY: number) => {
      performanceMonitor.measure(() => {
        setPan(panX + deltaX, panY + deltaY);
      });
    },
    [panX, panY, setPan],
    { throttle: 16 } // 60fps限制
  );

  // 优化的缩放处理
  const handleZoom = useOptimizedEventHandler(
    (delta: number, centerX: number, centerY: number) => {
      const newScale = Math.max(0.1, Math.min(5, scale + delta * 0.001));
      setScale(newScale);
    },
    [scale, setScale],
    { debounce: 50 } // 防抖50ms
  );

  // 批量节点更新示例
  const handleBatchNodeUpdate = useCallback(() => {
    schedule(() => {
      // 批量更新多个节点，减少重渲染次数
      nodes.forEach((node, index) => {
        if (index % 2 === 0) {
          // 例如：批量更新偶数索引节点的颜色
          useNodesStore.getState().updateNode(node.id, {
            lightBackgroundColor: 'blue'
          });
        }
      });
    });
  }, [nodes, schedule]);

  // 防抖的搜索处理
  const debouncedSearch = useDebounce((query: string) => {
    console.log('搜索节点:', query);
    // 实际搜索逻辑
  }, 300);

  // 节流的滚动处理
  const throttledScroll = useThrottle((event: React.UIEvent) => {
    const scrollY = (event.target as HTMLDivElement).scrollTop;
    setScrollTop(scrollY);
  }, 16);

  // 记忆化的变换样式
  const transformStyle = useMemo(() => ({
    transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
    transformOrigin: '0 0',
    transition: 'transform 0.1s ease-out',
  }), [panX, panY, scale]);

  // 记忆化的可见区域计算
  const visibleBounds = useMemo(() => {
    const viewportWidth = width / scale;
    const viewportHeight = height / scale;
    const viewportX = -panX / scale;
    const viewportY = -panY / scale;
    
    return {
      minX: viewportX,
      minY: viewportY,
      maxX: viewportX + viewportWidth,
      maxY: viewportY + viewportHeight,
    };
  }, [width, height, scale, panX, panY]);

  // 过滤可见节点以减少渲染负担
  const visibleNodes = useMemo(() => {
    return nodes.filter(node => {
      const nodeRight = node.x + (node.width || 324);
      const nodeBottom = node.y + (node.height || 200);
      
      return !(
        node.x > visibleBounds.maxX ||
        nodeRight < visibleBounds.minX ||
        node.y > visibleBounds.maxY ||
        nodeBottom < visibleBounds.minY
      );
    });
  }, [nodes, visibleBounds]);

  // 性能监控：在每次重渲染时测量
  useEffect(() => {
    performanceMonitor.start();
    return () => performanceMonitor.end();
  });

  // 鼠标事件处理
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.button === 1) { // 中键
      event.preventDefault();
      // 平移逻辑
    }
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    
    if (event.ctrlKey || event.metaKey) {
      // 缩放
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const centerX = event.clientX - rect.left;
        const centerY = event.clientY - rect.top;
        handleZoom(-event.deltaY, centerX, centerY);
      }
    } else {
      // 平移
      handlePan(-event.deltaX, -event.deltaY);
    }
  }, [handleZoom, handlePan]);

  return (
    <div
      ref={canvasRef}
      className="optimized-canvas"
      style={{
        width,
        height,
        overflow: 'hidden',
        position: 'relative',
        background: '#f8f9fa',
      }}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      onScroll={throttledScroll}
    >
      {/* 画布变换容器 */}
      <div
        className="canvas-transform-container"
        style={transformStyle}
      >
        {/* 只渲染可见节点 */}
        {visibleNodes.map(node => (
          <NodeCard
            key={`${node.id}-${node.x}-${node.y}`} // 更好的key策略
            node={node}
          />
        ))}
        
        {/* 连线渲染 */}
        <svg
          className="connections-layer"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: nodesBounds.width + 1000,
            height: nodesBounds.height + 1000,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {useConnectionsStore.getState().connections.map(connection => (
            <line
              key={`${connection.from}-${connection.to}`}
              x1={0} // 实际连线计算逻辑
              y1={0}
              x2={100}
              y2={100}
              stroke="#3b82f6"
              strokeWidth={2}
            />
          ))}
        </svg>
      </div>
      
      {/* 性能信息面板 */}
      <div
        className="performance-info"
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: 4,
          fontSize: 12,
          fontFamily: 'monospace',
          zIndex: 1000,
        }}
      >
        <div>节点总数: {nodes.length}</div>
        <div>可见节点: {visibleNodes.length}</div>
        <div>缩放: {(scale * 100).toFixed(0)}%</div>
        <div>位置: ({Math.round(panX)}, {Math.round(panY)})</div>
      </div>
      
      {/* 搜索框示例 */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1000,
        }}
      >
        <input
          type="text"
          placeholder="搜索节点..."
          onChange={(e) => debouncedSearch(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 4,
            border: '1px solid #ccc',
            outline: 'none',
          }}
        />
      </div>
      
      {/* 批量操作按钮示例 */}
      <button
        onClick={handleBatchNodeUpdate}
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          padding: '8px 16px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          zIndex: 1000,
        }}
      >
        批量更新节点
      </button>
    </div>
  );
};

export default OptimizedCanvas; 