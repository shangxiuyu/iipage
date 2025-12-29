console.log('RichTextEditor loaded!!!');
import React, { useCallback, forwardRef, useImperativeHandle, useContext } from 'react';
import { createEditor, Transforms, Editor, Range, Element as SlateElement, Path } from 'slate';
import type { Descendant } from 'slate';
import { Slate, Editable, withReact, ReactEditor, useSlateStatic, useSelected } from 'slate-react';
import ReactDOM from 'react-dom';
import { ThemeContext } from '../App';
import type { BaseEditor } from 'slate';
import type { ReactEditor as SlateReactEditor } from 'slate-react';
import type { BaseElement, BaseText } from 'slate';
import WebPageRenderer from './WebPageRenderer';
import { aliCloudStorage } from '../services/aliCloudStorageService';
import { detectMarkdown, isLikelyMarkdown } from '../utils/markdownDetector';

// 动态导入 PNG icons
const iconModules = import.meta.glob('../assets/icons/*.png', { query: '?url', import: 'default', eager: true });
const iconList = Object.entries(iconModules).map(([path, url]) => ({
  name: path.split('/').pop()?.replace('.png', '') || '',
  url: url as string
}));

// 增强：节点类型插件 (处理 Inline 和 Void)
function withNodeTypes(editor: ReactEditor) {
  const { isInline, isVoid } = editor;

  editor.isInline = element => {
    return (element as any).type === 'tag' || (element as any).type === 'image' ? true : isInline(element);
  };

  editor.isVoid = element => {
    return (element as any).type === 'tag' || (element as any).type === 'image' || (element as any).type === 'video' ? true : isVoid(element);
  };

  return editor;
}

// 新增：标签提取函数
export const extractTags = (value: Descendant[]): string[] => {
  const tags: string[] = [];

  const extractFromNode = (node: any) => {
    if (node.type === 'tag' && node.value) {
      tags.push(node.value);
    }
    if (node.children) {
      node.children.forEach(extractFromNode);
    }
  };

  value.forEach(extractFromNode);
  return Array.from(new Set(tags)); // 去重
};

// 新增：文本提取函数
export const extractTextFromSlateContent = (content: any[]): string => {
  if (!Array.isArray(content)) return '';

  const extractText = (node: any): string => {
    // 如果是文本节点，直接返回文本
    if (typeof node === 'string') return node;
    if (node.text !== undefined) return node.text;

    // 如果是标签节点，返回标签值
    if (node.type === 'tag' && node.value) {
      return `#${node.value}`;
    }

    // 如果有children，递归处理所有子节点
    if (node.children && Array.isArray(node.children)) {
      return node.children.map(extractText).join('');
    }

    return '';
  };

  return content.map(extractText).join(' ').trim();
};

const initialValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  } as any
];

interface RichTextEditorProps {
  value?: Descendant[];
  onChange: (value: Descendant[]) => void;
  onBlur?: () => void;
  autoFocus?: boolean;
  style?: React.CSSProperties;
  onTagsChange?: (tags: string[]) => void;
  readOnly?: boolean;
  onInsertImage?: (insert: (url: string) => void) => void;
  onMarkdownDetected?: (content: string, confidence: number, features: string[]) => void;
}

const RichTextEditor = forwardRef<ReactEditor, RichTextEditorProps>(
  ({ value, onChange, onBlur, autoFocus, style, onTagsChange, readOnly, onInsertImage, onMarkdownDetected }, ref) => {
    const { isDarkMode } = useContext(ThemeContext);

    const createSlateEditor = useCallback(() => {
      return withShortcuts(withNodeTypes(withReact(createEditor() as ReactEditor))) as ReactEditor;
    }, []);
    const editorRef = React.useRef<ReactEditor | null>(null);
    const updateIndentLinesRef = React.useRef<(() => void) | null>(null);

    if (!editorRef.current) {
      editorRef.current = createSlateEditor();
    }
    const editor = editorRef.current;
    useImperativeHandle(ref, () => editor as ReactEditor, [editor]);

    // 添加autoFocus处理
    React.useEffect(() => {
      if (autoFocus && editor) {
        // 使用多重延迟确保DOM完全渲染
        const focusTimer = setTimeout(() => {
          try {
            ReactEditor.focus(editor);
            // 确保光标位置在内容末尾
            const endPoint = Editor.end(editor, []);
            Transforms.select(editor, endPoint);
          } catch (error) {
            console.warn('Auto focus failed:', error);
            // 备用方案：直接聚焦DOM元素
            const editableElement = ReactEditor.toDOMNode(editor, editor);
            if (editableElement) {
              editableElement.focus();
            }
          }
        }, 150); // 增加延迟时间

        return () => clearTimeout(focusTimer);
      }
    }, [autoFocus, editor]);

    const [localValue, setLocalValue] = React.useState<Descendant[]>(() => {
      if (!value || !Array.isArray(value) || value.length === 0) {
        return initialValue;
      }
      return value;
    });
    React.useEffect(() => {
      if (value && Array.isArray(value)) {
        if (JSON.stringify(value) !== JSON.stringify(localValue)) {
          setLocalValue(value.length === 0 ? initialValue : value);
        }
      }
    }, [value]);

    // 使用ref来引用编辑器容器
    const editorContainerRef = React.useRef<HTMLDivElement>(null);
    const [indentLines, setIndentLines] = React.useState<React.ReactNode[]>([]);
    const rafId = React.useRef<number | null>(null);

    // 计算连续竖线的简单方法
    const updateIndentLines = React.useCallback(() => {
      // 分析文档内容，找出每个缩进级别的使用情况
      const indentUsage: { [level: number]: number[] } = {}; // 记录每个级别在哪些行被使用

      localValue.forEach((node: any, index) => {
        const indent = node.indent || 0;
        // 记录该元素及其所有父级缩进
        for (let level = 1; level <= indent; level++) {
          if (!indentUsage[level]) {
            indentUsage[level] = [];
          }
          indentUsage[level].push(index);
        }
      });

      const lines: React.ReactNode[] = [];
      const indentSize = 24;
      const lineHeight = 30; // 调整行高估算

      // 为每个使用的缩进级别创建连续竖线
      Object.entries(indentUsage).forEach(([level, indices]) => {
        if (indices.length === 0) return;

        const levelNum = parseInt(level);
        const leftPos = (levelNum - 1) * indentSize + 12;

        // 找到该级别的第一行和最后一行
        const firstIndex = Math.min(...indices);
        const lastIndex = Math.max(...indices);

        // 计算竖线位置：从第一个使用该级别的元素开始，到最后一个结束
        const startTop = firstIndex * lineHeight + 4;
        const endBottom = (lastIndex + 1) * lineHeight + 4;
        const totalHeight = endBottom - startTop;

        lines.push(
          <div
            key={`indent-line-${level}`}
            style={{
              position: 'absolute',
              left: leftPos,
              top: startTop,
              height: totalHeight,
              width: '1px',
              backgroundColor: isDarkMode
                ? 'rgba(156, 163, 175, 0.3)'
                : 'rgba(107, 114, 128, 0.25)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        );
      });

      setIndentLines(lines);
    }, [localValue, isDarkMode]);

    // 优化的强制更新函数 - 使用 requestAnimationFrame 和 debounce
    const scheduleIndentUpdate = React.useCallback(() => {
      // 取消之前的更新请求
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      // 使用 requestAnimationFrame 确保在下一个渲染帧更新
      rafId.current = requestAnimationFrame(() => {
        updateIndentLines();
        rafId.current = null;
      });
    }, [updateIndentLines]);

    // 清理 RAF
    React.useEffect(() => {
      return () => {
        if (rafId.current) {
          cancelAnimationFrame(rafId.current);
        }
      };
    }, []);

    // 内容变化时更新竖线
    React.useEffect(() => {
      scheduleIndentUpdate();
    }, [scheduleIndentUpdate]);

    // 修改：handleChange 添加标签提取逻辑
    // 云端文件删除检测
    const previousValueRef = React.useRef<Descendant[]>(localValue);

    // 云端文件删除工具函数
    const deleteCloudFile = React.useCallback(async (url: string) => {
      try {
        // 检查是否是阿里云OSS URL
        if (url && typeof url === 'string' && url.includes('.aliyuncs.com')) {
          console.log(`🗑️ 检测到云端文件删除: ${url}`);

          // 从URL提取文件路径
          const urlObj = new URL(url);
          const filePath = urlObj.pathname.substring(1); // 移除开头的 '/'

          console.log(`🗑️ 提取文件路径: ${filePath}`);

          if (aliCloudStorage.isReady()) {
            const result = await aliCloudStorage.deleteFile(filePath);
            if (result.success) {
              console.log(`✅ 云端文件删除成功: ${filePath}`);
            } else {
              console.warn(`⚠️ 云端文件删除失败: ${result.error}`);
            }
          } else {
            console.warn('⚠️ 阿里云OSS服务未初始化，无法删除云端文件');
          }
        } else {
          console.log(`ℹ️ 跳过非云端文件: ${url ? url.substring(0, 50) + '...' : 'undefined'}`);
        }
      } catch (error) {
        console.error('❌ 云端文件删除过程中出错:', error);
      }
    }, []);

    // 检测媒体文件删除的函数
    const detectDeletedMediaFiles = React.useCallback((oldValue: Descendant[], newValue: Descendant[]) => {
      try {
        console.log('🔍 执行媒体文件删除检测');

        // 提取所有媒体文件URL
        const extractMediaUrls = (value: Descendant[]): string[] => {
          const urls: string[] = [];
          const traverse = (nodes: any[]) => {
            for (const node of nodes) {
              if (node.type === 'image' || node.type === 'video') {
                if (node.url) {
                  urls.push(node.url);
                }
              }
              if (node.children && Array.isArray(node.children)) {
                traverse(node.children);
              }
            }
          };
          traverse(value);
          return urls;
        };

        const oldUrls = extractMediaUrls(oldValue);
        const newUrls = extractMediaUrls(newValue);

        console.log(`📊 删除检测统计:`);
        console.log(`   旧内容媒体文件数量: ${oldUrls.length}`);
        console.log(`   新内容媒体文件数量: ${newUrls.length}`);
        console.log(`   旧内容URL: ${JSON.stringify(oldUrls, null, 2)}`);
        console.log(`   新内容URL: ${JSON.stringify(newUrls, null, 2)}`);

        // 找出被删除的URL
        const deletedUrls = oldUrls.filter(url => !newUrls.includes(url));

        console.log(`🗑️ 检测到被删除的文件数量: ${deletedUrls.length}`);

        if (deletedUrls.length === 0) {
          console.log('ℹ️ 没有检测到媒体文件被删除');
          return;
        }

        // 异步删除云端文件
        deletedUrls.forEach(url => {
          // 确定文件类型
          const fileType = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? '图片' :
            url.match(/\.(mp4|webm|ogg|avi)$/i) ? '视频' : '媒体';

          console.log(`🎯 检测到${fileType}文件被删除:`);
          console.log(`   📄 文件类型: ${fileType}`);
          console.log(`   🔗 文件URL: ${url}`);
          console.log(`   📅 删除时间: ${new Date().toLocaleString()}`);

          deleteCloudFile(url).catch(error => {
            console.error(`❌ 异步删除云端${fileType}文件失败:`, error);
          });
        });

      } catch (error) {
        console.error('❌ 媒体文件删除检测失败:', error);
      }
    }, [deleteCloudFile]);

    // 处理粘贴事件
    const handlePaste = useCallback((event: React.ClipboardEvent) => {
      console.log('RichTextEditor: Paste event triggered');

      const clipboardData = event.clipboardData;
      if (!clipboardData) {
        console.log('RichTextEditor: No clipboard data available');
        return;
      }

      const pastedText = clipboardData.getData('text/plain');
      console.log('RichTextEditor: Pasted text length:', pastedText.length);
      console.log('RichTextEditor: Pasted text preview:', pastedText.substring(0, 100) + '...');

      if (!pastedText || pastedText.length < 10) {
        console.log('RichTextEditor: Text too short for Markdown detection');
        return;
      }

      // 🔥 关键优化：检测长URL，跳过Markdown检测
      const trimmedText = pastedText.trim();
      if (trimmedText.length > 500) {
        // 检查是否是纯URL（没有空格、换行等）
        const hasSpacesOrNewlines = /[\s\n\r]/.test(trimmedText);
        const looksLikeUrl = /^https?:\/\/[^\s]+$/i.test(trimmedText.substring(0, 100));

        if (!hasSpacesOrNewlines && looksLikeUrl) {
          console.log('🚀 检测到长URL，跳过Markdown检测以避免卡死');
          return; // 直接返回，使用默认粘贴行为
        }

        // 如果是超长文本但不是URL，限制检测长度
        console.log('📄 文本较长，使用优化检测');
      }

      // 检测是否为Markdown格式
      try {
        console.log('🔍 开始Markdown检测...');
        const result = detectMarkdown(pastedText);
        console.log('RichTextEditor: Markdown detection result:', result);

        // 如果检测到Markdown且置信度较高，直接自动切换
        if (result.isMarkdown && result.confidence > 0.4) {
          console.log('RichTextEditor: Auto-switching to Markdown mode');
          event.preventDefault(); // 阻止默认粘贴行为

          // 直接调用回调函数，让卡片自动切换到Markdown模式
          if (onMarkdownDetected) {
            onMarkdownDetected(pastedText, result.confidence, result.features);
          }
        }
      } catch (error) {
        console.error('❌ Markdown检测过程中出错:', error);
        // 出错时不阻止默认粘贴行为
      }
    }, [onMarkdownDetected]);



    // 重写 handleChange，移除 splitDescendantsToTags 以避免光标问题
    const handleChange = (value: Descendant[]) => {
      setLocalValue(value);
      onChange?.(value);

      // 提取所有标签并去重，通知外部
      const allTags = extractTags(value);
      onTagsChange?.(allTags);
    };

    // picker 状态
    const [showIconPicker, setShowIconPicker] = React.useState(false);
    const [iconPickerPos, setIconPickerPos] = React.useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const lastSelectionRef = React.useRef<Range | null>(null);
    const isPickerOpenRef = React.useRef(false);

    React.useEffect(() => {
      isPickerOpenRef.current = showIconPicker;
    }, [showIconPicker]);

    // 斜杠命令功能项
    const SLASH_COMMANDS = [
      { label: '一级标题', type: 'heading-one', desc: '大标题', icon: 'H1' },
      { label: '二级标题', type: 'heading-two', desc: '中标题', icon: 'H2' },
      { label: '无序列表', type: 'bulleted-list', desc: '• 项目符号', icon: '•' },
      { label: '有序列表', type: 'numbered-list', desc: '1. 有序', icon: '1.' },
      { label: '待办列表', type: 'todo-list', desc: '☐ 待办', icon: '☐' },
      { label: '虚线分割', type: 'dashed-divider', desc: '---', icon: '⋯' },
      { label: '实线分割', type: 'divider', desc: '——', icon: '—' },
      { label: 'icon', type: 'icon', desc: '插入图标', icon: '😊' },
      { label: '插入图片/视频', type: 'media', desc: '本地上传图片或视频', icon: '🖼️' },
    ];

    const [showSlashMenu, setShowSlashMenu] = React.useState(false);
    const [slashMenuPos, setSlashMenuPos] = React.useState<{ x: number, y: number }>({ x: 0, y: 0 });
    const [slashMenuIndex, setSlashMenuIndex] = React.useState(0);
    const [slashInput, setSlashInput] = React.useState('');

    // 监听 / 触发弹窗
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (readOnly) return;

      // 体验优化：输入新字符时自动清除 mark
      if (
        event.key.length === 1 && // 只处理可见字符
        !event.ctrlKey && !event.metaKey && !event.altKey &&
        editor.selection && Range.isCollapsed(editor.selection)
      ) {
        const marks = Editor.marks(editor) || {};
        // 只要有 color/bgColor/underline/bold/link 就清除
        if ((marks as any).color || (marks as any).bgColor || (marks as any).underline || (marks as any).bold || (marks as any).link) {
          // 判断光标是否在带 mark 的末尾
          const [node, path] = Editor.node(editor, editor.selection.focus.path);
          const offset = editor.selection.focus.offset;
          const text = Editor.string(editor, path);
          if (offset === text.length) {
            if ((marks as any).color) Editor.removeMark(editor, 'color');
            if ((marks as any).bgColor) Editor.removeMark(editor, 'bgColor');
            if ((marks as any).underline) Editor.removeMark(editor, 'underline');
            if ((marks as any).bold) Editor.removeMark(editor, 'bold');
            if ((marks as any).link) Editor.removeMark(editor, 'link');
          }
        }
      }

      // Tab/Shift+Tab 只做 blockquote 嵌套
      if (event.key === 'Tab') {
        event.preventDefault();
        const currentSelection = editor.selection;
        if (currentSelection && Range.isCollapsed(currentSelection)) {
          const [match] = Editor.nodes(editor, {
            match: n => SlateElement.isElement(n),
          }) as any;
          if (match) {
            const [node, path] = match;
            const isBlockquote = node.type === 'blockquote';
            const currentLevel = (node as any).blockquoteLevel || 0;
            if (event.shiftKey) {
              // Shift+Tab：减少嵌套
              if (isBlockquote && currentLevel > 1) {
                Transforms.setNodes(editor, { ...node, blockquoteLevel: currentLevel - 1 } as any, { at: path });
              } else if (isBlockquote && currentLevel === 1) {
                // 变回普通段落
                Transforms.setNodes(editor, { type: 'paragraph', blockquoteLevel: undefined } as any, { at: path });
              }
            } else {
              // Tab：增加嵌套
              if (isBlockquote) {
                Transforms.setNodes(editor, { ...node, blockquoteLevel: currentLevel + 1 } as any, { at: path });
              } else {
                Transforms.setNodes(editor, { type: 'blockquote', blockquoteLevel: 1 } as any, { at: path });
              }
            }
          }
        }
        return;
      }

      // 斜杠命令弹窗
      if (event.key === '/' && !showSlashMenu) {
        const domSelection = window.getSelection();
        if (domSelection && domSelection.rangeCount > 0 && editorContainerRef.current) {
          const range = domSelection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const containerRect = editorContainerRef.current.getBoundingClientRect();
          setSlashMenuPos({ x: rect.left - containerRect.left, y: rect.bottom - containerRect.top });
        }
        setShowSlashMenu(true);
        setSlashMenuIndex(0);
        setSlashInput('');
        return;
      }
      // 斜杠菜单交互
      if (showSlashMenu) {
        if (event.key === 'ArrowDown') {
          setSlashMenuIndex(i => Math.min(i + 1, filteredSlashCommands.length - 1));
          event.preventDefault();
          return;
        }
        if (event.key === 'ArrowUp') {
          setSlashMenuIndex(i => Math.max(i - 1, 0));
          event.preventDefault();
          return;
        }
        if (event.key === 'Enter') {
          handleSlashSelect(filteredSlashCommands[slashMenuIndex]);
          event.preventDefault();
          return;
        }
        if (event.key === 'Escape') {
          setShowSlashMenu(false);
          event.preventDefault();
          return;
        }
        // 支持输入过滤
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          setSlashInput(slashInput + event.key);
          return;
        }
        if (event.key === 'Backspace') {
          setSlashInput(slashInput.slice(0, -1));
          return;
        }
      }

      // 实时标签识别：输入分隔符时立即触发 handleChange
      if (
        event.key === 'Enter' ||
        event.key === ' ' ||
        event.key === 'Spacebar' ||
        event.key === '，' ||
        event.key === ',' ||
        event.key === '。' ||
        event.key === '.'
      ) {
        setTimeout(() => {
          handleChange(editor.children as any);
        }, 0);
      }
    };

    // 过滤斜杠命令
    const filteredSlashCommands = React.useMemo(() => {
      if (!slashInput) return SLASH_COMMANDS;
      return SLASH_COMMANDS.filter(cmd => cmd.label.includes(slashInput) || cmd.desc.includes(slashInput));
    }, [slashInput]);

    // 斜杠命令插入逻辑
    const handleSlashSelect = (cmd: typeof SLASH_COMMANDS[0]) => {
      if (readOnly) return;
      setShowSlashMenu(false);
      if (!editor.selection) return;
      // icon 特殊处理：弹出图标选择器，并定位到光标附近
      if (cmd.type === 'icon') {
        // 获取光标位置
        const domSelection = window.getSelection();
        if (domSelection && domSelection.rangeCount > 0) {
          const range = domSelection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          // 直接用视口坐标，配合 position: fixed
          setIconPickerPos({ x: rect.left, y: rect.bottom });
        }
        setShowIconPicker(true);
        return;
      }
      // 新增：插入图片/视频
      if (cmd.type === 'media') {
        // 先删除 / 及其前缀
        Transforms.delete(editor, { unit: 'character', reverse: true, distance: slashInput.length + 1 });
        // 创建一个隐藏的文件选择框
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.multiple = false;
        input.onchange = async (e: any) => {
          const file = e.target.files[0];
          if (!file) return;
          // 🔥 优先使用云端上传，失败时降级到base64
          if (file.type.startsWith('image/')) {
            // 暂时存储插入位置
            const currentSelection = editor.selection;

            // 异步上传图片
            (async () => {
              try {
                let imageUrl: string;
                console.log(`🖼️ 开始处理图片: ${file.name}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

                // 尝试云端上传
                if (aliCloudStorage.isReady()) {
                  console.log(`📤 尝试上传图片到云端: ${file.name}`);
                  const timestamp = Date.now();
                  const randomStr = Math.random().toString(36).substring(2, 8);
                  const fileExtension = file.name.split('.').pop() || 'jpg';
                  const fileName = `${timestamp}-${randomStr}.${fileExtension}`;
                  const filePath = `images/${fileName}`;

                  const result = await aliCloudStorage.uploadFile(filePath, file);

                  if (result.success && result.url) {
                    console.log(`✅ 图片云端上传成功: ${result.url}`);
                    imageUrl = result.url;
                  } else {
                    console.warn('⚠️ 云端上传失败，使用本地存储:', result.error);
                    imageUrl = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        console.log(`📁 本地base64转换完成, 数据长度: ${(reader.result as string).length}`);
                        resolve(reader.result as string);
                      };
                      reader.onerror = () => {
                        console.error('❌ FileReader错误');
                        resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y5ZmFmYiIgc3Ryb2tlPSIjZDFkNWRiIi8+PHRleHQgeD0iMTAwIiB5PSI1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNmI3MjgwIj7liqDovb3lpLHotKU8L3RleHQ+PC9zdmc+');
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                } else {
                  console.log('☁️ 云端存储不可用，使用本地base64存储');
                  imageUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      console.log(`📁 本地base64转换完成, 数据长度: ${(reader.result as string).length}`);
                      resolve(reader.result as string);
                    };
                    reader.onerror = () => {
                      console.error('❌ FileReader错误');
                      resolve('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y5ZmFmYiIgc3Ryb2tlPSIjZDFkNWRiIi8+PHRleHQgeD0iMTAwIiB5PSI1NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNmI3MjgwIj7liqDovb3lpLHotKU8L3RleHQ+PC9zdmc+');
                    };
                    reader.readAsDataURL(file);
                  });
                }

                // 直接在当前位置插入图片
                console.log(`🎯 直接插入图片: ${imageUrl.substring(0, 100)}...`);

                if (currentSelection) {
                  Transforms.select(editor, currentSelection);
                }

                const imageNode = { type: 'image', url: imageUrl, children: [{ text: '' }] } as any;
                Transforms.insertNodes(editor, [imageNode, { type: 'paragraph', children: [{ text: '' }] }]);
                console.log(`✅ 图片插入完成!`);
              } catch (error) {
                console.error('❌ 图片处理失败:', error);
                // 移除加载中的图片节点
                const [imageEntry] = Editor.nodes(editor, {
                  match: (n: any) => n.type === 'image' && n.loading === true,
                });
                if (imageEntry) {
                  const [, imagePath] = imageEntry;
                  Transforms.removeNodes(editor, { at: imagePath });
                }
              }
            })();
          } else if (file.type.startsWith('video/')) {
            // 视频文件处理 - 支持云端上传
            const currentSelection = editor.selection;

            // 异步上传视频
            (async () => {
              try {
                let videoUrl: string;
                console.log(`🎬 开始处理视频: ${file.name}, 大小: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

                // 尝试云端上传
                if (aliCloudStorage.isReady()) {
                  console.log(`📤 尝试上传视频到云端: ${file.name}`);
                  const timestamp = Date.now();
                  const randomStr = Math.random().toString(36).substring(2, 8);
                  const fileExtension = file.name.split('.').pop() || 'mp4';
                  const fileName = `${timestamp}-${randomStr}.${fileExtension}`;
                  const filePath = `videos/${fileName}`;

                  const result = await aliCloudStorage.uploadFile(filePath, file);

                  if (result.success && result.url) {
                    console.log(`✅ 视频云端上传成功: ${result.url}`);
                    videoUrl = result.url;
                  } else {
                    console.warn('⚠️ 视频云端上传失败，使用本地存储:', result.error);
                    videoUrl = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        console.log(`📁 视频本地base64转换完成, 数据长度: ${(reader.result as string).length}`);
                        resolve(reader.result as string);
                      };
                      reader.onerror = () => {
                        console.error('❌ 视频FileReader错误');
                        resolve('data:video/mp4;base64,'); // 空视频占位符
                      };
                      reader.readAsDataURL(file);
                    });
                  }
                } else {
                  console.log('☁️ 云端存储不可用，视频使用本地base64存储');
                  videoUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                      console.log(`📁 视频本地base64转换完成, 数据长度: ${(reader.result as string).length}`);
                      resolve(reader.result as string);
                    };
                    reader.onerror = () => {
                      console.error('❌ 视频FileReader错误');
                      resolve('data:video/mp4;base64,'); // 空视频占位符
                    };
                    reader.readAsDataURL(file);
                  });
                }

                // 直接在当前位置插入视频
                console.log(`🎯 直接插入视频: ${videoUrl.substring(0, 100)}...`);

                if (currentSelection) {
                  Transforms.select(editor, currentSelection);
                }

                const videoNode = { type: 'video', url: videoUrl, children: [{ text: '' }] } as any;
                Transforms.insertNodes(editor, [videoNode, { type: 'paragraph', children: [{ text: '' }] }]);
                console.log(`✅ 视频插入完成!`);
              } catch (error) {
                console.error('❌ 视频处理失败:', error);
                // 移除加载中的视频节点（如果有的话）
                const [videoEntry] = Editor.nodes(editor, {
                  match: (n: any) => n.type === 'video' && n.loading === true,
                });
                if (videoEntry) {
                  const [, videoPath] = videoEntry;
                  Transforms.removeNodes(editor, { at: videoPath });
                }
              }
            })();
          }
        };
        input.click();
        return;
      }
      // 1. 删除 / 及其前缀
      Transforms.delete(editor, { unit: 'character', reverse: true, distance: slashInput.length + 1 }); // +1 包含斜杠本身
      // 2. 获取当前 block
      const [blockEntry] = Editor.nodes(editor, {
        match: (n: any) => Editor.isBlock(editor, n as any) && SlateElement.isElement(n),
      });
      if (!blockEntry) return;
      const [blockNode, blockPath] = blockEntry as [SlateElement, Path];
      // 3. 构造新块
      let newBlock: any = null;
      switch (cmd.type) {
        case 'heading-one':
        case 'heading-two':
        case 'heading-three':
        case 'bulleted-list':
        case 'numbered-list':
        case 'todo-list':
          newBlock = { type: cmd.type, children: [{ text: '' }] } as any;
          break;
        case 'divider':
        case 'dashed-divider': {
          newBlock = { type: cmd.type, children: [{ text: '' }] } as any;
          // 4. 用新块替换当前 block
          Transforms.removeNodes(editor, { at: blockPath });
          Transforms.insertNodes(editor, newBlock, { at: blockPath });
          // 在分割线后插入空段落
          const nextPath = Path.next(blockPath);
          Transforms.insertNodes(editor, { type: 'paragraph', children: [{ text: '' }] } as any, { at: nextPath });
          // 光标移动到新段落
          Transforms.select(editor, Editor.start(editor, nextPath));
          return;
        }
        default:
          newBlock = { type: 'paragraph', children: [{ text: '' }] } as any;
      }
      // 4. 用新块替换当前 block
      if (newBlock) {
        Transforms.removeNodes(editor, { at: blockPath });
        Transforms.insertNodes(editor, newBlock, { at: blockPath });
        // 5. 移动 selection 到新块
        Transforms.select(editor, Editor.start(editor, blockPath));
      }
    };

    // 只在 picker 关闭时才允许更新 selection
    const handleSelect = () => {
      if (!isPickerOpenRef.current) {
        lastSelectionRef.current = editor.selection;
      }
    };

    // 新增：暴露插入图片节点的方法
    const insertImage = useCallback((url: string) => {
      if (!editor) return;
      const imageNode = { type: 'image', url, children: [{ text: '' }] } as any;
      Transforms.insertNodes(editor, [imageNode, { type: 'paragraph', children: [{ text: '' }] }]);
    }, [editor]);

    // 新增：onInsertImage props 支持
    React.useEffect(() => {
      if (onInsertImage) {
        onInsertImage(insertImage);
      }
    }, [onInsertImage, insertImage]);

    // 只读模式下过滤所有末尾空 block
    const filteredValue = React.useMemo(() => {
      if (!readOnly || !localValue || localValue.length === 0) return localValue;
      let end = localValue.length;
      while (end > 0) {
        const node = localValue[end - 1] as any;
        if (
          (node.type === 'paragraph' || node.type === 'div' || node.type === 'block-quote') &&
          node.children &&
          node.children.length === 1 &&
          node.children[0].text === ''
        ) {
          end--;
        } else {
          break;
        }
      }
      return localValue.slice(0, end);
    }, [readOnly, localValue]);

    // RichTextEditor 组件体内，新增临时网页卡片状态
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [previewPos, setPreviewPos] = React.useState<{ x: number, y: number } | null>(null);
    const [previewSize, setPreviewSize] = React.useState({ width: 420, height: 320 });
    const [isDragging, setIsDragging] = React.useState(false);
    const [isResizing, setIsResizing] = React.useState(false);
    const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });

    // 支持 Ctrl+Enter 快捷键跳转和 Escape 关闭预览
    React.useEffect(() => {
      if (!previewUrl || !previewPos) return;

      const handler = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          window.open(previewUrl, '_blank');
        }
        if (e.key === 'Escape') {
          setPreviewUrl(null);
          setPreviewPos(null);
        }
      };

      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [previewUrl, previewPos]);

    // 点击其他区域关闭预览卡片
    React.useEffect(() => {
      if (!previewUrl) return;

      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const previewCard = document.getElementById('preview-card');
        if (previewCard && !previewCard.contains(target)) {
          setPreviewUrl(null);
          setPreviewPos(null);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [previewUrl]);

    // 富文本渲染 - 移动到组件内部以正确使用Hooks
    const renderElement = React.useCallback((props: any) => {
      const { attributes, children, element } = props;
      const { isDarkMode } = useContext(ThemeContext);

      // 计算缩进
      const indent = element.indent || 0;
      const indentSize = 24; // 每级缩进24px
      const leftMargin = indent * indentSize;

      // 简单的包装元素，只处理缩进和对齐
      const wrapWithIndent = (content: React.ReactNode, style: React.CSSProperties = {}) => (
        <div
          {...(attributes as any)}
          style={{
            paddingLeft: leftMargin,
            position: 'relative',
            minHeight: '1.4em',
            textAlign: element.align || 'inherit', // 支持 align
            width: '100%',
            ...style
          }}
          data-indent={indent}
        >
          {content as any}
        </div>
      );

      switch (element.type) {
        case 'tag':
          return <TagElement {...props} editor={editor} readOnly={readOnly} />;
        case 'heading-one':
          return wrapWithIndent(
            <h1 style={{
              fontSize: '1.5em',
              fontWeight: 'bold',
              margin: '0.4em 0 0.2em 0',
              lineHeight: '1.6',
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}>{children}</h1>
          );
        case 'heading-two':
          return wrapWithIndent(
            <h2 style={{
              fontSize: '1.25em',
              fontWeight: 'bold',
              margin: '0.4em 0 0.2em 0',
              lineHeight: '1.6',
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}>{children}</h2>
          );
        case 'bulleted-list':
          return wrapWithIndent(
            <div style={{ display: 'flex', alignItems: 'flex-start', margin: '0.2em 0', paddingLeft: '8px' }}>
              <span style={{ marginRight: '8px', minWidth: '16px', fontSize: '16px', color: isDarkMode ? '#9ca3af' : '#666', lineHeight: '1.6', userSelect: 'none' }}>•</span>
              <div style={{ flex: 1, lineHeight: '1.6', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{children}</div>
            </div>
          );
        case 'numbered-list':
          return wrapWithIndent(
            <div style={{ display: 'flex', alignItems: 'flex-start', margin: '0.2em 0', paddingLeft: '8px' }}>
              <span style={{ marginRight: '8px', minWidth: '24px', fontSize: '14px', color: isDarkMode ? '#9ca3af' : '#666', lineHeight: '1.6', userSelect: 'none' }}>1.</span>
              <div style={{ flex: 1, lineHeight: '1.6', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{children}</div>
            </div>
          );
        case 'todo-list':
          return wrapWithIndent(
            <div style={{ display: 'flex', alignItems: 'center', margin: '0.2em 0', paddingLeft: '8px' }}>
              <input
                type="checkbox"
                checked={element.checked || false}
                readOnly
                style={{
                  marginRight: 8,
                  marginTop: '0px',
                  cursor: 'pointer',
                  transform: 'scale(1.1)',
                  flexShrink: 0,
                  accentColor: isDarkMode ? '#60a5fa' : '#3b82f6'
                }}
              />
              <div style={{
                flex: 1,
                lineHeight: '1.6',
                textDecoration: element.checked ? 'line-through' : 'none',
                opacity: element.checked ? 0.6 : 1,
                transition: 'all 0.2s ease',
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }}>{children}</div>
            </div>
          );
        case 'divider':
          return wrapWithIndent(
            <hr style={{ border: 'none', borderTop: isDarkMode ? '2px solid #4b5563' : '2px solid #e0e0e0', margin: '8px 0 0 0' }} />
          );
        case 'dashed-divider':
          return wrapWithIndent(
            <hr style={{ border: 'none', borderTop: isDarkMode ? '2px dashed #4b5563' : '2px dashed #e0e0e0', margin: '8px 0 0 0' }} />
          );
        case 'image': {
          // 如果是图标，使用简单的内联渲染
          if ((element as any).isIcon) {
            return (
              <span
                {...attributes}
                contentEditable={false}
                style={{
                  display: 'inline-block',
                  verticalAlign: 'middle',
                  margin: '0 2px',
                }}
              >
                <img
                  src={(element as any).url}
                  alt="图标"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    objectFit: 'contain',
                  }}
                  draggable={false}
                />
              </span>
            );
          }

          const editorStatic = useSlateStatic();
          const selected = useSelected ? useSelected() : false;
          let isSelected = false;
          try {
            const { selection } = editorStatic;
            if (selection) {
              const path = ReactEditor.findPath(editorStatic as any, element);
              isSelected = Range.includes(selection, path);
            }
          } catch { }

          // 图片调整大小逻辑
          const ImageResizer: React.FC<{ element: any, path: any }> = ({ element: imgElement, path: imgPath }) => {
            const [resizing, setResizing] = React.useState(false);
            const [hovering, setHovering] = React.useState(false);

            const handleResizeMouseDown = (e: React.MouseEvent) => {
              if (readOnly) return;
              e.stopPropagation();
              e.preventDefault();
              setResizing(true);

              const startX = e.clientX;
              const startY = e.clientY;
              const startWidth = imgElement.width || 320;
              const startHeight = imgElement.height || 240;

              const onMouseMove = (e: MouseEvent) => {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;

                const minWidth = 100;
                const minHeight = 75;

                // 右下角拖拽：同时调整宽度和高度
                const newWidth = Math.max(minWidth, startWidth + deltaX);
                const newHeight = Math.max(minHeight, startHeight + deltaY);

                // 更新图片尺寸
                const newProperties = {
                  ...imgElement,
                  width: newWidth,
                  height: newHeight
                };
                Transforms.setNodes(editorStatic, newProperties, { at: imgPath });
              };

              const onMouseUp = () => {
                setResizing(false);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };

              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            };

            // 调整手柄样式
            const handleStyle = () => ({
              position: 'absolute' as const,
              width: '8px',
              height: '8px',
              backgroundColor: '#3b82f6',
              border: '1px solid #ffffff',
              borderRadius: '2px',
              cursor: 'se-resize',
              opacity: (isSelected || hovering) && !readOnly ? 1 : 0,
              transition: 'opacity 0.2s',
              zIndex: 1000,
              bottom: -4,
              right: -4,
            });



            return (
              <span
                {...attributes}
                contentEditable={false}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                style={{
                  display: 'block',
                  position: 'relative',
                  width: (imgElement.width || 320) + 'px',
                  height: 'auto',
                  margin: '8px auto',
                  //@ts-ignore
                  boxShadow: isSelected ? '0 0 0 2px #6366f1' : 'none',
                  borderRadius: 8,
                  background: '#fff',
                  transition: 'box-shadow 0.2s',
                  cursor: resizing ? 'grabbing' : 'default',
                }}
              >
                <img
                  src={imgElement.url}
                  alt="图片"
                  style={{
                    width: '100%',
                    height: imgElement.height ? imgElement.height + 'px' : 'auto',
                    maxWidth: '100%',
                    objectFit: imgElement.height ? 'cover' : 'contain',
                    display: 'block',
                    borderRadius: 8,
                  }}
                  draggable={false}
                />

                {/* 调整大小手柄 - 只显示右下角 */}
                {!readOnly && (
                  <div
                    style={handleStyle()}
                    onMouseDown={handleResizeMouseDown}
                  />
                )}
              </span>
            );
          };

          // 获取当前图片路径
          let imagePath;
          try {
            imagePath = ReactEditor.findPath(editorStatic as any, element);
          } catch {
            // 如果无法获取路径，使用简单的图片渲染
            const width = element.width || 320;
            return (
              <span
                {...attributes}
                contentEditable={false}
                style={{
                  display: 'block',
                  position: 'relative',
                  width: width + 'px',
                  margin: '0 auto',
                  //@ts-ignore
                  boxShadow: isSelected ? '0 0 0 2px #6366f1' : 'none',
                  borderRadius: 8,
                  background: '#fff',
                  transition: 'box-shadow 0.2s',
                }}
              >
                <img
                  src={element.url}
                  alt="图片"
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    borderRadius: 8,
                  }}
                  draggable={false}
                />
              </span>
            );
          }

          return <ImageResizer element={element} path={imagePath} />;
        }
        case 'video': {
          // 视频调整大小逻辑 - 与图片相同
          const VideoResizer: React.FC<{ element: any, path: any }> = ({ element: videoElement, path: videoPath }) => {
            const [resizing, setResizing] = React.useState(false);
            const [hovering, setHovering] = React.useState(false);
            const isSelected = useSelected();

            const handleResizeMouseDown = (e: React.MouseEvent) => {
              if (readOnly) return;
              e.stopPropagation();
              e.preventDefault();
              setResizing(true);

              const startX = e.clientX;
              const startY = e.clientY;
              const startWidth = videoElement.width || 320;
              const startHeight = videoElement.height || 240;

              const onMouseMove = (e: MouseEvent) => {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;

                const minWidth = 200;
                const minHeight = 150;

                // 右下角拖拽：同时调整宽度和高度
                const newWidth = Math.max(minWidth, startWidth + deltaX);
                const newHeight = Math.max(minHeight, startHeight + deltaY);

                // 更新视频尺寸
                const newProperties = {
                  ...videoElement,
                  width: newWidth,
                  height: newHeight
                };
                Transforms.setNodes(editor, newProperties, { at: videoPath });
              };

              const onMouseUp = () => {
                setResizing(false);
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
              };

              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            };

            // 调整手柄样式
            const handleStyle = () => ({
              position: 'absolute' as const,
              width: '8px',
              height: '8px',
              backgroundColor: '#3b82f6',
              border: '1px solid #ffffff',
              borderRadius: '2px',
              cursor: 'se-resize',
              opacity: (isSelected || hovering) && !readOnly ? 1 : 0,
              transition: 'opacity 0.2s',
              zIndex: 1000,
              bottom: -4,
              right: -4,
            });

            return (
              <span
                {...attributes}
                contentEditable={false}
                onMouseEnter={() => setHovering(true)}
                onMouseLeave={() => setHovering(false)}
                style={{
                  display: 'block',
                  position: 'relative',
                  width: (videoElement.width || 320) + 'px',
                  height: 'auto',
                  margin: 0, // 🔥 移除margin避免空白
                  //@ts-ignore
                  boxShadow: isSelected ? '0 0 0 2px #6366f1' : 'none',
                  borderRadius: 8,
                  background: '#fff',
                  transition: 'box-shadow 0.2s',
                  cursor: resizing ? 'grabbing' : 'default',
                }}
              >
                <video
                  src={videoElement.url}
                  controls
                  style={{
                    width: '100%',
                    height: videoElement.height ? videoElement.height + 'px' : 'auto',
                    maxWidth: '100%',
                    objectFit: videoElement.height ? 'cover' : 'contain',
                    display: 'block',
                    borderRadius: 8,
                    background: '#000',
                  }}
                />

                {/* 调整大小手柄 - 只显示右下角 */}
                {!readOnly && (
                  <div
                    style={handleStyle()}
                    onMouseDown={handleResizeMouseDown}
                  />
                )}
              </span>
            );
          };

          // 获取当前视频路径
          let videoPath;
          try {
            videoPath = ReactEditor.findPath(editor, element);
          } catch {
            // 如果无法获取路径，使用简单的视频渲染
            const width = (element as VideoElement).width || 320;
            return (
              <span
                {...attributes}
                contentEditable={false}
                style={{
                  display: 'block',
                  position: 'relative',
                  width: width + 'px',
                  margin: 0,
                  //@ts-ignore
                  boxShadow: isSelected ? '0 0 0 2px #6366f1' : 'none',
                  borderRadius: 8,
                  background: '#fff',
                  transition: 'box-shadow 0.2s',
                }}
              >
                <video
                  src={(element as VideoElement).url}
                  controls
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    borderRadius: 8,
                    background: '#000',
                  }}
                />
              </span>
            );
          }

          return <VideoResizer element={element} path={videoPath} />;
        }
        case 'blockquote': {
          const level = element.blockquoteLevel || 1;
          return (
            <blockquote
              {...attributes}
              style={{
                borderLeft: `${level * 2}px solid #bdbdbd`,
                margin: 0,
                marginLeft: 0,
                paddingLeft: 8 + (level - 1) * 10,
                background: level > 1 ? '#f7f7fa' : 'transparent',
                color: '#888',
              }}
            >
              {children}
            </blockquote>
          );
        }
        default:
          return wrapWithIndent(
            <div style={{
              lineHeight: '1.6',
              minHeight: '1.4em',
              width: '100%',
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}>{children as any}</div>
          );
      }
    }, [setPreviewUrl, setPreviewPos, readOnly]);

    // 链接渲染函数，移入组件内部以访问state
    const renderLeaf = useCallback((props: any) => {
      const { attributes, children, leaf } = props;
      let style: React.CSSProperties = {};
      if (leaf.bold) style.fontWeight = 'bold';
      if (leaf.underline) style.textDecoration = 'underline';
      if (leaf.color) style.color = leaf.color;
      if (leaf.bgColor) {
        style.background = leaf.bgColor;
        // 自动判断文字颜色
        const hex = leaf.bgColor.replace('#', '');
        const rgb = hex.length === 6 ? [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)] : [255, 255, 255];
        const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
        style.color = luminance > 0.6 ? '#222' : '#fff';
      }
      if (leaf.link) {
        style.textDecoration = 'underline';
        style.color = '#2563eb';
        style.cursor = 'pointer';

        // 为链接添加点击事件
        return (
          <span
            {...attributes}
            style={style}
            onClick={e => {
              e.preventDefault();
              // 获取鼠标点击位置
              const mouseX = e.clientX;
              const mouseY = e.clientY;

              setPreviewUrl(leaf.link);
              setPreviewPos({ x: mouseX, y: mouseY });
            }}
          >
            {children}
          </span>
        );
      }
      return <span {...attributes} style={style}>{children}</span>;
    }, [setPreviewUrl, setPreviewPos]);

    return (
      <Slate editor={editor} initialValue={filteredValue} onChange={handleChange}>
        <div
          ref={editorContainerRef}
          className="editor-container"
          style={{
            position: 'relative',
            minHeight: '1.5em',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            // 继承父容器的对齐设置
            justifyContent: 'inherit',
            alignItems: 'inherit',
            textAlign: 'inherit',
            // 🔥 应用传入的padding到容器级别，而不是Editable组件
            padding: style?.padding || 0,
          }}
        >
          {/* 只读时不渲染悬浮工具栏 */}
          {!readOnly && <HoveringToolbar editor={editor} />}
          {indentLines}
          <Editable
            renderElement={props => {
              if ('type' in props.element && props.element.type === 'tag') {
                return <TagElement {...props} editor={editor} readOnly={readOnly} />;
              }
              return renderElement(props);
            }}
            renderLeaf={renderLeaf}
            placeholder="请输入内容..."
            spellCheck
            autoFocus={autoFocus}
            onBlur={onBlur}
            onKeyDown={readOnly ? undefined : handleKeyDown}
            onPaste={readOnly ? undefined : handlePaste}
            onSelect={handleSelect}
            readOnly={readOnly}
            style={{
              minHeight: 24,
              outline: 'none',
              background: 'transparent',
              fontSize: 16,
              position: 'relative',
              zIndex: 2,
              width: '100%',
              height: style?.height || 'auto', // 🔥 优先使用传入的高度设置，默认auto
              lineHeight: style?.lineHeight || 1.6, // 🔥 支持传入行高设置
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: style?.whiteSpace || 'normal', // 🔥 支持传入空白符处理
              // 🔥 应用样式但排除padding，因为padding已经应用到容器上
              ...Object.fromEntries(Object.entries(style || {}).filter(([key]) => key !== 'padding')),
              display: 'flex',
              flexDirection: 'column',
              justifyContent: style?.justifyContent || 'inherit',
              alignItems: style?.alignItems || 'inherit',
            }}
          />
        </div>
        {/* Icon picker 弹窗 */}
        {showIconPicker && !readOnly && ReactDOM.createPortal(
          <div
            style={{
              position: 'fixed',
              left: iconPickerPos.x,
              top: iconPickerPos.y,
              zIndex: 2001,
              background: isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              border: isDarkMode ? '1px solid rgba(75, 85, 99, 0.8)' : '1px solid rgba(229, 231, 235, 0.8)',
              borderRadius: 12,
              boxShadow: isDarkMode
                ? '0 8px 32px rgba(0, 0, 0, 0.6), 0 4px 16px rgba(0, 0, 0, 0.4)'
                : '0 8px 32px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              padding: 10,
              minWidth: 280,
              maxWidth: 420,
              width: '100%',
              overflow: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              gap: 8,
              maxHeight: 220,
              overflowY: 'auto',
            }}>
              {iconList.map(icon => (
                <button
                  key={icon.name}
                  style={{
                    border: 'none',
                    background: 'none',
                    margin: 0,
                    padding: 2,
                    cursor: 'pointer',
                    borderRadius: 8,
                    width: 30,
                    height: 30,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDarkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(243, 244, 246, 0.8)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  onMouseDown={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const selection = editor.selection;
                    if (selection && Range.isCollapsed(selection)) {
                      // 自动查找并删除最近的 /命令
                      const { anchor } = selection;
                      const blockEntry = Editor.above(editor, { match: (n: any) => Editor.isBlock(editor, n as any) });
                      if (blockEntry) {
                        const [blockNode, blockPath] = blockEntry;
                        const blockText = Editor.string(editor, blockPath);
                        const beforeText = blockText.slice(0, anchor.offset);
                        const slashIndex = beforeText.lastIndexOf('/');
                        if (slashIndex !== -1) {
                          const from = { path: anchor.path, offset: slashIndex };
                          const to = anchor;
                          Transforms.delete(editor, { at: { anchor: from, focus: to } });
                        }
                      }
                      // 插入内联图标节点（作为image类型，但标记为icon）
                      const iconNode = { type: 'image', url: icon.url, isIcon: true, children: [{ text: '' }] } as any;
                      Transforms.insertNodes(editor, iconNode);
                      setShowIconPicker(false);
                      return;
                    }
                    ReactEditor.focus(editor as ReactEditor);
                    // 兜底：直接插入内联图标节点
                    const iconNode = { type: 'image', url: icon.url, isIcon: true, children: [{ text: '' }] } as any;
                    Transforms.insertNodes(editor, iconNode);
                    setShowIconPicker(false);
                  }}
                >
                  <img
                    src={icon.url}
                    alt={icon.name}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: isDarkMode ? 'rgba(55, 65, 81, 0.6)' : 'rgba(243, 244, 246, 0.8)'
                    }}
                  />
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
        {/* 只读时不渲染斜杠菜单 */}
        {showSlashMenu && !readOnly && (
          <div
            style={{
              position: 'absolute',
              left: slashMenuPos.x,
              top: slashMenuPos.y,
              zIndex: 10001,
              background: isDarkMode ? '#23272e' : '#fff',
              border: '1px solid #eee',
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              minWidth: 180,
              padding: 4,
              fontSize: 15,
              color: isDarkMode ? '#f3f4f6' : '#222',
            }}
          >
            {filteredSlashCommands.length === 0 ? (
              <div style={{ padding: 12, textAlign: 'center', color: '#aaa' }}>无匹配项</div>
            ) : filteredSlashCommands.map((cmd, i) => (
              <div
                key={cmd.type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: i === slashMenuIndex ? (isDarkMode ? '#374151' : '#f3f4f6') : 'none',
                  cursor: 'pointer',
                  fontWeight: i === slashMenuIndex ? 600 : 400,
                }}
                onMouseEnter={() => setSlashMenuIndex(i)}
                onMouseDown={e => { e.preventDefault(); handleSlashSelect(cmd); }}
              >
                <span style={{ width: 28, display: 'inline-block', textAlign: 'center', fontSize: 16, marginRight: 8 }}>{cmd.icon}</span>
                <span>{cmd.label}</span>
                <span style={{ marginLeft: 8, fontSize: 12, color: '#aaa' }}>{cmd.desc}</span>
              </div>
            ))}
          </div>
        )}
        {/* 在编辑器容器内渲染临时网页卡片 - 支持拖拽和缩放 */}
        {previewUrl && previewPos && (
          <div
            id="preview-card"
            style={{
              position: 'fixed',
              left: previewPos.x - previewSize.width / 2,
              top: previewPos.y - previewSize.height - 20,
              zIndex: 99999,
              background: isDarkMode ? '#23272e' : '#fff',
              border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              width: previewSize.width,
              height: previewSize.height,
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              transition: isDragging || isResizing ? 'none' : 'all 0.18s',
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => {
              if (e.target === e.currentTarget || (e.target as HTMLElement).id === 'drag-header') {
                const rect = e.currentTarget.getBoundingClientRect();
                setDragOffset({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top
                });
                setIsDragging(true);
              }
            }}
            onMouseMove={e => {
              if (isDragging && previewPos) {
                setPreviewPos({
                  x: e.clientX - dragOffset.x + previewSize.width / 2,
                  y: e.clientY - dragOffset.y + previewSize.height + 20
                });
              }
            }}
            onMouseUp={() => {
              setIsDragging(false);
            }}
          >
            {/* 拖拽头部区域 */}
            <div
              id="drag-header"
              style={{
                height: 32,
                background: isDarkMode ? '#1f2937' : '#f8fafc',
                borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 12px',
                cursor: 'grab',
                userSelect: 'none',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: isDarkMode ? '#9ca3af' : '#6b7280'
              }}>
                <span>⋮⋮</span>
                <span>网页预览</span>
              </div>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  cursor: 'pointer',
                  padding: 4,
                  fontSize: 16,
                  lineHeight: 1,
                }}
                onClick={() => { setPreviewUrl(null); setPreviewPos(null); }}
                title="关闭"
              >
                ✕
              </button>
            </div>

            {/* 网页内容区域 */}
            <div style={{ flex: 1, position: 'relative' }}>
              <WebPageRenderer
                url={previewUrl}
                width={previewSize.width}
                height={previewSize.height - 72} // 减去头部和底部高度
                nodeId={previewUrl}
              />
            </div>

            {/* 底部操作栏 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: 40,
              padding: '0 12px',
              background: isDarkMode ? '#1f2937' : '#f8fafc',
              borderTop: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {/* 缩放按钮 */}
                <button
                  style={{
                    background: 'none',
                    border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 12,
                    cursor: 'pointer',
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                  }}
                  onClick={() => setPreviewSize(prev => ({
                    width: Math.max(300, prev.width - 50),
                    height: Math.max(250, prev.height - 40)
                  }))}
                  title="缩小"
                >
                  −
                </button>
                <button
                  style={{
                    background: 'none',
                    border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: 12,
                    cursor: 'pointer',
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                  }}
                  onClick={() => setPreviewSize(prev => ({
                    width: Math.min(800, prev.width + 50),
                    height: Math.min(600, prev.height + 40)
                  }))}
                  title="放大"
                >
                  +
                </button>
              </div>

              <button
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
                onClick={() => window.open(previewUrl, '_blank')}
                title="在浏览器打开 (Ctrl+Enter)"
              >
                在浏览器打开
              </button>
            </div>

            {/* 右下角缩放手柄 */}
            <div
              style={{
                position: 'absolute',
                right: 0,
                bottom: 0,
                width: 20,
                height: 20,
                cursor: 'nw-resize',
                background: 'transparent',
                zIndex: 1,
              }}
              onMouseDown={e => {
                e.stopPropagation();
                setIsResizing(true);
                const startX = e.clientX;
                const startY = e.clientY;
                const startWidth = previewSize.width;
                const startHeight = previewSize.height;

                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const deltaX = moveEvent.clientX - startX;
                  const deltaY = moveEvent.clientY - startY;
                  setPreviewSize({
                    width: Math.max(300, Math.min(800, startWidth + deltaX)),
                    height: Math.max(250, Math.min(600, startHeight + deltaY))
                  });
                };

                const handleMouseUp = () => {
                  setIsResizing(false);
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              <div style={{
                position: 'absolute',
                right: 2,
                bottom: 2,
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderBottom: `8px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
              }} />
            </div>
          </div>
        )}
        {/* 支持 Ctrl+Enter 快捷键跳转 - 修复：将useEffect移出条件渲染 */}
      </Slate>
    );
  }
);

// 新增：Notion风格悬浮工具栏
const MARKS = [
  { type: 'bold', icon: <b>B</b>, title: '加粗' },
  { type: 'underline', icon: <u>U</u>, title: '下划线' },
  {
    type: 'color', icon: (
      <span style={{ position: 'relative', color: '#e11d48', fontWeight: 600, display: 'inline-block' }}>
        A
        <span style={{ position: 'absolute', left: 0, right: 0, bottom: -2, height: 2, background: '#e11d48', borderRadius: 1 }} />
      </span>
    ), title: '文字颜色'
  },
  {
    type: 'bgColor', icon: (
      <span style={{ background: '#fde68a', padding: '2px 6px', borderRadius: 4, color: '#222', fontWeight: 600, display: 'inline-block', boxShadow: '0 0 0 1px #fbbf24' }}>A</span>
    ), title: '背景色'
  },
  { type: 'link', icon: <span style={{ textDecoration: 'underline' }}>🔗</span>, title: '超链接' },
];

// 类型声明
interface HoveringToolbarProps {
  editor: BaseEditor & SlateReactEditor;
}

function isMarkActive(editor: BaseEditor & SlateReactEditor, format: string): boolean {
  const marks = Editor.marks(editor);
  return marks ? !!marks[format as keyof typeof marks] : false;
}
function toggleMark(editor: BaseEditor & SlateReactEditor, format: string, value?: string): void {
  const isActive = isMarkActive(editor, format);
  if (format === 'color' || format === 'bgColor') {
    Editor.addMark(editor, format, value);
    return;
  }
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, value ?? true);
  }
}

function removeLink(editor: BaseEditor & SlateReactEditor): void {
  Editor.removeMark(editor, 'link');
}

const COLORS = ['#e11d48', '#2563eb', '#059669', '#f59e42', '#fbbf24', '#f472b6', '#6d28d9', '#374151', '#111827'];
const BG_COLORS_LIGHT = ['#fef3c7', '#fce7f3', '#dbeafe', '#d1fae5', '#fee2e2', '#f3f4f6', '#fef9c3', '#e0e7ff', '#f1f5f9'];
const BG_COLORS_DARK = ['#7c5c00', '#4b5563', '#374151', '#1e293b', '#334155', '#78350f', '#3b3b3b', '#22223b', '#23272e'];

// 1. 新增 setBlockAlign 工具函数
function setBlockAlign(editor: BaseEditor & SlateReactEditor, align: 'left' | 'center' | 'right') {
  if (!editor.selection) return;
  Transforms.setNodes(
    editor,
    { align } as any,
    {
      match: (n: any) => Editor.isBlock(editor, n as any) && SlateElement.isElement(n),
      split: true,
    }
  );
}

// 1. 新增 insertLink 方法
function insertLink(editor: BaseEditor & SlateReactEditor, url: string, savedSelection?: any): void {
  if (!url) return;

  // 使用保存的选区或当前选区
  const selection = savedSelection || editor.selection;

  if (selection && Range.isExpanded(selection)) {
    // 先恢复选区
    Transforms.select(editor, selection);

    // 直接对选中的文字应用link属性作为mark，而不是创建inline节点
    Editor.addMark(editor, 'link', url);

    // 移动光标到选区末尾，避免后续输入继续带link属性
    Transforms.collapse(editor, { edge: 'end' });
    Editor.removeMark(editor, 'link');
  } else {
    // 无选区，后续输入带 link mark
    Editor.addMark(editor, 'link', url);
  }
}

const HoveringToolbar = ({ editor }: HoveringToolbarProps) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [showColor, setShowColor] = React.useState(false);
  const [showBgColor, setShowBgColor] = React.useState(false);
  const [showLinkInput, setShowLinkInput] = React.useState(false);
  const [linkValue, setLinkValue] = React.useState('');
  const [linkInputRect, setLinkInputRect] = React.useState<DOMRect | null>(null);
  const [savedSelection, setSavedSelection] = React.useState<any>(null); // 保存原始选区
  const { isDarkMode } = React.useContext(ThemeContext);
  const bgColors = isDarkMode ? BG_COLORS_DARK : BG_COLORS_LIGHT;

  // 追加：获取当前 selection 所在 block 的对齐方式
  let currentAlign: 'left' | 'center' | 'right' = 'left';
  if (editor.selection) {
    const [block] = Editor.nodes(editor, {
      match: (n: any) => Editor.isBlock(editor, n as any) && SlateElement.isElement(n),
    }) as any;
    if (block && (block[0] as any).align) {
      currentAlign = (block[0] as any).align;
    }
  }

  React.useEffect(() => {
    const el = ref.current as HTMLDivElement | null;
    const { selection } = editor;
    if (!el) return;
    // 修复：showLinkInput 为 true 时，toolbar 始终显示，且位置固定
    if (showLinkInput) {
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      // 只在 linkInputRect 有值时定位
      if (linkInputRect) {
        el.style.top = `${linkInputRect.top + window.scrollY - el.offsetHeight - 8}px`;
        el.style.left = `${linkInputRect.left + window.scrollX + linkInputRect.width / 2 - el.offsetWidth / 2}px`;
      }
      return;
    }
    // 只有未输入链接时才按原逻辑隐藏
    if (!selection || !ReactEditor.isFocused(editor) || Range.isCollapsed(selection) || Editor.string(editor, selection) === '') {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      return;
    }
    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) return;
    const domRange = domSelection.getRangeAt(0);
    const rect = domRange.getBoundingClientRect();
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
    el.style.top = `${rect.top + window.scrollY - el.offsetHeight - 8}px`;
    el.style.left = `${rect.left + window.scrollX + rect.width / 2 - el.offsetWidth / 2}px`;
  });

  return ReactDOM.createPortal(
    <div
      ref={ref}
      className="hovering-toolbar"
      style={{
        position: 'absolute',
        zIndex: 9999,
        top: 0,
        left: 0,
        opacity: 0,
        pointerEvents: 'none',
        background: 'rgba(255,255,255,0.98)',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'opacity 0.15s',
        minWidth: 0,
      }}
      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
    >
      {MARKS.map(mark => (
        <button
          key={mark.type}
          title={mark.title}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color:
              mark.type === 'bold' ? (isMarkActive(editor, 'bold') ? '#2563eb' : '#222') :
                mark.type === 'underline' ? (isMarkActive(editor, 'underline') ? '#2563eb' : '#222') :
                  mark.type === 'color' ? '#e11d48' :
                    mark.type === 'bgColor' ? '#f59e42' :
                      mark.type === 'link' ? '#2563eb' :
                        undefined,
            fontWeight: mark.type === 'bold' ? 'bold' : undefined,
            textDecoration: mark.type === 'underline' ? 'underline' : undefined,
          }}
          onMouseDown={e => {
            e.preventDefault();
            if (mark.type === 'bold' || mark.type === 'underline') {
              toggleMark(editor, mark.type);
              ReactEditor.focus(editor);
            } else if (mark.type === 'color') {
              setShowColor(v => !v);
              setShowBgColor(false);
              setShowLinkInput(false);
              setLinkInputRect(null);
              ReactEditor.focus(editor);
            } else if (mark.type === 'bgColor') {
              setShowBgColor(v => !v);
              setShowColor(false);
              setShowLinkInput(false);
              setLinkInputRect(null);
              ReactEditor.focus(editor);
            } else if (mark.type === 'link') {
              setShowLinkInput(v => {
                const next = !v;
                if (next) {
                  // 保存当前选区和位置信息
                  setSavedSelection(editor.selection);
                  const domSelection = window.getSelection();
                  if (domSelection && domSelection.rangeCount > 0) {
                    const domRange = domSelection.getRangeAt(0);
                    setLinkInputRect(domRange.getBoundingClientRect());
                  }
                } else {
                  setLinkInputRect(null);
                  setSavedSelection(null);
                }
                return next;
              });
              setShowColor(false);
              setShowBgColor(false);
              setLinkValue((Editor.marks(editor) as any)?.link || '');
              ReactEditor.focus(editor);
            }
          }}
        >
          {mark.icon}
        </button>
      ))}
      {/* 新增：对齐按钮组 */}
      <div style={{ display: 'flex', gap: 2, marginLeft: 6 }}>
        <button
          title="左对齐"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
            color: currentAlign === 'left' ? '#2563eb' : '#222', fontWeight: currentAlign === 'left' ? 700 : 400,
            backgroundColor: currentAlign === 'left' ? '#e0e7ff' : 'transparent',
          }}
          onMouseDown={e => { e.preventDefault(); setBlockAlign(editor, 'left'); ReactEditor.focus(editor); }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="4" width="12" height="2" rx="1" fill="currentColor" /><rect x="3" y="8" width="8" height="2" rx="1" fill="currentColor" /><rect x="3" y="12" width="10" height="2" rx="1" fill="currentColor" /></svg>
        </button>
        <button
          title="居中对齐"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
            color: currentAlign === 'center' ? '#2563eb' : '#222', fontWeight: currentAlign === 'center' ? 700 : 400,
            backgroundColor: currentAlign === 'center' ? '#e0e7ff' : 'transparent',
          }}
          onMouseDown={e => { e.preventDefault(); setBlockAlign(editor, 'center'); ReactEditor.focus(editor); }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="5" y="4" width="8" height="2" rx="1" fill="currentColor" /><rect x="3" y="8" width="12" height="2" rx="1" fill="currentColor" /><rect x="4" y="12" width="10" height="2" rx="1" fill="currentColor" /></svg>
        </button>
      </div>
      {showColor && (
        <div style={{ position: 'absolute', top: 36, left: 0, display: 'flex', background: '#fff', border: '1px solid #eee', borderRadius: 6, padding: 4, gap: 2, zIndex: 10000 }}>
          <span title="清除颜色" style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1.5px solid #eee', borderRadius: 4, background: '#fff', color: '#aaa', fontSize: 14 }} onMouseDown={e => { e.preventDefault(); Editor.removeMark(editor, 'color'); setShowColor(false); ReactEditor.focus(editor); }}>🗙</span>
          {COLORS.map(c => (
            <span key={c} style={{ width: 18, height: 18, background: c, borderRadius: 4, display: 'inline-block', cursor: 'pointer', border: '1.5px solid #fff', boxShadow: '0 0 1px #aaa' }} onMouseDown={e => { e.preventDefault(); toggleMark(editor, 'color', c); setShowColor(false); ReactEditor.focus(editor); }} />
          ))}
        </div>
      )}
      {showBgColor && (
        <div style={{ position: 'absolute', top: 36, left: 40, display: 'flex', background: '#fff', border: '1px solid #eee', borderRadius: 6, padding: 4, gap: 2, zIndex: 10000 }}>
          <span title="清除背景色" style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1.5px solid #eee', borderRadius: 4, background: '#fff', color: '#aaa', fontSize: 14 }} onMouseDown={e => { e.preventDefault(); Editor.removeMark(editor, 'bgColor'); setShowBgColor(false); ReactEditor.focus(editor); }}>🗙</span>
          {bgColors.map(c => (
            <span key={c} style={{ width: 18, height: 18, background: c, borderRadius: 4, display: 'inline-block', cursor: 'pointer', border: '1.5px solid #fff', boxShadow: '0 0 1px #aaa' }} onMouseDown={e => { e.preventDefault(); toggleMark(editor, 'bgColor', c); setShowBgColor(false); ReactEditor.focus(editor); }} />
          ))}
        </div>
      )}
      {showLinkInput && (
        <input
          ref={input => { if (input) setTimeout(() => input.focus(), 0); }}
          style={{ position: 'absolute', top: 36, left: 80, width: 160, padding: 2, border: '1px solid #eee', borderRadius: 4, fontSize: 13, zIndex: 10000 }}
          value={linkValue}
          onChange={e => setLinkValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { insertLink(editor, linkValue, savedSelection); setShowLinkInput(false); setLinkInputRect(null); setSavedSelection(null); }
            if (e.key === 'Escape') { setShowLinkInput(false); setLinkInputRect(null); setSavedSelection(null); }
          }}
          placeholder="输入链接并回车"
        />
      )}
      {isMarkActive(editor, 'link') && (
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e11d48', marginLeft: 2 }} title="移除链接" onMouseDown={e => { e.preventDefault(); removeLink(editor); ReactEditor.focus(editor); }}>✕</button>
      )}
    </div>,
    document.body
  );
};



// 快捷输入规则
function withShortcuts(editor: Editor) {
  const { insertText, insertBreak, deleteBackward } = editor;

  // 重写deleteBackward处理，在行首删除时减少缩进
  editor.deleteBackward = (unit) => {
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const [match] = Editor.nodes(editor, {
        match: n => SlateElement.isElement(n),
      }) as any;

      if (match) {
        const [node, path] = match;
        const start = Editor.start(editor, path);

        // 如果光标在行首且有缩进，删除缩进而不是字符
        if (Range.equals(selection, { anchor: start, focus: start })) {
          const currentIndent = (node as any).indent || 0;
          if (currentIndent > 0) {
            Transforms.setNodes(editor, {
              ...node,
              indent: currentIndent - 1
            } as any, { at: path });

            // 确保光标保持在正确位置
            setTimeout(() => {
              try {
                Transforms.select(editor, start);
                ReactEditor.focus(editor as ReactEditor);
              } catch (error) {
                console.warn('Delete backspace focus error:', error);
              }
            }, 0);

            return;
          }
        }
      }
    }
    deleteBackward(unit);
  };

  editor.insertText = (text) => {
    const { selection } = editor;
    if (text === ' ' && selection && Range.isCollapsed(selection)) {
      const [match] = Editor.nodes(editor, {
        match: n => (n as any).type === 'paragraph',
      }) as any;
      if (match) {
        const [, path] = match;
        const start = Editor.start(editor, path);
        const range = { anchor: start, focus: selection.anchor };
        const beforeText = Editor.string(editor, range);

        // 1. 优先检测标签输入 #标签名 + 空格
        // 获取光标前的最后一个单词
        const words = beforeText.split(/\s+/);
        const lastWord = words[words.length - 1];

        if (lastWord && lastWord.startsWith('#') && lastWord.length > 1) {
          // 再次确认是否符合标签格式 (不包含空格)
          const tagContent = lastWord.substring(1);
          if (!/[#\s]/.test(tagContent)) {
            // 计算要删除的范围：只删除 #tag 这一部分
            const end = selection.anchor;
            const startPoints = Editor.before(editor, end, { distance: lastWord.length, unit: 'character' });

            if (startPoints) {
              const tagRange = { anchor: startPoints, focus: end };
              Transforms.select(editor, tagRange);
              Transforms.delete(editor);

              // 插入标签节点 + 一个空格 Text 节点
              // 这样可以确保后面一定有一个 Text 节点供光标停留
              Transforms.insertNodes(editor, [{
                type: 'tag',
                value: tagContent,
                children: [{ text: '' }]
              } as any, { text: ' ' }]);

              // 移动光标：跨过 Tag(1) 和 Space(1)
              // 使用默认 unit (character)，避免 'offset' 在 void node 上失效
              Transforms.move(editor, { distance: 2 });
              return;
            }
          }
        }

        // 标题
        if (beforeText === '#') {
          Transforms.select(editor, range);
          Transforms.delete(editor);
          Transforms.setNodes(editor, { type: 'heading-one' } as any);
          return;
        }
        if (beforeText === '##') {
          Transforms.select(editor, range);
          Transforms.delete(editor);
          Transforms.setNodes(editor, { type: 'heading-two' } as any);
          return;
        }
        // 无序列表
        if (beforeText === '-') {
          Transforms.select(editor, range);
          Transforms.delete(editor);
          Transforms.setNodes(editor, { type: 'bulleted-list' } as any);
          return;
        }
        // 有序列表
        if (/^\d+\.$/.test(beforeText)) {
          Transforms.select(editor, range);
          Transforms.delete(editor);
          Transforms.setNodes(editor, { type: 'numbered-list' } as any);
          return;
        }
        // 待办
        if (beforeText === '【' || beforeText === '[') {
          Transforms.select(editor, range);
          Transforms.delete(editor);
          Transforms.setNodes(editor, { type: 'todo-list', checked: false } as any);
          return;
        }
      }
    }
    insertText(text);
  };

  editor.insertBreak = () => {
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      // 新增：处理标签输入 (#标签名 + 回车)
      const [match] = Editor.nodes(editor, {
        match: n => (n as any).type === 'paragraph',
      }) as any;
      if (match) {
        const [, path] = match;
        const start = Editor.start(editor, path);
        const range = { anchor: start, focus: selection.anchor };
        const beforeText = Editor.string(editor, range);

        // 匹配 #标签名 格式 (支持行内任意位置)
        // 1. 优先检测标签输入 #标签名 + 回车
        // 获取光标前的最后一个单词
        const words = beforeText.split(/\s+/);
        const lastWord = words[words.length - 1];

        if (lastWord && lastWord.startsWith('#') && lastWord.length > 1) {
          const tagContent = lastWord.substring(1);
          if (!/[#\s]/.test(tagContent)) {
            const end = selection.anchor;
            const startPoints = Editor.before(editor, end, { distance: lastWord.length, unit: 'character' });

            if (startPoints) {
              const tagRange = { anchor: startPoints, focus: end };
              Transforms.select(editor, tagRange);
              Transforms.delete(editor);

              // 插入标签节点 + 一个空格 Text 节点
              Transforms.insertNodes(editor, [{
                type: 'tag',
                value: tagContent,
                children: [{ text: '' }]
              } as any, { text: ' ' }]);

              // 移动光标
              Transforms.move(editor, { distance: 2 });

              // 强制聚焦，防止光标丢失
              // 在 void 节点后操作容易导致 DOM selection 丢失
              setTimeout(() => {
                ReactEditor.focus(editor);
              }, 0);

              return;
            }
          }
        }
      }

      const [match2] = Editor.nodes(editor, {
        match: n => (n as any).type === 'paragraph' ||
          (n as any).type === 'heading-one' ||
          (n as any).type === 'heading-two' ||
          (n as any).type === 'bulleted-list' ||
          (n as any).type === 'numbered-list' ||
          (n as any).type === 'todo-list',
      }) as any;
      if (match2) {
        const [block, path] = match2;
        const isEmpty = Editor.string(editor, path) === '';

        // 空的标题、列表、待办，回车变普通段落，保持缩进
        if (isEmpty && (
          block.type === 'heading-one' ||
          block.type === 'heading-two' ||
          block.type === 'bulleted-list' ||
          block.type === 'numbered-list' ||
          block.type === 'todo-list')
        ) {
          Transforms.setNodes(editor, {
            type: 'paragraph',
            indent: (block as any).indent || 0
          } as any, { at: path });
          return;
        }

        // 其它分割线、虚线等逻辑保持不变
        const start = Editor.start(editor, path);
        const range = { anchor: start, focus: selection.anchor };
        const beforeText = Editor.string(editor, range);

        if (beforeText === '---') {
          Transforms.select(editor, range);
          Transforms.delete(editor);
          Transforms.setNodes(editor, { type: 'divider' } as any);
          Transforms.insertNodes(editor, { type: 'paragraph', children: [{ text: '' }] } as any);
          return;
        }
        if (beforeText === '--') {
          Transforms.select(editor, range);
          Transforms.delete(editor);
          Transforms.setNodes(editor, { type: 'dashed-divider' } as any);
          Transforms.insertNodes(editor, { type: 'paragraph', children: [{ text: '' }] } as any);
          return;
        }

        // 回车时保持当前缩进级别
        const currentIndent = (block as any).indent || 0;

        // 标题回车后变成正文格式，保持缩进
        if (block.type === 'heading-one' || block.type === 'heading-two') {
          insertBreak();
          Transforms.setNodes(editor, { type: 'paragraph', indent: currentIndent } as any);
          return;
        }

        // 有序/无序/待办列表继续，保持缩进
        if (block.type === 'numbered-list') {
          insertBreak();
          Transforms.setNodes(editor, { type: 'numbered-list', indent: currentIndent } as any);
          return;
        }
        if (block.type === 'bulleted-list') {
          insertBreak();
          Transforms.setNodes(editor, { type: 'bulleted-list', indent: currentIndent } as any);
          return;
        }
        if (block.type === 'todo-list') {
          insertBreak();
          Transforms.setNodes(editor, { type: 'todo-list', checked: false, indent: currentIndent } as any);
          return;
        }

        // 普通段落换行时保持缩进
        if (block.type === 'paragraph') {
          insertBreak();
          Transforms.setNodes(editor, { type: 'paragraph', indent: currentIndent } as any);
          return;
        }
      }
    }
    insertBreak();
  };

  return editor;
}

// 1. 标签可选颜色
const TAG_COLORS = [
  { id: 'gray', light: '#F3F4F6', dark: '#374151' },
  { id: 'blue', light: '#DBEAFE', dark: '#2563eb' },
  { id: 'green', light: '#D1FAE5', dark: '#059669' },
  { id: 'orange', light: '#FDE68A', dark: '#f59e42' },
  { id: 'red', light: '#FEE2E2', dark: '#e11d48' },
  { id: 'purple', light: '#EDE9FE', dark: '#8b5cf6' },
  { id: 'cyan', light: '#CFFAFE', dark: '#06b6d4' },
];

// 2. 标签颜色选择器弹窗
const TagColorPicker: React.FC<{
  anchorPos: { x: number, y: number };
  value?: string;
  onChange: (colorId: string) => void;
  onClose: () => void;
  isDark: boolean;
}> = ({ anchorPos, value, onChange, onClose, isDark }) => {
  // 防止超出窗口边界
  const padding = 8, width = 220, height = 48;
  let left = anchorPos.x, top = anchorPos.y + 8;
  if (left + width > window.innerWidth - padding) left = window.innerWidth - width - padding;
  if (top + height > window.innerHeight - padding) top = window.innerHeight - height - padding;
  return (
    <div
      id="tag-color-picker-pop"
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 9999,
        background: isDark ? '#23272F' : '#fff',
        border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        padding: 8,
        display: 'flex',
        gap: 8,
      }}
      onClick={e => e.stopPropagation()}
    >
      {TAG_COLORS.map(c => (
        <div
          key={c.id}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: isDark ? c.dark : c.light,
            border: value === c.id ? '2px solid #6366f1' : '2px solid transparent',
            cursor: 'pointer',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => { onChange(c.id); onClose(); }}
          title={c.id}
        >
          {value === c.id && <span style={{ fontSize: 16, color: '#6366f1' }}>✓</span>}
        </div>
      ))}
    </div>
  );
};

// 3. 标签节点渲染组件，支持多色和弹窗
const TagElement: React.FC<any> = (props) => {
  const { attributes, children, element, readOnly } = props;
  const { isDarkMode } = useContext(ThemeContext);
  const [showPicker, setShowPicker] = React.useState(false);
  const [pickerPos, setPickerPos] = React.useState<{ x: number, y: number } | null>(null);
  const tagRef = React.useRef<HTMLSpanElement>(null);
  // 颜色映射
  const colorObj = TAG_COLORS.find(c => c.id === element.color) || TAG_COLORS[0];
  const bgColor = isDarkMode ? colorObj.dark : colorObj.light;
  const textColor = isDarkMode ? '#e5e7eb' : '#374151';
  // 选色后更新 color 字段
  const handleColorChange = (colorId: string) => {
    if (readOnly) return;
    const path = ReactEditor.findPath(props.editor, element);
    Transforms.setNodes(props.editor, { color: colorId } as Partial<SlateElement>, { at: path });
    setShowPicker(false);
  };
  // 只在编辑态下允许弹窗
  const isEditable = !readOnly && props.editor?.isEditable !== false;
  // 监听外部点击和ESC关闭弹窗
  React.useEffect(() => {
    if (!showPicker) return;
    const handleClick = (e: MouseEvent) => {
      const picker = document.getElementById('tag-color-picker-pop');
      if (picker && picker.contains(e.target as Node)) return;
      if (tagRef.current && tagRef.current.contains(e.target as Node)) return;
      setShowPicker(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      // 🔥 修复：检查事件来源，如果是输入框则跳过
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

      if (e.key === 'Escape') setShowPicker(false);
    };
    document.addEventListener('mousedown', handleClick, true);
    document.addEventListener('keydown', handleEsc, false); // 🔥 修复：移除事件捕获
    return () => {
      document.removeEventListener('mousedown', handleClick, true);
      document.removeEventListener('keydown', handleEsc, false); // 🔥 修复：移除事件捕获
    };
  }, [showPicker]);
  return (
    <>
      <span
        {...attributes}
        ref={tagRef}
        contentEditable={false}
        style={{
          backgroundColor: bgColor,
          borderRadius: '4px',
          padding: '2px 6px',
          margin: '0 2px',
          color: textColor,
          fontSize: '14px',
          fontWeight: '500',
          display: 'inline-block',
          userSelect: 'none',
          transition: 'all 0.15s ease',
          cursor: isEditable ? 'pointer' : 'default',
          border: showPicker ? '2px solid #6366f1' : 'none',
        }}
        onClick={e => {
          if (!isEditable) return;
          e.preventDefault();
          e.stopPropagation();
          setShowPicker(v => !v);
          if (!showPicker) {
            // 使用 clientX/Y，因为 TagColorPicker 使用 fixed 定位
            setPickerPos({ x: e.clientX, y: e.clientY });
          }
        }}
      >
        #{element.value}
        {children}
      </span>
      {/* 只读时不渲染颜色选择器 */}
      {showPicker && pickerPos && !readOnly &&
        ReactDOM.createPortal(
          <TagColorPicker
            anchorPos={pickerPos}
            value={element.color}
            onChange={handleColorChange}
            onClose={() => setShowPicker(false)}
            isDark={isDarkMode}
          />,
          document.body
        )
      }
    </>
  );
};

// 1. 顶部类型声明补充
interface VideoElement {
  type: 'video';
  url: string;
  width?: number;
  height?: number;
  children: { text: string }[];
}

export default RichTextEditor; 