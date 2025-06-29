import React, { useState, useRef, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import html2canvas from 'html2canvas';
import type { NodeData } from '../store/useBoardStore';
import NodeCardContent from './NodeCard/NodeCardContent';
import { ThemeContext } from '../App';
import { getCurrentCardBackground, getBorderRadius, getCircleCardStyles, getFrostedStyle, getCardBorderStyle } from '../utils/cardStyle';

interface CardImagePreviewProps {
  node: NodeData;
  onClose: () => void;
  position: { x: number; y: number };
}

const CardImagePreview: React.FC<CardImagePreviewProps> = ({
  node,
  onClose,
  position,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useContext(ThemeContext);

  // 复用主卡片的内容渲染逻辑
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

  useEffect(() => {
    generateCardImage();
    // eslint-disable-next-line
  }, [node, isDarkMode]);

  const generateCardImage = async () => {
    setIsGenerating(true);
    setError(null);
    setImageUrl(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (!cardRef.current) {
        throw new Error('卡片DOM元素未找到');
      }
      // 记录原始样式
      const cardEl = cardRef.current;
      const originalHeight = cardEl.style.height;
      const originalOverflow = cardEl.style.overflow;
      cardEl.style.height = 'auto';
      cardEl.style.overflow = 'visible';
      const canvas = await html2canvas(cardEl, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      } as any);
      cardEl.style.height = originalHeight;
      cardEl.style.overflow = originalOverflow;
      const url = canvas.toDataURL('image/png', 0.95);
      setImageUrl(url);
    } catch (error) {
      setError('生成图片失败，请重试');
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
      setToastMessage('图片已复制到剪贴板！');
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

  // 复用主卡片的样式
  const getCardStyle = () => {
    const currentBg = getCurrentCardBackground(node, isDarkMode);
    
    // 检查是否为白色或接近白色的背景
    const isWhiteBackground = () => {
      if (node.transparent) return false;
      
      const bgColor = currentBg.color.toLowerCase();
      
      // 添加详细的调试日志
      console.log('🎨 卡片颜色检测调试:', {
        nodeId: node.id,
        originalColor: currentBg.color,
        lowerCaseColor: bgColor,
        nodeTransparent: node.transparent,
        nodeShowBorder: node.showBorder,
        nodeBorderColor: node.borderColor,
        currentBg: currentBg
      });
      
      const isWhite = bgColor === '#ffffff' || 
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
      
      console.log('🎨 白色检测结果:', {
        isWhite: isWhite,
        needsBorder: isWhite && !node.showBorder
      });
      
      return isWhite;
    };
    
    // 如果是白色背景且没有设置边框，添加浅灰色边框
    const needsDefaultBorder = isWhiteBackground() && !node.showBorder;
    
    const finalStyle = {
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
      position: 'relative' as const,
      padding: 12,
      boxSizing: 'border-box' as const,
      ...getFrostedStyle(node, isDarkMode),
      ...getCircleCardStyles(node),
      // 先应用用户自定义边框样式
      ...getCardBorderStyle(node, isDarkMode),
      // 如果是白色背景且没有用户边框，最后应用默认边框（这样会覆盖上面的 border: 'none'）
      ...(needsDefaultBorder ? { border: '1px solid #e5e7eb' } : {}),
    };
    
    console.log('🎨 最终卡片样式:', {
      nodeId: node.id,
      needsDefaultBorder: needsDefaultBorder,
      finalBorder: finalStyle.border,
      finalStyle: finalStyle
    });
    
    return finalStyle;
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
          <h3 style={{ margin: 0, color: '#1f2937' }}>卡片图片预览</h3>
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
          {/* 隐藏的卡片用于生成图片 - 用户看不到 */}
          <div style={{ position: 'fixed', left: 0, top: 0, zIndex: -1, opacity: 0, pointerEvents: 'none' }}>
            <div
              ref={cardRef}
              style={getCardStyle()}
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
              生成图片中...
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
                onClick={generateCardImage}
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
                  alt="卡片图片"
                  style={{
                    maxWidth: '400px',
                    maxHeight: '300px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </div>
              <button
                onClick={copyImageToClipboard}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#10b981';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                📷 复制图片
              </button>
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

export default CardImagePreview; 