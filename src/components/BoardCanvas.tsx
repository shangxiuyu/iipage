import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { useBoardStore, BACKGROUND_COLORS } from '../store/useBoardStore';
import NodeCard from './NodeCard';
import DeleteConfirmModal from './DeleteConfirmModal';
import ZoomControls from './ZoomControls';
import GridToggle from './GridToggle';
import VideoBackground from './VideoBackground';
import ImageBackground from './ImageBackground';
import BuiltinImageBackground from './BuiltinImageBackground';
import InteractiveThemeBackground from './InteractiveThemeBackground';
import SimpleConnectionLayer from './SimpleConnectionLayer';
import { ThemeContext } from '../App';
import NodeConnection from './NodeCard/NodeConnection';
import FrameStylePicker from './FrameStylePicker';

// 兼容类型：扩展 BACKGROUND_COLORS 的类型定义
import type { BACKGROUND_COLORS as BGCType } from '../store/useBoardStore';

const GRID_SIZE = 20;

interface BoardCanvasProps {
  onOpenProjectCenter?: () => void;
  readOnly?: boolean;
}

const BoardCanvas: React.FC<BoardCanvasProps> = ({ onOpenProjectCenter, readOnly = false }) => {
  const { 
    nodes, 
    addNode, 
    clearSelection,
    isSelecting,
    selectionStart,
    selectionEnd,
    startSelection,
    updateSelection,
    endSelection,
    selectedNodes,
    selectedConnections,
    deleteSelectedNodes,
    deleteSelectedConnections,
    clearConnectionSelection,
    setNodeEditing,
    scale,
    panX,
    panY,
    setScale,
    setPan,
    showGrid,
    toggleGrid,
    
    // 复制粘贴相关
    copyNode,
    copyNodes,
    pasteNode,
    pasteNodes,
    copiedNodeData,
    copiedNodesData,
    
    // 背景框相关
    backgroundFrames,
    selectedFrames,
    isDraggingFrame,
    createBackgroundFrame,
    selectBackgroundFrame,
    clearFrameSelection,
    moveBackgroundFrame,
    addNodeToFrame,
    removeNodeFromFrame,
    
    // 新的背景模式管理
    backgroundMode,
    setBackgroundMode,
    
    // 视频背景
    videoBackgroundUrl,
    setVideoBackgroundUrl,
    
    // 图片背景
    imageBackgroundUrl,
    imageBlurLevel,
    setImageBackgroundUrl,
    setImageBlurLevel,
    
    // 内置背景图片
    builtinBackgroundPath,
    
    // 可交互主题
    interactiveTheme,
    setInteractiveTheme,
    
    // 连线相关状态和方法
    isConnecting,
    connectingFrom,
    updateTempConnection,
    cancelConnecting,
    startConnecting,
    finishConnecting,
    
    // 背景框相关状态和方法
    updateBackgroundFrame,
    frameHighlights
  } = useBoardStore();
  
  // 获取深色模式状态
  const { isDarkMode } = useContext(ThemeContext);

  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });
  const [mouseDownTime, setMouseDownTime] = useState(0);
  const [mouseDownPosition, setMouseDownPosition] = useState({ x: 0, y: 0 });
  const [isDoubleClick, setIsDoubleClick] = useState(false);
  
  // 添加ref来引用canvas元素
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // 全局保存所有正在编辑的卡片内容
  const nodeCardRefs = useRef<{ [id: string]: { finishEdit: () => void } | null }>({});
  
  // 用于FrameStylePicker的状态
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 });
  const [editingFrameId, setEditingFrameId] = useState<string | null>(null);
  const [hoveredFrameId, setHoveredFrameId] = useState<string | null>(null);
  const [resizingFrameId, setResizingFrameId] = useState<string | null>(null);
  
  // 1. 新增 gridIntensity 状态
  const [gridIntensity, setGridIntensity] = React.useState(3); // 0~10，初始为3
  
  // 当前背景色索引
  const [bgIndex, setBgIndex] = React.useState(() => {
    const current = useBoardStore.getState().currentBackground;
    const idx = BACKGROUND_COLORS.findIndex(bg => bg.id === current);
    return idx >= 0 ? idx : 0;
  });

  // 切换背景色
  useEffect(() => {
    const bg = BACKGROUND_COLORS[bgIndex];
    if (bg) {
      useBoardStore.getState().setBackground(bg.id);
      if (!isDarkMode) {
        document.body.style.setProperty('--grid-bg', bg.bgColor);
        document.body.style.setProperty('--grid-line', bg.gridColor);
      } else {
        // 深色模式：优先用 darkBgColor/darkGridColor，否则用默认
        document.body.style.setProperty('--grid-bg', bg.darkBgColor || '#181c23');
        document.body.style.setProperty('--grid-line', bg.darkGridColor || '#283040');
      }
    }
  }, [bgIndex, isDarkMode]);

  const saveEditingNodes = () => {
    nodes.forEach(node => {
      if (node.editing && nodeCardRefs.current[node.id] && typeof nodeCardRefs.current[node.id]?.finishEdit === 'function') {
        nodeCardRefs.current[node.id]?.finishEdit();
      }
    });
  };
  
  // 获取当前背景配置 - 暂时未使用
  // const _backgroundConfig = getCurrentBackgroundConfig();
  
  // 根据背景模式确定是否显示网格
  const shouldShowGrid = backgroundMode === 'grid' && showGrid && !interactiveTheme;
  // 根据背景模式确定是否显示点状背景
  const shouldShowDots = backgroundMode === 'dots' && !interactiveTheme;

  // 统一处理背景样式，修复网格线条粗细不均的问题
  const { bgImage, bgSize, bgRepeat } = useMemo(() => {
    if (shouldShowGrid) {
      return {
        bgImage: `
          linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
          linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)
        `,
        bgSize: `${GRID_SIZE * scale}px ${GRID_SIZE * scale}px`,
        bgRepeat: 'repeat',
      };
    }
    if (shouldShowDots) {
      return {
        bgImage: `radial-gradient(circle, var(--grid-line) 1.5px, transparent 1.5px)`,
        bgSize: `${GRID_SIZE * scale}px ${GRID_SIZE * scale}px`,
        bgRepeat: 'repeat',
      };
    }
    return {
      bgImage: 'none',
      bgSize: 'auto',
      bgRepeat: 'no-repeat',
    };
  }, [shouldShowGrid, shouldShowDots, scale]);

  // 根据背景模式确定画布背景色
  const getCanvasBackgroundColor = () => {
    // 如果有可交互主题，让主题背景显示
    if (interactiveTheme) {
      return 'transparent';
    }
    
    switch (backgroundMode) {
      case 'grid':
        return 'var(--grid-bg)';
      case 'dots':
        return 'var(--grid-bg)';
      case 'blank':
        return 'var(--bg-color)';
      case 'image':
      case 'video':
        return 'transparent'; // 让背景图片/视频显示
      default:
        return 'var(--bg-color)';
    }
  };

  // 新增：根据 gridIntensity 计算网格线颜色
  useEffect(() => {
    // 线性插值：0=最淡，10=最深
    // 浅色模式：#f5f6fa(最淡) ~ #cbd5e1(最深)
    // 深色模式：#232a36(最淡) ~ #e5e7eb(最深)
    function lerpColor(a: string, b: string, t: number) {
      // a, b: '#rrggbb'，t: 0~1
      const ah = a.replace('#', '');
      const bh = b.replace('#', '');
      const ar = parseInt(ah.substring(0, 2), 16);
      const ag = parseInt(ah.substring(2, 4), 16);
      const ab = parseInt(ah.substring(4, 6), 16);
      const br = parseInt(bh.substring(0, 2), 16);
      const bg = parseInt(bh.substring(2, 4), 16);
      const bb = parseInt(bh.substring(4, 6), 16);
      const rr = Math.round(ar + (br - ar) * t);
      const rg = Math.round(ag + (bg - ag) * t);
      const rb = Math.round(ab + (bb - ab) * t);
      return `#${rr.toString(16).padStart(2, '0')}${rg.toString(16).padStart(2, '0')}${rb.toString(16).padStart(2, '0')}`;
    }
    let color = '#e5e7eb';
    if (!isDarkMode) {
      // 浅色：0=#f5f6fa，10=#000000
      color = lerpColor('#f5f6fa', '#000000', gridIntensity / 10);
    } else {
      // 深色：0=#232a36，10=#000000
      color = lerpColor('#232a36', '#000000', gridIntensity / 10);
    }
    document.body.style.setProperty('--grid-line', color);
  }, [gridIntensity, isDarkMode]);

  // 键盘事件处理
  useEffect(() => {
    if (readOnly) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // 新增：如果事件来源于输入框、textarea或contenteditable，直接跳过
      if (
        e.target instanceof HTMLElement &&
        (
          e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.isContentEditable
        )
      ) {
        return;
      }
      // Escape 键取消选择和框选
      if (e.key === 'Escape') {
        clearSelection();
        clearConnectionSelection();
        clearFrameSelection();
        // 清除框选状态
        if (isSelecting) {
          endSelection();
        }
        return; // 提前返回，避免后续逻辑
      }
      
      // 检查是否在编辑状态
      const hasEditingNode = nodes.some(node => node.editing);
      if (hasEditingNode) return;
      
      // 空格键触发生成背景框
      if (e.key === ' ') {
        e.preventDefault();
        if (isSelecting && selectionStart && selectionEnd) {
          // 计算框选区域
          const minX = Math.min(selectionStart.x, selectionEnd.x);
          const minY = Math.min(selectionStart.y, selectionEnd.y);
          const width = Math.abs(selectionEnd.x - selectionStart.x);
          const height = Math.abs(selectionEnd.y - selectionStart.y);
          
          // 确保框选区域足够大
          if (width > 50 && height > 50) {
            createBackgroundFrame(minX, minY, width, height);
            console.log('✅ 背景框已创建，框选区域:', { minX, minY, width, height });
          } else {
            console.log('⚠️ 框选区域太小，无法创建背景框');
          }
        } else {
          console.log('⚠️ 请先拖拽框选一个区域，然后按空格键创建背景框');
        }
        return;
      }
      
      // Delete 键或 Backspace 键
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const hasSelectedNodes = selectedNodes.length > 0;
        const hasSelectedFrames = selectedFrames.length > 0;
        if (hasSelectedNodes || hasSelectedFrames) {
          // 同时删除选中的卡片和背景框
          if (hasSelectedNodes) {
            deleteSelectedNodes();
          }
          if (hasSelectedFrames) {
            selectedFrames.forEach(frameId => {
              const { deleteBackgroundFrame } = useBoardStore.getState();
              deleteBackgroundFrame(frameId);
            });
          }
          // 删除后清空 selection
          clearSelection();
          clearFrameSelection();
        }
        return;
      }
      
      // G键切换网格（在网格和点状背景模式下有效）
      if (e.key === 'G' && (backgroundMode === 'grid' || backgroundMode === 'dots')) {
        e.preventDefault();
        toggleGrid();
      }
      
      // 复制粘贴快捷键
      if (e.key === 'c' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          if (selectedNodes.length === 1) {
            copyNode(selectedNodes[0]);
        } else if (selectedNodes.length > 1) {
            copyNodes(selectedNodes);
        }
      }
      
      if (e.key === 'v' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
        if (copiedNodesData.length > 1) {
            pasteNodes();
        } else if (copiedNodeData) {
          pasteNode();
        }
      }

      // 网格深浅调节
      if (e.key === 'ArrowUp') {
        setGridIntensity(intensity => Math.min(intensity + 1, 10));
        return;
      }
      if (e.key === 'ArrowDown') {
        setGridIntensity(intensity => Math.max(intensity - 1, 0));
        return;
      }

      // ← → 切换背景色
      if (e.key === 'ArrowLeft') {
        setBgIndex(idx => (idx - 1 + BACKGROUND_COLORS.length) % BACKGROUND_COLORS.length);
        return;
      }
      if (e.key === 'ArrowRight') {
        setBgIndex(idx => (idx + 1) % BACKGROUND_COLORS.length);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    readOnly, 
    clearSelection, 
    clearConnectionSelection, 
    clearFrameSelection,
    isSelecting, 
    endSelection, 
    nodes, 
    selectedNodes, 
    selectedConnections, 
    selectedFrames,
    deleteSelectedConnections, 
    backgroundMode, 
    toggleGrid, 
    copyNode, 
    copyNodes, 
    pasteNode, 
    pasteNodes, 
    copiedNodeData, 
    copiedNodesData,
    isSelecting,
    selectionStart,
    selectionEnd,
    createBackgroundFrame,
    deleteSelectedNodes,
    setGridIntensity,
    setBgIndex
  ]);

  // 滚轮事件处理 - 只读模式下允许缩放
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // 允许缩放和平移
      const isTouchpadPinch = e.ctrlKey;
      const isTouchpadPan = Math.abs(e.deltaX) > 0 || (Math.abs(e.deltaY) < 50 && !e.ctrlKey);
      if (isTouchpadPan && !isTouchpadPinch) {
        const deltaX = -e.deltaX;
        const deltaY = -e.deltaY;
        setPan(panX + deltaX, panY + deltaY);
        return;
      }
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(3, scale * delta));
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - panX) / scale;
      const worldY = (mouseY - panY) / scale;
      const newPanX = mouseX - worldX * newScale;
      const newPanY = mouseY - worldY * newScale;
      setScale(newScale);
      setPan(newPanX, newPanY);
    };
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel);
      }
    };
  }, [scale, panX, panY, setScale, setPan]);

  // 触摸事件处理 - 只读模式下允许缩放和平移
  useEffect(() => {
    let lastTouchDistance = 0;
    let lastTouchCenter = { x: 0, y: 0 };
    let initialScale = scale;
    let initialPan = { x: panX, y: panY };
    let isTouchPanning = false;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        lastTouchDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) + 
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        lastTouchCenter = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2
        };
        initialScale = scale;
        initialPan = { x: panX, y: panY };
        isTouchPanning = true;
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isTouchPanning) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) + 
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        const currentCenter = {
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2
        };
        const scaleChange = currentDistance / lastTouchDistance;
        const newScale = Math.max(0.1, Math.min(3, initialScale * scaleChange));
        const panDeltaX = currentCenter.x - lastTouchCenter.x;
        const panDeltaY = currentCenter.y - lastTouchCenter.y;
        if (Math.abs(scaleChange - 1) < 0.1) {
          setPan(initialPan.x + panDeltaX, initialPan.y + panDeltaY);
        } else {
          setScale(newScale);
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const centerX = lastTouchCenter.x - rect.left;
            const centerY = lastTouchCenter.y - rect.top;
            const worldX = (centerX - initialPan.x) / initialScale;
            const worldY = (centerY - initialPan.y) / initialScale;
            const newPanX = centerX - worldX * newScale + panDeltaX;
            const newPanY = centerY - worldY * newScale + panDeltaY;
            setPan(newPanX, newPanY);
          }
        }
      }
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        isTouchPanning = false;
      }
    };
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [scale, panX, panY, setScale, setPan]);

  // 双击空白区域创建节点
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    // 检查是否点击在卡片上，如果是则不创建新卡片
    const target = e.target as HTMLElement;
    
    // 检查是否点击在卡片或卡片内部元素上
    if (target.closest('[data-node-id]')) {
      return;
    }
    
    // 检查是否点击在连线上（React Flow 相关元素）
    if (target.closest('.react-flow__edge-interaction') || 
        target.closest('.react-flow__edge-path') ||
        target.classList.contains('react-flow__edge-interaction') ||
        target.classList.contains('react-flow__edge-path')) {
      return;
    }
    
    // 设置双击标志，防止其他事件处理
    setIsDoubleClick(true);
    
    // 重置框选状态（如果有的话）
    if (isSelecting) {
      endSelection();
    }
    
    // 防止双击时触发其他事件
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Double click detected!', target); // 调试用
    
    // 检查是否有正在编辑的节点，如果有则先保存并退出编辑状态
    const editingNode = nodes.find(node => node.editing);
    if (editingNode) {
      saveEditingNodes();
      setNodeEditing(editingNode.id, false);
    }
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // 转换为世界坐标系
    const worldX = (canvasX - panX) / scale;
    const worldY = (canvasY - panY) / scale;
    
    // 先清除现有选择
    clearSelection();
    
    console.log('Creating node at world coordinates:', worldX, worldY); // 调试用
    addNode(worldX, worldY);
    
    // 清除双击标志
    setTimeout(() => setIsDoubleClick(false), 100);
  };

  // 鼠标按下 - 框选/平移/清除选择
  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    // 检查是否点击在卡片上，如果是则不处理
    const target = e.target as HTMLElement;
    
    console.log('Mouse down on:', target.tagName, target.className, target.getAttribute('data-node-id')); // 调试用
    
    if (target.closest('[data-node-id]')) {
      console.log('Mouse down on card, ignoring'); // 调试用
      return;
    }
    
    console.log('Mouse down on canvas area'); // 调试用
    
    // 如果已经有框选状态，先清理
    if (isSelecting) {
      endSelection();
    }
    
    // 记录鼠标按下的时间和位置
    setMouseDownTime(Date.now());
    setMouseDownPosition({ x: e.clientX, y: e.clientY });
    
    // 检查是否有正在编辑的节点，如果有则先保存并退出编辑状态
    const editingNode = nodes.find(node => node.editing);
    if (editingNode) {
      saveEditingNodes();
      setNodeEditing(editingNode.id, false);
    }
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // 检查是否按下空格键进行平移
    if (e.button === 1 || e.ctrlKey) { // 中键或Ctrl+左键拖拽平移
      e.preventDefault();
      setIsPanning(true);
      setLastPanPosition({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // 转换为世界坐标系进行框选
    const worldX = (canvasX - panX) / scale;
    const worldY = (canvasY - panY) / scale;
    
    // 开始框选
    startSelection(worldX, worldY);
    setIsDraggingCanvas(true);
  };

  // 鼠标移动 - 框选/平移/连接
  const handleMouseMove = (e: React.MouseEvent) => {
    if (readOnly) return;
    
    // 获取画布和世界坐标
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const worldX = (canvasX - panX) / scale;
    const worldY = (canvasY - panY) / scale;
    
    // --- 1. 处理连线逻辑 ---
    if (isConnecting) {
      // 这里的 fromAnchor 必须从 store 中获取最新的状态
      const { fromAnchor } = useBoardStore.getState();
      if(fromAnchor) {
        // 更新临时连线到当前鼠标位置
        // 注意：fromX 和 fromY 在 `startConnecting` 时已经设置好了，这里只需要更新 toX 和 toY
        // SimpleConnectionLayer 会使用 tempConnection 状态来绘制临时连线
        const { tempConnection } = useBoardStore.getState();
        if (tempConnection) {
          updateTempConnection(tempConnection.fromX, tempConnection.fromY, e.clientX, e.clientY, fromAnchor);
        }
      }
      return; // 连线时，不执行其他鼠标移动逻辑
    }

    // --- 2. 处理平移逻辑 ---
    if (isPanning) {
      const deltaX = e.clientX - lastPanPosition.x;
      const deltaY = e.clientY - lastPanPosition.y;
      setPan(panX + deltaX, panY + deltaY);
      setLastPanPosition({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // --- 3. 处理框选逻辑 ---
    if (isSelecting) {
    updateSelection(worldX, worldY);
    }
  };

  // 鼠标抬起 - 结束框选/平移
  const handleMouseUp = (e: React.MouseEvent) => {
    if (readOnly) return;
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    
    // 如果是双击，不处理单击逻辑，但要重置框选状态
    if (isDoubleClick) {
      setIsDraggingCanvas(false);
      // 重置框选状态
      if (isSelecting) {
        endSelection();
      }
      return;
    }
    
    // 检查是否是快速点击（可能是双击的一部分）
    const clickDuration = Date.now() - mouseDownTime;
    const moveDistance = Math.sqrt(
      Math.pow(e.clientX - mouseDownPosition.x, 2) + 
      Math.pow(e.clientY - mouseDownPosition.y, 2)
    );
    
    // 如果是短时间且没有移动的单击
    if (clickDuration < 300 && moveDistance < 5) {
      // 如果在连线模式，点击空白区域取消连线
      if (isConnecting && connectingFrom) {
        cancelConnecting();
        setIsDraggingCanvas(false);
        // 重置框选状态
        if (isSelecting) {
          endSelection();
        }
        return;
      }
      
      // 检查点击的目标是否是卡片
      const target = e.target as HTMLElement;
      const isNotCard = !target.closest('[data-node-id]');
      const isNotFrame = !target.closest('[data-frame-id]'); // 新增：检查是否点击在背景框上
      
      // 只有在点击空白区域且不是多选模式时才清除选中状态
      if (isNotCard && isNotFrame && !e.metaKey && !e.ctrlKey) {
        clearSelection();
        clearConnectionSelection();
        clearFrameSelection(); // 新增：清除背景框选择
      }
      setIsDraggingCanvas(false);
      
      // 重置框选状态 - 这是关键修复！
      if (isSelecting) {
        endSelection();
      }
      return;
    }

    // 如果有拖拽框选，结束框选
    if (isSelecting && moveDistance > 5) {
      // 先结束框选
      endSelection();
      // 框选结束后，选中被框选的背景框
      if (selectionStart && selectionEnd) {
        const minX = Math.min(selectionStart.x, selectionEnd.x);
        const minY = Math.min(selectionStart.y, selectionEnd.y);
        const maxX = Math.max(selectionStart.x, selectionEnd.x);
        const maxY = Math.max(selectionStart.y, selectionEnd.y);
        backgroundFrames.forEach(frame => {
          if (frame.collapsed) return;
          const frameRight = frame.x + frame.width;
          const frameBottom = frame.y + frame.height;
          // 判断背景框是否与框选区域有重叠
          if (
            frame.x < maxX && frameRight > minX &&
            frame.y < maxY && frameBottom > minY
          ) {
            selectBackgroundFrame(frame.id, e.metaKey || e.ctrlKey);
          }
        });
      }
    } else if (isSelecting) {
      endSelection();
    }
    
    setIsDraggingCanvas(false);
  };

  // 计算框选矩形样式
  const getSelectionRect = () => {
    if (!isSelecting || !selectionStart || !selectionEnd) return null;
    
    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    // 转换为屏幕坐标系
    return {
      left: minX * scale + panX,
      top: minY * scale + panY,
      width: width * scale,
      height: height * scale,
    };
  };

  const selectionRect = getSelectionRect();

  return (
    <>
      {/* 连线层 - 移到最外层，确保在所有内容之上 */}
      <SimpleConnectionLayer readOnly={readOnly} />
      
      <div
        ref={canvasRef}
        className="board-canvas"
        style={{
          width: '100vw',
          height: '100vh',
          position: 'relative',
          backgroundImage: bgImage,
          backgroundSize: bgSize,
          backgroundRepeat: bgRepeat,
          backgroundColor: getCanvasBackgroundColor(),
          backgroundPosition: `${Math.round(panX * scale)}px ${Math.round(panY * scale)}px`,
          // 添加 will-change 来优化平移和缩放性能
          willChange: 'background-position',
          transition: isPanning ? 'none' : 'background-color 0.3s ease',
          overflow: 'hidden',
          cursor: isPanning ? 'grabbing' : isSelecting ? 'crosshair' : 'default',
          zIndex: 0, // 设置为0，让背景显示在下方
          // 阻止浏览器的滑动手势
          overscrollBehaviorX: 'none',
          overscrollBehavior: 'none',
          touchAction: 'none',
        }}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        tabIndex={0} // 使div可以接收键盘焦点
      >
        {/* 砖墙背景层 */}
        {backgroundMode === 'brickwall' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: -1,
              pointerEvents: 'none',
              backgroundColor: isDarkMode ? '#232323' : '#f5f3ee',
              backgroundImage: `url('data:image/svg+xml;utf8,<svg width="200" height="100" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke="${isDarkMode ? '%23444' : '%23999'}" stroke-width="${isDarkMode ? '2' : '2.5'}" stroke-linecap="round" stroke-linejoin="round"><path d="M0 20 Q 20 18 40 20 T 80 20 T 120 20 T 160 20 T 200 20"/><path d="M0 40 Q 20 38 40 40 T 80 40 T 120 40 T 160 40 T 200 40"/><path d="M0 60 Q 20 62 40 60 T 80 60 T 120 60 T 160 60 T 200 60"/><path d="M0 80 Q 20 82 40 80 T 80 80 T 120 80 T 160 80 T 200 80"/><path d="M0 100 Q 20 98 40 100 T 80 100 T 120 100 T 160 100 T 200 100"/><path d="M20 0 Q 22 10 20 20"/><path d="M40 20 Q 42 30 40 40"/><path d="M60 0 Q 62 10 60 20"/><path d="M80 20 Q 82 30 80 40"/><path d="M100 0 Q 102 10 100 20"/><path d="M120 20 Q 122 30 120 40"/><path d="M140 0 Q 142 10 140 20"/><path d="M160 20 Q 162 30 160 40"/><path d="M180 0 Q 182 10 180 20"/><path d="M30 40 Q 32 50 30 60"/><path d="M60 40 Q 62 50 60 60"/><path d="M90 40 Q 92 50 90 60"/><path d="M120 40 Q 122 50 120 60"/><path d="M150 40 Q 152 50 150 60"/><path d="M180 40 Q 182 50 180 60"/><path d="M40 60 Q 42 70 40 80"/><path d="M80 60 Q 82 70 80 80"/><path d="M120 60 Q 122 70 120 80"/><path d="M160 60 Q 162 70 160 80"/><path d="M20 80 Q 22 90 20 100"/><path d="M60 80 Q 62 90 60 100"/><path d="M100 80 Q 102 90 100 100"/><path d="M140 80 Q 142 90 140 100"/><path d="M180 80 Q 182 90 180 100"/></g></svg>')`,
              backgroundRepeat: 'repeat',
              backgroundSize: '200px 100px',
              opacity: 1,
              transition: 'background 0.3s',
            }}
          />
        )}
        {/* 缩放容器 */}
        <div
          data-canvas-container="true"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* 背景框层 - 在卡片下方 */}
          {backgroundFrames.map((frame) => {
            const showAnchors = (frame.selected || hoveredFrameId === frame.id) && !readOnly;
            if (frame.collapsed) {
              // 只渲染一个可点击的标题用于展开
              return (
                <React.Fragment key={frame.id}>
                  {/* 展开的标题 */}
                  {frame.title && (
                    <div
                      style={{
                        position: 'absolute',
                        left: frame.x + frame.width / 2,
                        top: frame.y - 22,
                        transform: 'translateX(-50%)',
                        zIndex: 40,
                        background: isDarkMode ? 'rgba(45, 55, 72, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(4px)',
                        padding: '0 18px',
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '16px 16px 20px 20px',
                        fontSize: 22,
                        fontWeight: 900,
                        color: frame.style?.borderColor || '#007acc',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        cursor: 'pointer',
                        lineHeight: '34px',
                        letterSpacing: 1,
                        border: 'none',
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        overflow: 'visible',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (readOnly) return;
                        // 只有未拖动时才切换收起/展开
                        if ((window as any).__frameTitleJustDragged) {
                          (window as any).__frameTitleJustDragged = false;
                          return;
                        }
                        updateBackgroundFrame(frame.id, { collapsed: !frame.collapsed });
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (readOnly) return;
                        selectBackgroundFrame(frame.id, e.metaKey || e.ctrlKey);
                        const startX = e.clientX;
                        const startY = e.clientY;
                        let hasMoved = false;
                        let lastX = startX;
                        let lastY = startY;
                        const handleMouseMove = (e: MouseEvent) => {
                          const deltaX = (e.clientX - lastX) / scale;
                          const deltaY = (e.clientY - lastY) / scale;
                          if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
                            if (!hasMoved) {
                              updateBackgroundFrame(frame.id, { isDragging: true });
                              hasMoved = true;
                              (window as any).__frameTitleJustDragged = true;
                            }
                            moveBackgroundFrame(frame.id, deltaX, deltaY);
                          }
                          lastX = e.clientX;
                          lastY = e.clientY;
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                      title={frame.collapsed ? '点击展开' : '点击收起'}
                    >
                      {frame.title}
                    </div>
                  )}
                </React.Fragment>
              );
            }
            // 展开时渲染完整背景框
            return (
              <div
                key={frame.id}
                data-frame-id={frame.id}
                style={{
                  position: 'absolute',
                  left: frame.x,
                  top: frame.y,
                  width: frame.width,
                  height: frame.height,
                  border: frame.style?.borderColor === 'none' 
                    ? 'none' 
                    : `${frame.style?.borderWidth || 2}px solid ${frame.style?.borderColor || '#007acc'}`,
                  borderRadius: frame.style?.borderRadius || 8,
                  backgroundColor: frameHighlights[frame.id] || frame.style?.backgroundColor || 'transparent',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onClick={() => selectBackgroundFrame(frame.id, false)}
                onContextMenu={(e) => {
                  if (readOnly) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setEditingFrameId(frame.id);
                  setPickerPosition({ x: e.clientX, y: e.clientY });
                  setShowFramePicker(true);
                }}
                onMouseEnter={() => {
                  if (!readOnly) setHoveredFrameId(frame.id);
                }}
                onMouseLeave={() => {
                  if (!readOnly) setHoveredFrameId(null);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  if (readOnly) return;
                  selectBackgroundFrame(frame.id, e.metaKey || e.ctrlKey);
                  const startX = e.clientX;
                  const startY = e.clientY;
                  let hasMoved = false;
                  let lastX = startX;
                  let lastY = startY;
                  const handleMouseMove = (e: MouseEvent) => {
                    const deltaX = (e.clientX - lastX) / scale;
                    const deltaY = (e.clientY - lastY) / scale;
                    if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
                      if (!hasMoved) {
                        updateBackgroundFrame(frame.id, { isDragging: true });
                        hasMoved = true;
                        (window as any).__frameTitleJustDragged = true;
                      }
                      moveBackgroundFrame(frame.id, deltaX, deltaY);
                    }
                    lastX = e.clientX;
                    lastY = e.clientY;
                  };
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              >
                {/* 标题和分段上边框，pointerEvents设为none只做装饰 */}
                {frame.title && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        top: -22,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 40,
                        background: isDarkMode ? 'rgba(45, 55, 72, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(4px)',
                        padding: '0 18px',
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '16px 16px 20px 20px',
                        fontSize: 22,
                        fontWeight: 900,
                        color: frame.style?.borderColor || '#007acc',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        cursor: 'pointer',
                        lineHeight: '34px',
                        letterSpacing: 1,
                        border: 'none',
                        pointerEvents: 'auto',
                        userSelect: 'none',
                        overflow: 'visible',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (readOnly) return;
                        // 只有未拖动时才切换收起/展开
                        if ((window as any).__frameTitleJustDragged) {
                          (window as any).__frameTitleJustDragged = false;
                          return;
                        }
                        updateBackgroundFrame(frame.id, { collapsed: !frame.collapsed });
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (readOnly) return;
                        selectBackgroundFrame(frame.id, e.metaKey || e.ctrlKey);
                        const startX = e.clientX;
                        const startY = e.clientY;
                        let hasMoved = false;
                        let lastX = startX;
                        let lastY = startY;
                        const handleMouseMove = (e: MouseEvent) => {
                          const deltaX = (e.clientX - lastX) / scale;
                          const deltaY = (e.clientY - lastY) / scale;
                          if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
                            if (!hasMoved) {
                              updateBackgroundFrame(frame.id, { isDragging: true });
                              hasMoved = true;
                              (window as any).__frameTitleJustDragged = true;
                            }
                            moveBackgroundFrame(frame.id, deltaX, deltaY);
                          }
                          lastX = e.clientX;
                          lastY = e.clientY;
                        };
                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };
                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                      title={frame.collapsed ? '点击展开' : '点击收起'}
                    >
                      {frame.title}
                    </div>
                  </>
                )}
                {/* 折叠时不显示内容，包括锚点和手柄 */}
                {!frame.collapsed && (
                  <>
                    {/* 连接锚点 */}
                    {showAnchors && ['top', 'right', 'bottom', 'left'].map((anchor) => {
                      const position = {
                        top: anchor === 'bottom' ? 'auto' : (anchor === 'top' ? '-5px' : '50%'),
                        left: anchor === 'right' ? 'auto' : (anchor === 'left' ? '-5px' : '50%'),
                        bottom: anchor === 'bottom' ? '-5px' : 'auto',
                        right: anchor === 'right' ? '-5px' : 'auto',
                        transform: anchor === 'top' || anchor === 'bottom' ? 'translateX(-50%)' : 'translateY(-50%)',
                      };
                      return (
                        <div
                          key={anchor}
                          style={{
                            position: 'absolute',
                            width: '10px',
                            height: '10px',
                            backgroundColor: 'white',
                            border: '2px solid #007acc',
                            borderRadius: '50%',
                            cursor: 'crosshair',
                            zIndex: 11,
                            ...position,
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            if (isConnecting) {
                              finishConnecting(frame.id, anchor as 'top' | 'right' | 'bottom' | 'left');
                            } else {
                              startConnecting(frame.id, anchor as 'top' | 'right' | 'bottom' | 'left');
                            }
                          }}
                          onMouseUp={(e) => {
                            e.stopPropagation();
                            if (isConnecting) {
                              finishConnecting(frame.id, anchor as 'top' | 'right' | 'bottom' | 'left');
                            }
                          }}
                        />
                      );
                    })}

                    {/* 最终版：八向调整大小的隐形手柄，鼠标靠近时激活 */}
                    {(hoveredFrameId === frame.id || resizingFrameId === frame.id) && !readOnly &&
                      (['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'] as const).map(dir => {
                        const handleStyle: React.CSSProperties = {
                          position: 'absolute',
                          zIndex: 10,
                          background: 'transparent', // 手柄本身透明
                        };

                        const edgeHotzone = 12;
                        const cornerHotzone = 20;

                        switch (dir) {
                          case 'n':
                            handleStyle.top = -edgeHotzone / 2;
                            handleStyle.left = cornerHotzone;
                            handleStyle.width = `calc(100% - ${cornerHotzone * 2}px)`;
                            handleStyle.height = edgeHotzone;
                            handleStyle.cursor = 'n-resize';
                            break;
                          case 's':
                            handleStyle.bottom = -edgeHotzone / 2;
                            handleStyle.left = cornerHotzone;
                            handleStyle.width = `calc(100% - ${cornerHotzone * 2}px)`;
                            handleStyle.height = edgeHotzone;
                            handleStyle.cursor = 's-resize';
                            break;
                          case 'w':
                            handleStyle.left = -edgeHotzone / 2;
                            handleStyle.top = cornerHotzone;
                            handleStyle.height = `calc(100% - ${cornerHotzone * 2}px)`;
                            handleStyle.width = edgeHotzone;
                            handleStyle.cursor = 'w-resize';
                            break;
                          case 'e':
                            handleStyle.right = -edgeHotzone / 2;
                            handleStyle.top = cornerHotzone;
                            handleStyle.height = `calc(100% - ${cornerHotzone * 2}px)`;
                            handleStyle.width = edgeHotzone;
                            handleStyle.cursor = 'e-resize';
                            break;
                          case 'nw':
                            handleStyle.top = -cornerHotzone / 2;
                            handleStyle.left = -cornerHotzone / 2;
                            handleStyle.width = cornerHotzone;
                            handleStyle.height = cornerHotzone;
                            handleStyle.cursor = 'nw-resize';
                            break;
                          case 'ne':
                            handleStyle.top = -cornerHotzone / 2;
                            handleStyle.right = -cornerHotzone / 2;
                            handleStyle.width = cornerHotzone;
                            handleStyle.height = cornerHotzone;
                            handleStyle.cursor = 'ne-resize';
                            break;
                          case 'sw':
                            handleStyle.bottom = -cornerHotzone / 2;
                            handleStyle.left = -cornerHotzone / 2;
                            handleStyle.width = cornerHotzone;
                            handleStyle.height = cornerHotzone;
                            handleStyle.cursor = 'sw-resize';
                            break;
                          case 'se':
                            handleStyle.bottom = -cornerHotzone / 2;
                            handleStyle.right = -cornerHotzone / 2;
                            handleStyle.width = cornerHotzone;
                            handleStyle.height = cornerHotzone;
                            handleStyle.cursor = 'se-resize';
                            break;
                        }

                        return (
                          <div
                            key={dir}
                            style={handleStyle}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizingFrameId(frame.id);
                              const startResizeX = e.clientX;
                              const startResizeY = e.clientY;
                              const startFrame = { ...frame };

                              const handleResizeMove = (e: MouseEvent) => {
                                const deltaX = (e.clientX - startResizeX) / scale;
                                const deltaY = (e.clientY - startResizeY) / scale;

                                let newX = startFrame.x;
                                let newY = startFrame.y;
                                let newWidth = startFrame.width;
                                let newHeight = startFrame.height;

                                if (dir.includes('e')) newWidth = Math.max(100, startFrame.width + deltaX);
                                if (dir.includes('w')) {
                                  newWidth = Math.max(100, startFrame.width - deltaX);
                                  if (newWidth > 100) newX = startFrame.x + deltaX;
                                }
                                if (dir.includes('s')) newHeight = Math.max(100, startFrame.height + deltaY);
                                if (dir.includes('n')) {
                                  newHeight = Math.max(100, startFrame.height - deltaY);
                                  if (newHeight > 100) newY = startFrame.y + deltaY;
                                }

                                updateBackgroundFrame(frame.id, {
                                  x: newX,
                                  y: newY,
                                  width: newWidth,
                                  height: newHeight,
                                });
                              };

                              const handleResizeUp = () => {
                                setResizingFrameId(null);
                                document.removeEventListener('mousemove', handleResizeMove);
                                document.removeEventListener('mouseup', handleResizeUp);
                              };

                              document.addEventListener('mousemove', handleResizeMove);
                              document.addEventListener('mouseup', handleResizeUp);
                            }}
                          />
                        );
                      })
                    }
                  </>
                )}
              </div>
            );
          })}
          
          {nodes.filter(node => {
            // 如果卡片属于某个背景框，且该背景框已收起，则不渲染
            if (node.containerId) {
              const frame = backgroundFrames.find(f => f.id === node.containerId);
              if (frame && frame.collapsed) return false;
            }
            return !node.pinned;
          }).map((node) => (
            <NodeCard 
              key={node.id} 
              node={node}
              ref={el => { nodeCardRefs.current[node.id] = el; }}
              readOnly={readOnly}
            />
          ))}
        </div>
        
        {/* 固定的卡片 - 不受画布变换影响 */}
        {nodes.filter(node => node.pinned).map((node) => (
          <NodeCard 
            key={node.id} 
            node={node}
            readOnly={readOnly}
          />
        ))}
        
        {/* 框选矩形 */}
        {selectionRect && (
          <div
            style={{
              position: 'absolute',
              left: selectionRect.left,
              top: selectionRect.top,
              width: selectionRect.width,
              height: selectionRect.height,
              border: '2px dashed #007acc',
              background: 'rgba(0, 122, 204, 0.1)',
              pointerEvents: 'none',
              zIndex: 15,
            }}
          />
        )}
      </div>
      
      {showFramePicker && editingFrameId && (
        <FrameStylePicker
          position={pickerPosition}
          onClose={() => setShowFramePicker(false)}
          currentBorderColor={backgroundFrames.find(f => f.id === editingFrameId)?.style?.borderColor}
          onBorderColorChange={(color) => {
            const frame = backgroundFrames.find(f => f.id === editingFrameId);
            if (frame) {
              updateBackgroundFrame(editingFrameId, {
                style: { ...frame.style, borderColor: color }
              });
            }
            setShowFramePicker(false);
          }}
          currentBackgroundColor={backgroundFrames.find(f => f.id === editingFrameId)?.style?.backgroundColor}
          onBackgroundColorChange={(color) => {
            const frame = backgroundFrames.find(f => f.id === editingFrameId);
            if (frame) {
              updateBackgroundFrame(editingFrameId, {
                style: { ...frame.style, backgroundColor: color }
              });
            }
            setShowFramePicker(false);
          }}
          currentTitle={backgroundFrames.find(f => f.id === editingFrameId)?.title}
          onTitleChange={(newTitle) => {
            const frame = backgroundFrames.find(f => f.id === editingFrameId);
            if (frame) {
              updateBackgroundFrame(editingFrameId, { title: newTitle });
            }
          }}
        />
      )}
      
      {/* 左下角项目中心浮动按钮 */}
      {onOpenProjectCenter && (
        <div
          onClick={onOpenProjectCenter}
          style={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            width: 80,
            height: 80,
            backgroundColor: 'transparent',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 9999,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="打开项目中心"
        >
          <svg 
            width="48" 
            height="48" 
            viewBox="0 0 100 100" 
            style={{ color: isDarkMode ? '#ffffff' : '#555555' }}
          >
            <g stroke="currentColor" strokeWidth="3" fill="none">
              {/* 灯泡主体轮廓 */}
              <path d="M25 35 C25 20, 35 10, 50 10 C65 10, 75 20, 75 35 C75 45, 70 50, 65 55 L65 65 L35 65 L35 55 C30 50, 25 45, 25 35 Z" />
              
              {/* 右上角折叠 */}
              <path d="M65 20 L65 10 L75 20 Z" />
              
              {/* 灯泡底部螺纹 */}
              <line x1="35" y1="70" x2="65" y2="70" />
              <ellipse cx="50" cy="75" rx="10" ry="3" fill="currentColor" />
              
              {/* 中心信息符号 */}
              <circle cx="50" cy="30" r="3" fill="currentColor" />
              <rect x="47" y="38" width="6" height="15" fill="currentColor" />
            </g>
          </svg>
        </div>
      )}
      
      {/* 视频背景组件 */}
      <VideoBackground 
        isActive={backgroundMode === 'video' && !interactiveTheme}
        videoUrl={videoBackgroundUrl}
        onVideoChange={setVideoBackgroundUrl}
      />
      
      {/* 图片背景组件 */}
      <ImageBackground 
        isActive={backgroundMode === 'image' && !interactiveTheme && !builtinBackgroundPath}
        imageUrl={imageBackgroundUrl}
        blurLevel={imageBlurLevel}
        onImageChange={setImageBackgroundUrl}
        onBlurChange={setImageBlurLevel}
      />
      
      {/* 内置背景图片组件 */}
      <BuiltinImageBackground 
        isActive={backgroundMode === 'image' && !interactiveTheme && !!builtinBackgroundPath}
        imagePath={builtinBackgroundPath}
      />
      
      {/* 可交互主题背景 */}
      <InteractiveThemeBackground 
        theme={interactiveTheme}
      />
    </>
  );
};

export default BoardCanvas; 