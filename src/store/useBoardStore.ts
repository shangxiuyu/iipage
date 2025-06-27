import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Descendant } from 'slate';
import type { BackgroundMode } from '../components/BackgroundModeSelector';
import type { InteractiveTheme } from '../components/InteractiveThemeBackground';

export interface NodeData {
  id: string;
  x: number;
  y: number;
  width?: number; // 添加宽度字段，可选，默认324
  height?: number; // 添加高度字段，可选，默认200
  content: Descendant[];
  editing?: boolean;
  selected?: boolean;
  backgroundColor?: string; // 兼容老字段
  lightBackgroundColor?: string; // 浅色主题下的卡片色id
  darkBackgroundColor?: string; // 深色主题下的卡片色id
  pinned?: boolean; // 添加图钉属性，标记是否固定在屏幕位置
  pinnedX?: number; // 固定时的屏幕X坐标
  pinnedY?: number;
  
  // 卡片反转相关属性
  frontContent?: Descendant[]; // 正面内容
  backContent?: Descendant[]; // 反面内容
  isFlipped?: boolean; // 是否显示反面
  isFlipping?: boolean; // 是否正在翻转动画中
  
  // 代码编辑器相关属性
  isCodeMode?: boolean; // 是否为代码编辑模式
  codeContent?: string; // 代码内容
  codeLanguage?: string; // 代码语言
  userResized?: boolean; // 用户是否主动调整过尺寸

  // 毛玻璃磨砂效果
  frosted?: boolean; // 是否为毛玻璃卡片，默认false
  
  // 标签功能
  tags?: string[]; // 卡片标签列表
  
  // 卡片形状
  shape?: 'rectangle' | 'circle' | 'table'; // 卡片形状
  
  // 文字对齐方式
  textAlign?: 'left' | 'center' | 'right'; // 文字水平对齐方式
  textVerticalAlign?: 'top' | 'center' | 'bottom'; // 文字垂直对齐方式
  
  // 透明度和边框设置
  transparent?: boolean; // 是否透明
  showBorder?: boolean; // 是否显示边框
  borderColor?: string; // 边框颜色
  
  // 网页渲染相关数据持久化
  webPageState?: any; // 网页状态数据（表单、滚动位置等）
  webPageStateKey?: string; // 网页状态存储键

  // 背景框相关属性
  containerId?: string; // 所属背景框的ID，null表示不在任何背景框中

  // Markdown 编辑模式
  editMode?: 'rich' | 'markdown';
  markdownContent?: string;
  backEditMode?: 'rich' | 'markdown';
  backMarkdownContent?: string;

  // AI 相关
  isAICreated?: boolean;
}

export interface Connection {
  from: string;
  to: string;
  fromAnchor?: 'top' | 'right' | 'bottom' | 'left'; // 起始锚点位置
  toAnchor?: 'top' | 'right' | 'bottom' | 'left'; // 结束锚点位置
  selected?: boolean; // 是否选中
  label?: string; // 连线文字标签
  editing?: boolean; // 是否正在编辑标签
  style?: 'solid' | 'dashed'; // 连线样式：实线或虚线
  color?: string; // 连线颜色
}

// 新增：背景框数据结构
export interface BackgroundFrame {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  selected?: boolean;
  isDragging?: boolean;
  nodeIds: string[]; // 包含的卡片ID列表
  style?: {
    borderColor?: string;
    backgroundColor?: string;
    borderWidth?: number;
    borderRadius?: number;
  };
  collapsed?: boolean; // 新增：是否折叠
}

// 卡片色类型加 textColor
export type CardColor = {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  textColor?: string;
};

// 浅色主题卡片色板
export const LIGHT_CARD_COLORS: CardColor[] = [
  { id: 'default', name: '默认白色', color: 'rgba(255,255,255,0.95)', borderColor: 'rgba(0,0,0,0.15)', textColor: '#222' },
  { id: 'yellow', name: '便签黄', color: 'rgba(255,251,230,0.95)', borderColor: 'rgba(245,158,11,0.3)', textColor: '#222' },
  { id: 'blue', name: '天空蓝', color: 'rgba(240,249,255,0.95)', borderColor: 'rgba(59,130,246,0.3)', textColor: '#222' },
  { id: 'green', name: '薄荷绿', color: 'rgba(240,253,244,0.95)', borderColor: 'rgba(34,197,94,0.3)', textColor: '#222' },
  { id: 'pink', name: '粉红色', color: 'rgba(253,242,248,0.95)', borderColor: 'rgba(236,72,153,0.3)', textColor: '#222' },
  { id: 'purple', name: '紫罗兰', color: 'rgba(250,245,255,0.95)', borderColor: 'rgba(147,51,234,0.3)', textColor: '#222' },
  { id: 'orange', name: '橙色', color: 'rgba(255,247,237,0.95)', borderColor: 'rgba(245,158,11,0.3)', textColor: '#222' },
  { id: 'slate', name: '灰蓝色', color: 'rgba(248,250,252,0.95)', borderColor: 'rgba(100,116,139,0.3)', textColor: '#222' }
];

// 深色主题卡片色板（顺序与浅色一一对应）
export const DARK_CARD_COLORS: CardColor[] = [
  { id: 'dark-default', name: '夜间白', color: 'rgba(40,40,40,0.96)', borderColor: 'rgba(255,255,255,0.10)', textColor: '#e2e8f0' },
  { id: 'dark-blue', name: '夜空蓝', color: 'rgba(30,41,59,0.9)', borderColor: 'rgba(71,85,105,0.5)', textColor: '#e2e8f0' },
  { id: 'dark-purple', name: '夜紫色', color: 'rgba(44,37,75,0.9)', borderColor: 'rgba(88,80,141,0.5)', textColor: '#e2e8f0' },
  { id: 'dark-green', name: '夜墨绿', color: 'rgba(22,44,36,0.9)', borderColor: 'rgba(52,83,65,0.5)', textColor: '#d1fae5' },
  { id: 'dark-pink', name: '夜粉色', color: 'rgba(60,40,50,0.9)', borderColor: 'rgba(236,72,153,0.3)', textColor: '#fbcfe8' },
  { id: 'dark-violet', name: '夜紫罗兰', color: 'rgba(60,50,80,0.9)', borderColor: 'rgba(147,51,234,0.3)', textColor: '#ddd6fe' },
  { id: 'dark-orange', name: '夜橙色', color: 'rgba(80,50,30,0.9)', borderColor: 'rgba(249,115,22,0.3)', textColor: '#fed7aa' },
  { id: 'dark-slate', name: '夜灰蓝', color: 'rgba(36,42,54,0.95)', borderColor: 'rgba(100,116,139,0.3)', textColor: '#cbd5e1' }
];

// 兼容旧代码，导出合并色板
export const CARD_BACKGROUND_COLORS = [...LIGHT_CARD_COLORS, ...DARK_CARD_COLORS];

// 预定义的背景色选项（保持现有的白板背景功能）
export const BACKGROUND_COLORS = [
  {
    id: 'default',
    name: '默认白色',
    bgColor: '#ffffff',
    gridColor: '#e5e7eb', // 更浅的灰色
    darkBgColor: '#232a36',
    darkGridColor: '#4b5563', // 深色灰
  },
  {
    id: 'soft-blue',
    name: '柔和蓝',
    bgColor: '#f0f4ff',
    gridColor: '#d1ddf7',
    darkBgColor: '#1e293b',
    darkGridColor: '#334155',
  },
  {
    id: 'warm-cream',
    name: '温暖米色',
    bgColor: '#fefbf3',
    gridColor: '#ede4d3',
    darkBgColor: '#2d2a25',
    darkGridColor: '#6b5e4e',
  },
  {
    id: 'mint-green',
    name: '薄荷绿',
    bgColor: '#f0fff4',
    gridColor: '#d0f0d8',
    darkBgColor: '#1a2e22',
    darkGridColor: '#3b5d46',
  },
  {
    id: 'lavender',
    name: '薰衣草紫',
    bgColor: '#faf5ff',
    gridColor: '#e9d5ff',
    darkBgColor: '#2e223a',
    darkGridColor: '#5b437a',
  },
  {
    id: 'peach',
    name: '桃色粉',
    bgColor: '#fff7ed',
    gridColor: '#fed7aa',
    darkBgColor: '#3b2c25',
    darkGridColor: '#a97c5b',
  },
  {
    id: 'cool-gray',
    name: '冷灰色',
    bgColor: '#f8fafc',
    gridColor: '#cbd5e1',
    darkBgColor: '#181c23',
    darkGridColor: '#283040',
  }
];

// 导出默认内容以供其他组件使用
export const defaultContent: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
] as any;

// 撤销栈类型
interface UndoState {
  nodes: NodeData[];
  connections: Connection[];
  backgroundFrames: BackgroundFrame[];
  currentBackground: string;
  showGrid: boolean;
  backgroundMode: BackgroundMode;
  videoBackgroundUrl: string | null;
  imageBackgroundUrl: string | null;
  imageBlurLevel: number;
  builtinBackgroundPath: string | null;
  interactiveTheme: InteractiveTheme;
  scale: number;
  panX: number;
  panY: number;
  defaultCardConfig: BoardState['defaultCardConfig'];
}

interface BoardState {
  nodes: NodeData[];
  connections: Connection[];
  selectedNodes: string[];
  selectedConnections: string[]; // 选中的连线ID列表
  isSelecting: boolean;
  selectionStart: { x: number; y: number } | null;
  selectionEnd: { x: number; y: number } | null;
  currentBackground: string; // 当前背景色ID
  showGrid: boolean; // 是否显示网格
  
  // 连线相关状态
  isConnecting: boolean; // 是否正在连线模式
  connectingFrom: string | null; // 连线起始节点ID
  fromAnchor?: 'top' | 'right' | 'bottom' | 'left'; // 起始锚点位置
  tempConnection: { 
    fromX: number; 
    fromY: number; 
    toX: number; 
    toY: number; 
    fromAnchor: 'top' | 'right' | 'bottom' | 'left';
  } | null; // 临时连线坐标
  
  // 背景框相关状态
  backgroundFrames: BackgroundFrame[]; // 背景框列表
  selectedFrames: string[]; // 选中的背景框ID列表
  isDraggingFrame: boolean; // 是否正在拖拽背景框
  frameHighlights: { [frameId: string]: string }; // 背景框高亮状态
  
  // 背景模式相关状态
  backgroundMode: BackgroundMode; // 当前背景模式：grid, blank, image, video
  
  // 视频背景相关状态
  videoBackgroundMode: boolean; // 是否开启视频背景模式（保持兼容）
  videoBackgroundUrl: string | null; // 背景视频URL
  
  // 图片背景相关状态
  imageBackgroundUrl: string | null; // 背景图片URL
  imageBlurLevel: number; // 图片模糊级别 0-20
  
  // 内置背景图片相关状态
  builtinBackgroundPath: string | null; // 内置背景图片路径
  
  // 可交互主题相关状态
  interactiveTheme: InteractiveTheme; // 当前可交互主题
  
  // 缩放相关状态
  scale: number; // 缩放比例
  panX: number; // X轴偏移
  panY: number; // Y轴偏移
  
  // 自动保存状态
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error'; // 自动保存状态
  lastSavedAt: Date | null; // 最后保存时间
  
  // 复制粘贴状态
  copiedNodeData: NodeData | null; // 复制的单个卡片数据（兼容旧版）
  copiedNodesData: NodeData[]; // 复制的多个卡片数据
  
  // 默认卡片配置
  defaultCardConfig: {
    shape: 'rectangle' | 'circle' | 'table'; // 默认形状
    width: number; // 默认宽度
    height: number; // 默认高度
    lightBackgroundColor: string; // 浅色模式默认背景色
    darkBackgroundColor: string; // 深色模式默认背景色
    fontFamily: string; // 默认字体
    frosted: boolean; // 默认毛玻璃效果
    textAlign: 'left' | 'center' | 'right'; // 文字对齐方式
    textVerticalAlign: 'top' | 'center' | 'bottom'; // 文字垂直对齐方式
    transparent: boolean; // 默认透明度设置
    showBorder: boolean; // 默认边框显示设置
    borderColor: string; // 默认边框颜色
  };
  
  addNode: (x: number, y: number) => void;
  updateNode: (id: string, data: Partial<NodeData>) => void;
  setNodeEditing: (id: string, editing: boolean) => void;
  deleteNode: (id: string) => void;
  deleteSelectedNodes: () => void;
  
  // 强制保存编辑中的节点
  saveEditingNodes: () => void;
  
  // 选择相关方法
  selectNode: (id: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  setSelectedNodes: (nodeIds: string[]) => void;
  
  // 框选相关方法
  startSelection: (x: number, y: number) => void;
  updateSelection: (x: number, y: number) => void;
  endSelection: () => void;
  
  // 移动相关方法
  moveSelectedNodes: (deltaX: number, deltaY: number) => void;
  
  // 背景框相关方法
  createBackgroundFrame: (x: number, y: number, width: number, height: number) => void;
  updateBackgroundFrame: (id: string, data: Partial<BackgroundFrame>) => void;
  deleteBackgroundFrame: (id: string) => void;
  selectBackgroundFrame: (id: string, multiSelect?: boolean) => void;
  clearFrameSelection: () => void;
  moveBackgroundFrame: (frameId: string, deltaX: number, deltaY: number) => void;
  addNodeToFrame: (nodeId: string, frameId: string) => void;
  removeNodeFromFrame: (nodeId: string) => void;
  getFrameNodes: (frameId: string) => NodeData[];
  
  // 背景色相关方法
  setBackground: (backgroundId: string) => void;
  getCurrentBackgroundConfig: () => typeof BACKGROUND_COLORS[0];
  toggleGrid: () => void; // 切换网格显示
  
  // 背景模式相关方法
  setBackgroundMode: (mode: BackgroundMode) => void;
  
  // 视频背景相关方法
  toggleVideoBackgroundMode: () => void; // 切换视频背景模式（保持兼容）
  setVideoBackgroundUrl: (url: string | null) => void; // 设置背景视频URL
  
  // 图片背景相关方法
  setImageBackgroundUrl: (url: string | null) => void; // 设置背景图片URL
  setImageBlurLevel: (level: number) => void; // 设置图片模糊级别
  
  // 内置背景图片相关方法
  setBuiltinBackgroundPath: (path: string | null) => void; // 设置内置背景图片路径
  
  // 缩放和平移相关方法
  setScale: (scale: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void; // 重置视图
  zoomIn: () => void; // 放大
  zoomOut: () => void; // 缩小
  zoomToFit: () => void; // 适应窗口
  
  // 图钉相关方法
  toggleNodePin: (id: string) => void; // 切换节点的图钉状态
  
  // 可交互主题相关方法
  setInteractiveTheme: (theme: InteractiveTheme) => void; // 设置可交互主题
  
  // 卡片反转相关方法
  flipCard: (id: string) => void; // 翻转卡片
  updateCardSide: (id: string, side: 'front' | 'back', content: Descendant[]) => void; // 更新指定面的内容
  
  // 连线相关方法
  addConnection: (from: string, to: string, fromAnchor?: 'top' | 'right' | 'bottom' | 'left', toAnchor?: 'top' | 'right' | 'bottom' | 'left') => void;
  removeConnection: (from: string, to: string) => void;
  startConnecting: (nodeId: string, fromAnchor?: 'top' | 'right' | 'bottom' | 'left') => void;
  updateTempConnection: (fromX: number, fromY: number, toX: number, toY: number, fromAnchor: 'top' | 'right' | 'bottom' | 'left') => void;
  finishConnecting: (nodeId?: string, toAnchor?: 'top' | 'right' | 'bottom' | 'left') => void;
  cancelConnecting: () => void;
  getNodeConnections: (nodeId: string) => Connection[];
  optimizeConnections: () => void;
  
  // 连线选择相关方法
  selectConnection: (connectionId: string, multiSelect?: boolean) => void;
  clearConnectionSelection: () => void;
  deleteSelectedConnections: () => void;
  
  // 连线标签相关方法
  updateConnectionLabel: (connectionId: string, label: string) => void;
  setConnectionEditing: (connectionId: string, editing: boolean) => void;
  
  // 连线锚点修改相关方法
  updateConnectionAnchor: (connectionId: string, anchorType: 'from' | 'to', newAnchor: 'top' | 'right' | 'bottom' | 'left') => void;
  
  // 连线样式修改相关方法
  updateConnectionStyle: (connectionId: string, style: 'solid' | 'dashed') => void;
  
  // 连线颜色修改相关方法
  updateConnectionColor: (connectionId: string, color: string) => void;
  
  // 背景框高亮相关方法（用于拖拽交互）
  setFrameHighlight: (frameId: string, color: string | null) => void;
  clearAllFrameHighlights: () => void;
  
  // 手动保存功能
  saveBoard: () => void;
  
  // 手动加载功能
  loadBoard: (boardData: any) => void;
  
  // 清空白板
  clearBoard: () => void;
  
  // 自动保存状态管理
  setAutoSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  
  // 默认卡片配置相关方法
  updateDefaultCardConfig: (config: Partial<BoardState['defaultCardConfig']>) => void;
  getDefaultCardConfig: () => BoardState['defaultCardConfig'];

  // 复制粘贴相关方法
  copyNode: (nodeId: string) => void; // 复制单个卡片（兼容旧版）
  copyNodes: (nodeIds: string[]) => void; // 复制多个卡片
  pasteNode: () => void; // 粘贴单个卡片（兼容旧版）
  pasteNodes: () => void; // 粘贴多个卡片

  addNodeWithMarkdown: (markdown: string) => void;

  // 撤销相关方法
  undoStack: UndoState[];
  pushUndo: () => void;
  undo: () => void;
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => (    {
      nodes: [],
      connections: [],
      selectedNodes: [],
      selectedConnections: [],
      isSelecting: false,
      selectionStart: null,
      selectionEnd: null,
      currentBackground: 'default',
      showGrid: true,
      
      // 连线相关状态
      isConnecting: false,
      connectingFrom: null,
      fromAnchor: undefined,
      tempConnection: null,
      
      // 背景框相关状态
      backgroundFrames: [],
      selectedFrames: [],
      isDraggingFrame: false,
      frameHighlights: {},
      
      // 背景模式相关状态
      backgroundMode: 'grid' as BackgroundMode,
      
      // 视频背景相关状态
      videoBackgroundMode: false,
      videoBackgroundUrl: null,
      
      // 图片背景相关状态
      imageBackgroundUrl: null,
      imageBlurLevel: 0,
      
      // 内置背景图片相关状态
      builtinBackgroundPath: null,
      
      // 可交互主题相关状态
      interactiveTheme: null,
      
      // 缩放相关状态
      scale: 1,
      panX: 0,
      panY: 0,
      
        // 自动保存状态
  autoSaveStatus: 'idle' as const,
  lastSavedAt: null,
  
  // 复制粘贴状态
  copiedNodeData: null,
  copiedNodesData: [],
      
      // 默认卡片配置
      defaultCardConfig: {
        shape: 'rectangle',
        width: 250,
        height: 150,
        lightBackgroundColor: 'rgba(255,255,255,0.95)',
        darkBackgroundColor: 'rgba(40,40,40,0.96)',
        fontFamily: 'Arial',
        frosted: false, // 默认毛玻璃效果
        textAlign: 'left', // 默认文字水平对齐方式
        textVerticalAlign: 'top', // 默认文字垂直对齐方式
        transparent: false, // 默认不透明
        showBorder: false, // 默认不显示边框
        borderColor: '#D1D5DB', // 默认边框颜色（浅灰色）
      },
      
      // 手动保存功能
      saveBoard: () => {
        const state = get();
        const boardData = {
          nodes: state.nodes,
          connections: state.connections,
          backgroundFrames: state.backgroundFrames, // 确保背景框被持久化
          currentBackground: state.currentBackground,
          showGrid: state.showGrid,
          backgroundMode: state.backgroundMode,
          videoBackgroundUrl: state.videoBackgroundUrl,
          imageBackgroundUrl: state.imageBackgroundUrl,
          imageBlurLevel: state.imageBlurLevel,
          builtinBackgroundPath: state.builtinBackgroundPath,
          interactiveTheme: state.interactiveTheme,
          savedAt: new Date().toISOString()
        };
        
        // 保存到localStorage
        localStorage.setItem('whiteboard-backup', JSON.stringify(boardData));
        
        // 触发下载备份文件
        const blob = new Blob([JSON.stringify(boardData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📁 白板数据已保存');
      },
      
      // 手动加载功能
      loadBoard: (boardData: any) => {
        try {
          set({
            nodes: boardData.nodes || [],
            connections: boardData.connections || [],
            backgroundFrames: boardData.backgroundFrames || [], // 修复：同步加载backgroundFrames
            currentBackground: boardData.currentBackground || 'default',
            showGrid: boardData.showGrid !== undefined ? boardData.showGrid : true,
            backgroundMode: boardData.backgroundMode || 'grid',
            videoBackgroundUrl: boardData.videoBackgroundUrl || null,
            imageBackgroundUrl: boardData.imageBackgroundUrl || null,
            imageBlurLevel: boardData.imageBlurLevel || 0,
            builtinBackgroundPath: boardData.builtinBackgroundPath || null,
            interactiveTheme: boardData.interactiveTheme || null,
          });
          console.log('📂 白板数据已加载');
        } catch (error) {
          console.error('❌ 加载白板数据失败:', error);
        }
      },
      
      // 清空白板
      clearBoard: () => {
        set({
          nodes: [],
          connections: [],
          backgroundFrames: [], // 修复：切换/新建白板时清空backgroundFrames
          selectedNodes: [],
          currentBackground: 'default', // 清空时也用 default
          showGrid: true,
          backgroundMode: 'grid' as BackgroundMode,
          videoBackgroundUrl: null,
          imageBackgroundUrl: null,
          imageBlurLevel: 0,
          builtinBackgroundPath: null,
          interactiveTheme: null,
          scale: 1,
          panX: 0,
          panY: 0,
        });
        console.log('🗑️ 白板已清空');
      },
      
      addNode: (x, y) => {
        get().pushUndo();
        // 创建完全独立的初始内容对象
        const createEmptyContent = () => [{ type: 'paragraph', children: [{ text: '' }] } as any];
        
        set((state) => {
          return {
            nodes: [
              ...state.nodes.map(n => ({ ...n, editing: false, selected: false })),
              { 
                id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
                x, 
                y, 
                width: state.defaultCardConfig.width, // 使用默认配置的宽度
                height: state.defaultCardConfig.height, // 使用默认配置的高度
                content: createEmptyContent(), // 正面内容，也用于向后兼容
                editing: true, 
                selected: false,
                frontContent: createEmptyContent(), // 正面内容（新字段）
                backContent: createEmptyContent(), // 反面内容（完全独立）
                isFlipped: false,
                // 设置默认背景色
                lightBackgroundColor: state.defaultCardConfig.lightBackgroundColor,
                darkBackgroundColor: state.defaultCardConfig.darkBackgroundColor,
                // 设置默认毛玻璃效果
                frosted: state.defaultCardConfig.frosted,
                // 设置默认文字对齐方式
                textAlign: state.defaultCardConfig.textAlign,
                textVerticalAlign: state.defaultCardConfig.textVerticalAlign,
                // 设置默认透明度和边框
                transparent: state.defaultCardConfig.transparent,
                showBorder: state.defaultCardConfig.showBorder,
                borderColor: state.defaultCardConfig.borderColor,
              },
            ],
            selectedNodes: [],
          };
        });
      },
      
      updateNode: (id, data) => {
        get().pushUndo();
        set((state) => {
          let updatedNodes = state.nodes.map((n) =>
            n.id === id ? { ...n, ...data } : n
          );
          // 检查是否需要自动调整背景框或移出背景框
          const node = updatedNodes.find(n => n.id === id);
          let updatedFrames = state.backgroundFrames;
          if (node && node.containerId) {
            const frame = state.backgroundFrames.find(f => f.id === node.containerId);
            if (frame) {
              // 如果卡片已不在背景框内，移出背景框
              if (!isNodeInsideFrame(node, frame)) {
                updatedNodes = updatedNodes.map(n =>
                  n.id === id ? { ...n, containerId: undefined } : n
                );
              } else if (isFrameOverflowed(updatedNodes, frame)) {
                updatedFrames = autoResizeFrame(state.backgroundFrames, updatedNodes, node.containerId);
              }
            }
          }
          return {
            nodes: updatedNodes,
            backgroundFrames: updatedFrames,
          };
        });
      },
      
      setNodeEditing: (id, editing) =>
        set((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === id ? { ...n, editing } : n
          ),
        })),
        
      deleteNode: (id) => {
        get().pushUndo();
        set((state) => ({
          nodes: state.nodes.filter(n => n.id !== id),
          selectedNodes: state.selectedNodes.filter(nodeId => nodeId !== id),
          connections: state.connections.filter(c => c.from !== id && c.to !== id),
        }));
      },
        
      deleteSelectedNodes: () => {
        get().pushUndo();
        set((state) => {
          const nodesToDelete = new Set(state.selectedNodes);
          return {
            nodes: state.nodes.filter(n => !nodesToDelete.has(n.id)),
            selectedNodes: [],
            connections: state.connections.filter(c => !nodesToDelete.has(c.from) && !nodesToDelete.has(c.to)),
          };
        });
      },
        
      // 强制保存编辑中的节点
      saveEditingNodes: () =>
        set((state) => ({
          nodes: state.nodes.map(n => ({
            ...n,
            editing: false,
            selected: false
          })),
          selectedNodes: [],
        })),
        
      // 选择节点
      selectNode: (id, multiSelect = false) =>
        set((state) => {
          if (multiSelect) {
            const isSelected = state.selectedNodes.includes(id);
            const newSelected = isSelected 
              ? state.selectedNodes.filter(nodeId => nodeId !== id)
              : [...state.selectedNodes, id];
            return {
              selectedNodes: newSelected,
              nodes: state.nodes.map(n => ({
                ...n,
                selected: newSelected.includes(n.id)
              }))
            };
          } else {
            return {
              selectedNodes: [id],
              nodes: state.nodes.map(n => ({
                ...n,
                selected: n.id === id
              }))
            };
          }
        }),
        
      clearSelection: () =>
        set((state) => ({
          selectedNodes: [],
          nodes: state.nodes.map(n => ({ ...n, selected: false }))
        })),
        
      setSelectedNodes: (nodeIds) =>
        set((state) => ({
          selectedNodes: nodeIds,
          nodes: state.nodes.map(n => ({
            ...n,
            selected: nodeIds.includes(n.id)
          }))
        })),
        
      // 开始框选
      startSelection: (x, y) =>
        set(() => ({
          isSelecting: true,
          selectionStart: { x, y },
          selectionEnd: { x, y },
        })),
        
      // 更新框选区域
      updateSelection: (x, y) =>
        set(() => ({
          selectionEnd: { x, y },
        })),
        
      // 结束框选
      endSelection: () =>
        set((state) => {
          if (!state.selectionStart || !state.selectionEnd) {
            return { isSelecting: false, selectionStart: null, selectionEnd: null };
          }
          
          // 计算框选区域
          const minX = Math.min(state.selectionStart.x, state.selectionEnd.x);
          const maxX = Math.max(state.selectionStart.x, state.selectionEnd.x);
          const minY = Math.min(state.selectionStart.y, state.selectionEnd.y);
          const maxY = Math.max(state.selectionStart.y, state.selectionEnd.y);
          
          // 找到在框选区域内的节点
          const selectedNodeIds = state.nodes
            .filter(node => {
              const nodeWidth = node.width || 250;
              const nodeHeight = node.height || 150;
              return node.x >= minX && 
                     node.x + nodeWidth <= maxX && 
                     node.y >= minY && 
                     node.y + nodeHeight <= maxY;
            })
            .map(node => node.id);
          
          return {
            isSelecting: false,
            selectionStart: null,
            selectionEnd: null,
            selectedNodes: selectedNodeIds,
            nodes: state.nodes.map(n => ({
              ...n,
              selected: selectedNodeIds.includes(n.id)
            }))
          };
        }),
        
      // 移动选中的节点
      moveSelectedNodes: (deltaX, deltaY) => {
        set((state) => {
          let updatedNodes = state.nodes.map(node =>
            state.selectedNodes.includes(node.id)
              ? { ...node, x: node.x + deltaX, y: node.y + deltaY }
              : node
          );
          // 找出所有受影响的背景框
          const affectedFrameIds = Array.from(new Set(
            state.selectedNodes
              .map(id => state.nodes.find(n => n.id === id)?.containerId)
              .filter(Boolean)
          ));
          let updatedFrames = state.backgroundFrames;
          for (const frameId of affectedFrameIds) {
            const frame = state.backgroundFrames.find(f => f.id === frameId);
            if (frame) {
              // 检查每个属于该 frame 的被移动节点
              state.selectedNodes.forEach(nodeId => {
                const node = updatedNodes.find(n => n.id === nodeId);
                if (node && node.containerId === frameId) {
                  if (!isNodeInsideFrame(node, frame)) {
                    // 移出背景框
                    updatedNodes = updatedNodes.map(n =>
                      n.id === nodeId ? { ...n, containerId: undefined } : n
                    );
                  } else if (isFrameOverflowed(updatedNodes, frame)) {
                    updatedFrames = autoResizeFrame(updatedFrames, updatedNodes, frameId!);
                  }
                }
              });
            }
          }
          return {
            nodes: updatedNodes,
            backgroundFrames: updatedFrames,
          };
        });
        // 移动完成后优化连接
        setTimeout(() => {
          get().optimizeConnections();
        }, 100);
      },
        
      // 设置背景色
      setBackground: (backgroundId) =>
        set(() => ({
          currentBackground: backgroundId
        })),
        
      // 获取当前背景色配置
      getCurrentBackgroundConfig: () => {
        const state = get();
        return BACKGROUND_COLORS.find(bg => bg.id === state.currentBackground) || BACKGROUND_COLORS[0];
      },
      
      // 切换网格显示
      toggleGrid: () =>
        set((state) => ({
          showGrid: !state.showGrid
        })),
      
      // 背景模式相关方法
      setBackgroundMode: (mode: BackgroundMode) =>
        set(() => ({
          backgroundMode: mode,
          // 当切换到视频模式时，同时更新 videoBackgroundMode 以保持兼容
          videoBackgroundMode: mode === 'video'
        })),
      
      // 视频背景相关方法
      toggleVideoBackgroundMode: () =>
        set((state) => {
          const newVideoMode = !state.videoBackgroundMode;
          return {
            videoBackgroundMode: newVideoMode,
            backgroundMode: newVideoMode ? 'video' : 'grid'
          };
        }),
      
      setVideoBackgroundUrl: (url: string | null) =>
        set(() => ({
          videoBackgroundUrl: url
        })),
      
      // 图片背景相关方法
      setImageBackgroundUrl: (url: string | null) =>
        set(() => ({
          imageBackgroundUrl: url
        })),
      
      setImageBlurLevel: (level: number) =>
        set(() => ({
          imageBlurLevel: Math.max(0, Math.min(20, level))
        })),
      
      // 内置背景图片相关方法
      setBuiltinBackgroundPath: (path: string | null) =>
        set(() => ({
          builtinBackgroundPath: path
        })),
      
      // 缩放和平移相关方法
      setScale: (scale: number) =>
        set(() => ({
          scale
        })),
        
      setPan: (x: number, y: number) =>
        set(() => ({
          panX: x,
          panY: y
        })),
        
      resetView: () =>
        set(() => ({
          scale: 1,
          panX: 0,
          panY: 0
        })),
        
      zoomIn: () =>
        set((state) => ({
          scale: state.scale * 1.1
        })),
        
      zoomOut: () =>
        set((state) => ({
          scale: state.scale * 0.9
        })),
        
      zoomToFit: () =>
        set((state) => {
          const nodes = get().nodes;
          if (nodes.length === 0) return state;
          
          const maxX = Math.max(...nodes.map(n => n.x + (n.width || 250)));
          const maxY = Math.max(...nodes.map(n => n.y + (n.height || 150)));
          const minX = Math.min(...nodes.map(n => n.x));
          const minY = Math.min(...nodes.map(n => n.y));
          
          const contentWidth = maxX - minX;
          const contentHeight = maxY - minY;
          
          const scaleX = window.innerWidth / contentWidth;
          const scaleY = window.innerHeight / contentHeight;
          const scale = Math.min(scaleX, scaleY, 1) * 0.8; // 留一些边距
          
          return {
            scale,
            panX: -minX * scale + (window.innerWidth - contentWidth * scale) / 2,
            panY: -minY * scale + (window.innerHeight - contentHeight * scale) / 2
          };
        }),
        
      // 图钉相关方法
      toggleNodePin: (id: string) =>
        set((state) => ({
          nodes: state.nodes.map(n =>
            n.id === id ? { ...n, pinned: !n.pinned } : n
          ),
        })),
      
      // 可交互主题相关方法
      setInteractiveTheme: (theme: InteractiveTheme) =>
        set(() => ({
          interactiveTheme: theme,
        })),
      
      // 卡片反转相关方法
      flipCard: (id: string) => {
        set((state) => {
          const nodeIndex = state.nodes.findIndex(n => n.id === id);
          if (nodeIndex === -1) return state;
          
          const node = state.nodes[nodeIndex];
          
          // 创建节点的更新副本，同时确保保留代码相关属性
          const updatedNode = {
            ...node,
            isFlipped: !node.isFlipped,
            isFlipping: true // 添加动画标记
          };
          
          // 创建新的节点数组
          const updatedNodes = [...state.nodes];
          updatedNodes[nodeIndex] = updatedNode;
          
          // 添加延迟重置动画状态的逻辑
          setTimeout(() => {
            set((state) => {
              const currentNodeIndex = state.nodes.findIndex(n => n.id === id);
              if (currentNodeIndex === -1) return state;
              
              const currentNode = state.nodes[currentNodeIndex];
              
              const updatedCurrentNodes = [...state.nodes];
              updatedCurrentNodes[currentNodeIndex] = {
                ...currentNode,
                isFlipping: false
              };
              
              return { nodes: updatedCurrentNodes };
            });
          }, 600); // 与CSS动画持续时间相匹配
          
          return { nodes: updatedNodes };
        });
      },
      
      updateCardSide: (id: string, side: 'front' | 'back', content: Descendant[]) =>
        set((state) => ({
          nodes: state.nodes.map(n =>
            n.id === id ? { ...n, [side + 'Content']: JSON.parse(JSON.stringify(content)) } : n
          ),
        })),
      
      // 连线相关方法
      addConnection: (from: string, to: string, fromAnchor?: 'top' | 'right' | 'bottom' | 'left', toAnchor?: 'top' | 'right' | 'bottom' | 'left') => {
        set((state) => ({
          connections: [...state.connections, { from, to, fromAnchor, toAnchor }],
        }));
      },
        
      removeConnection: (from: string, to: string) =>
        set((state) => ({
          connections: state.connections.filter(c => c.from !== from || c.to !== to),
        })),
        
      startConnecting: (nodeId: string, fromAnchor?: 'top' | 'right' | 'bottom' | 'left') => {
        // 在这里计算起始点的屏幕坐标
        const { nodes, backgroundFrames, panX, panY, scale } = get();

        const getEntityById = (id: string) => {
          const node = nodes.find(n => n.id === id);
          if (node) return node;
          const frame = backgroundFrames.find(f => f.id === id);
          if (frame) return frame;
          return null;
        };

        const entity = getEntityById(nodeId);
        if (!entity) return;

        const isPinned = 'pinned' in entity && entity.pinned;
        const entityX = isPinned ? (entity as NodeData).pinnedX! : entity.x * scale + panX;
        const entityY = isPinned ? (entity as NodeData).pinnedY! : entity.y * scale + panY;
        const entityWidth = (entity.width || 324) * (isPinned ? 1 : scale);
        const entityHeight = (entity.height || 200) * (isPinned ? 1 : scale);

        let fromX = 0, fromY = 0;
        switch (fromAnchor) {
          case 'top': fromX = entityX + entityWidth / 2; fromY = entityY; break;
          case 'right': fromX = entityX + entityWidth; fromY = entityY + entityHeight / 2; break;
          case 'bottom': fromX = entityX + entityWidth / 2; fromY = entityY + entityHeight; break;
          case 'left': fromX = entityX; fromY = entityY + entityHeight / 2; break;
        }

        set({ 
          isConnecting: true, 
          connectingFrom: nodeId,
          fromAnchor: fromAnchor,
          // 同时设置临时连线的起点和初始终点
          tempConnection: { fromX, fromY, toX: fromX, toY: fromY, fromAnchor: fromAnchor || 'right' }
        });
      },
        
      updateTempConnection: (fromX: number, fromY: number, toX: number, toY: number, fromAnchor: 'top' | 'right' | 'bottom' | 'left') => {
        set(() => ({
          tempConnection: { fromX, fromY, toX, toY, fromAnchor },
        }));
      },
        
        finishConnecting: (nodeId?: string, toAnchor?: 'top' | 'right' | 'bottom' | 'left') => {
          set((state) => {
            if (state.isConnecting && state.connectingFrom && nodeId) {
              // 获取起始锚点信息
              const fromAnchor = (state as any).fromAnchor;
              // 创建连线时传递锚点信息
              return {
                connections: [...state.connections, { 
                  from: state.connectingFrom, 
                  to: nodeId, 
                  fromAnchor, 
                  toAnchor 
                }],
                isConnecting: false,
                connectingFrom: null,
                tempConnection: null,
                fromAnchor: undefined,
              };
            }
            // 没有目标节点时只清除连线状态
            return {
              isConnecting: false,
              connectingFrom: null,
              tempConnection: null,
              fromAnchor: undefined,
            };
          });
        },
        
        cancelConnecting: () =>
          set(() => ({
            isConnecting: false,
            connectingFrom: null,
            tempConnection: null,
          })),
        
        getNodeConnections: (nodeId: string) =>
          get().connections.filter((c: Connection) => c.from === nodeId || c.to === nodeId),
        
        // 优化连接的锚点位置（当节点移动后调用）
        optimizeConnections: () => {
          set((state) => {
            const optimizedConnections = state.connections.map((connection) => {
              const fromNode = state.nodes.find(n => n.id === connection.from);
              const toNode = state.nodes.find(n => n.id === connection.to);
              
              if (!fromNode || !toNode) return connection;
              
              // 如果连接没有指定锚点，或者我们想要重新优化
              const fromX = fromNode.pinned ? (fromNode.pinnedX ?? 100) : fromNode.x;
              const fromY = fromNode.pinned ? (fromNode.pinnedY ?? 100) : fromNode.y;
              const toX = toNode.pinned ? (toNode.pinnedX ?? 100) : toNode.x;
              const toY = toNode.pinned ? (toNode.pinnedY ?? 100) : toNode.y;

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

              // 只在连接没有手动指定锚点时才自动优化
              return {
                ...connection,
                fromAnchor: connection.fromAnchor ?? fromAnchor,
                toAnchor: connection.toAnchor ?? toAnchor,
              };
            });
            
            return { connections: optimizedConnections };
          });
        },
       
      // 连线选择相关方法
      selectConnection: (connectionId: string, multiSelect?: boolean) => {
        set((state) => {
          if (!multiSelect) {
            // 清除节点选择
            const updatedNodes = state.nodes.map(n => ({ ...n, selected: false }));
            return {
              nodes: updatedNodes,
              selectedNodes: [],
              selectedConnections: [connectionId],
              connections: state.connections.map(c => ({
                ...c,
                selected: `${c.from}-${c.to}` === connectionId
              }))
            };
          } else {
            const isSelected = state.selectedConnections.includes(connectionId);
            return {
              selectedConnections: isSelected
                ? state.selectedConnections.filter(id => id !== connectionId)
                : [...state.selectedConnections, connectionId],
              connections: state.connections.map(c => ({
                ...c,
                selected: `${c.from}-${c.to}` === connectionId ? !c.selected : c.selected
              }))
            };
          }
        });
      },

      clearConnectionSelection: () => {
        set((state) => ({
          selectedConnections: [],
          connections: state.connections.map(c => ({ ...c, selected: false }))
        }));
      },

      deleteSelectedConnections: () => {
        set((state) => ({
          connections: state.connections.filter(c => 
            !state.selectedConnections.includes(`${c.from}-${c.to}`)
          ),
          selectedConnections: []
        }));
      },

      // 连线标签相关方法
      updateConnectionLabel: (connectionId: string, label: string) => {
        set((state) => ({
          connections: state.connections.map(c =>
            `${c.from}-${c.to}` === connectionId
              ? { ...c, label }
              : c
          )
        }));
      },

      setConnectionEditing: (connectionId: string, editing: boolean) => {
        set((state) => ({
          connections: state.connections.map(c =>
            `${c.from}-${c.to}` === connectionId
              ? { ...c, editing }
              : c
          )
        }));
      },

      // 连线锚点修改相关方法
      updateConnectionAnchor: (connectionId: string, anchorType: 'from' | 'to', newAnchor: 'top' | 'right' | 'bottom' | 'left') => {
        set((state) => ({
          connections: state.connections.map(c => {
            if (`${c.from}-${c.to}` === connectionId) {
              return {
                ...c,
                [anchorType === 'from' ? 'fromAnchor' : 'toAnchor']: newAnchor
              };
            }
            return c;
          })
        }));
      },

      // 连线样式修改相关方法
      updateConnectionStyle: (connectionId: string, style: 'solid' | 'dashed') => {
        set((state) => ({
          connections: state.connections.map(c => {
            if (`${c.from}-${c.to}` === connectionId) {
              return {
                ...c,
                style
              };
            }
            return c;
          })
        }));
      },

      // 连线颜色修改相关方法
      updateConnectionColor: (connectionId: string, color: string) => {
        set((state) => ({
          connections: state.connections.map(c => {
            if (`${c.from}-${c.to}` === connectionId) {
              return {
                ...c,
                color
              };
            }
            return c;
          })
        }));
      },
       
      // 自动保存状态管理
      setAutoSaveStatus: (status) => 
        set(() => ({ 
          autoSaveStatus: status,
          lastSavedAt: status === 'saved' ? new Date() : get().lastSavedAt
        })),
      
      // 默认卡片配置相关方法
      updateDefaultCardConfig: (config: Partial<BoardState['defaultCardConfig']>) =>
        set((state) => ({
          defaultCardConfig: { ...state.defaultCardConfig, ...config }
        })),
      
      getDefaultCardConfig: () =>
        get().defaultCardConfig,

      // 复制粘贴相关方法
      copyNode: (nodeId: string) => {
        const state = get();
        const node = state.nodes.find(n => n.id === nodeId);
        if (node) {
          // 深度复制节点数据到剪贴板
          const copiedData: NodeData = JSON.parse(JSON.stringify(node));
          set({ copiedNodeData: copiedData, copiedNodesData: [copiedData] });
          console.log('✅ 卡片已复制到剪贴板:', node.id);
        }
      },

      copyNodes: (nodeIds: string[]) => {
        const state = get();
        const nodes = state.nodes.filter(n => nodeIds.includes(n.id));
        if (nodes.length > 0) {
          // 深度复制多个节点数据到剪贴板
          const copiedData: NodeData[] = JSON.parse(JSON.stringify(nodes));
          set({ 
            copiedNodesData: copiedData,
            copiedNodeData: copiedData[0] || null // 兼容旧版，取第一个
          });
          console.log(`✅ ${nodes.length}个卡片已复制到剪贴板:`, nodeIds);
        }
      },

      pasteNode: () => {
        const state = get();
        if (!state.copiedNodeData) return;
        
        // 生成新的ID
        const newId = Date.now().toString() + Math.random().toString(36).slice(2, 8);
        
        // 计算粘贴位置（在当前视口中心）
        const containerElement = document.querySelector('.board-canvas');
        if (!containerElement) return;
        
        const rect = containerElement.getBoundingClientRect();
        const centerX = (rect.width / 2 - state.panX) / state.scale;
        const centerY = (rect.height / 2 - state.panY) / state.scale;
        
        // 创建新节点，偏移一点位置避免完全重叠
        const newNode: NodeData = {
          ...state.copiedNodeData,
          id: newId,
          x: centerX + 20, // 稍微偏移避免完全重叠
          y: centerY + 20,
          editing: false,
          selected: false,
        };
        
        set((state) => ({
          nodes: [...state.nodes, newNode],
          selectedNodes: [newId], // 选中新粘贴的节点
        }));
        
        console.log('✅ 卡片已粘贴:', newId);
      },

      pasteNodes: () => {
        const state = get();
        if (!state.copiedNodesData || state.copiedNodesData.length === 0) return;
        
        // 计算粘贴位置（在当前视口中心）
        const containerElement = document.querySelector('.board-canvas');
        if (!containerElement) return;
        
        const rect = containerElement.getBoundingClientRect();
        const centerX = (rect.width / 2 - state.panX) / state.scale;
        const centerY = (rect.height / 2 - state.panY) / state.scale;
        
        // 计算原始卡片的包围盒中心
        const originalNodes = state.copiedNodesData;
        const minX = Math.min(...originalNodes.map(n => n.x));
        const maxX = Math.max(...originalNodes.map(n => n.x + (n.width || 324)));
        const minY = Math.min(...originalNodes.map(n => n.y));
        const maxY = Math.max(...originalNodes.map(n => n.y + (n.height || 200)));
        
        const originalCenterX = (minX + maxX) / 2;
        const originalCenterY = (minY + maxY) / 2;
        
        // 计算偏移量
        const offsetX = centerX - originalCenterX + 20; // 稍微偏移避免完全重叠
        const offsetY = centerY - originalCenterY + 20;
        
        // 创建新节点
        const newNodes: NodeData[] = [];
        const newNodeIds: string[] = [];
        
        originalNodes.forEach((node, index) => {
          const newId = Date.now().toString() + Math.random().toString(36).slice(2, 8) + index;
          const newNode: NodeData = {
            ...node,
            id: newId,
            x: node.x + offsetX,
            y: node.y + offsetY,
            editing: false,
            selected: false,
          };
          newNodes.push(newNode);
          newNodeIds.push(newId);
        });
        
        set((state) => ({
          nodes: [...state.nodes, ...newNodes],
          selectedNodes: newNodeIds, // 选中所有新粘贴的节点
        }));
        
        console.log(`✅ ${newNodes.length}个卡片已粘贴:`, newNodeIds);
      },

      addNodeWithMarkdown: (markdown: string) => set((state) => {
        const id = Date.now().toString() + Math.random().toString(36).slice(2, 8);
        return {
          nodes: [
            ...state.nodes,
            {
              id,
              x: 100 + Math.random() * 200,
              y: 100 + Math.random() * 200,
              width: state.defaultCardConfig.width,
              height: state.defaultCardConfig.height,
              markdownContent: markdown,
              editMode: 'markdown',
              editing: false,
              selected: false,
              content: [{ type: 'paragraph', children: [{ text: '' }] }], // 必须有content字段
              lightBackgroundColor: state.defaultCardConfig.lightBackgroundColor,
              darkBackgroundColor: state.defaultCardConfig.darkBackgroundColor,
              frosted: state.defaultCardConfig.frosted,
              textAlign: state.defaultCardConfig.textAlign,
              textVerticalAlign: state.defaultCardConfig.textVerticalAlign,
              transparent: state.defaultCardConfig.transparent,
              showBorder: state.defaultCardConfig.showBorder,
              borderColor: state.defaultCardConfig.borderColor,
            }
          ]
        };
      }),

      // 背景框相关方法
      createBackgroundFrame: (x: number, y: number, width: number, height: number) => {
        const frameId = Date.now().toString() + Math.random().toString(36).slice(2, 8);
        const newFrame: BackgroundFrame = {
          id: frameId,
          x,
          y,
          width,
          height,
          title: '',
          selected: false,
          isDragging: false,
          nodeIds: [],
          style: {
            borderColor: '#007acc',
            backgroundColor: 'rgba(0, 122, 204, 0.05)',
            borderWidth: 2,
            borderRadius: 8,
          },
        };
        
        set((state) => ({
          backgroundFrames: [...state.backgroundFrames, newFrame],
          selectedFrames: [frameId],
        }));
        
        console.log('✅ 背景框已创建:', frameId);
      },

      updateBackgroundFrame: (id: string, data: Partial<BackgroundFrame>) => {
        set((state) => {
          const frame = state.backgroundFrames.find((f) => f.id === id);
          if (!frame) return { backgroundFrames: state.backgroundFrames };
          // 计算所有属于该 frame 的卡片的最小包裹范围
          const frameNodes = state.nodes.filter((n) => n.containerId === id);
          let minX = frame.x, minY = frame.y, maxX = frame.x + frame.width, maxY = frame.y + frame.height;
          if (frameNodes.length > 0) {
            minX = Math.min(...frameNodes.map(n => n.x));
            minY = Math.min(...frameNodes.map(n => n.y));
            maxX = Math.max(...frameNodes.map(n => n.x + (n.width || 200)));
            maxY = Math.max(...frameNodes.map(n => n.y + (n.height || 80)));
          }
          const padding = 20;
          // 允许的最小包裹区域
          const minFrameX = minX - padding;
          const minFrameY = minY - padding;
          const minFrameWidth = (maxX - minX) + padding * 2;
          const minFrameHeight = (maxY - minY) + padding * 2;
          // 计算用户想要设置的新位置和尺寸
          let newX = data.x !== undefined ? data.x : frame.x;
          let newY = data.y !== undefined ? data.y : frame.y;
          let newWidth = data.width !== undefined ? data.width : frame.width;
          let newHeight = data.height !== undefined ? data.height : frame.height;
          // 限制不能小于最小包裹区域
          if (newX > minFrameX) newX = minFrameX;
          if (newY > minFrameY) newY = minFrameY;
          if (newWidth < minFrameWidth) newWidth = minFrameWidth;
          if (newHeight < minFrameHeight) newHeight = minFrameHeight;
          return {
            ...state,
            backgroundFrames: state.backgroundFrames.map((f) =>
              f.id === id ? { ...f, ...data, x: newX, y: newY, width: newWidth, height: newHeight } : f
            ),
          };
        });
      },

      deleteBackgroundFrame: (id: string) => {
        set((state) => {
          // 先移除所有卡片与背景框的关联
          const updatedNodes = state.nodes.map((node) =>
            node.containerId === id ? { ...node, containerId: undefined } : node
          );
          
          return {
            backgroundFrames: state.backgroundFrames.filter((frame) => frame.id !== id),
            selectedFrames: state.selectedFrames.filter((frameId) => frameId !== id),
            nodes: updatedNodes,
          };
        });
      },

      selectBackgroundFrame: (id: string, multiSelect = false) => {
        set((state) => {
          if (multiSelect) {
            const isSelected = state.selectedFrames.includes(id);
            const newSelected = isSelected
              ? state.selectedFrames.filter((frameId) => frameId !== id)
              : [...state.selectedFrames, id];
            return {
              selectedFrames: newSelected,
              backgroundFrames: state.backgroundFrames.map((frame) => ({
                ...frame,
                selected: newSelected.includes(frame.id),
              })),
            };
          } else {
            return {
              selectedFrames: [id],
              backgroundFrames: state.backgroundFrames.map((frame) => ({
                ...frame,
                selected: frame.id === id,
              })),
            };
          }
        });
      },

      clearFrameSelection: () => {
        set((state) => ({
          selectedFrames: [],
          backgroundFrames: state.backgroundFrames.map((frame) => ({
            ...frame,
            selected: false,
          })),
        }));
      },

      moveBackgroundFrame: (frameId: string, deltaX: number, deltaY: number) => {
        set((state) => {
          const frameIndex = state.backgroundFrames.findIndex(f => f.id === frameId);
          if (frameIndex === -1) {
            console.log('❌ 背景框未找到:', frameId);
            return state;
          }

          const frame = state.backgroundFrames[frameIndex];
          const newX = frame.x + deltaX;
          const newY = frame.y + deltaY;

          console.log(`🔄 移动背景框 ${frameId}:`, {
            oldPos: { x: frame.x, y: frame.y },
            newPos: { x: newX, y: newY },
            delta: { deltaX, deltaY },
            nodeIds: frame.nodeIds
          });

          // 更新背景框位置
          const updatedFrames = [...state.backgroundFrames];
          updatedFrames[frameIndex] = {
            ...frame,
            x: newX,
            y: newY,
          };

          // 同步移动背景框内的所有卡片
          const updatedNodes = state.nodes.map(node => {
            if (node.containerId === frameId) {
              const newNodeX = node.x + deltaX;
              const newNodeY = node.y + deltaY;
              console.log(`📦 同步移动卡片 ${node.id}:`, {
                oldPos: { x: node.x, y: node.y },
                newPos: { x: newNodeX, y: newNodeY }
              });
              return {
                ...node,
                x: newNodeX,
                y: newNodeY,
              };
            }
            return node;
          });

          const movedNodesCount = updatedNodes.filter(node => node.containerId === frameId).length;
          console.log(`✅ 背景框移动完成，同步移动了 ${movedNodesCount} 个卡片`);

          return {
            ...state,
            backgroundFrames: updatedFrames,
            nodes: updatedNodes,
          };
        });
      },

      addNodeToFrame: (nodeId: string, frameId: string) => {
        set((state) => {
          const frame = state.backgroundFrames.find((f) => f.id === frameId);
          if (!frame) {
            console.log('❌ 背景框未找到，无法添加卡片:', frameId);
            return state;
          }

          console.log(`🔗 添加卡片 ${nodeId} 到背景框 ${frameId}`);

          // 更新卡片的容器ID
          const updatedNodes = state.nodes.map((node) =>
            node.id === nodeId ? { ...node, containerId: frameId } : node
          );

          // 更新背景框的节点列表
          const updatedFrames = state.backgroundFrames.map((f) =>
            f.id === frameId
              ? { ...f, nodeIds: [...f.nodeIds, nodeId] }
              : f
          );

          // 判断是否需要扩展背景框
          let finalFrames = updatedFrames;
          const newFrame = updatedFrames.find(f => f.id === frameId);
          if (newFrame && isFrameOverflowed(updatedNodes, newFrame)) {
            finalFrames = autoResizeFrame(updatedFrames, updatedNodes, frameId);
          }

          console.log(`✅ 卡片 ${nodeId} 已成功添加到背景框 ${frameId}，当前节点列表:`, finalFrames.find(f => f.id === frameId)?.nodeIds);

          return {
            nodes: updatedNodes,
            backgroundFrames: finalFrames,
          };
        });
      },

      removeNodeFromFrame: (nodeId: string) => {
        set((state) => {
          const node = state.nodes.find((n) => n.id === nodeId);
          if (!node || !node.containerId) return state;

          // 移除卡片的容器ID
          const updatedNodes = state.nodes.map((n) =>
            n.id === nodeId ? { ...n, containerId: undefined } : n
          );

          // 从背景框中移除节点ID
          const updatedFrames = state.backgroundFrames.map((frame) =>
            frame.id === node.containerId
              ? { ...frame, nodeIds: frame.nodeIds.filter((id) => id !== nodeId) }
              : frame
          );

          return {
            nodes: updatedNodes,
            backgroundFrames: updatedFrames,
          };
        });
      },

      getFrameNodes: (frameId: string) => {
        const state = get();
        return state.nodes.filter((node) => node.containerId === frameId);
      },

      // 背景框高亮相关方法（用于拖拽交互）
      setFrameHighlight: (frameId: string, color: string | null) => {
        set((state) => {
          const newHighlights = { ...state.frameHighlights };
          if (color) {
            newHighlights[frameId] = color;
          } else {
            delete newHighlights[frameId];
          }
          return { frameHighlights: newHighlights };
        });
      },

      clearAllFrameHighlights: () => {
        set({ frameHighlights: {} });
      },

      // 撤销相关方法
      undoStack: [],
      pushUndo: () => {
        const state = get();
        const snapshot: UndoState = {
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          connections: JSON.parse(JSON.stringify(state.connections)),
          backgroundFrames: JSON.parse(JSON.stringify(state.backgroundFrames)),
          currentBackground: state.currentBackground,
          showGrid: state.showGrid,
          backgroundMode: state.backgroundMode,
          videoBackgroundUrl: state.videoBackgroundUrl,
          imageBackgroundUrl: state.imageBackgroundUrl,
          imageBlurLevel: state.imageBlurLevel,
          builtinBackgroundPath: state.builtinBackgroundPath,
          interactiveTheme: state.interactiveTheme,
          scale: state.scale,
          panX: state.panX,
          panY: state.panY,
          defaultCardConfig: JSON.parse(JSON.stringify(state.defaultCardConfig)),
        };
        set((s) => ({ undoStack: [...s.undoStack, snapshot] }));
      },
      undo: () => {
        const state = get();
        if (state.undoStack.length === 0) return;
        const last = state.undoStack[state.undoStack.length - 1];
        set({
          nodes: JSON.parse(JSON.stringify(last.nodes)),
          connections: JSON.parse(JSON.stringify(last.connections)),
          backgroundFrames: JSON.parse(JSON.stringify(last.backgroundFrames)),
          currentBackground: last.currentBackground,
          showGrid: last.showGrid,
          backgroundMode: last.backgroundMode,
          videoBackgroundUrl: last.videoBackgroundUrl,
          imageBackgroundUrl: last.imageBackgroundUrl,
          imageBlurLevel: last.imageBlurLevel,
          builtinBackgroundPath: last.builtinBackgroundPath,
          interactiveTheme: last.interactiveTheme,
          scale: last.scale,
          panX: last.panX,
          panY: last.panY,
          defaultCardConfig: JSON.parse(JSON.stringify(last.defaultCardConfig)),
          undoStack: state.undoStack.slice(0, -1),
        });
      },
    }),
    {
      name: 'whiteboard-storage', // 存储键名
      storage: createJSONStorage(() => localStorage), // 使用localStorage
      // 选择性持久化（排除临时状态）
      partialize: (state) => ({
        nodes: state.nodes,
        connections: state.connections,
        backgroundFrames: state.backgroundFrames, // 确保背景框被持久化
        currentBackground: state.currentBackground,
        showGrid: state.showGrid,
        backgroundMode: state.backgroundMode,
        videoBackgroundUrl: state.videoBackgroundUrl,
        imageBackgroundUrl: state.imageBackgroundUrl,
        imageBlurLevel: state.imageBlurLevel,
        builtinBackgroundPath: state.builtinBackgroundPath,
        interactiveTheme: state.interactiveTheme,
        scale: state.scale,
        panX: state.panX,
        panY: state.panY,
        defaultCardConfig: state.defaultCardConfig, // 添加默认卡片配置到持久化
        lastSavedAt: state.lastSavedAt, // 保存最后保存时间
      }),
      // 版本管理
      version: 2, // 增加版本号，因为我们添加了backgroundFrames
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // 处理版本升级
          persistedState.backgroundFrames = [];
        }
        return persistedState;
      },
      // 添加保存回调
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 恢复数据后设置状态为已保存
          state.setAutoSaveStatus('saved');
        }
      },
    }
  )
);

// 改进的自动保存功能
let autoSaveTimer: number | null = null;
let isFirstChange = true; // 标记是否为首次变化，避免初始化时触发保存

// 监听store变化并自动保存
const unsubscribe = useBoardStore.subscribe((state, prevState) => {
  // 跳过初始化时的变化
  if (isFirstChange) {
    isFirstChange = false;
    return;
  }
  
  // 检查是否有实际的数据变化（排除UI状态变化）
  const hasDataChanged = (
    JSON.stringify(state.nodes) !== JSON.stringify(prevState.nodes) ||
    JSON.stringify(state.connections) !== JSON.stringify(prevState.connections) ||
    state.currentBackground !== prevState.currentBackground ||
    state.showGrid !== prevState.showGrid ||
    state.backgroundMode !== prevState.backgroundMode ||
    state.videoBackgroundUrl !== prevState.videoBackgroundUrl ||
    state.imageBackgroundUrl !== prevState.imageBackgroundUrl ||
    state.imageBlurLevel !== prevState.imageBlurLevel ||
    state.builtinBackgroundPath !== prevState.builtinBackgroundPath ||
    JSON.stringify(state.backgroundFrames) !== JSON.stringify(prevState.backgroundFrames) ||
    JSON.stringify(state.interactiveTheme) !== JSON.stringify(prevState.interactiveTheme) ||
    state.scale !== prevState.scale ||
    state.panX !== prevState.panX ||
    state.panY !== prevState.panY ||
    JSON.stringify(state.defaultCardConfig) !== JSON.stringify(prevState.defaultCardConfig)
  );
  
  if (!hasDataChanged) {
    return; // 没有实际数据变化，不需要保存
  }
  
  // 设置为保存中状态
  state.setAutoSaveStatus('saving');
  
  // 防抖：清除之前的定时器
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  
  // 设置新的定时器
  autoSaveTimer = window.setTimeout(() => {
    try {
      // 这里persistence中间件会自动处理保存
      const currentState = useBoardStore.getState();
      currentState.setAutoSaveStatus('saved');
      console.log('💾 自动保存完成 -', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('❌ 自动保存失败:', error);
      const currentState = useBoardStore.getState();
      currentState.setAutoSaveStatus('error');
    }
  }, 2000); // 2秒后保存，给用户足够的编辑时间
});

// 调试工具：将store暴露到window对象上
if (typeof window !== 'undefined') {
  (window as any).useBoardStore = useBoardStore;
  
  // 页面卸载时取消订阅
  window.addEventListener('beforeunload', () => {
    unsubscribe();
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
  });
}

// 在 useBoardStore.ts 顶部或合适位置添加 autoResizeFrame 工具函数
function autoResizeFrame(frames: BackgroundFrame[], nodes: NodeData[], frameId: string) {
  const frame = frames.find(f => f.id === frameId);
  if (!frame) return frames;
  const frameNodes = nodes.filter(n => n.containerId === frameId);
  if (frameNodes.length === 0) return frames;
  const padding = 20;
  const minX = Math.min(...frameNodes.map(n => n.x));
  const minY = Math.min(...frameNodes.map(n => n.y));
  const maxX = Math.max(...frameNodes.map(n => n.x + (n.width || 200)));
  const maxY = Math.max(...frameNodes.map(n => n.y + (n.height || 80)));
  const newX = minX - padding;
  const newY = minY - padding;
  const newWidth = (maxX - minX) + padding * 2;
  const newHeight = (maxY - minY) + padding * 2;
  return frames.map(f =>
    f.id === frameId
      ? { ...f, x: newX, y: newY, width: newWidth, height: newHeight }
      : f
  );
} 

// 工具函数：判断 frame 是否需要扩展包裹所有子卡片
function isFrameOverflowed(nodes: NodeData[], frame: BackgroundFrame) {
  const frameNodes = nodes.filter(n => n.containerId === frame.id);
  if (frameNodes.length === 0) return false;
  const minX = Math.min(...frameNodes.map(n => n.x));
  const minY = Math.min(...frameNodes.map(n => n.y));
  const maxX = Math.max(...frameNodes.map(n => n.x + (n.width || 200)));
  const maxY = Math.max(...frameNodes.map(n => n.y + (n.height || 80)));
  // 只要有一边超出当前 frame 范围（含 padding），就需要扩展
  const padding = 20;
  if (minX - padding < frame.x) return true;
  if (minY - padding < frame.y) return true;
  if (maxX + padding > frame.x + frame.width) return true;
  if (maxY + padding > frame.y + frame.height) return true;
  return false;
} 

// 工具函数：判断卡片是否在背景框内
function isNodeInsideFrame(node: NodeData, frame: BackgroundFrame) {
  const nodeRight = node.x + (node.width || 200);
  const nodeBottom = node.y + (node.height || 80);
  return (
    node.x >= frame.x &&
    node.y >= frame.y &&
    nodeRight <= frame.x + frame.width &&
    nodeBottom <= frame.y + frame.height
  );
}