import React, { useState, useRef, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import html2canvas from 'html2canvas';
import type { BackgroundFrame, NodeData } from '../store/useBoardStore';
import { useBoardStore } from '../store/useBoardStore';
import NodeCardContent from './NodeCard/NodeCardContent';
import { ThemeContext } from '../App';
import { getCurrentCardBackground, getBorderRadius, getCircleCardStyles, getFrostedStyle, getCardBorderStyle } from '../utils/cardStyle';

interface BackgroundFrameImagePreviewProps {
  frame: BackgroundFrame;
  onClose: () => void;
  position: { x: number; y: number };
}

const BackgroundFrameImagePreview: React.FC<BackgroundFrameImagePreviewProps> = ({
  frame,
  onClose,
  position,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const frameRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useContext(ThemeContext);
  
  // 获取背景框内的所有卡片和连线
  const { nodes, connections } = useBoardStore(state => ({ 
    nodes: state.nodes, 
    connections: state.connections 
  }));
  const frameNodes = nodes.filter(node => node.containerId === frame.id);
  
  // 获取背景框内的连线（起点和终点都在背景框内的连线）
  const frameConnections = connections.filter(connection => {
    const fromNode = frameNodes.find(n => n.id === connection.from);
    const toNode = frameNodes.find(n => n.id === connection.to);
    return fromNode && toNode;
  });

  useEffect(() => {
    // 只在组件首次加载时生成图片，避免无限循环
    generateFrameImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 移除所有依赖项，只在组件挂载时执行一次

  // 获取锚点的绝对位置（相对于背景框）
  const getAnchorPosition = (nodeId: string, anchor: 'top' | 'right' | 'bottom' | 'left') => {
    const node = frameNodes.find(n => n.id === nodeId);
    if (!node) return null;
    
    // 计算相对于背景框的位置
    const relativeX = node.x - frame.x;
    const relativeY = node.y - frame.y;
    const nodeWidth = node.width || 250;
    const nodeHeight = node.height || 150;
    
    let x = relativeX;
    let y = relativeY;
    
    switch (anchor) {
      case 'top':
        x += nodeWidth / 2;
        break;
      case 'right':
        x += nodeWidth;
        y += nodeHeight / 2;
        break;
      case 'bottom':
        x += nodeWidth / 2;
        y += nodeHeight;
        break;
      case 'left':
        y += nodeHeight / 2;
        break;
    }
    
    return { x, y };
  };

  // 生成平滑的连线路径
  const generateSmoothPath = (
    fromPos: { x: number; y: number },
    toPos: { x: number; y: number },
    fromAnchor: string,
    toAnchor: string
  ) => {
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const offset = Math.min(distance * 0.3, 100);
    
    let cp1x = fromPos.x;
    let cp1y = fromPos.y;
    let cp2x = toPos.x;
    let cp2y = toPos.y;
    
    if (fromAnchor === 'right') cp1x += offset;
    else if (fromAnchor === 'left') cp1x -= offset;
    else if (fromAnchor === 'bottom') cp1y += offset;
    else if (fromAnchor === 'top') cp1y -= offset;
    
    if (toAnchor === 'right') cp2x += offset;
    else if (toAnchor === 'left') cp2x -= offset;
    else if (toAnchor === 'bottom') cp2y += offset;
    else if (toAnchor === 'top') cp2y -= offset;
    
    return `M ${fromPos.x} ${fromPos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toPos.x} ${toPos.y}`;
  };

  // 生成箭头路径
  const generateArrowPath = (pos: { x: number; y: number }, anchor: string) => {
    const size = 8;
    let path = '';
    
    switch (anchor) {
      case 'top':
        path = `M ${pos.x} ${pos.y} L ${pos.x - size} ${pos.y - size} L ${pos.x + size} ${pos.y - size} Z`;
        break;
      case 'right':
        path = `M ${pos.x} ${pos.y} L ${pos.x + size} ${pos.y - size} L ${pos.x + size} ${pos.y + size} Z`;
        break;
      case 'bottom':
        path = `M ${pos.x} ${pos.y} L ${pos.x - size} ${pos.y + size} L ${pos.x + size} ${pos.y + size} Z`;
        break;
      case 'left':
        path = `M ${pos.x} ${pos.y} L ${pos.x - size} ${pos.y - size} L ${pos.x - size} ${pos.y + size} Z`;
        break;
    }
    
    return path;
  };

  const generateFrameImage = async () => {
    // 防止重复调用
    if (isGenerating) {
      console.log('图片生成中，跳过重复调用');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setImageUrl(null);
    try {
      // 减少等待时间，加快生成速度
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!frameRef.current) {
        throw new Error('背景框DOM元素未找到');
      }
      
      // 重新获取最新的卡片数据，避免闭包问题
      const currentState = useBoardStore.getState();
      const currentNodes = currentState.nodes;
      const currentConnections = currentState.connections;
      const currentFrameNodes = currentNodes.filter(node => node.containerId === frame.id);
      const currentFrameConnections = currentConnections.filter(connection => {
        const fromNode = currentFrameNodes.find(n => n.id === connection.from);
        const toNode = currentFrameNodes.find(n => n.id === connection.to);
        return fromNode && toNode;
      });
      
      console.log('开始生成背景框图片...', { 
        frameId: frame.id, 
        frameNodes: currentFrameNodes.length,
        frameConnections: currentFrameConnections.length,
        frameSize: { width: frame.width, height: frame.height }
      });
      
      const frameEl = frameRef.current;
      
      // 记录所有卡片的原始样式，然后设置为显示完整内容
      const cardElements = frameEl.querySelectorAll('[data-card-id]');
      const originalStyles: Array<{element: Element, height: string, overflow: string}> = [];
      
      cardElements.forEach(cardEl => {
        const htmlEl = cardEl as HTMLElement;
        originalStyles.push({
          element: cardEl,
          height: htmlEl.style.height,
          overflow: htmlEl.style.overflow
        });
        htmlEl.style.height = 'auto';
        htmlEl.style.overflow = 'visible';
      });
      
      // 等待DOM更新完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 计算所有卡片展开后的实际高度
      let maxBottomY = frame.height; // 初始背景框高度
      
      cardElements.forEach(cardEl => {
        const htmlEl = cardEl as HTMLElement;
        const cardId = htmlEl.getAttribute('data-card-id');
        const node = currentFrameNodes.find(n => n.id === cardId);
        
        if (node) {
          // 获取卡片的实际渲染高度
          const cardRect = htmlEl.getBoundingClientRect();
          const actualHeight = Math.max(htmlEl.scrollHeight, htmlEl.offsetHeight, cardRect.height);
          const cardRelativeY = node.y - frame.y;
          const cardBottomY = cardRelativeY + actualHeight;
          
          // 更新最大底部位置，增加一些边距
          maxBottomY = Math.max(maxBottomY, cardBottomY + 30); // 增加更多边距确保完整显示
          
          console.log(`卡片 ${cardId} 高度计算:`, {
            原始高度: node.height,
            scrollHeight: htmlEl.scrollHeight,
            offsetHeight: htmlEl.offsetHeight,
            实际使用高度: actualHeight,
            相对Y位置: cardRelativeY,
            底部位置: cardBottomY
          });
        }
      });
      
      // 动态调整背景框高度
      const adjustedHeight = Math.max(frame.height, maxBottomY);
      frameEl.style.height = `${adjustedHeight}px`;
      
      // 如果有标题，需要调整背景框位置以包含标题
      const hasTitle = frame.title && frame.title.trim() !== '';
      const titleHeight = hasTitle ? 40 : 0; // 标题大约占用40px高度（包括边距）
      
      if (hasTitle) {
        // 临时调整背景框位置，向下移动以给标题留出空间
        frameEl.style.top = `${titleHeight}px`;
        frameEl.style.position = 'relative';
      }
      
      // 更新SVG的高度以匹配调整后的背景框
      const svgElement = frameEl.querySelector('svg');
      if (svgElement) {
        svgElement.style.height = `${adjustedHeight}px`;
      }
      
      console.log('背景框高度调整:', {
        原始高度: frame.height,
        调整后高度: adjustedHeight,
        卡片数量: cardElements.length,
        包含标题: hasTitle,
        标题高度: titleHeight
      });
      
      // 再次等待DOM更新
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 创建一个包含标题的外层容器用于截图
      const captureContainer = document.createElement('div');
      captureContainer.style.position = 'relative';
      captureContainer.style.width = `${frame.width}px`;
      captureContainer.style.height = `${adjustedHeight + titleHeight}px`;
      captureContainer.style.background = 'transparent';
      
      // 将背景框移动到容器中
      const originalParent = frameEl.parentNode;
      const originalNextSibling = frameEl.nextSibling;
      captureContainer.appendChild(frameEl);
      
      // 将容器添加到DOM中
      document.body.appendChild(captureContainer);
      
      // 优化html2canvas配置，提高兼容性
      const canvas = await html2canvas(captureContainer, {
        scale: 2, // 高清图片
        logging: false, // 关闭日志，减少控制台输出
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        foreignObjectRendering: false, // 禁用外部对象渲染
        width: frame.width,
        height: adjustedHeight + titleHeight, // 包含标题的总高度
        ignoreElements: (element: Element) => {
          // 忽略可能有问题的元素
          return element.tagName === 'IFRAME' || 
                 element.tagName === 'VIDEO' ||
                 element.classList?.contains('ignore-screenshot');
        }
      } as any);
      
      // 清理：移除临时容器并恢复原始DOM结构
      document.body.removeChild(captureContainer);
      if (originalParent) {
        if (originalNextSibling) {
          originalParent.insertBefore(frameEl, originalNextSibling);
        } else {
          originalParent.appendChild(frameEl);
        }
      }
      
      // 恢复背景框的原始样式和位置
      frameEl.style.height = `${frame.height}px`;
      frameEl.style.top = '';
      frameEl.style.position = '';
      if (svgElement) {
        svgElement.style.height = `${frame.height}px`;
      }
      
      // 恢复所有卡片的原始样式
      originalStyles.forEach(({element, height, overflow}) => {
        const htmlEl = element as HTMLElement;
        htmlEl.style.height = height;
        htmlEl.style.overflow = overflow;
      });
      
      const url = canvas.toDataURL('image/png', 0.95);
      console.log('背景框图片生成成功！');
      setImageUrl(url);
    } catch (error) {
      console.error('生成背景框图片失败:', error);
      setError(`生成图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyImageToClipboard = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      setToastMessage('背景框图片已复制到剪贴板！');
      setShowToast(true);
      onClose();
    } catch (error) {
      setToastMessage('复制失败，请确认浏览器支持剪贴板API');
      setShowToast(true);
    }
  };

  // Toast 自动隐藏
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000); // 3秒后自动隐藏
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // 计算相对位置
  const getRelativePosition = (node: NodeData) => {
    return {
      x: node.x - frame.x,
      y: node.y - frame.y,
    };
  };

  // 复用主卡片的样式（参考CardImagePreview）
  const getCardStyle = (node: NodeData) => {
    const currentBg = getCurrentCardBackground(node, isDarkMode);
    
    // 检查是否为白色或接近白色的背景
    const isWhiteBackground = () => {
      if (node.transparent) return false;
      
      const bgColor = currentBg.color.toLowerCase();
      // 检查各种白色的表示方式
      return bgColor === '#ffffff' || 
             bgColor === '#fff' || 
             bgColor === 'white' || 
             bgColor === 'rgb(255, 255, 255)' || 
             bgColor === 'rgba(255, 255, 255, 1)' ||
             bgColor === 'rgba(255,255,255,0.95)' || // 添加默认白色的检测
             bgColor === 'rgba(255,255,255,0.9)' ||  // 添加其他透明度的白色
             bgColor === 'rgba(255,255,255,0.85)' ||
             bgColor === 'rgba(255,255,255,0.8)' ||
             bgColor === 'rgba(255,255,255,1)' ||
             // 检查 rgba 格式的白色（使用正则表达式）
             /^rgba\(255\s*,\s*255\s*,\s*255\s*,\s*[\d.]+\)$/i.test(bgColor) ||
             // 检查非常接近白色的颜色（如 #fefefe, #fcfcfc 等）
             /^#f[cdef][f][cdef][f][cdef]$/i.test(bgColor) ||
             /^#f[cdef]f$/i.test(bgColor);
    };
    
    // 如果是白色背景且没有设置边框，添加浅灰色边框
    const needsDefaultBorder = isWhiteBackground() && !node.showBorder;
    
    return {
      width: node.width || 250,
      minHeight: node.height || 150,
      background: node.transparent ? 'transparent' : currentBg.color,
      borderRadius: getBorderRadius(node),
      color: currentBg.textColor || '#000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: '16px',
      lineHeight: '1.5',
      textAlign: (node.textAlign as any) || 'left',
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: node.textVerticalAlign === 'center' ? 'center' : 
                      node.textVerticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
      wordBreak: 'break-word' as const,
      boxShadow: 'none',
      overflow: 'hidden',
      padding: 12,
      boxSizing: 'border-box' as const,
      ...getFrostedStyle(node, isDarkMode),
      ...getCircleCardStyles(node),
      // 先应用用户自定义边框样式
      ...getCardBorderStyle(node, isDarkMode),
      // 如果是白色背景且没有用户边框，最后应用默认边框（这样会覆盖上面的 border: 'none'）
      ...(needsDefaultBorder ? { border: '1px solid #e5e7eb' } : {}),
    };
  };

  // 渲染完整的卡片（参考CardImagePreview，直接复用NodeCardContent）
  const renderCompleteCard = (node: NodeData, relativePos: { x: number; y: number }) => {
    // 正确处理 Markdown 模式的内容
    let displayContent: any = node.isFlipped ? (node.backContent || []) : (node.content || []);
    let isMarkdownMode = false;
    let markdownText = '';
    
    // 检查是否为 Markdown 模式
    if (node.isFlipped) {
      isMarkdownMode = node.backEditMode === 'markdown';
      markdownText = node.backMarkdownContent || '';
    } else {
      isMarkdownMode = node.editMode === 'markdown';
      markdownText = node.markdownContent || '';
    }
    
    // 如果是 Markdown 模式，使用字符串内容而不是 Slate 数组
    if (isMarkdownMode && markdownText) {
      displayContent = markdownText;
    }
    
    const contentContainerRef = useRef<HTMLDivElement>(null);
    
    return (
      <div
        key={node.id}
        data-card-id={node.id} // 添加标识，便于后续样式操作
        style={{
          position: 'absolute',
          left: relativePos.x,
          top: relativePos.y,
          ...getCardStyle(node),
        }}
      >
        <NodeCardContent
          node={{
            ...node,
            // 确保 Markdown 相关属性正确传递
            editMode: node.isFlipped ? node.backEditMode : node.editMode,
            markdownContent: node.isFlipped ? node.backMarkdownContent : node.markdownContent,
          }}
          isBack={!!node.isFlipped}
          displayContent={displayContent}
          contentContainerRef={contentContainerRef}
          codeInfo={null}
          detectedUrl={null}
          isWebPageMode={false}
          webpageInteractive={false}
          iframeInteractive={false}
          draggingWebPage={false}
          onEditorChange={() => {}}
          onTagsChange={() => {}}
          onMarkdownDetected={() => {}}
          onWebPageMaskMouseDown={() => {}}
          onMouseDown={() => {}}
          onSetWebpageInteractive={() => {}}
          onSetIframeInteractive={() => {}}
          onInsertImage={() => {}}
          shouldRemovePadding={() => false}
          generateHtmlFromCode={() => ''}
          readOnly={true}
        />
      </div>
    );
  };

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px' 
        }}>
          <h3 style={{ margin: 0, color: '#1f2937' }}>背景框图片预览</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          {/* 隐藏的背景框用于生成图片 */}
          <div style={{ position: 'fixed', left: 0, top: 0, zIndex: -1, opacity: 0, pointerEvents: 'none' }}>
            <div
              ref={frameRef}
              style={{
                position: 'relative',
                width: frame.width,
                height: frame.height,
                border: frame.style?.borderColor === 'none' 
                  ? 'none' 
                  : `${frame.style?.borderWidth || 2}px solid ${frame.style?.borderColor || '#007acc'}`,
                borderRadius: frame.style?.borderRadius || 8,
                backgroundColor: frame.style?.backgroundColor || 'transparent',
                boxSizing: 'border-box',
              }}
            >
              {/* 背景框标题 */}
              {frame.title && (
                <div
                  style={{
                    position: 'absolute',
                    top: -22,
                    left: '50%',
                    transform: 'translateX(-50%)',
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
                    zIndex: 10, // 确保标题在最上层
                  }}
                >
                  {frame.title}
                </div>
              )}
              
              {/* 连线层 - 添加SVG渲染连线 */}
              {frameConnections.length > 0 && (
                <svg
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 1,
                    minHeight: frame.height, // 确保最小高度
                  }}
                >
                  {frameConnections.map((connection, index) => {
                    const connectionId = `${connection.from}-${connection.to}`;
                    const uniqueKey = `${connectionId}-${index}`;
                    
                    // 获取默认锚点
                    const fromNode = frameNodes.find(n => n.id === connection.from);
                    const toNode = frameNodes.find(n => n.id === connection.to);
                    if (!fromNode || !toNode) return null;
                    
                    // 计算最优锚点
                    const fromPos = getRelativePosition(fromNode);
                    const toPos = getRelativePosition(toNode);
                    const dx = toPos.x - fromPos.x;
                    const dy = toPos.y - fromPos.y;
                    
                    let fromAnchor: 'top' | 'right' | 'bottom' | 'left' = 'right';
                    let toAnchor: 'top' | 'right' | 'bottom' | 'left' = 'left';
                    
                    if (Math.abs(dx) > Math.abs(dy)) {
                      fromAnchor = dx > 0 ? 'right' : 'left';
                      toAnchor = dx > 0 ? 'left' : 'right';
                    } else {
                      fromAnchor = dy > 0 ? 'bottom' : 'top';
                      toAnchor = dy > 0 ? 'top' : 'bottom';
                    }
                    
                    // 使用连线指定的锚点（如果有）
                    if (connection.fromAnchor) fromAnchor = connection.fromAnchor;
                    if (connection.toAnchor) toAnchor = connection.toAnchor;
                    
                    const fromAnchorPos = getAnchorPosition(connection.from, fromAnchor);
                    const toAnchorPos = getAnchorPosition(connection.to, toAnchor);
                    
                    if (!fromAnchorPos || !toAnchorPos) return null;
                    
                    const path = generateSmoothPath(fromAnchorPos, toAnchorPos, fromAnchor, toAnchor);
                    const arrowPath = generateArrowPath(toAnchorPos, toAnchor);
                    
                    const connectionColor = connection.color || '#64748b';
                    
                    return (
                      <g key={uniqueKey}>
                        {/* 主连线 */}
                        <path
                          d={path}
                          stroke={connectionColor}
                          strokeWidth={2}
                          fill="none"
                          strokeDasharray={connection.style === 'dashed' ? '8,4' : 'none'}
                        />
                        
                        {/* 箭头 */}
                        <path
                          d={arrowPath}
                          fill={connectionColor}
                          stroke="none"
                        />
                        
                        {/* 连线标签 */}
                        {connection.label && (
                          <text
                            x={(fromAnchorPos.x + toAnchorPos.x) / 2}
                            y={(fromAnchorPos.y + toAnchorPos.y) / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={connectionColor}
                            fontSize="12"
                            fontWeight="500"
                            style={{
                              textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                            }}
                          >
                            {connection.label}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
              
              {/* 内部卡片 - 完全复用NodeCardContent */}
              {frameNodes.map((node) => {
                const relativePos = getRelativePosition(node);
                return renderCompleteCard(node, relativePos);
              })}
            </div>
          </div>

          {isGenerating && (
            <div style={{ 
              color: '#6b7280',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #e5e7eb',
                borderTop: '2px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              生成背景框图片中...
            </div>
          )}

          {error && (
            <div style={{ 
              color: '#dc2626',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              {error}
              <br />
              <button
                onClick={generateFrameImage}
                style={{
                  marginTop: '8px',
                  padding: '4px 12px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                重新生成
              </button>
            </div>
          )}

          {imageUrl && (
            <>
              <div>
                <img 
                  src={imageUrl} 
                  alt="背景框图片"
                  style={{
                    maxWidth: '400px',
                    maxHeight: '300px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={copyImageToClipboard}
                  style={{
                    padding: '10px 20px',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  📋 复制到剪贴板
                </button>
                
                <button
                  onClick={onClose}
                  style={{
                    padding: '10px 20px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  关闭
                </button>
              </div>
            </>
          )}
        </div>
        
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            @keyframes slideInUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            @keyframes slideOutDown {
              from {
                opacity: 1;
                transform: translateY(0);
              }
              to {
                opacity: 0;
                transform: translateY(20px);
              }
            }
          `
        }} />
      </div>
      
      {/* Toast 提示 */}
      {showToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 20000,
            animation: 'slideInUp 0.3s ease-out',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(8px)',
            maxWidth: '300px',
            textAlign: 'center',
            wordBreak: 'break-word',
          }}
          onClick={() => setShowToast(false)}
        >
          {toastMessage}
        </div>
      )}
    </div>,
    document.body
  );
};

export default BackgroundFrameImagePreview; 