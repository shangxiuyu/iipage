import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBoardStore, type NodeData, type BackgroundFrame } from '../store/useBoardStore';

interface SimpleConnectionLayerProps {
  readOnly?: boolean;
}

// 定义一个统一的实体类型，可以是节点或背景框
type ConnectableEntity = (NodeData & { type: 'node' }) | (BackgroundFrame & { type: 'frame' });

const SimpleConnectionLayer: React.FC<SimpleConnectionLayerProps> = ({ readOnly }) => {
  const { 
    nodes: boardNodes, 
    backgroundFrames, // 获取背景框数据
    connections,
    scale,
    panX,
    panY,
    selectConnection,
    clearConnectionSelection,
    clearSelection,
    updateConnectionLabel,
    setConnectionEditing,
    updateConnectionAnchor,
    updateConnectionStyle,
    updateConnectionColor,
    removeConnection,
    tempConnection,
    isConnecting,
    connectingFrom,
    selectedNodes,
  } = useBoardStore();

  // 连线标签编辑状态
  const [editingConnection, setEditingConnection] = useState<string | null>(null);
  const [labelText, setLabelText] = useState('');
  const [labelPosition, setLabelPosition] = useState<{x: number, y: number} | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isDoubleClicking, setIsDoubleClicking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 用于处理单击/双击冲突的定时器
  const clickTimeoutRef = useRef<number | null>(null);

  // 连线拖拽状态
  const [draggingConnection, setDraggingConnection] = useState<{
    connectionId: string;
    type: 'from' | 'to';
    startX: number;
    startY: number;
    nodeId: string;
    isNearAnchor: boolean;
  } | null>(null);

  // 1. 组件顶层获取只读状态
  const isReadOnly = readOnly || (window as any).__whiteboardReadOnly__ || false;

  // 创建一个辅助函数，用于通过ID获取节点或背景框实体
  const getEntityById = useCallback((id: string): ConnectableEntity | null => {
    const node = boardNodes.find(n => n.id === id);
    if (node) {
      return { ...node, type: 'node' };
    }
    const frame = backgroundFrames.find(f => f.id === id);
    if (frame) {
      return { ...frame, type: 'frame' };
    }
    return null;
  }, [boardNodes, backgroundFrames]);

  // 处理双击连线事件
  const handleConnectionDoubleClick = (connectionId: string, x: number, y: number) => {
    if (isReadOnly) return;
    const connection = connections.find(c => `${c.from}-${c.to}` === connectionId);
    if (!connection) return;

    // 设置双击标志，防止拖拽逻辑执行
    setIsDoubleClicking(true);
    
    // 清除所有选中状态（包括卡片和连线），避免显示锚点
    clearSelection();
    clearConnectionSelection();
    
    setEditingConnection(connectionId);
    setLabelText(connection.label || '');
    setLabelPosition({ x, y });
    setShowColorPicker(false); // 重置颜色选择器状态
    
    // 延迟聚焦，确保输入框已渲染
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 10);
    
    // 重置双击标志
    setTimeout(() => {
      setIsDoubleClicking(false);
    }, 100);
  };

  // 保存标签
  const saveLabelText = () => {
    if (editingConnection) {
      updateConnectionLabel(editingConnection, labelText);
      setEditingConnection(null);
      setLabelPosition(null);
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingConnection(null);
    setLabelPosition(null);
    setLabelText('');
    setShowColorPicker(false);
  };

  // 定义适合创作思考的柔和颜色
  const commonColors = [
    { name: '默认', value: '', preview: 'var(--connection-default)' },
    { name: '暖灰', value: '#78716c', preview: '#78716c' },
    { name: '橄榄绿', value: '#65a30d', preview: '#65a30d' },
    { name: '青石蓝', value: '#0369a1', preview: '#0369a1' },
    { name: '薰衣草', value: '#7c3aed', preview: '#7c3aed' },
    { name: '赤褐色', value: '#b91c1c', preview: '#b91c1c' },
    { name: '琥珀色', value: '#d97706', preview: '#d97706' },
    { name: '墨绿色', value: '#166534', preview: '#166534' },
  ];

  // 切换连线样式
  const toggleConnectionStyle = (connectionId: string) => {
    const connection = connections.find(c => `${c.from}-${c.to}` === connectionId);
    if (!connection) return;
    
    const currentStyle = connection.style || 'solid'; // 默认为实线
    const newStyle = currentStyle === 'dashed' ? 'solid' : 'dashed';
    updateConnectionStyle(connectionId, newStyle);
  };

  // 设置连线颜色
  const setConnectionColor = (connectionId: string, color: string) => {
    updateConnectionColor(connectionId, color);
  };

  // 删除连线
  const deleteConnection = (connectionId: string) => {
    const connection = connections.find(c => `${c.from}-${c.to}` === connectionId);
    if (connection) {
      removeConnection(connection.from, connection.to);
      // 如果正在编辑这个连线，取消编辑
      if (editingConnection === connectionId) {
        cancelEdit();
      }
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveLabelText();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // 开始拖拽连线端点
  const handleConnectionMouseDown = (
    e: React.MouseEvent,
    connectionId: string,
    clickX: number,
    clickY: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    
    // 如果正在双击，不执行拖拽逻辑
    if (isDoubleClicking) return;
    
    const connection = connections.find(c => `${c.from}-${c.to}` === connectionId);
    if (!connection) return;

    const optimal = getOptimalAnchors(connection.from, connection.to);
    // 如果找不到实体，则无法判断最佳锚点，直接返回
    if (!optimal) return;

    const fromAnchor = (connection.fromAnchor ?? optimal.fromAnchor) as 'top' | 'right' | 'bottom' | 'left';
    const toAnchor = (connection.toAnchor ?? optimal.toAnchor) as 'top' | 'right' | 'bottom' | 'left';

    const fromPos = getAnchorPosition(connection.from, fromAnchor);
    const toPos = getAnchorPosition(connection.to, toAnchor);
    
    if (!fromPos || !toPos) return;
    
    // 判断点击更接近起点还是终点
    const distanceToFrom = Math.sqrt(Math.pow(clickX - fromPos.x, 2) + Math.pow(clickY - fromPos.y, 2));
    const distanceToTo = Math.sqrt(Math.pow(clickX - toPos.x, 2) + Math.pow(clickY - toPos.y, 2));
    
    const isFromCloser = distanceToFrom < distanceToTo;
    
    setDraggingConnection({
      connectionId,
      type: isFromCloser ? 'from' : 'to',
      startX: e.clientX,
      startY: e.clientY,
      nodeId: isFromCloser ? connection.from : connection.to,
      isNearAnchor: false
    });
  };

  // 获取鼠标位置最近的锚点
  const getNearestAnchor = (nodeId: string, mouseX: number, mouseY: number): 'top' | 'right' | 'bottom' | 'left' => {
    const entity = getEntityById(nodeId);
    if (!entity) return 'right';

    let entityX, entityY, entityWidth, entityHeight;

    if (entity.type === 'node' && entity.pinned) {
      // 固定卡片使用屏幕坐标
      entityX = entity.pinnedX || 100;
      entityY = entity.pinnedY || 100;
      entityWidth = entity.width || 324;
      entityHeight = entity.height || 200;
    } else {
      // 普通卡片和背景框需要应用缩放和平移变换
      entityX = entity.x * scale + panX;
      entityY = entity.y * scale + panY;
      entityWidth = (entity.width || 324) * scale;
      entityHeight = (entity.height || 200) * scale;
    }

    const centerX = entityX + entityWidth / 2;
    const centerY = entityY + entityHeight / 2;

    // 计算鼠标相对于节点中心的位置
    const relativeX = mouseX - centerX;
    const relativeY = mouseY - centerY;

    // 根据象限和距离边缘的远近确定最近的锚点
    if (Math.abs(relativeX) > Math.abs(relativeY)) {
      return relativeX > 0 ? 'right' : 'left';
    } else {
      return relativeY > 0 ? 'bottom' : 'top';
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // 处理滚轮和触摸事件传播到白板
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // 如果事件来自连线SVG元素，阻止默认行为并转发到白板
      if (e.target && (e.target as Element).closest('path[data-connection]')) {
        // 阻止浏览器的默认缩放行为
        e.preventDefault();
        e.stopPropagation();
        
        const boardCanvas = document.querySelector('.board-canvas') as HTMLElement;
        if (boardCanvas) {
          // 创建新的滚轮事件并在白板上派发
          const forwardedEvent = new WheelEvent('wheel', {
            deltaY: e.deltaY,
            deltaX: e.deltaX,
            deltaZ: e.deltaZ,
            clientX: e.clientX,
            clientY: e.clientY,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            bubbles: false, // 不让它再冒泡
            cancelable: true
          });
          boardCanvas.dispatchEvent(forwardedEvent);
        }
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      // 如果触摸事件来自连线SVG元素，阻止默认的手势行为
      if (e.target && (e.target as Element).closest('path[data-connection]')) {
        // 特别检查是否是边缘滑动手势（可能触发后退）
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          // 如果触摸在屏幕边缘10%的区域内，强制阻止
          if (touch.clientX < window.innerWidth * 0.1 || 
              touch.clientX > window.innerWidth * 0.9) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // 如果触摸移动事件来自连线SVG元素，阻止默认的滑动手势
      if (e.target && (e.target as Element).closest('path[data-connection]')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // 如果触摸结束事件来自连线SVG元素，阻止默认行为
      if (e.target && (e.target as Element).closest('path[data-connection]')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 使用非被动监听器，并在捕获阶段处理
    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    document.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    
    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true });
      document.removeEventListener('touchstart', handleTouchStart, { capture: true });
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });
      document.removeEventListener('touchend', handleTouchEnd, { capture: true });
    };
  }, []);

  // 处理鼠标移动（拖拽连线端点）
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingConnection) return;

      const nearestAnchor = getNearestAnchor(draggingConnection.nodeId, e.clientX, e.clientY);
      
      // 检查是否靠近锚点
      const anchorPos = getAnchorPosition(draggingConnection.nodeId, nearestAnchor);
      const distance = Math.sqrt(Math.pow(e.clientX - anchorPos.x, 2) + Math.pow(e.clientY - anchorPos.y, 2));
      const isNearAnchor = distance < 30; // 30像素内算靠近

      // 更新拖拽状态
      setDraggingConnection(prev => prev ? { ...prev, isNearAnchor } : null);
      
      // 如果靠近锚点，实时更新连线锚点
      if (isNearAnchor) {
        updateConnectionAnchor(draggingConnection.connectionId, draggingConnection.type, nearestAnchor);
      }
    };

    const handleMouseUp = () => {
      if (draggingConnection) {
        setDraggingConnection(null);
      }
    };

    if (draggingConnection) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingConnection, updateConnectionAnchor, scale, panX, panY, boardNodes]);

  // 处理点击外部关闭颜色选择器
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showColorPicker) {
        // 检查点击是否在颜色选择器外部
        const target = e.target as Element;
        const colorPicker = target.closest('[data-color-picker]');
        if (!colorPicker) {
          setShowColorPicker(false);
        }
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  // 计算贝塞尔曲线的中点
  const getBezierMidpoint = (fromPos: {x: number, y: number}, toPos: {x: number, y: number}, fromAnchor: string, toAnchor: string) => {
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    
    // 计算控制点偏移
    const offset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.5 + 50;
    
    let cp1x = fromPos.x;
    let cp1y = fromPos.y;
    let cp2x = toPos.x;
    let cp2y = toPos.y;
    
    // 根据锚点方向调整控制点
    switch (fromAnchor) {
      case 'right':
        cp1x += offset;
        break;
      case 'left':
        cp1x -= offset;
        break;
      case 'bottom':
        cp1y += offset;
        break;
      case 'top':
        cp1y -= offset;
        break;
    }
    
    switch (toAnchor) {
      case 'right':
        cp2x += offset;
        break;
      case 'left':
        cp2x -= offset;
        break;
      case 'bottom':
        cp2y += offset;
        break;
      case 'top':
        cp2y -= offset;
        break;
    }
    
    // 计算贝塞尔曲线在 t=0.5 处的点
    const t = 0.5;
    const x = Math.pow(1-t, 3) * fromPos.x + 
              3 * Math.pow(1-t, 2) * t * cp1x + 
              3 * (1-t) * Math.pow(t, 2) * cp2x + 
              Math.pow(t, 3) * toPos.x;
    
    const y = Math.pow(1-t, 3) * fromPos.y + 
              3 * Math.pow(1-t, 2) * t * cp1y + 
              3 * (1-t) * Math.pow(t, 2) * cp2y + 
              Math.pow(t, 3) * toPos.y;
    
    return { x, y };
  };

  // 计算锚点位置的辅助函数
  const getAnchorPosition = (nodeId: string, anchor: 'top' | 'right' | 'bottom' | 'left') => {
    const entity = getEntityById(nodeId);
    if (!entity) return null;

    // 新增：背景框收起时锚点指向标题边缘
    if (entity.type === 'frame' && entity.collapsed) {
      // 标题div样式：padding: '0 18px', height: 36, fontSize: 22
      const titleWidth = Math.max(60, (entity.title?.length || 2) * 22 + 36); // 估算宽度，22px/字+左右padding
      const titleHeight = 36; // 标题高度
      const centerX = (entity.x + entity.width / 2) * scale + panX;
      const centerY = (entity.y - 22 + titleHeight / 2) * scale + panY;
      let x = centerX, y = centerY;
      switch (anchor) {
        case 'left':
          x = centerX - (titleWidth / 2) * scale;
          break;
        case 'right':
          x = centerX + (titleWidth / 2) * scale;
          break;
        case 'top':
          y = centerY - (titleHeight / 2) * scale;
          break;
        case 'bottom':
          y = centerY + (titleHeight / 2) * scale;
          break;
        default:
          break;
      }
      return { x, y };
    }

    let entityX, entityY, entityWidth, entityHeight;

    if (entity.type === 'node' && entity.pinned) {
      // 固定卡片使用屏幕坐标，不受缩放和平移影响
      entityX = entity.pinnedX || 100;
      entityY = entity.pinnedY || 100;
      entityWidth = entity.width || 324;
      entityHeight = entity.height || 200;
    } else {
      // 普通卡片和背景框需要应用缩放和平移变换
      entityX = entity.x * scale + panX;
      entityY = entity.y * scale + panY;
      entityWidth = (entity.width || 324) * scale;
      entityHeight = (entity.height || 200) * scale;
    }

    switch (anchor) {
      case 'top':
        return { x: entityX + entityWidth / 2, y: entityY };
      case 'right':
        return { x: entityX + entityWidth, y: entityY + entityHeight / 2 };
      case 'bottom':
        return { x: entityX + entityWidth / 2, y: entityY + entityHeight };
      case 'left':
        return { x: entityX, y: entityY + entityHeight / 2 };
      default:
        return { x: entityX + entityWidth / 2, y: entityY + entityHeight / 2 };
    }
  };

  // 智能选择最近的锚点
  const getOptimalAnchors = (fromNodeId: string, toNodeId: string) => {
    const entity = getEntityById(fromNodeId);
    const toEntity = getEntityById(toNodeId);
    
    if (!entity || !toEntity) return null;

    let fromX, fromY, toX, toY;

    // 计算起始节点的中心位置
    if (entity.type === 'node' && entity.pinned) {
      fromX = (entity.pinnedX || 100) + (entity.width || 324) / 2;
      fromY = (entity.pinnedY || 100) + (entity.height || 200) / 2;
    } else {
      fromX = entity.x * scale + panX + (entity.width || 324) * scale / 2;
      fromY = entity.y * scale + panY + (entity.height || 200) * scale / 2;
    }

    // 计算目标节点的中心位置
    if (toEntity.type === 'node' && toEntity.pinned) {
      toX = (toEntity.pinnedX || 100) + (toEntity.width || 324) / 2;
      toY = (toEntity.pinnedY || 100) + (toEntity.height || 200) / 2;
    } else {
      toX = toEntity.x * scale + panX + (toEntity.width || 324) * scale / 2;
      toY = toEntity.y * scale + panY + (toEntity.height || 200) * scale / 2;
    }

    const deltaX = toX - fromX;
    const deltaY = toY - fromY;

    // 根据相对位置选择最佳锚点
    let fromAnchor: 'top' | 'right' | 'bottom' | 'left';
    let toAnchor: 'top' | 'right' | 'bottom' | 'left';

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平距离更大
      if (deltaX > 0) {
        fromAnchor = 'right';
        toAnchor = 'left';
      } else {
        fromAnchor = 'left';
        toAnchor = 'right';
      }
    } else {
      // 垂直距离更大
      if (deltaY > 0) {
        fromAnchor = 'bottom';
        toAnchor = 'top';
      } else {
        fromAnchor = 'top';
        toAnchor = 'bottom';
      }
    }

    return { fromAnchor, toAnchor };
  };

  // 生成平滑路径
  const generateSmoothPath = (fromPos: {x: number, y: number}, toPos: {x: number, y: number}, fromAnchor: string, toAnchor: string) => {
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    
    // 计算控制点偏移
    const offset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.5 + 50;
    
    let cp1x = fromPos.x;
    let cp1y = fromPos.y;
    let cp2x = toPos.x;
    let cp2y = toPos.y;
    
    // 根据锚点方向调整控制点
    switch (fromAnchor) {
      case 'right':
        cp1x += offset;
        break;
      case 'left':
        cp1x -= offset;
        break;
      case 'bottom':
        cp1y += offset;
        break;
      case 'top':
        cp1y -= offset;
        break;
    }
    
    switch (toAnchor) {
      case 'right':
        cp2x += offset;
        break;
      case 'left':
        cp2x -= offset;
        break;
      case 'bottom':
        cp2y += offset;
        break;
      case 'top':
        cp2y -= offset;
        break;
    }
    
    return `M ${fromPos.x} ${fromPos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toPos.x} ${toPos.y}`;
  };

  // 计算箭头路径
  const generateArrowPath = (toPos: {x: number, y: number}, toAnchor: string) => {
    const arrowLength = 10;
    let angle = 0;
    
    switch (toAnchor) {
      case 'top':
        angle = Math.PI / 2; // 向下
        break;
      case 'right':
        angle = Math.PI; // 向左
        break;
      case 'bottom':
        angle = -Math.PI / 2; // 向上
        break;
      case 'left':
        angle = 0; // 向右
        break;
    }
    
    return `
      M ${toPos.x} ${toPos.y}
      L ${toPos.x - arrowLength * Math.cos(angle - Math.PI / 6)} ${toPos.y - arrowLength * Math.sin(angle - Math.PI / 6)}
      L ${toPos.x - arrowLength * Math.cos(angle + Math.PI / 6)} ${toPos.y - arrowLength * Math.sin(angle + Math.PI / 6)}
      Z
    `;
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 25,
        pointerEvents: 'none', // 默认不接收事件
        touchAction: 'none', // 阻止所有触摸手势
        userSelect: 'none', // 阻止文本选择
        WebkitUserSelect: 'none', // Safari
        msUserSelect: 'none', // IE
      }}
      onWheel={(e) => {
        // 确保滚轮事件能传播到白板组件，不阻止缩放
        // 不调用 e.stopPropagation()
      }}
    >

      <svg
        width="100%"
        height="100%"
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none', // SVG 本身不接收事件
          touchAction: 'none', // 防止触摸手势
        }}
        onWheel={(e) => {
          // 如果滚轮事件到达SVG层，说明可能来自连线
          // 阻止默认行为并转发到白板
          e.preventDefault();
          const boardCanvas = document.querySelector('.board-canvas') as HTMLElement;
          if (boardCanvas) {
            const forwardedEvent = new WheelEvent('wheel', {
              deltaY: e.deltaY,
              deltaX: e.deltaX,
              deltaZ: e.deltaZ,
              clientX: e.clientX,
              clientY: e.clientY,
              ctrlKey: e.ctrlKey,
              metaKey: e.metaKey,
              shiftKey: e.shiftKey,
              altKey: e.altKey,
              bubbles: false,
              cancelable: true
            });
            boardCanvas.dispatchEvent(forwardedEvent);
          }
        }}
      >
                 {/* 渲染所有连线 */}
         {connections.map((connection, index) => {
           const connectionId = `${connection.from}-${connection.to}`;
           const uniqueKey = `${connectionId}-${index}`; // 使用索引确保唯一性
           const optimal = getOptimalAnchors(connection.from, connection.to);
           if (!optimal) return null;
           const fromAnchor = (connection.fromAnchor ?? optimal.fromAnchor) as 'top' | 'right' | 'bottom' | 'left';
           const toAnchor = (connection.toAnchor ?? optimal.toAnchor) as 'top' | 'right' | 'bottom' | 'left';

           const fromPos = getAnchorPosition(connection.from, fromAnchor);
           const toPos = getAnchorPosition(connection.to, toAnchor);
           if (!fromPos || !toPos) return null;

           const path = generateSmoothPath(fromPos, toPos, fromAnchor, toAnchor);
           const arrowPath = generateArrowPath(toPos, toAnchor);
           
           const isSelected = connection.selected || false;
           // 检查连线是否从选中的节点流出，且不是自循环
           const isFlowingFromSelectedNode = selectedNodes.length > 0 && 
             connection.from !== connection.to && // 排除自循环
             selectedNodes.includes(connection.from); // 只有从选中节点流出的连线才有效果
           const labelX = (fromPos.x + toPos.x) / 2;
           const labelY = (fromPos.y + toPos.y) / 2;
           
           // 根据连线样式决定虚线类型
           const isDashed = connection.style === 'dashed';
           let strokeDasharray = "none";
           if (isSelected) {
             strokeDasharray = "8,4";
           } else if (isFlowingFromSelectedNode) {
             strokeDasharray = "6,3";
           } else if (isDashed) {
             strokeDasharray = "8,4"; // 用户设置的虚线样式
           }
           
           // 确定连线颜色
           const connectionColor = connection.color || 'var(--connection-default)';
           const connectionStroke = isSelected ? '#3b82f6' : isFlowingFromSelectedNode ? '#f59e0b' : connectionColor;
           const arrowFill = isSelected ? '#3b82f6' : isFlowingFromSelectedNode ? '#f59e0b' : (connection.color || 'var(--connection-arrow)');
           


           return (
             <g key={uniqueKey}>
              {/* 主连线 */}
              <path
                d={path}
                stroke={connectionStroke}
                strokeWidth={isSelected ? 3 : isFlowingFromSelectedNode ? 2.5 : 2}
                fill="none"
                strokeDasharray={strokeDasharray}
                style={(isSelected || isFlowingFromSelectedNode) ? {
                  animation: 'dash-flow 1.2s linear infinite'
                } : {}}
              />
              
              {/* 箭头 */}
                             <path
                 d={arrowPath}
                 fill={arrowFill}
                 stroke="none"
               />


              
                             {/* 点击区域（更大的透明路径） */}
               <path
                 d={path}
                 stroke="transparent"
                 strokeWidth={20}
                 fill="none"
                 data-connection={connectionId}
                 style={{ 
                   cursor: draggingConnection ? 'grabbing' : 'pointer',
                   pointerEvents: 'stroke',
                   // 阻止所有浏览器默认手势行为
                   touchAction: 'none',
                   userSelect: 'none',
                   WebkitUserSelect: 'none',
                   msUserSelect: 'none'
                 } as React.CSSProperties}
                 onPointerDown={(e) => {
                   if (isReadOnly) return;
                   if (e.pointerType === 'mouse' && isSelected && !isDoubleClicking) {
                     handleConnectionMouseDown(e as any, connectionId, e.clientX, e.clientY);
                   }
                 }}
                 onClick={(e) => {
                   if (isReadOnly) return;
                   e.stopPropagation();
                   
                   // 清除之前的定时器
                   if (clickTimeoutRef.current) {
                     clearTimeout(clickTimeoutRef.current);
                   }
                   
                   // 延迟执行单击逻辑，如果期间发生双击则会被取消
                   clickTimeoutRef.current = window.setTimeout(() => {
                     if (!isDoubleClicking) {
                       selectConnection(connectionId, e.ctrlKey || e.metaKey);
                     }
                   }, 200);
                 }}
                 onDoubleClick={(e) => {
                   if (isReadOnly) return;
                   e.stopPropagation();
                   e.preventDefault();
                   
                   // 清除单击的定时器，防止单击逻辑执行
                   if (clickTimeoutRef.current) {
                     clearTimeout(clickTimeoutRef.current);
                     clickTimeoutRef.current = null;
                   }
                   
                   const midpoint = getBezierMidpoint(fromPos, toPos, fromAnchor, toAnchor);
                   handleConnectionDoubleClick(connectionId, midpoint.x, midpoint.y);
                 }}
                 onMouseDown={(e) => {
                   if (isReadOnly) return;
                   if (isSelected && !isDoubleClicking) {
                     handleConnectionMouseDown(e, connectionId, e.clientX, e.clientY);
                   }
                 }}

               />
            </g>
          );
        })}
        
        {/* 临时连线（拖拽时显示） */}
        {isConnecting && tempConnection && (
          <g>
            {/* 简单的直线临时连线 */}
            <line
              x1={tempConnection.fromX}
              y1={tempConnection.fromY}
              x2={tempConnection.toX}
              y2={tempConnection.toY}
              stroke="#3b82f6"
              strokeWidth="3"
              strokeDasharray="5,5"
              opacity="0.8"
              style={{ pointerEvents: 'none' }}
            />
            {/* 终点圆圈 */}
            <circle
              cx={tempConnection.toX}
              cy={tempConnection.toY}
              r="6"
              fill="#3b82f6"
              opacity="0.8"
              style={{ pointerEvents: 'none' }}
            />
          </g>
        )}
        
        {/* 调试：显示连线状态 */}
        {false && isConnecting && (
          <text x="10" y="30" fill="red" fontSize="14">
            连线模式: {connectingFrom || 'null'}
          </text>
        )}
        
        {/* 调试：显示临时连线数据 */}
        {false && (
          <text x="10" y="50" fill="blue" fontSize="13">
            临时连线: {tempConnection?.fromX},{tempConnection?.fromY} → {tempConnection?.toX},{tempConnection?.toY}
          </text>
        )}

        {/* 拖拽连线时显示目标节点的所有锚点 */}
        {draggingConnection && (
          <>
            {['top', 'right', 'bottom', 'left'].map((anchor) => {
              const anchorPos = getAnchorPosition(draggingConnection.nodeId, anchor as 'top' | 'right' | 'bottom' | 'left');
              if (!anchorPos) return null;
              return (
                <circle
                  key={`anchor-${anchor}`}
                  cx={anchorPos.x}
                  cy={anchorPos.y}
                  r="8"
                  fill="rgba(59, 130, 246, 0.2)"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                  style={{ pointerEvents: 'none' }}
                />
              );
            })}
          </>
        )}
      </svg>

      {/* 渲染连线标签 */}
      {connections.map((connection, index) => {
        const connectionId = `${connection.from}-${connection.to}`;
        if (!connection.label) return null;
        const optimal = getOptimalAnchors(connection.from, connection.to);
        if (!optimal) return null;
        const fromAnchor = (connection.fromAnchor ?? optimal.fromAnchor) as 'top' | 'right' | 'bottom' | 'left';
        const toAnchor = (connection.toAnchor ?? optimal.toAnchor) as 'top' | 'right' | 'bottom' | 'left';
        const fromPos = getAnchorPosition(connection.from, fromAnchor);
        const toPos = getAnchorPosition(connection.to, toAnchor);
        if (!fromPos || !toPos) return null;
        const midpoint = getBezierMidpoint(fromPos, toPos, fromAnchor, toAnchor);

        return (
          <div
            key={`label-${connectionId}-${index}`}
            style={{
              position: 'absolute',
              left: midpoint.x,
              top: midpoint.y,
              transform: 'translate(-50%, -50%)',
              fontSize: `${14 * scale}px`,
              fontWeight: '500',
              color: '#374151',
              userSelect: 'none',
              pointerEvents: 'none',
              zIndex: 30,
              textShadow: '1px 1px 2px rgba(255, 255, 255, 0.8), -1px -1px 2px rgba(255, 255, 255, 0.8), 1px -1px 2px rgba(255, 255, 255, 0.8), -1px 1px 2px rgba(255, 255, 255, 0.8)',
            }}
          >
            {connection.label}
          </div>
        );
      })}

      {/* 标签编辑输入框 */}
      {editingConnection && labelPosition && (
        <div
          style={{
            position: 'absolute',
            left: labelPosition.x,
            top: labelPosition.y,
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            pointerEvents: 'all',
          }}
        >
          {/* 主容器 */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            minWidth: '240px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            
            {/* 工具栏 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}>
              
              {/* 左侧按钮组 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                {/* 样式切换 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (editingConnection) {
                    toggleConnectionStyle(editingConnection);
                  }
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                style={{
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  background: '#f8fafc',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  fontWeight: '500',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                }}
                title={(() => {
                  const connection = connections.find(c => `${c.from}-${c.to}` === editingConnection);
                  const currentStyle = connection?.style === 'dashed' ? '虚线' : '实线';
                  const nextStyle = connection?.style === 'dashed' ? '实线' : '虚线';
                  return `当前: ${currentStyle}，点击切换为${nextStyle}`;
                })()}
              >
                {/* 连线图标 - 显示当前状态 */}
                <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
                  <line 
                    x1="1" 
                    y1="5" 
                    x2="17" 
                    y2="5" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={(() => {
                      const connection = connections.find(c => `${c.from}-${c.to}` === editingConnection);
                      const isDashed = connection?.style === 'dashed';
                      return isDashed ? "4,3" : "none"; // 虚线显示虚线，实线显示实线
                    })()}
                  />
                </svg>
                {(() => {
                  const connection = connections.find(c => `${c.from}-${c.to}` === editingConnection);
                  const isDashed = connection?.style === 'dashed';
                  return isDashed ? '虚线' : '实线'; // 显示当前状态
                })()}
              </button>
              
              {/* 颜色选择器 */}
              <div style={{ position: 'relative' }} data-color-picker>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowColorPicker(!showColorPicker);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  style={{
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    background: '#f8fafc',
                    color: '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    fontWeight: '500',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                >
                  {/* 当前颜色预览 */}
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    background: (() => {
                      const connection = connections.find(c => `${c.from}-${c.to}` === editingConnection);
                      return connection?.color || 'var(--connection-default)';
                    })(),
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                  }} />
                  颜色
                  {/* 展开箭头 */}
                  <svg 
                    width="12" 
                    height="12" 
                    viewBox="0 0 12 12" 
                    fill="none"
                    style={{
                      transform: showColorPicker ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <path 
                      d="M3 4.5L6 7.5L9 4.5" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                
                {/* 颜色选择面板 */}
                {showColorPicker && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    marginTop: '4px',
                    background: 'white',
                    borderRadius: '8px',
                    padding: '8px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    zIndex: 1000,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '6px',
                    minWidth: '140px',
                  }}>
                    {commonColors.map((colorOption) => {
                      const connection = connections.find(c => `${c.from}-${c.to}` === editingConnection);
                      const currentColor = connection?.color || '';
                      const isSelected = currentColor === colorOption.value;
                      
                      return (
                        <button
                          key={colorOption.value}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (editingConnection) {
                              setConnectionColor(editingConnection, colorOption.value);
                              setShowColorPicker(false);
                            }
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          title={colorOption.name}
                          style={{
                            width: '28px',
                            height: '28px',
                            border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                            borderRadius: '6px',
                            background: colorOption.preview,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                            boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.transform = 'scale(1.1)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = isSelected ? 'scale(1.05)' : 'scale(1)';
                            e.currentTarget.style.boxShadow = isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)';
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
              </div>
              
              {/* 删除按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (editingConnection) {
                    deleteConnection(editingConnection);
                  }
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                style={{
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  fontSize: '13px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  fontWeight: '500',
                  width: '32px',
                  height: '32px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fee2e2';
                  e.currentTarget.style.color = '#b91c1c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                  e.currentTarget.style.color = '#dc2626';
                }}
                title="删除连线"
              >
                {/* 删除图标 */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path 
                    d="M6 2V1.5C6 1.22386 6.22386 1 6.5 1H9.5C9.77614 1 10 1.22386 10 1.5V2M4 4V13.5C4 14.3284 4.67157 15 5.5 15H10.5C11.3284 15 12 14.3284 12 13.5V4M2 4H14M6.5 7V11.5M9.5 7V11.5" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            
            {/* 输入框 */}
            <input
              ref={inputRef}
              type="text"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              onBlur={(e) => {
                // 延迟执行，让按钮点击事件有时间触发
                setTimeout(() => {
                  saveLabelText();
                }, 150);
              }}
              onKeyDown={handleKeyDown}
              placeholder="输入标签..."
              style={{
                border: '2px solid #e2e8f0',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: '500',
                background: 'white',
                color: '#1e293b',
                outline: 'none',
                width: '100%',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlurCapture={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default SimpleConnectionLayer; 