import React, { useState, useEffect, useRef, useCallback, useContext, useImperativeHandle, forwardRef } from 'react';
import type { NodeData, BackgroundFrame } from '../store/useBoardStore';
import { useBoardStore, defaultContent, LIGHT_CARD_COLORS, DARK_CARD_COLORS } from '../store/useBoardStore';
import RichTextEditor from './RichTextEditor';
import CardColorPicker from './CardColorPicker';
import CardImagePreview from './CardImagePreview';

import type { Descendant } from 'slate';
import type { Element as SlateElement } from 'slate';
import CodePreview from './CodePreview';
import CodeRenderer from './CodeRenderer';
import { detectCodeLanguage, extractCodeFromContent } from '../utils/codeDetector';
import { Transforms, Editor } from 'slate';
import { ReactEditor } from 'slate-react';
import { ThemeContext } from '../App';
import WebPageRenderer from './WebPageRenderer';
import { detectUrlInCard, extractTextFromSlateContent } from '../utils/urlDetector';
import NodeConnection from './NodeCard/NodeConnection';
import { useDebounce } from '../stores/performance';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import { useImagePaste } from '../hooks/useImagePaste';
import type { ImageBlock } from '../hooks/useImagePaste';

// 引入拆分后的子组件
import NodeCardEditor from './NodeCard/NodeCardEditor';
import NodeCardContent from './NodeCard/NodeCardContent';
import NodeCardActions from './NodeCard/NodeCardActions';
import NodeCardResizeHandles from './NodeCard/NodeCardResizeHandles';

// 简单的错误边界组件
class ErrorBoundary extends React.Component<{children: React.ReactNode, fallback: React.ReactNode}> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error) {
    console.error("编辑器错误:", error);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface Props {
  node: NodeData;
  readOnly?: boolean; // 新增只读模式
}

// 提取文本内容的辅助函数
const getTextContent = (descendants: any[]): string => {
  if (!descendants || !Array.isArray(descendants)) return '';
  
  return descendants.map(desc => {
    if (desc.children && Array.isArray(desc.children)) {
      return getTextContent(desc.children);
    }
    return desc.text || '';
  }).join('');
};

// 检查是否应移除内边距的工具函数
const shouldRemovePadding = (content: Descendant[]): boolean => {
  // 如果只有一个元素且是全尺寸图片或视频，不需要内边距
  if (content.length === 1) {
    const item = content[0] as any;
    return (item.type === 'image' && item.isFullSize === true) || item.type === 'video';
  }
  return false;
};

// 工具函数：将字符串转为Slate段落
const toSlateContent = (content: any): Descendant[] => {
  if (typeof content === 'string') {
    return [{
      type: 'paragraph',
      children: [{ text: content }]
    } as any];
  }
  if (Array.isArray(content) && content.length === 1 && typeof content[0] === 'string') {
    return [{
      type: 'paragraph',
      children: [{ text: content[0] }]
    } as any];
  }
  if (Array.isArray(content)) {
    return content;
  }
  return defaultContent;
};

const NodeCard = forwardRef<any, Props>(({ node, readOnly = false }, ref) => {
  // NodeCard 组件内部，获取 defaultCardConfig，放在所有钩子和函数之前
  const defaultCardConfig = useBoardStore((s) => s.defaultCardConfig);
  const updateNode = useBoardStore((s) => s.updateNode);
  const setNodeEditing = useBoardStore((s) => s.setNodeEditing);
  const selectNode = useBoardStore((s) => s.selectNode);
  const deleteNode = useBoardStore((s) => s.deleteNode);
  const scale = useBoardStore((s) => s.scale);
  const panX = useBoardStore((s) => s.panX);
  const panY = useBoardStore((s) => s.panY);
  
  // 添加卡片翻转相关状态和方法
  const flipCard = useBoardStore((s) => s.flipCard);
  
  // 添加连线相关的状态和方法
  const isConnecting = useBoardStore((s) => s.isConnecting);
  const connectingFrom = useBoardStore((s) => s.connectingFrom);
  const startConnecting = useBoardStore((s) => s.startConnecting);
  const finishConnecting = useBoardStore((s) => s.finishConnecting);
  const addConnection = useBoardStore((s) => s.addConnection);
  const updateTempConnection = useBoardStore((s) => s.updateTempConnection);
  
  // 新增：背景框相关状态
  const backgroundFrames = useBoardStore((s) => s.backgroundFrames);
  const addNodeToFrame = useBoardStore((s) => s.addNodeToFrame);
  const removeNodeFromFrame = useBoardStore((s) => s.removeNodeFromFrame);
  const setFrameHighlight = useBoardStore((s) => s.setFrameHighlight);
  const clearAllFrameHighlights = useBoardStore((s) => s.clearAllFrameHighlights);
  
  // 新增：标签相关状态
  const [localTags, setLocalTags] = useState<string[]>(node.tags || []);
  
  // 新增：标签变化处理函数
  const handleTagsChange = useCallback((tags: string[]) => {
    if (readOnly) return;
    setLocalTags(tags);
    updateNode(node.id, { tags });
  }, [node.id, updateNode, readOnly]);
  
  
  // 监听 node.tags 变化，同步到本地状态
  useEffect(() => {
    if (node.tags && JSON.stringify(node.tags) !== JSON.stringify(localTags)) {
      setLocalTags(node.tags);
    }
  }, [node.tags]);
  
  // 添加CSS动画样式
  React.useEffect(() => {
    if (!document.getElementById('nodecard-animations')) {
      const style = document.createElement('style');
      style.id = 'nodecard-animations';
      style.textContent = `
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(10px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        /* 添加卡片翻转动画 */
        .flip-card {
          perspective: 1000px;
          box-sizing: border-box;
          /* 确保边框位置清晰 */
          border: 1px solid transparent;
          /* 性能优化 */
          will-change: transform, left, top;
          transform: translateZ(0); /* 硬件加速 */
        }
        
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
          box-sizing: border-box;
          /* 移除 backface-visibility: hidden; */
          will-change: transform;
        }
        
        .flip-card.flipped .flip-card-inner {
          transform: rotateY(180deg);
        }
        
        .flip-card-front, .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          overflow: hidden;
          box-sizing: border-box;
          /* 性能优化 */
          transform: translateZ(0); /* 硬件加速 */
          will-change: transform, opacity;
        }
        
        .flip-card-back {
          transform: rotateY(180deg);
        }

        /* 锚点悬停动画 */
        .card-anchor {
          transition: transform 0.2s ease, background-color 0.2s ease, width 0.2s ease, height 0.2s ease; 
        }
        
        .card-anchor:hover {
          transform: scale(1.2);
        }

        /* 添加内容容器样式 - 跟随卡片高度，自动处理内容溢出 */
        .card-content-container {
          overflow-y: auto; /* 内容超出时自动显示滚动条 */
          overflow-x: hidden;
          box-sizing: border-box;
          width: 100%;
          height: 100%;
          /* 不设置max-height，让内容容器跟随卡片高度 */
          scrollbar-width: none; /* 默认隐藏Firefox滚动条 */
          line-height: 1.6; /* 确保行高足够 */
          word-wrap: break-word; /* 长单词换行 */
          overflow-wrap: break-word; /* 现代浏览器支持 */
        }

        /* 当内容超出时才启用滚动 */
        .card-content-container.content-scrollable {
          overflow-y: auto; /* 内容超出时启用滚动 */
        }
        


        /* 编辑器容器样式 - 编辑时限制最大高度，非编辑时跟随卡片高度 */
        .editor-container {
          overflow-y: auto;
          overflow-x: hidden;
          box-sizing: border-box;
          width: 100%;
          height: 100%;
          min-height: 100%;
          /* max-height通过内联样式动态设置 */
          display: flex;
          flex-direction: column;
          scrollbar-width: none; /* 默认隐藏Firefox滚动条 */
          line-height: 1.6; /* 确保行高足够 */
          word-wrap: break-word; /* 长单词换行 */
          overflow-wrap: break-word; /* 现代浏览器支持 */
        }
        
        /* 编辑状态下显示滚动条 */
        .flip-card-front:has(.editor-container:focus-within) .editor-container,
        .flip-card-back:has(.editor-container:focus-within) .editor-container,
        .editor-container:hover {
          scrollbar-width: thin; /* Firefox */
          scrollbar-color: rgba(0, 0, 0, 0.15) transparent; /* Firefox */
        }

        /* 确保所有文本元素都有合适的行高和间距 */
        .editor-container p,
        .editor-container div,
        .editor-container span,
        .card-content-container p,
        .card-content-container div,
        .card-content-container span {
          line-height: 1.6 !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }

        /* 段落间距 */
        .editor-container p {
          margin: 0.3em 0 !important;
        }

        /* 确保列表项也有合适的行高 */
        .editor-container ul li,
        .editor-container ol li,
        .card-content-container ul li,
        .card-content-container ol li {
          line-height: 1.6 !important;
          margin: 0.2em 0 !important;
        }

        /* 确保编辑器容器至少有足够的高度 */
        .editor-container .slate-editor {
          min-height: 100%;
        }
        /* 当内容可滚动并且卡片被选中或悬停时显示Firefox滚动条 */
        .card-content-container.content-scrollable:hover,
        .card-content-container.content-scrollable:focus,
        .flip-card.selected .card-content-container.content-scrollable {
          scrollbar-width: thin; /* Firefox */
          scrollbar-color: rgba(0, 0, 0, 0.15) transparent; /* Firefox */
        }

        /* 默认隐藏所有滚动条 */
        .card-content-container::-webkit-scrollbar,
        .editor-container::-webkit-scrollbar {
          width: 4px; /* 滚动条更细 */
          display: none; /* 默认隐藏滚动条 */
        }

        /* 只有可滚动的内容在卡片被选中或悬停时才显示滚动条 */
        .content-scrollable:hover::-webkit-scrollbar,
        .flip-card.selected .content-scrollable::-webkit-scrollbar,
        .editor-container:hover::-webkit-scrollbar,
        .editor-container:focus-within::-webkit-scrollbar {
          display: block; /* 显示滚动条 */
        }

        .card-content-container::-webkit-scrollbar-track,
        .editor-container::-webkit-scrollbar-track {
          background: transparent;
          margin: 4px 0; /* 上下留出空间 */
        }

        .card-content-container::-webkit-scrollbar-thumb,
        .editor-container::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15); /* 更淡的颜色 */
          border-radius: 4px; /* 圆角更大 */
        }

        .card-content-container::-webkit-scrollbar-thumb:hover,
        .editor-container::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.25); /* 悬停时稍微深一点 */
        }

        /* 编辑状态下的调整大小手柄样式 */
        .resize-handle-editing {
          background: rgba(59, 130, 246, 0.1) !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
          transition: all 0.2s ease !important;
        }
        
        .resize-handle-editing:hover {
          background: rgba(59, 130, 246, 0.2) !important;
          border: 1px solid rgba(59, 130, 246, 0.5) !important;
          transform: scale(1.1) !important;
        }
        
        /* 编辑状态下的角落手柄 */
        .resize-corner-editing {
          background: rgba(59, 130, 246, 0.8) !important;
          border: 1px solid #3B82F6 !important;
          border-radius: 3px !important;
        }
        
        .resize-corner-editing:hover {
          background: #3B82F6 !important;
          transform: scale(1.2) !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);
  
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(node.editing || false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [imagePreviewPosition, setImagePreviewPosition] = useState({ x: 0, y: 0 });

  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });
  
  // 确保 isEditing 状态与全局状态严格同步
  useEffect(() => {
    setIsEditing(node.editing || false);
  }, [node.editing]);
  
  // 新增本地内容状态
  const [localContent, setLocalContent] = useState<Descendant[]>(() => {
    if (node.isFlipped) {
      // 只用 backContent，绝不兜底 frontContent
      return toSlateContent(node.backContent);
    } else {
      // 只用 frontContent 或 content
      return toSlateContent(node.frontContent ?? node.content);
    }
  });
  
  // 网页渲染相关状态
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [isWebPageMode, setIsWebPageMode] = useState(false);
  const [codeInfo, setCodeInfo] = useState<{ code: string, language: string } | null>(null);
  
  // 优先判断代码块，如果不是代码再判断url
  useEffect(() => {
    let code = null;
    if (node.isFlipped) {
      code = extractCodeFromContent(
        node.backContent && Array.isArray(node.backContent) && node.backContent.length > 0
          ? node.backContent
          : defaultContent
      );
      if (!code) {
        code = extractCodeFromContent(
          node.frontContent && Array.isArray(node.frontContent) && node.frontContent.length > 0
            ? node.frontContent
            : (node.content && Array.isArray(node.content) && node.content.length > 0
                ? node.content
                : defaultContent)
        );
      }
    } else {
      code = extractCodeFromContent(
        node.frontContent && Array.isArray(node.frontContent) && node.frontContent.length > 0
          ? node.frontContent
          : (node.content && Array.isArray(node.content) && node.content.length > 0
              ? node.content
              : defaultContent)
      );
      if (!code) {
        code = extractCodeFromContent(
          node.backContent && Array.isArray(node.backContent) && node.backContent.length > 0
            ? node.backContent
            : defaultContent
        );
      }
    }
    setCodeInfo(code);
    if (code) {
      setDetectedUrl(null);
      setIsWebPageMode(false);
      return;
    }
    // 不是代码时再检测url
    let url: string | null = null;
    if (node.isFlipped) {
      url = detectUrlInCard(
        node.backContent && Array.isArray(node.backContent) && node.backContent.length > 0
          ? node.backContent
          : defaultContent
      );
      if (!url) {
        url = detectUrlInCard(
          node.frontContent && Array.isArray(node.frontContent) && node.frontContent.length > 0
            ? node.frontContent
            : (node.content && Array.isArray(node.content) && node.content.length > 0
                ? node.content
                : defaultContent)
        );
      }
    } else {
      url = detectUrlInCard(
        node.frontContent && Array.isArray(node.frontContent) && node.frontContent.length > 0
          ? node.frontContent
          : (node.content && Array.isArray(node.content) && node.content.length > 0
              ? node.content
              : defaultContent)
      );
      if (!url) {
        url = detectUrlInCard(
          node.backContent && Array.isArray(node.backContent) && node.backContent.length > 0
            ? node.backContent
            : defaultContent
        );
      }
    }
    setDetectedUrl(url);
    setIsWebPageMode(Boolean(url));
  }, [node.isFlipped, node.backContent, node.frontContent, node.content]);
  
  // 使用ref保存最新的编辑器内容
  const currentContentRef = useRef<Descendant[]>(localContent);
  // 使用ref来跟踪卡片元素，用于获取实时高度
  const cardRef = useRef<HTMLDivElement>(null);
  // 添加Slate编辑器的ref
  const slateEditorRef = useRef<any>(null); // Slate编辑器实例
  
  // 更新ref中的内容
  useEffect(() => {
    currentContentRef.current = localContent;
  }, [localContent]);

  // 监听编辑状态变化，确保内容不丢失
  const [prevEditing, setPrevEditing] = useState(node.editing);
  
  // 代码检测状态
  // const [isCodeMode, setIsCodeMode] = useState(false);
  // const [codeContent, setCodeContent] = useState('');
  // const [codeLanguage, setCodeLanguage] = useState('javascript');
  
  useEffect(() => {
    // 检测从编辑状态变为非编辑状态
    if (prevEditing && !node.editing) {
      // 立即保存当前编辑器内容
      const contentToSave = currentContentRef.current;
      if (contentToSave && Array.isArray(contentToSave) && contentToSave.length > 0) {
        // 检查是否有图片且为isFullSize模式
        const hasFullSizeImage = contentToSave.some((item: any) => 
          item.type === 'image' && item.isFullSize === true
        );
        
        // 检查是否有文本内容
        const hasTextContent = contentToSave.some((item: any) => {
          if (item.type === 'paragraph' && item.children && Array.isArray(item.children)) {
            return item.children.some((child: any) => child.text && child.text.trim() !== '');
          }
          return false;
        });
        
        // 针对仅有全尺寸图片的情况特殊处理
        if (hasFullSizeImage && !hasTextContent && contentToSave.length === 1) {
          // 确保卡片无内边距
          if (node.isFlipped) {
            console.log('保存卡片背面内容（全尺寸图片）', contentToSave);
            updateNode(node.id, { 
              backContent: contentToSave,
              // 确保内容也同时更新到全局content中，避免正面内容丢失
              content: node.frontContent || contentToSave
            });
          } else {
            updateNode(node.id, { 
              frontContent: contentToSave,
              content: contentToSave
            });
          }
        } else {
          // 常规情况处理
          const hasContent = contentToSave.some((item: any) => 
            item.children && Array.isArray(item.children) && 
            item.children.some((child: any) => child.text && child.text.trim() !== '')
          );
          
          if (hasContent || JSON.stringify(contentToSave) !== JSON.stringify(defaultContent)) {
            // 根据当前卡片面更新相应的内容
            if (node.isFlipped) {
              console.log('保存卡片背面内容', contentToSave);
              // 同时更新backContent和全局content，确保内容不丢失
              updateNode(node.id, { 
                backContent: contentToSave,
                // 确保内容也同时更新到全局content中，避免正面内容丢失 
                content: node.frontContent || contentToSave
              });
            } else {
              updateNode(node.id, { 
                frontContent: contentToSave,
                content: contentToSave // 同时更新content以保持向后兼容
              });
            }
          }
        }
      }
    }
    
    // 进入编辑状态时确保isCodeMode为false
    // if (!prevEditing && node.editing) {
    //   setIsCodeMode(false);
    // }
    
    setPrevEditing(node.editing);
  }, [node.editing, prevEditing, updateNode, node.id, node.isFlipped, node.frontContent]);

  // 全局点击监听，当点击卡片外部时退出编辑状态和关闭菜单
  useEffect(() => {
    if (!node.editing && !showActionMenu) return;

    const handleGlobalClick = (e: MouseEvent) => {
      // 新增：如果点击在悬浮工具栏内，直接返回，不退出编辑态
      const target = e.target as HTMLElement;
      if (target.closest && target.closest('.hovering-toolbar')) {
        return;
      }
      // 如果点击的是当前卡片内部，不做任何处理
      const cardElement = e.target as Element;
      let isClickInside = false;
      
      // 检查点击是否在当前卡片内
      let current = cardElement;
      while (current && current !== document.body) {
        if (current.closest && current.closest(`[data-node-id="${node.id}"]`)) {
          isClickInside = true;
          break;
        }
        current = current.parentElement as Element;
      }
      
      // 如果点击在卡片外部
      if (!isClickInside) {
        // 关闭动作菜单
        if (showActionMenu) {
          setShowActionMenu(false);
        }
        
        // 如果在编辑状态，退出编辑
        if (node.editing) {
          // 保存当前编辑内容和调整高度
          const validContent = (currentContentRef.current && Array.isArray(currentContentRef.current) && currentContentRef.current.length > 0) ? 
            currentContentRef.current : 
            defaultContent;
          
          // 在退出编辑前，检查内容是否需要更大的高度
          if (cardRef.current) {
            const contentHeight = getContentHeight();
            const currentHeight = node.height || 80;
            
            // 如果内容高度大于当前高度，则扩展卡片高度
            // 但如果用户没有手动调整过尺寸，限制最大高度为550px
            const newHeight = node.userResized 
              ? Math.max(currentHeight, contentHeight)
              : Math.min(MAX_CARD_HEIGHT, Math.max(currentHeight, contentHeight));
            
            // 根据当前是否为翻转状态，保存对应内容
            if (node.isFlipped) {
              console.log('点击外部保存背面内容', validContent);
              // 同时保存内容和高度
              updateNode(node.id, { 
                backContent: validContent,
                // 确保内容也同时更新到全局content中，避免正面内容丢失
                content: node.frontContent || validContent,
                ...((!!node.userResized) ? {} : { height: newHeight })
              });
            } else {
              // 同时保存内容和高度
              updateNode(node.id, { 
                frontContent: validContent,
                content: validContent,
                ...((!!node.userResized) ? {} : { height: newHeight })
              });
            }
          } else {
            // 如果没有cardRef，至少保存内容
            if (node.isFlipped) {
              console.log('点击外部保存背面内容（无高度调整）', validContent);
              updateNode(node.id, { 
                backContent: validContent,
                // 确保内容也同时更新到全局content中，避免正面内容丢失
                content: node.frontContent || validContent
              });
            } else {
              updateNode(node.id, { 
                frontContent: validContent,
                content: validContent
              });
            }
          }
          
          // 延迟一帧再退出编辑状态，确保内容和高度已经保存
          setTimeout(() => {
            setNodeEditing(node.id, false);
          }, 0);
        }
      }
    };

    // 添加全局点击监听
    document.addEventListener('mousedown', handleGlobalClick, true);
    
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick, true);
    };
  }, [node.editing, showActionMenu, node.id, setNodeEditing, node.isFlipped, node.frontContent, node.height, updateNode]);

  const { isDarkMode } = useContext(ThemeContext);
  const colorList = isDarkMode ? DARK_CARD_COLORS : LIGHT_CARD_COLORS;
  // 获取当前背景色配置
  const getCurrentCardBackground = () => {
    let colorValue;
    
    // 首先检查是否有设置面板配置的默认背景色（直接颜色值）
    if (isDarkMode && node.darkBackgroundColor && node.darkBackgroundColor.startsWith('rgba')) {
      colorValue = node.darkBackgroundColor;
    } else if (!isDarkMode && node.lightBackgroundColor && node.lightBackgroundColor.startsWith('rgba')) {
      colorValue = node.lightBackgroundColor;
    } else {
      // 如果没有直接颜色值，则查找色板ID
      let colorId = isDarkMode ? node.darkBackgroundColor : node.lightBackgroundColor;
      // 兼容老数据
      if (!colorId) colorId = node.backgroundColor;
      // 在色板中查找对应颜色
      const foundColor = colorList.find(c => c.id === colorId);
      if (foundColor) {
        return foundColor;
      } else {
        // 找不到则用第0个
        return colorList[0];
      }
    }
    
    // 如果是直接颜色值，创建一个临时的背景色对象
    return {
      id: 'custom',
      name: '自定义',
      color: colorValue,
      borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      textColor: isDarkMode ? '#e2e8f0' : '#222'
    };
  };
  const currentBg = getCurrentCardBackground();

  // 根据卡片形状获取圆角大小
  const getBorderRadius = () => {
    if (node.shape === 'circle') {
      // 圆形：使用50%创建完美圆形
      return '50%';
    } else if (node.shape === 'table') {
      // 表格：使用较小的圆角
      return 4;
    } else {
      // 方形（默认）：使用标准圆角
      return 8;
    }
  };

  // 获取圆形卡片的特殊样式
  const getCircleCardStyles = () => {
    if (node.shape === 'circle') {
      const size = Math.min(node.width || 200, node.height || 200);
      return {
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center' as const,
      };
    }
    return {};
  };

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    
    if (node.editing) return;

    // 关闭操作菜单（如果打开的话）
    setShowActionMenu(false);
    
    // 设置颜色选择器位置 - 直接在点击位置
    
    // 使用 setTimeout 确保在下一个事件循环中设置位置
    setTimeout(() => {
      setColorPickerPosition({ x: e.clientX, y: e.clientY });
      setShowColorPicker(true);
    }, 0);
  };

  // 颜色变化处理
  const handleColorChange = (colorId: string) => {
    if (readOnly) return;
    if (isDarkMode) {
      updateNode(node.id, { darkBackgroundColor: colorId });
    } else {
      updateNode(node.id, { lightBackgroundColor: colorId });
    }
  };

  const handleConfirmDelete = () => {
    deleteNode(node.id);
  };

  // 点击处理 - 确保单击能选中
  const handleClick = (e: React.MouseEvent) => {
    if (readOnly) {
      // 只读模式下允许选中卡片（高亮/聚焦），但不进入编辑
      selectNode(node.id, false);
      return;
    }
    if (node.editing || showColorPicker) return;
    
    e.stopPropagation(); // 阻止事件冒泡到BoardCanvas
    
    // 如果当前在连线模式，处理连线逻辑
    if (isConnecting) {
      if (connectingFrom === node.id) {
        // 点击了同一个节点，取消连线
        finishConnecting();
        return;
      } else if (connectingFrom) {
        // 完成连线到目标节点
        addConnection(connectingFrom, node.id);
        finishConnecting();
        return;
      }
    }
    
    // 检查是否有其他正在编辑的节点，如果有则先保存并退出编辑状态
    const allNodes = useBoardStore.getState().nodes;
    const editingNode = allNodes.find(n => n.editing && n.id !== node.id);
    if (editingNode) {
      const { setNodeEditing } = useBoardStore.getState();
      setNodeEditing(editingNode.id, false);
    }
    
    // 处理选中状态
    const isMultiSelect = e.metaKey || e.ctrlKey;
    selectNode(node.id, isMultiSelect);
  };

  // 连线按钮点击处理 - 暂时未使用
  /*
  const handleConnectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 如果当前正在编辑，先保存编辑内容
    if (node.editing) {
      const validContent = (currentContentRef.current && Array.isArray(currentContentRef.current) && currentContentRef.current.length > 0) ? currentContentRef.current : defaultContent;
      updateNode(node.id, { frontContent: validContent, backContent: validContent });
      setNodeEditing(node.id, false);
    }
    
    // 开始连线
    startConnecting(node.id);
    setShowActionMenu(false);
  };
  */

  // 锚点拖拽开始


  // 拖拽逻辑
  const onMouseDown = (e: React.MouseEvent, dragCallbacks?: { onDragStart?: () => void, onDragEnd?: () => void }) => {
    if (readOnly) return;
    if (node.editing || showColorPicker) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    let hasDragged = false;
    let lastX = startX;
    let lastY = startY;
    let bestFitFrameId: string | null = null;
    
    // 缓存状态，避免频繁调用getState()
    let cachedNodes: any[] = [];
    let cachedSelectedNodes: string[] = [];
    let needsUpdate = false;
    let animationFrameId: number | null = null;
    
    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - lastX;
      const deltaY = e.clientY - lastY;
      
      // 小的移动量直接忽略，减少不必要的更新
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
      
      // 如果移动距离超过阈值，开始拖拽
      if (!hasDragged && (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5)) {
        hasDragged = true;
        setDragging(true);
        
        // 开始拖拽时，检查是否有其他正在编辑的节点
        const allNodes = useBoardStore.getState().nodes;
        const editingNode = allNodes.find(n => n.editing && n.id !== node.id);
        if (editingNode) {
          const { setNodeEditing } = useBoardStore.getState();
          setNodeEditing(editingNode.id, false);
        }
        
        // 如果当前卡片未选中，或者是多选模式，处理选中状态
        const isMultiSelect = e.metaKey || e.ctrlKey;
        if (!node.selected || isMultiSelect) {
          selectNode(node.id, isMultiSelect);
        }
        
        // 缓存初始状态
        const state = useBoardStore.getState();
        cachedNodes = state.nodes;
        cachedSelectedNodes = state.selectedNodes;
      }
      
      if (!hasDragged) return;
      
      // 使用requestAnimationFrame优化渲染性能
      if (!needsUpdate) {
        needsUpdate = true;
        
        // 取消之前的动画帧请求
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        
        animationFrameId = requestAnimationFrame(() => {
          // 批量更新所有选中的节点
          const updates: Array<{id: string, changes: any}> = [];
          
          cachedSelectedNodes.forEach(nodeId => {
            const targetNode = cachedNodes.find(n => n.id === nodeId);
            if (!targetNode) return;
            
            if (targetNode.pinned) {
              // 固定卡片直接使用屏幕坐标移动
              const currentPinnedX = targetNode.pinnedX || 100;
              const currentPinnedY = targetNode.pinnedY || 100;
              updates.push({
                id: nodeId,
                changes: {
                  pinnedX: currentPinnedX + deltaX,
                  pinnedY: currentPinnedY + deltaY,
                }
              });
            } else {
              // 普通卡片需要考虑缩放因子
              const currentX = targetNode.x;
              const currentY = targetNode.y;
              updates.push({
                id: nodeId,
                changes: {
                  x: currentX + deltaX / scale,
                  y: currentY + deltaY / scale,
                }
              });
            }
          });
          
          // 批量应用更新
          updates.forEach(update => {
            updateNode(update.id, update.changes);
            // 更新缓存的节点数据
            const nodeIndex = cachedNodes.findIndex(n => n.id === update.id);
            if (nodeIndex !== -1) {
              cachedNodes[nodeIndex] = { ...cachedNodes[nodeIndex], ...update.changes };
            }
          });
          
          needsUpdate = false;
          animationFrameId = null;

          // --- 实时检测背景框交互 ---
          const { backgroundFrames } = useBoardStore.getState();
          clearAllFrameHighlights(); // 清除上一帧的高亮
          bestFitFrameId = null; // 重置最佳匹配

          const cardRect = {
            x: cachedNodes.find(n => n.id === node.id)?.x || node.x,
            y: cachedNodes.find(n => n.id === node.id)?.y || node.y,
            width: node.width || 250,
            height: node.height || 150,
          };

          let bestOverlap = 0;

          for (const frame of backgroundFrames) {
            // 新增：跳过已收起的背景框
            if (frame.collapsed) continue;
            
            const frameRect = {
              x: frame.x,
              y: frame.y,
              width: frame.width,
              height: frame.height,
            };

            const overlapX = Math.max(0, Math.min(cardRect.x + cardRect.width, frameRect.x + frameRect.width) - Math.max(cardRect.x, frameRect.x));
            const overlapY = Math.max(0, Math.min(cardRect.y + cardRect.height, frameRect.y + frameRect.height) - Math.max(cardRect.y, frameRect.y));
            const overlapArea = overlapX * overlapY;

            if (
              cardRect.x >= frameRect.x &&
              cardRect.y >= frameRect.y &&
              cardRect.x + cardRect.width <= frameRect.x + frameRect.width &&
              cardRect.y + cardRect.height <= frameRect.y + frameRect.height
            ) {
              setFrameHighlight(frame.id, 'rgba(0, 255, 0, 0.2)'); // 绿色高亮
              bestFitFrameId = frame.id;
              bestOverlap = Infinity; // 完全包含，最高优先级
              break; 
            }

            if (overlapArea > bestOverlap) {
              bestOverlap = overlapArea;
              bestFitFrameId = frame.id;
            }
          }

          if (bestOverlap > 0 && bestOverlap !== Infinity) {
            setFrameHighlight(bestFitFrameId!, 'rgba(255, 165, 0, 0.2)'); // 橙色提示
          }
          // --- 结束检测 ---
        });
      }
      
      // 更新上次的鼠标位置
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMouseUp = (e: MouseEvent) => {
      // 清理动画帧
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      
      // 如果没有拖拽，触发点击选中逻辑
      if (!hasDragged) {
        // 检查是否有其他正在编辑的节点
        const allNodes = useBoardStore.getState().nodes;
        const editingNode = allNodes.find(n => n.editing && n.id !== node.id);
        if (editingNode) {
          const { setNodeEditing } = useBoardStore.getState();
          setNodeEditing(editingNode.id, false);
        }
        
        // 处理选中状态
        const isMultiSelect = (e as any).metaKey || (e as any).ctrlKey;
        selectNode(node.id, isMultiSelect);
      } else {
        // 如果有拖拽，根据 bestFitFrameId 处理背景框关联
        if (bestFitFrameId) {
          // 检查是否需要更新关联
          if (node.containerId !== bestFitFrameId) {
            console.log(`✅ 卡片 ${node.id} 已添加到背景框 ${bestFitFrameId}`);
            addNodeToFrame(node.id, bestFitFrameId);
          }
        } else if (node.containerId) {
          // 从当前背景框中移除
          console.log(`✅ 卡片 ${node.id} 已从背景框 ${node.containerId} 中移除`);
          removeNodeFromFrame(node.id);
        }
      }

      // 拖拽结束，清理所有高亮
      clearAllFrameHighlights();
      
      setDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // 编辑态切换时同步内容
  useEffect(() => {
    // 同步编辑器内容 - 只在进入编辑模式时更新，避免编辑过程中被重置
    if (node.editing) {
      console.log('进入编辑模式，加载内容', node.isFlipped ? '背面' : '正面');
      // 根据当前是正面还是背面，加载对应的内容
      if (node.isFlipped) {
        // 确保加载背面内容
        const backContentToLoad = (node.backContent && Array.isArray(node.backContent) && node.backContent.length > 0)
          ? node.backContent
          : defaultContent;
        
        // 更新到ref和state
        currentContentRef.current = backContentToLoad;
        console.log('更新背面编辑器内容', backContentToLoad);
      } else {
        // 加载正面内容
        const frontContentToLoad = (node.frontContent && Array.isArray(node.frontContent) && node.frontContent.length > 0)
          ? node.frontContent
          : (node.content && Array.isArray(node.content) && node.content.length > 0)
            ? node.content
            : defaultContent;
        
        // 更新到ref和state
        currentContentRef.current = frontContentToLoad;
        console.log('更新正面编辑器内容', frontContentToLoad);
      }
    }
  }, [node.editing, node.isFlipped, node.frontContent, node.backContent, node.content]); // 添加isFlipped依赖，确保翻转时能够更新内容

  // 双击进入编辑态
  const [pendingFocusPos, setPendingFocusPos] = useState<{x: number, y: number} | null>(null);
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    setShowColorPicker(false);
    // 检查是否有其他正在编辑的节点，如果有则先保存并退出编辑状态
    const allNodes = useBoardStore.getState().nodes;
    const editingNode = allNodes.find(n => n.editing && n.id !== node.id);
    if (editingNode) {
      const { setNodeEditing } = useBoardStore.getState();
      setNodeEditing(editingNode.id, false);
    }
    // 记录鼠标坐标
    setPendingFocusPos({ x: e.clientX, y: e.clientY });
    // 立即更新本地状态，抢在渲染前
    setIsEditing(true);
    setNodeEditing(node.id, true);
  };

  // 计算文本内容实际需要的高度
  const calculateContentHeight = (content: Descendant[]): number => {
    const textContent = getTextContent(content);
    
    // 如果没有文本内容，返回默认最小高度
    if (!textContent || textContent.trim() === '') {
      return 80; // 默认最小高度
    }
    
    // 基础参数
    const fontSize = 16;
    const lineHeight = 1.6; // 行高系数
    const actualLineHeight = fontSize * lineHeight; // 实际行高：25.6px
    const padding = shouldRemovePadding(content) ? 0 : 24; // 上下内边距总和
    const cardWidth = node.width || 200;
    const effectiveWidth = cardWidth - padding - 16; // 减去滚动条和额外边距
    
    // 更精确的字符宽度估算
    const avgCharWidth = fontSize * 0.65; // 调整字符宽度系数
    const charsPerLine = Math.max(1, Math.floor(effectiveWidth / avgCharWidth));
    
    // 计算段落数量和总行数
    let totalLines = 0;
    let paragraphCount = 0;
    
    content.forEach((node) => {
      // 类型检查：确保node是Element类型
      if ('type' in node && typeof node.type === 'string') {
        paragraphCount++;
        
        if (node.type === 'paragraph') {
          const paragraphText = getTextContent([node]);
          if (!paragraphText.trim()) {
            totalLines += 1; // 空段落占一行
          } else {
            // 考虑自动换行
            const lines = Math.ceil(paragraphText.length / charsPerLine);
            totalLines += Math.max(1, lines);
          }
        } else if (node.type === 'list-item') {
          const itemText = getTextContent([node]);
          const lines = Math.ceil(itemText.length / charsPerLine);
          totalLines += Math.max(1, lines);
        } else {
          totalLines += 1; // 其他类型默认占一行
        }
      } else {
        // Text节点
        totalLines += 1;
      }
    });
    
    // 添加段落间距（除了第一个段落）
    const paragraphSpacing = Math.max(0, paragraphCount - 1) * 0.3 * actualLineHeight;
    
    // 计算总高度
    const contentHeight = totalLines * actualLineHeight + paragraphSpacing;
    const totalHeight = Math.ceil(contentHeight + padding);
    
    // 确保不小于最小高度，不超过最大高度
    const MAX_CARD_HEIGHT = 550;
    const minHeight = 80;
    
    return Math.min(MAX_CARD_HEIGHT, Math.max(minHeight, totalHeight));
  };

  // 保存内容并退出编辑态
  const finishEdit = () => {
    if (node.isFlipped) {
      if (backEditMode === 'markdown') {
        updateNode(node.id, {
          backMarkdownContent: localBackMarkdown,
          backEditMode: 'markdown',
        });
      } else {
        updateNode(node.id, {
          backContent: localContent,
          backEditMode: 'rich',
        });
      }
    } else {
      if (node.editMode === 'markdown') {
        updateNode(node.id, {
          markdownContent: localMarkdown,
          editMode: 'markdown',
        });
      } else {
        updateNode(node.id, {
          content: localContent,
          editMode: 'rich',
        });
      }
    }
    setNodeEditing(node.id, false);
  };

  // 智能高度调整：尊重用户手动调整的偏好
  // const autoAdjustHeight = useCallback((value: Descendant[]) => {
  //   if (node.userResized) {
  //     return;
  //   }
  //   const contentHeight = calculateContentHeight(value);
  //   const currentHeight = node.height || (defaultCardConfig.height || 80);
  //   if (contentHeight > currentHeight) {
  //     const newHeight = Math.min(contentHeight + 20, 550);
  //     if (node.isFlipped) {
  //       updateNode(node.id, { height: newHeight });
  //     } else {
  //       updateNode(node.id, { height: newHeight });
  //     }
  //   }
  // }, [node.id, node.isFlipped, node.height, node.userResized, updateNode, defaultCardConfig.height]);



  // 处理编辑器内容变化
  const handleEditorChange = (value: Descendant[]) => {
    if (readOnly) return;
    setLocalContent(value);
    // 只更新当前面的内容
    if (node.isFlipped) {
      updateNode(node.id, { backContent: value });
    } else {
      updateNode(node.id, { frontContent: value, content: value });
    }
    // 自动调整高度（仅在编辑模式下）
    if (node.editing) {
      // autoAdjustHeight(value);
    }
  };

  // 计算文本内容的最小高度
  const getMinHeight = () => {
    const textContent = getTextContent(localContent);
    
    // 如果没有文本内容，返回一个很小的最小高度
    if (!textContent || textContent.trim() === '') {
      return 24; // 空内容时的最小高度，进一步降低
    }
    
    // 基于字体大小计算最小高度：16px字体 + 减少内边距
    const lineHeight = 18; // 稍微减少行高
    const padding = 16; // 减少上下内边距到8px each
    
    return lineHeight + padding;
  };

  // 简化的内容高度计算（仅用于调整尺寸时的最小高度）
  const getContentHeight = () => {
    // 简化逻辑：只返回基本的最小高度，不进行复杂计算
    return getMinHeight();
  };

  // 调整尺寸逻辑
  const handleResizeMouseDown = (e: React.MouseEvent, direction: 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se') => {
    if (readOnly) return;
    e.stopPropagation();
    e.preventDefault();
    if (showColorPicker) return; // 已移除 showDeleteModal
    setResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = node.width || 200;
    const startHeight = node.height || (defaultCardConfig.height || 80);
    const startNodeX = node.x;
    const startNodeY = node.y;
    const startPinnedX = node.pinnedX || 100;
    const startPinnedY = node.pinnedY || 100;
    
    const onMouseMove = (e: MouseEvent) => {
      // 对于固定卡片，不需要考虑缩放因子，因为它们使用屏幕坐标
      const deltaX = node.pinned ? (e.clientX - startX) : (e.clientX - startX) / scale;
      const deltaY = node.pinned ? (e.clientY - startY) : (e.clientY - startY) / scale;
      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startNodeX;
      let newY = startNodeY;
      let newPinnedX = startPinnedX;
      let newPinnedY = startPinnedY;
      
      const minWidth = 120;
      const minHeight = getMinHeight();
      
      // 根据方向调整宽度、高度和位置
      switch (direction) {
        case 'nw': // 左上角
          newWidth = Math.max(minWidth, startWidth - deltaX);
          newHeight = Math.max(minHeight, startHeight - deltaY);
          // 圆形卡片保持1:1比例
          if (node.shape === 'circle') {
            const size = Math.max(newWidth, newHeight);
            newWidth = size;
            newHeight = size;
          }
          if (node.pinned) {
            newPinnedX = startPinnedX + (startWidth - newWidth);
            newPinnedY = startPinnedY + (startHeight - newHeight);
          } else {
            newX = startNodeX + (startWidth - newWidth);
            newY = startNodeY + (startHeight - newHeight);
          }
          break;
        case 'n': // 上边
          newHeight = Math.max(minHeight, startHeight - deltaY);
          // 圆形卡片：上边拖拽时同步调整宽度
          if (node.shape === 'circle') {
            newWidth = newHeight;
            if (node.pinned) {
              newPinnedX = startPinnedX + (startWidth - newWidth) / 2;
            } else {
              newX = startNodeX + (startWidth - newWidth) / 2;
            }
          }
          if (node.pinned) {
            newPinnedY = startPinnedY + (startHeight - newHeight);
          } else {
            newY = startNodeY + (startHeight - newHeight);
          }
          break;
        case 'ne': // 右上角
          newWidth = Math.max(minWidth, startWidth + deltaX);
          newHeight = Math.max(minHeight, startHeight - deltaY);
          // 圆形卡片保持1:1比例
          if (node.shape === 'circle') {
            const size = Math.max(newWidth, newHeight);
            newWidth = size;
            newHeight = size;
          }
          if (node.pinned) {
            newPinnedY = startPinnedY + (startHeight - newHeight);
          } else {
            newY = startNodeY + (startHeight - newHeight);
          }
          break;
        case 'w': // 左边
          newWidth = Math.max(minWidth, startWidth - deltaX);
          // 圆形卡片：左边拖拽时同步调整高度
          if (node.shape === 'circle') {
            newHeight = newWidth;
            if (node.pinned) {
              newPinnedY = startPinnedY + (startHeight - newHeight) / 2;
            } else {
              newY = startNodeY + (startHeight - newHeight) / 2;
            }
          }
          if (node.pinned) {
            newPinnedX = startPinnedX + (startWidth - newWidth);
          } else {
            newX = startNodeX + (startWidth - newWidth);
          }
          break;
        case 'e': // 右边
          newWidth = Math.max(minWidth, startWidth + deltaX);
          break;
        case 'sw': // 左下角
          newWidth = Math.max(minWidth, startWidth - deltaX);
          newHeight = Math.max(minHeight, startHeight + deltaY);
          if (node.pinned) {
            newPinnedX = startPinnedX + (startWidth - newWidth);
          } else {
            newX = startNodeX + (startWidth - newWidth);
          }
          break;
        case 's': // 下边
          newHeight = Math.max(minHeight, startHeight + deltaY);
          break;
        case 'se': // 右下角
          newWidth = Math.max(minWidth, startWidth + deltaX);
          newHeight = Math.max(minHeight, startHeight + deltaY);
          break;
      }
      
      // 根据卡片是否固定，更新不同的坐标
      if (node.pinned) {
        updateNode(node.id, {
          pinnedX: newPinnedX,
          pinnedY: newPinnedY,
          width: newWidth,
          height: newHeight,
          userResized: true,
        });
      } else {
        updateNode(node.id, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          userResized: true,
        });
      }
    };
    
    const onMouseUp = () => {
      setResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // 计算卡片的实际位置
  const getCardPosition = () => {
    if (node.pinned) {
      // 如果卡片被固定，使用固定的屏幕坐标
      return {
        x: node.pinnedX || 100,
        y: node.pinnedY || 100,
        transform: 'none', // 不受缩放影响
        zIndex: 1000 // 确保固定卡片在最上层
      };
    } else {
      // 正常卡片跟随画布变换
      return {
        x: node.x,
        y: node.y,
        transform: undefined,
        zIndex: node.selected ? 20 : 10
      };
    }
  };

  const cardPosition = getCardPosition();

  // 处理翻转卡片
  const handleFlipCard = (e: React.MouseEvent) => {
    // 只读模式下允许翻转
    e.stopPropagation();
    if (node.editing) {
      // ...原有逻辑...
      return;
    }
    flipCard(node.id);
  };

  // 处理图片粘贴和代码检测
  const handlePaste = useCallback((e: React.ClipboardEvent | any) => {
    if (readOnly) return; // 只在编辑模式下处理粘贴

    // 检测粘贴的内容是否为代码
    const pastedText = e.clipboardData.getData('text/plain');
    if (pastedText) {
      console.log('📋 NodeCard: 检测到粘贴文本，长度:', pastedText.length);
      
      // 🔥 关键优化：跳过长URL的代码检测
      const trimmedText = pastedText.trim();
      if (trimmedText.length > 1000) {
        const hasSpacesOrNewlines = /[\s\n\r]/.test(trimmedText);
        const looksLikeUrl = /^https?:\/\/[^\s]+$/i.test(trimmedText.substring(0, 100));
        
        if (!hasSpacesOrNewlines && looksLikeUrl) {
          console.log('🚀 NodeCard: 检测到长URL，跳过代码检测');
          return; // 跳过代码检测，使用默认粘贴行为
        }
      }

      const minCodeLength = 15; // 最小代码长度，避免误判
      
      // 如果文本长度小于最小代码长度，不判断为代码
      if (pastedText.length < minCodeLength) {
        return;
      }

      // 🔥 对超长文本进行限制，避免正则表达式卡死
      const maxTestLength = 5000; // 最大检测长度
      const testText = pastedText.length > maxTestLength 
        ? pastedText.substring(0, maxTestLength) 
        : pastedText;

      // 代码检测正则表达式
      const codePatterns = [
        /function\s+\w+\s*\(/,              // 函数定义
        /class\s+\w+\s*\{/,                 // 类定义
        /const\s+\w+\s*=/,                  // const声明
        /let\s+\w+\s*=/,                    // let声明
        /var\s+\w+\s*=/,                    // var声明
        /<\s*(!doctype|html|head|body|div)/i, // HTML标签
        /import\s+.*?from/,                 // import语句
        /export\s+(default\s+)?(function|class|const|let|var)/,  // export语句
        /{\s*['"]?\w+['"]?\s*:/,            // JSON或对象字面量
        /\[\s*[\d"'{\[]/, // 数组
        /@media\s+/,                        // CSS媒体查询
        /#\w+\s*{/,                         // CSS ID选择器
        /\.\w+\s*{/,                        // CSS类选择器
        /=>\s*{/,                           // 箭头函数
        /async\s+function/,                 // async函数
        /await\s+\w+/,                      // await表达式
        /try\s*{/,                          // try-catch块
        /catch\s*\(/,                       // catch块
        /for\s*\(/,                         // for循环
        /while\s*\(/,                       // while循环
        /if\s*\(/,                          // if条件
        /switch\s*\(/,                      // switch语句
        /return\s+/,                        // return语句
        /throw\s+new\s+/,                   // throw语句
        /console\.\w+\(/,                   // 控制台输出
        /document\.\w+/,                   // DOM操作
        /window\.\w+/,
        /\$\('\w+'\)/,                      // jQuery选择器
        /addEventListener\(/,               // 事件监听器
        /setTimeout\(/,                     // 定时器
        /setInterval\(/,                    // 间隔定时器
        /fetch\(/,                          // Fetch API
        /axios\./,                          // Axios请求
        /new\s+Promise/,                    // Promise构造
        /\w+\.\w+\s*\(/,                    // 方法调用
        /\w+\[['"`]\w+['"`]\]/              // 对象属性访问
      ];
      
      // 🔥 使用try-catch保护正则表达式检测
      let isCode = false;
      try {
        console.log('🔍 NodeCard: 开始代码模式检测...');
        isCode = codePatterns.some(pattern => pattern.test(testText));
        console.log('🔍 NodeCard: 代码检测结果:', isCode);
      } catch (error) {
        console.error('❌ NodeCard: 代码检测过程中出错:', error);
        return; // 出错时跳过代码检测
      }
      
      if (isCode) {
        e.preventDefault(); // 阻止默认粘贴行为
        
        // 检测代码语言
        const language = detectCodeLanguage(pastedText);
        
        // 同时更新到节点数据中，确保持久化
        updateNode(node.id, {
          isCodeMode: true,
          codeContent: pastedText,
          codeLanguage: language
        });
        
        // 显示一个通知消息
        console.log('✅ NodeCard: 代码已识别，按ESC或点击外部以查看渲染效果');
        
        return; // 处理完代码粘贴后不再继续处理其它内容
      }
    }
    // 其它类型粘贴不做处理
  }, [readOnly, node.id, updateNode]);

  // 添加粘贴事件监听
  useEffect(() => {
    if (node.editing && cardRef.current) {
      const editorElement = cardRef.current.querySelector('[data-slate-editor="true"]');
      
      if (editorElement) {
        editorElement.addEventListener('paste', handlePaste as EventListener);
        
        return () => {
          editorElement.removeEventListener('paste', handlePaste as EventListener);
        };
      }
    }
  }, [node.editing, handlePaste, readOnly]);

  // 添加滑动卡片内容的状态和处理函数
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // 已移除复杂的触摸事件处理 - 使用浏览器原生滚动

  // 修复的滚轮事件处理 - 支持编辑模式下的滚动
  useEffect(() => {
    if (!node.selected) return;
    
    const cardElement = cardRef.current;
    if (!cardElement) return;
    
    const handleWheel = (e: WheelEvent) => {
      // 如果是编辑模式，需要特殊处理
      if (node.editing) {
        // 检查是否是Markdown编辑模式
        if (node.editMode === 'markdown') {
          // 找到textarea元素
          const textarea = cardElement.querySelector('.markdown-editor-textarea') as HTMLTextAreaElement;
          if (textarea && textarea.contains(e.target as Node)) {
            // 让textarea自然滚动，只阻止冒泡到白板
            e.stopPropagation();
            return;
          }
        } else {
          // 富文本模式，检查是否在编辑器容器内
          const editorContainer = cardElement.querySelector('.editor-container') as HTMLElement;
          if (editorContainer && editorContainer.contains(e.target as Node)) {
            // 让编辑器自然滚动，只阻止冒泡到白板
            e.stopPropagation();
            return;
          }
        }
      }
      
      // 非编辑模式或不在编辑器内的滚动，阻止冒泡到白板
      e.stopPropagation();
    };
    
    cardElement.addEventListener('wheel', handleWheel, { passive: true });
    
    return () => {
      cardElement.removeEventListener('wheel', handleWheel);
    };
  }, [node.selected, node.editing, node.editMode]);

  // 在每次内容变化或者卡片渲染后更新滚动条状态
  useEffect(() => {
    // 延迟检查，确保DOM已更新并且内容已完全渲染
    const checkScrollable = () => {
      // 根据是否在编辑模式选择正确的容器
      const container = node.editing ? editorContainerRef.current : contentContainerRef.current;
      
      if (container) {
        // 检查是否需要滚动
        const needsScrolling = container.scrollHeight > container.clientHeight;
        
        console.log('🔍 滚动检查详细信息:', {
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight,
          needsScrolling,
          nodeId: node.id,
          isFlipped: node.isFlipped,
          editing: node.editing,
          containerType: node.editing ? 'editor' : 'content',
          currentClasses: container.className,
          hasScrollableClass: container.classList.contains('content-scrollable')
        });
        
        // 根据是否需要滚动添加或移除类名
        if (needsScrolling) {
          container.classList.add('content-scrollable');
          console.log('✅ 启用滚动条 for', node.id, '- 新类名:', container.className);
        } else {
          container.classList.remove('content-scrollable');
          console.log('❌ 禁用滚动条 for', node.id, '- 新类名:', container.className);
        }
      } else {
        console.log('❗ 容器为 null', {
          nodeId: node.id,
          editing: node.editing,
          containerType: node.editing ? 'editor' : 'content'
        });
      }
    };

    // 使用多重延迟确保内容完全加载
    requestAnimationFrame(() => {
      setTimeout(checkScrollable, 50); // 额外延迟确保Rich Text Editor完全渲染
      setTimeout(checkScrollable, 200); // 再次检查确保内容已完全渲染
      setTimeout(checkScrollable, 500); // 最后一次检查
    });
  }, [node.content, node.frontContent, node.backContent, node.height, node.width, node.isFlipped, node.editing]);

  // 新增editorContainerRef
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const MAX_CARD_HEIGHT = 550;

  // displayContent 编辑状态下使用localContent，非编辑状态使用存储的内容
  const getContent = (content: any) => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content) && content.length === 1 && typeof content[0] === 'string') return content[0];
    return content;
  };

  const [localMarkdown, setLocalMarkdown] = useState(node.markdownContent || '');

  // 切换编辑模式
  const handleSwitchEditMode = () => {
    if (node.editMode === 'markdown') {
      // markdown -> rich，尝试将markdown转为富文本（简单处理，直接塞到段落）
      updateNode(node.id, {
        editMode: 'rich',
        content: [{ type: 'paragraph', children: [{ text: localMarkdown }] } as SlateElement],
        frontContent: [{ type: 'paragraph', children: [{ text: localMarkdown }] } as SlateElement],
        markdownContent: undefined,
      });
      setLocalMarkdown('');
    } else {
      // rich -> markdown，提取纯文本
      const text = getTextContent(localContent);
      updateNode(node.id, {
        editMode: 'markdown',
        markdownContent: text,
        content: undefined,
        frontContent: undefined,
        backContent: undefined,
      });
      setLocalMarkdown(text);
    }
  };

  // markdown 编辑保存
  const handleMarkdownSave = () => {
    updateNode(node.id, {
      markdownContent: localMarkdown,
    });
  };

  // displayContent 编辑状态下使用localContent/markdown，非编辑状态使用存储的内容
  const displayContent = node.editing
    ? (node.editMode === 'markdown' ? localMarkdown : localContent)
    : (node.editMode === 'markdown' && node.markdownContent
        ? node.markdownContent
        : (node.isFlipped
            ? (getContent(node.backContent) ?? defaultContent)
            : (getContent(node.frontContent) ?? getContent(node.content) ?? defaultContent)));

  // 计算毛玻璃样式
  const frostedStyle = node.frosted
    ? {
        background: isDarkMode
          ? 'rgba(30, 32, 40, 0.45)' // 深色主题下更深色
          : 'rgba(255, 255, 255, 0.55)', // 浅色主题下更亮
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        // 可选：加一点边框和阴影提升质感
        boxShadow: node.selected
          ? (isDarkMode ? '0 4px 16px rgba(0,0,0,0.45)' : '0 4px 16px rgba(0,0,0,0.10)')
          : undefined,
        border: node.selected
          ? (isDarkMode ? '2px dashed #fff' : '2px dashed #000')
          : 'none',
      }
    : {};

  // 添加编辑器聚焦处理
  useEffect(() => {
    if (node.editing && cardRef.current) {
      // 使用 setTimeout 确保编辑器已经完全渲染
      const focusTimer = setTimeout(() => {
        const editorElement = cardRef.current?.querySelector('[data-slate-editor="true"]') as HTMLElement;
        if (editorElement) {
          // 先尝试聚焦编辑器
          editorElement.focus();
          
          // 如果有 Slate 编辑器引用，也尝试通过 ReactEditor.focus 聚焦
          if (slateEditorRef.current) {
            try {
              ReactEditor.focus(slateEditorRef.current);
              
              // 如果有待处理的聚焦位置，尝试将光标移动到点击位置附近
              if (pendingFocusPos) {
                // 获取编辑器的边界矩形
                const editorRect = editorElement.getBoundingClientRect();
                const relativeX = pendingFocusPos.x - editorRect.left;
                const relativeY = pendingFocusPos.y - editorRect.top;
                
                // 如果点击位置在编辑器范围内，尝试设置光标位置
                if (relativeX >= 0 && relativeX <= editorRect.width && 
                    relativeY >= 0 && relativeY <= editorRect.height) {
                  // 使用(document as any).caretPositionFromPoint或document.caretRangeFromPoint
                  let range = null;
                  if ((document as any).caretPositionFromPoint) {
                    const caretPos = (document as any).caretPositionFromPoint(pendingFocusPos.x, pendingFocusPos.y);
                    if (caretPos) {
                      range = document.createRange();
                      range.setStart(caretPos.offsetNode, caretPos.offset);
                      range.collapse(true);
                    }
                  } else if (document.caretRangeFromPoint) {
                    range = document.caretRangeFromPoint(pendingFocusPos.x, pendingFocusPos.y);
                  }
                  
                  if (range) {
                    const selection = window.getSelection();
                    if (selection) {
                      selection.removeAllRanges();
                      selection.addRange(range);
                    }
                  }
                } else {
                  // 如果点击位置不在编辑器内，将光标移动到内容末尾
                  try {
                    const endPoint = Editor.end(slateEditorRef.current, []);
                    Transforms.select(slateEditorRef.current, endPoint);
                  } catch (error) {
                    console.warn('Failed to set cursor to end:', error);
                  }
                }
              } else {
                // 没有待处理的聚焦位置，将光标移动到内容末尾
                try {
                  const endPoint = Editor.end(slateEditorRef.current, []);
                  Transforms.select(slateEditorRef.current, endPoint);
                } catch (error) {
                  console.warn('Failed to set cursor to end:', error);
                }
              }
            } catch (error) {
              console.warn('Slate editor focus failed:', error);
            }
          }
          
          // 清除待处理的聚焦位置
          setPendingFocusPos(null);
        }
      }, 200); // 增加延迟时间，确保DOM完全更新

      return () => clearTimeout(focusTimer);
    }
  }, [node.editing, node.id, pendingFocusPos]); // 添加pendingFocusPos依赖

  // 编辑器内容滚动事件拦截，彻底阻止页面滚动
  // 编辑器的简化滚轮事件处理 - 只阻止冒泡到白板
  React.useEffect(() => {
    if (!node.editing) return;
    const container = editorContainerRef.current;
    if (!container) return;

    // 简化的wheel事件 - 只阻止冒泡
    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation(); // 阻止冒泡到白板
    };

    container.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [node.editing]);

  // 在组件顶部定义ref


  // 修复：监听node.markdownContent变化，自动同步到localMarkdown
  useEffect(() => {
    if (node.editing && node.editMode === 'markdown') {
      setLocalMarkdown(node.markdownContent || '');
    }
  }, [node.editing, node.editMode, node.markdownContent]);

  // 新增：背面编辑模式与内容本地状态
  const [backEditMode, setBackEditMode] = useState<'rich' | 'markdown'>(
    node.backEditMode || (node.isAICreated ? 'markdown' : 'rich')
  );
  const [localBackMarkdown, setLocalBackMarkdown] = useState(node.backMarkdownContent || '');

  // 监听node.backMarkdownContent变化，自动同步到localBackMarkdown
  useEffect(() => {
    if (node.editing && node.isFlipped && backEditMode === 'markdown') {
      setLocalBackMarkdown(node.backMarkdownContent || '');
    }
  }, [node.editing, node.isFlipped, backEditMode, node.backMarkdownContent]);

  // 监听node.backEditMode变化
  useEffect(() => {
    if (node.isFlipped && node.backEditMode) {
      setBackEditMode(node.backEditMode);
    }
  }, [node.isFlipped, node.backEditMode]);

  // 切换背面编辑模式
  const handleSwitchBackEditMode = () => {
    if (backEditMode === 'markdown') {
      // markdown -> rich
      updateNode(node.id, {
        backEditMode: 'rich',
        backMarkdownContent: undefined,
        backContent: undefined,
      });
      setBackEditMode('rich');
      setLocalBackMarkdown('');
    } else {
      // rich -> markdown，提取纯文本
      const text = getTextContent(localContent);
      updateNode(node.id, {
        backEditMode: 'markdown',
        backMarkdownContent: text,
        backContent: undefined,
      });
      setBackEditMode('markdown');
      setLocalBackMarkdown(text);
    }
  };

  // 保存背面markdown
  const handleBackMarkdownSave = () => {
    updateNode(node.id, {
      backMarkdownContent: localBackMarkdown,
    });
  };

  // 新增：处理Markdown检测 - 自动切换无需确认
  const handleMarkdownDetected = React.useCallback((markdownText: string, confidence: number) => {
    console.log('🔍 NodeCard检测到Markdown，自动切换:', { confidence, length: markdownText.length });
    
    // 如果置信度足够高，直接自动切换到Markdown模式
    if (confidence > 0.4) {
      // 如果当前是正面编辑
      if (node.editing && !node.isFlipped) {
        updateNode(node.id, {
          editMode: 'markdown',
          markdownContent: markdownText,
        });
        setLocalMarkdown(markdownText);
      }
      // 如果当前是背面编辑
      else if (node.editing && node.isFlipped) {
        updateNode(node.id, {
          backEditMode: 'markdown',
          backMarkdownContent: markdownText,
        });
        setLocalBackMarkdown(markdownText);
        setBackEditMode('markdown');
      }
      
      // 显示提示
      console.log('✅ 已自动切换到Markdown模式并应用内容');
    }
  }, [node.id, node.editing, node.isFlipped, updateNode]);

  useImperativeHandle(ref, () => ({
    finishEdit: () => {
      if (node.editMode === 'markdown' && localMarkdown.trim() !== (node.markdownContent || '').trim()) {
        handleMarkdownSave();
      }
      if (node.backEditMode === 'markdown' && localBackMarkdown.trim() !== (node.backMarkdownContent || '').trim()) {
        handleBackMarkdownSave();
      }
    }
  }));

  // 修复：正反面切换时分别同步本地内容
  useEffect(() => {
    if (node.isFlipped) {
      setLocalContent(toSlateContent(node.backContent));
    } else {
      setLocalContent(toSlateContent(node.frontContent ?? node.content));
    }
  }, [node.isFlipped, node.backContent, node.frontContent, node.content]);

  // 新增状态：是否允许网页交互
  const [webpageInteractive, setWebpageInteractive] = useState(false);

  // 失焦或翻转时自动关闭网页交互
  useEffect(() => {
    setWebpageInteractive(false);
  }, [node.isFlipped, node.selected, node.editing]);

  // 新增拖动网页卡片时隐藏iframe的状态
  const [draggingWebPage, setDraggingWebPage] = useState(false);

  // 修改onMouseDown逻辑：网页遮罩层拖动时设为true
  const handleWebPageMaskMouseDown = (e: React.MouseEvent) => {
    onMouseDown(e, {
      onDragStart: () => setDraggingWebPage(true),
      onDragEnd: () => setDraggingWebPage(false),
    });
  };

  // 为子组件准备的回调函数
  const handleOpenUrlInNewWindow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (detectedUrl) {
      window.open(detectedUrl, '_blank');
    }
  };

  const handleCopyAsImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 计算预览弹窗的位置
    const rect = e.currentTarget.getBoundingClientRect();
    const position = {
      x: rect.left + rect.width + 10,
      y: rect.top
    };
    
    setImagePreviewPosition(position);
    setShowImagePreview(true);
    setShowActionMenu(false);
  };

  const handleShowColorPicker = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 计算颜色选择器位置 - 根据卡片是否固定使用不同的坐标系统
    let pickerX, pickerY;
    if (node.pinned) {
      // 固定卡片：使用屏幕坐标
      pickerX = (node.pinnedX || 100) + (node.width || 324) + 20;
      pickerY = node.pinnedY || 100;
    } else {
      // 普通卡片：世界坐标转屏幕坐标
      const { scale: currentScale, panX, panY } = useBoardStore.getState();
      pickerX = node.x * currentScale + panX + (node.width || 324) * currentScale + 20;
      pickerY = node.y * currentScale + panY;
    }
    
    setColorPickerPosition({ x: pickerX, y: pickerY });
    setShowColorPicker(true);
    setShowActionMenu(false);
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 如果当前正在编辑，先保存编辑内容
    if (node.editing) {
      const validContent = (currentContentRef.current && Array.isArray(currentContentRef.current) && currentContentRef.current.length > 0) ? currentContentRef.current : defaultContent;
      updateNode(node.id, { frontContent: validContent, backContent: validContent });
      setNodeEditing(node.id, false);
    }
    
    if (!node.pinned) {
      // 固定卡片
      const currentScreenX = node.x * scale + panX;
      const currentScreenY = node.y * scale + panY;
      updateNode(node.id, { 
        pinnedX: currentScreenX, 
        pinnedY: currentScreenY,
        pinned: true
      });
    } else {
      // 取消固定
      const currentScreenX = node.pinnedX || 100;
      const currentScreenY = node.pinnedY || 100;
      const worldX = (currentScreenX - panX) / scale;
      const worldY = (currentScreenY - panY) / scale;
      updateNode(node.id, { 
        x: worldX, 
        y: worldY,
        pinned: false,
        pinnedX: undefined,
        pinnedY: undefined
      });
    }
    setShowActionMenu(false);
  };

  // 工具函数：将代码片段拼接成完整 HTML 文档，并自动注入本地持久化脚本和全局变量代理
  function generateHtmlFromCode(codeInfo: { code: string, language: string }, nodeId: string) {
    if (!codeInfo) return '';
    const { code, language } = codeInfo;
    // 持久化脚本（input/textarea/contenteditable）
    const persistScript = `<script>(function(){
      var nodeId = ${JSON.stringify(nodeId)};
      function save(key, value) { localStorage.setItem(nodeId + ':' + key, value); }
      function load(key) { return localStorage.getItem(nodeId + ':' + key) || ''; }
      document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('input,textarea').forEach(function(el, idx){
          var k = el.name || el.id || idx;
          el.value = load(k);
          el.addEventListener('input', function(){ save(k, el.value); });
        });
        document.querySelectorAll('[contenteditable]').forEach(function(el, idx){
          var k = el.id || el.className || idx;
          el.innerHTML = load(k);
          el.addEventListener('input', function(){ save(k, el.innerHTML); });
        });
      });
      // 自动代理 window 下常见变量，实现全局数据持久化
      var keys = ['todos', 'data', 'list', 'items', 'store'];
      keys.forEach(function(key){
        try {
          var saved = localStorage.getItem(nodeId + ':' + key);
          if (saved) window[key] = JSON.parse(saved);
          var value = window[key];
          Object.defineProperty(window, key, {
            get: function(){ return value; },
            set: function(v){
              value = v;
              localStorage.setItem(nodeId + ':' + key, JSON.stringify(v));
            }
          });
          if (Array.isArray(value)) {
            ['push','pop','shift','unshift','splice'].forEach(function(m){
              var orig = value[m];
              value[m] = function(){
                var r = orig.apply(this, arguments);
                localStorage.setItem(nodeId + ':' + key, JSON.stringify(value));
                return r;
              }
            });
          }
        } catch(e){}
      });
    })();<\/script>`;
    if (language === 'html') {
      return code.includes('<html') ?
        code.replace(/<\/body>/i, persistScript + '</body>') :
        `<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>${code}${persistScript}</body></html>`;
    } else if (language === 'css') {
      return `<!DOCTYPE html><html><head><meta charset='utf-8'><style>${code}</style></head><body>${persistScript}</body></html>`;
    } else if (language === 'javascript' || language === 'js') {
      return `<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><script>${code}<\/script>${persistScript}</body></html>`;
    } else if (language === 'jsx') {
      // 简单处理 jsx，嵌入 babel-standalone
      return `<!DOCTYPE html><html><head><meta charset='utf-8'><script src='https://unpkg.com/@babel/standalone/babel.min.js'></script></head><body><div id='root'></div><script type='text/babel'>${code}</script></body></html>`;
    } else {
      // 兜底：全部塞进 <pre>
      return `<!DOCTYPE html><html><head><meta charset='utf-8'></head><body><pre>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`;
    }
    return code;
  }

  // 新增状态：是否允许代码iframe交互
  const [iframeInteractive, setIframeInteractive] = useState(false);

  // 失焦或翻转时自动关闭iframe交互
  useEffect(() => {
    setIframeInteractive(false);
  }, [node.isFlipped, node.selected, node.editing]);

  // 全局点击监听，点击卡片外部时关闭iframe交互
  useEffect(() => {
    if (!iframeInteractive) return;
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest && !target.closest(`[data-node-id="${node.id}"]`)) {
        setIframeInteractive(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick, true);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick, true);
    };
  }, [iframeInteractive, node.id]);

  // 在非编辑态下内容渲染后，自动检测内容高度并自适应卡片高度
  // useEffect(() => {
  //   if (!node.editing && contentContainerRef.current && !node.userResized) {
  //     const container = contentContainerRef.current;
  //     if (container && !node.isCodeMode && !isWebPageMode) {
  //       setTimeout(() => {
  //         const contentHeight = container.scrollHeight;
  //         const minHeight = defaultCardConfig.height || 80;
  //         const maxHeight = 550;
  //         if (contentHeight > (node.height || minHeight)) {
  //           updateNode(node.id, { height: Math.min(contentHeight, maxHeight) });
  //         }
  //       }, 60);
  //     }
  //   }
  // }, [node.editing, displayContent, node.height, node.id, updateNode, isWebPageMode, node.isCodeMode, node.userResized, defaultCardConfig.height]);

  // NodeCard 组件内部合适位置添加如下 hook 调用
  let insertImageToEditor: ((url: string, width?: number, height?: number, aspectRatio?: number) => void) | null = null;

  useImagePaste({
    // @ts-ignore
    editorRef: editorContainerRef,
    onInsertImage: (img: ImageBlock) => {
      if (!node.editing || !insertImageToEditor) return;
      if (img.status !== 'done') return;
      insertImageToEditor(img.url, img.width, img.height, img.aspectRatio);
    }
  });

  // 检查卡片是否在背景框内
  const isInFrame = node.containerId && backgroundFrames.some(frame => frame.id === node.containerId);
  const parentFrame = isInFrame ? backgroundFrames.find(frame => frame.id === node.containerId) : null;
  
  // 如果在背景框内，使用特殊的样式
  const frameStyle = isInFrame && parentFrame ? {
    border: `2px solid ${parentFrame.style?.borderColor || '#007acc'}`,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    boxShadow: `0 4px 12px rgba(0, 122, 204, 0.3)`,
    transform: dragging ? 'scale(1.02) translateZ(0)' : 'scale(0.98) translateZ(0)', // 稍微缩小以显示层次感
  } : {};

  const frontStyle: React.CSSProperties = {
    minHeight: node.height || 80,
    height: '100%',
    maxHeight: 'none',
    background: node.transparent ? 'transparent' : currentBg.color,
    borderRadius: getBorderRadius(),
    boxShadow: node.selected 
      ? '0 4px 12px var(--card-shadow)' 
      : (node.transparent ? 'none' : '0 2px 8px var(--card-shadow)'),
    cursor: node.editing ? 'text' : (resizing ? 'default' : 'move'),
    userSelect: 'none',
    padding: isWebPageMode || shouldRemovePadding(displayContent) ? 0 : 12,
    border: node.editing
      ? (isDarkMode ? '2px dashed #fff' : '2px dashed #000')
      : (node.selected
          ? (isDarkMode ? '2px dashed #fff' : '2px dashed #000')
          : (node.showBorder 
              ? `2px solid ${node.borderColor || '#D1D5DB'}`
              : 'none')
        ),
    transform: dragging ? 'scale(1.02) translateZ(0)' : 'scale(1) translateZ(0)',
    transition: dragging || resizing || node.editing ? 'none' : 'transform 0.2s ease',
    willChange: dragging ? 'transform, left, top' : 'auto',
    fontSize: 16,
    overflow: node.editing ? 'visible' : 'visible',
    color: currentBg.textColor || undefined,
    ...frostedStyle,
    ...getCircleCardStyles(),
  };

  // If the card is inside a frame, add a more subtle visual cue
  if (parentFrame) {
    const frameColor = parentFrame.style?.borderColor || 'rgba(0, 122, 204, 0.9)';
    const glow = `0 0 8px 2px ${frameColor}`;

    const existingShadow = frontStyle.boxShadow;
    if (existingShadow && existingShadow !== 'none') {
      frontStyle.boxShadow = `${glow}, ${existingShadow}`;
    } else {
      frontStyle.boxShadow = glow;
    }
  }

  return (
    <>
    <div
        ref={cardRef}
        data-node-id={node.id}
        className={`flip-card ${node.isFlipped ? 'flipped' : ''} ${node.selected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: cardPosition.x,
        top: cardPosition.y,
        width: node.width || 200,
        height: node.height || 80, // 始终使用固定高度
        maxHeight: 'none', // 不在主容器上设置最大高度限制
        zIndex: cardPosition.zIndex,
        isolation: 'isolate', // 创建新的层叠上下文，确保子元素z-index正常工作
        // 性能优化
        transform: 'translateZ(0)', // 启用硬件加速
        willChange: dragging ? 'transform, left, top' : 'auto',
      }}
      >


        <div className="flip-card-inner">
          {/* 正面 */}
          <div className="flip-card-front" style={frontStyle}
          onClick={handleClick}
          onMouseDown={onMouseDown}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          >
            {/* 固定图钉图标 - 仅当卡片被固定时显示（正面） */}
            {node.pinned && !node.editing && !node.isFlipped && !readOnly && (
              <div
                onClick={(e) => {
                  if (readOnly) return;
                  e.stopPropagation();
                  e.preventDefault();
                  // 取消固定
                  const currentScreenX = node.pinnedX || 100;
                  const currentScreenY = node.pinnedY || 100;
                  const worldX = (currentScreenX - panX) / scale;
                  const worldY = (currentScreenY - panY) / scale;
                  updateNode(node.id, { 
                    x: worldX, 
                    y: worldY,
                    pinned: false,
                    pinnedX: undefined,
                    pinnedY: undefined
                  });
                }}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  color: '#dc2626',
                  zIndex: 10,
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease',
                }}
                title="点击取消固定"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16,12V4A1,1 0 0,0 15,3H9A1,1 0 0,0 8,4V12L6,14V16H11V21.5C11,21.78 11.22,22 11.5,22A0.5,0.5 0 0,0 12,21.5V16H17V14L16,12Z" />
                </svg>
              </div>
            )}

            {/* 正面指示器 - 显示背面内容或网页内容 */}
            {!node.editing && (
              (node.backContent && Array.isArray(node.backContent) && getTextContent(node.backContent).trim() !== '') || 
              detectedUrl
            ) && (
              <div
                onClick={handleFlipCard}
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  width: detectedUrl ? 24 : 20,
                  height: detectedUrl ? 24 : 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: detectedUrl ? '#f0f9ff' : 'transparent',
                  border: detectedUrl ? '1.8px solid #0ea5e9' : '1.8px solid #3b82f6',
                  color: detectedUrl ? '#0ea5e9' : '#3b82f6',
                  fontSize: detectedUrl ? 12 : 11,
                  fontWeight: 'bold',
                  zIndex: 10,
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
                }}
                title={detectedUrl ? `点击查看网页: ${detectedUrl}` : "翻转到背面"}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                  if (detectedUrl) {
                    e.currentTarget.style.borderColor = '#0284c7';
                    e.currentTarget.style.backgroundColor = '#e0f2fe';
                  } else {
                    e.currentTarget.style.borderColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  if (detectedUrl) {
                    e.currentTarget.style.borderColor = '#0ea5e9';
                    e.currentTarget.style.backgroundColor = '#f0f9ff';
                  } else {
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }
                }}
              >
                {detectedUrl ? '🌐' : 'A'}
              </div>
            )}

            {!node.isFlipped && (
              node.editing ? (
                <NodeCardEditor
                  node={node}
                  isBack={false}
                  localContent={localContent}
                  localMarkdown={localMarkdown}
                  localBackMarkdown={localBackMarkdown}
                  backEditMode={backEditMode}
                  displayContent={displayContent}
                  editorContainerRef={editorContainerRef as React.RefObject<HTMLDivElement>}
                  onEditorChange={handleEditorChange}
                  onTagsChange={handleTagsChange}
                  onMarkdownDetected={handleMarkdownDetected}
                  onMarkdownChange={setLocalMarkdown}
                  onBackMarkdownChange={setLocalBackMarkdown}
                  onSwitchEditMode={handleSwitchEditMode}
                  onSwitchBackEditMode={handleSwitchBackEditMode}
                  onMarkdownSave={handleMarkdownSave}
                  onBackMarkdownSave={handleBackMarkdownSave}
                  onInsertImage={fn => { insertImageToEditor = fn; }}
                  shouldRemovePadding={shouldRemovePadding}
                  readOnly={readOnly}
                />
              ) : (
                <NodeCardContent
                  node={node}
                  isBack={false}
                  displayContent={displayContent}
                  contentContainerRef={contentContainerRef as React.RefObject<HTMLDivElement>}
                  codeInfo={codeInfo}
                  detectedUrl={detectedUrl}
                  isWebPageMode={isWebPageMode}
                  webpageInteractive={webpageInteractive}
                  iframeInteractive={iframeInteractive}
                  draggingWebPage={draggingWebPage}
                  onEditorChange={handleEditorChange}
                  onTagsChange={handleTagsChange}
                  onMarkdownDetected={handleMarkdownDetected}
                  onWebPageMaskMouseDown={handleWebPageMaskMouseDown}
                  onMouseDown={onMouseDown}
                  onSetWebpageInteractive={setWebpageInteractive}
                  onSetIframeInteractive={setIframeInteractive}
                  onInsertImage={fn => { insertImageToEditor = fn; }}
                  shouldRemovePadding={shouldRemovePadding}
                  generateHtmlFromCode={generateHtmlFromCode}
                  readOnly={readOnly}
                />
              )
            )}
          </div>
          
          {/* 背面 */}
          <div className="flip-card-back" style={{
            minHeight: node.height || 80, // 保持最小高度
            height: '100%', // 始终填满父容器
            maxHeight: 'none', // 不在容器上设置最大高度限制
            overflow: 'visible', // 彻底去除裁剪，允许弹窗溢出
            // 应用透明度设置
            background: node.transparent ? 'transparent' : currentBg.color,
            borderRadius: getBorderRadius(),
            boxShadow: node.selected 
              ? '0 4px 12px var(--card-shadow)' 
              : (node.transparent ? 'none' : '0 2px 8px var(--card-shadow)'),
            cursor: node.editing ? 'text' : (resizing ? 'default' : 'move'),
            userSelect: 'none',
            padding: isWebPageMode || shouldRemovePadding(displayContent) ? 0 : 12, // 和正面一致
            color: currentBg.textColor || undefined, // 修正：用选中色
            // 新增：边框逻辑
            border: node.editing
              ? (isDarkMode ? '2px dashed #fff' : '2px dashed #000')
              : (node.selected
                  ? (isDarkMode ? '2px dashed #fff' : '2px dashed #000')
                  : (node.showBorder 
                      ? `2px solid ${node.borderColor || '#D1D5DB'}`
                      : 'none')
                ),
            ...frostedStyle,
            ...getCircleCardStyles(), // 添加圆形卡片特殊样式
          }}
          onClick={handleClick}
          onMouseDown={onMouseDown}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          >


            {/* 卡片背面内容部分 */}
            {node.isFlipped && (
              node.editing ? (
                <NodeCardEditor
                  node={node}
                  isBack={true}
                  localContent={localContent}
                  localMarkdown={localMarkdown}
                  localBackMarkdown={localBackMarkdown}
                  backEditMode={backEditMode}
                  displayContent={displayContent}
                  editorContainerRef={editorContainerRef as React.RefObject<HTMLDivElement>}
                  onEditorChange={handleEditorChange}
                  onTagsChange={handleTagsChange}
                  onMarkdownDetected={handleMarkdownDetected}
                  onMarkdownChange={setLocalMarkdown}
                  onBackMarkdownChange={setLocalBackMarkdown}
                  onSwitchEditMode={handleSwitchEditMode}
                  onSwitchBackEditMode={handleSwitchBackEditMode}
                  onMarkdownSave={handleMarkdownSave}
                  onBackMarkdownSave={handleBackMarkdownSave}
                  onInsertImage={fn => { insertImageToEditor = fn; }}
                  shouldRemovePadding={shouldRemovePadding}
                  readOnly={readOnly}
                />
              ) : (
                <NodeCardContent
                  node={node}
                  isBack={true}
                  displayContent={displayContent}
                  contentContainerRef={contentContainerRef as React.RefObject<HTMLDivElement>}
                  codeInfo={codeInfo}
                  detectedUrl={detectedUrl}
                  isWebPageMode={isWebPageMode}
                  webpageInteractive={webpageInteractive}
                  iframeInteractive={iframeInteractive}
                  draggingWebPage={draggingWebPage}
                  onEditorChange={handleEditorChange}
                  onTagsChange={handleTagsChange}
                  onMarkdownDetected={handleMarkdownDetected}
                  onWebPageMaskMouseDown={handleWebPageMaskMouseDown}
                  onMouseDown={onMouseDown}
                  onSetWebpageInteractive={setWebpageInteractive}
                  onSetIframeInteractive={setIframeInteractive}
                  onInsertImage={fn => { insertImageToEditor = fn; }}
                  shouldRemovePadding={shouldRemovePadding}
                  generateHtmlFromCode={generateHtmlFromCode}
                  readOnly={readOnly}
                />
              )
            )}
            

          </div>
        </div>
        
        {/* 调整尺寸手柄组件 - 编辑时隐藏 */}
        {!readOnly && (
          <NodeCardResizeHandles
            node={node}
            backEditMode={backEditMode}
            onResizeMouseDown={handleResizeMouseDown}
          />
        )}
        
        {/* 操作按钮组 */}
        <NodeCardActions
          node={node}
          readOnly={readOnly}
          showActionMenu={showActionMenu}
          onToggleActionMenu={() => setShowActionMenu(!showActionMenu)}
          onFlipCard={handleFlipCard}
          onShowColorPicker={handleShowColorPicker}
          onTogglePin={handleTogglePin}
          onShowDeleteModal={handleConfirmDelete} // 直接删除
          onOpenUrlInNewWindow={handleOpenUrlInNewWindow}
          onCopyAsImage={handleCopyAsImage}
          detectedUrl={detectedUrl}
          isWebPageMode={isWebPageMode}
          hasBackContent={!!(node.backContent && Array.isArray(node.backContent) && getTextContent(node.backContent).trim() !== '')}
        />

        {/* 连接锚点 - 编辑时隐藏 */}
        {!isEditing && (
          <NodeConnection 
            node={node}
            cardRef={cardRef}
            readOnly={readOnly}
          />
        )}
      </div>
      
      {/* 确认删除对话框 */}
      {showColorPicker && (
        <CardColorPicker
          position={colorPickerPosition}
          onClose={() => setShowColorPicker(false)}
          onColorChange={handleColorChange}
          currentColor={isDarkMode ? node.darkBackgroundColor : node.lightBackgroundColor}
          frosted={node.frosted}
          onFrostedChange={(val) => updateNode(node.id, { frosted: val })}
          transparent={node.transparent}
          onTransparentChange={(val) => updateNode(node.id, { transparent: val })}
          showBorder={node.showBorder}
          onShowBorderChange={(val) => updateNode(node.id, { showBorder: val })}
          borderColor={node.borderColor}
          onBorderColorChange={(color) => updateNode(node.id, { borderColor: color })}
          // 新增：文字对齐设置
          textAlign={node.textAlign}
          onTextAlignChange={(align) => updateNode(node.id, { textAlign: align })}
          textVerticalAlign={node.textVerticalAlign}
          onTextVerticalAlignChange={(align) => updateNode(node.id, { textVerticalAlign: align })}
        />
      )}

      {/* 图片预览对话框 */}
      {showImagePreview && (
        <CardImagePreview
          node={node}
          position={imagePreviewPosition}
          onClose={() => setShowImagePreview(false)}
        />
      )}
      

    </>
  );
});

export default NodeCard;
