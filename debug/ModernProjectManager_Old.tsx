import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import { useBoardStore, type NodeData, LIGHT_CARD_COLORS, DARK_CARD_COLORS } from '../store/useBoardStore';
import { ThemeContext } from '../App';
import { extractTags, extractTextFromSlateContent } from './RichTextEditor';
import NodeCard from './NodeCard';
import type { InteractiveTheme } from './InteractiveThemeBackground';
import BackgroundImageSelector from './BackgroundImageSelector';

// 导入新的统一存储系统
import { useUnifiedStorage } from '../hooks/useUnifiedStorage';
import type { BoardMetadata } from '../services/unifiedStorageService';

// 动态获取可用的图标列表
// 常用图标列表 - 优化性能，避免加载1996个图标
const POPULAR_ICONS = [
  '1F4A1.png', '1F4DD.png', '1F4C1.png', '1F4CB.png', '1F4CA.png', '1F4C8.png', '1F4C9.png', '1F4CE.png',
  '1F4CF.png', '1F4CC.png', '1F4CD.png', '1F50D.png', '1F511.png', '1F512.png', '1F513.png', '1F514.png',
  '1F515.png', '1F516.png', '1F517.png', '1F518.png', '1F519.png', '1F51A.png', '1F51B.png', '1F51C.png',
  '1F51D.png', '1F3AF.png', '1F3C6.png', '1F3C5.png', '1F3C4.png', '1F3C3.png', '1F3C2.png', '1F3C1.png',
  '1F680.png', '1F681.png', '1F682.png', '1F683.png', '1F684.png', '1F685.png', '1F686.png', '1F687.png',
  '1F688.png', '1F689.png', '1F68A.png', '1F68B.png', '1F68C.png', '1F68D.png', '1F68E.png', '1F68F.png',
  '1F690.png', '1F691.png', '1F692.png', '1F693.png', '1F694.png', '1F695.png', '1F696.png', '1F697.png',
  '1F698.png', '1F699.png', '1F69A.png', '1F69B.png', '1F69C.png', '1F69D.png', '1F69E.png', '1F69F.png',
  '1F6A0.png', '1F6A1.png', '1F6A2.png', '1F6A3.png', '1F6A4.png', '1F6A5.png', '1F6A6.png', '1F6A7.png',
  '1F6A8.png', '1F6A9.png', '1F6AA.png', '1F6AB.png', '1F6AC.png', '1F6AD.png', '1F6AE.png', '1F6AF.png',
  '1F6B0.png', '1F6B1.png', '1F6B2.png', '1F6B3.png', '1F6B4.png', '1F6B5.png', '1F6B6.png', '1F6B7.png',
  '1F6B8.png', '1F6B9.png', '1F6BA.png', '1F6BB.png', '1F6BC.png', '1F6BD.png', '1F6BE.png', '1F6BF.png',
  '1F6C0.png', '1F6C1.png', '1F6C2.png', '1F6C3.png', '1F6C4.png', '1F6C5.png', '2728.png', '2B50.png',
  '1F31F.png', '1F320.png', '1F4AB.png', '1F496.png', '1F497.png', '1F498.png', '1F499.png', '1F49A.png',
  '1F49B.png', '1F49C.png', '1F49D.png', '1F49E.png', '1F49F.png', '1F4A0.png', '1F4A2.png', '1F4A3.png',
  '1F4A4.png', '1F4A5.png', '1F4A6.png', '1F4A7.png', '1F4A8.png', '1F4A9.png', '1F4AA.png', '1F4AB.png',
  '1F600.png', '1F601.png', '1F602.png', '1F603.png', '1F604.png', '1F605.png', '1F606.png', '1F607.png',
  '1F608.png', '1F609.png', '1F60A.png', '1F60B.png', '1F60C.png', '1F60D.png', '1F60E.png', '1F60F.png',
  '1F610.png', '1F611.png', '1F612.png', '1F613.png', '1F614.png', '1F615.png', '1F616.png', '1F617.png',
  '1F618.png', '1F619.png', '1F61A.png', '1F61B.png', '1F61C.png', '1F61D.png', '1F61E.png', '1F61F.png',
  '1F620.png', '1F621.png', '1F622.png', '1F623.png', '1F624.png', '1F625.png', '1F626.png', '1F627.png',
  '1F628.png', '1F629.png', '1F62A.png', '1F62B.png', '1F62C.png', '1F62D.png', '1F62E.png', '1F62F.png'
];

// 图标加载状态缓存
let iconCache: string[] | null = null;

const getAvailableIcons = (): string[] => {
  // 使用缓存避免重复计算
  if (iconCache) {
    return iconCache;
  }

  try {
    // 仅在需要时异步加载图标列表，不立即加载所有图标
    const iconModules = import.meta.glob('/src/assets/icons/*.png', { query: '?url', import: 'default', eager: false });
    
    // 提取文件名
    const iconNames = Object.keys(iconModules).map(path => {
      // 从路径 '/src/assets/icons/filename.png' 提取 'filename.png'
      return path.split('/').pop() || '';
    }).filter(name => name && name !== '.DS_Store');
    
    // 缓存结果
    iconCache = iconNames.length > 0 ? iconNames : POPULAR_ICONS;
    console.log(`🎨 图标列表已准备: ${iconCache.length} 个图标`);
    return iconCache;
  } catch (error) {
    console.warn('动态加载图标失败，使用常用图标列表:', error);
    
    // 缓存备用图标列表
    iconCache = POPULAR_ICONS;
    return iconCache;
  }
};

// 可用的图标列表
const AVAILABLE_ICONS = getAvailableIcons();

// 随机选择一个图标
const getRandomIcon = (): string => {
  const randomIndex = Math.floor(Math.random() * AVAILABLE_ICONS.length);
  return AVAILABLE_ICONS[randomIndex];
};

// 获取图标的完整路径
const getIconPath = (iconFileName: string): string => {
  return `/src/assets/icons/${iconFileName}`;
};

interface ModernProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

// 简化的标签接口
interface Tag {
  id: string;
  name: string;
  color: string;
  nodeCount: number;
}

// 标签icon将通过统一存储系统管理，不再使用localStorage

// 工具函数：生成唯一shareId
function generateShareId(length = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const ModernProjectManager: React.FC<ModernProjectManagerProps & { onShowAI?: () => void }> = ({ isOpen, onClose, onShowAI }) => {
  // 使用新的统一存储钩子
  const unifiedStorage = useUnifiedStorage();
  
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [tagSearchQuery, setTagSearchQuery] = useState(''); // 添加标签搜索状态
  
  // 白板标题相关状态
  const [boardTitle, setBoardTitle] = useState(() => {
    // 默认标题为当前日期时间
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    return `${year}/${month}/${day} ${hour}:${minute}`;
  });
  const [isEditingBoardTitle, setIsEditingBoardTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  
  // 白板管理相关状态 - 现在使用BoardMetadata类型
  const [boardSearchQuery, setBoardSearchQuery] = useState('');
  const [boardList, setBoardList] = useState<BoardMetadata[]>([]);
  
  // 白板右键菜单相关状态
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    boardId: string;
  } | null>(null);
  
  // 白板重命名相关状态
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState('');
  
  // 悬停状态管理
  const [hoveredBoardId, setHoveredBoardId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  
  // 新增白板弹窗状态
  const [showNewBoardDialog, setShowNewBoardDialog] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  
  // 背景选择弹窗状态
  const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
  
  // 背景图片选择器状态
  const [showBackgroundImageSelector, setShowBackgroundImageSelector] = useState(false);
  
  // 卡片设置弹窗状态
  const [showCardSettings, setShowCardSettings] = useState(false);
  
  // 图标选择弹窗状态
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [selectedBoardForIcon, setSelectedBoardForIcon] = useState<string | null>(null);
  
  // Tab切换状态 - 新增
  const [activeTab, setActiveTab] = useState<'boards' | 'tags'>('boards');
  
  // 初始化标记
  const isInitialized = useRef(false);
  
  // 性能优化：添加loading状态
  const [isLoading, setIsLoading] = useState(false);
  
  const theme = useContext(ThemeContext);
  const isDark = theme.isDarkMode;
  // 深色模式下的颜色
  const tagBgColor = isDark ? '#23272F' : '#F9FAFB';
  const tagBorderColor = isDark ? '#374151' : '#d1d5db';
  const tagTextColor = isDark ? '#D1D5DB' : '#6B7280';
  
  const { 
    nodes,
    connections, // 添加connections用于监听连线变化
    clearBoard, // 添加清空白板功能
    backgroundMode,
    setBackgroundMode,
    interactiveTheme,
    setInteractiveTheme,
    builtinBackgroundPath,
    setBuiltinBackgroundPath,
    defaultCardConfig,
    updateDefaultCardConfig,
    setNodeEditing,
  } = useBoardStore();

  // 删除白板二次确认弹窗状态
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; boardId: string | null }>({ show: false, boardId: null });

  // 在组件关闭时保存当前白板数据
  const handleClose = () => {
    // 保存当前白板数据
    const currentBoard = boardList.find(b => b.isActive);
    if (currentBoard) {
      saveCurrentBoardData();
    }
    onClose();
  };

  // 添加自动保存触发器到全局window对象
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).triggerBoardAutoSave = saveCurrentBoardData;
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).triggerBoardAutoSave;
      }
    };
  }, []);

  // 新增：监听节点变化，自动保存当前白板数据（防抖）
  const autoSaveTimeoutRef = useRef<number | null>(null);
  React.useEffect(() => {
    // 清除之前的计时器
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    // 设置新的计时器（1秒防抖，确保及时保存）
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      const currentBoard = boardList.find(b => b.isActive);
      if (currentBoard) {  // 移除nodes.length > 0的条件，确保空白板也能保存
        saveCurrentBoardData();
        console.log('🔄 ModernProjectManager自动保存触发', `nodes: ${nodes.length}, connections: ${connections.length}`);
      }
    }, 1000);  // 改为1秒，确保更及时的保存
    
    // 清理函数
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [nodes, connections, boardList]); // 监听节点、连线和白板列表变化

  // 缓存白板卡片数量，避免重复读取localStorage
  const boardCardCountCache = useRef<Map<string, { count: number, timestamp: number }>>(new Map());
  
  // 计算白板的真实卡片数量 - 添加缓存机制
  const getBoardCardCount = React.useCallback((boardId: string): number => {
    if (boardId === 'current') {
      return nodes.length;
    }
    
    const now = Date.now();
    const CACHE_DURATION = 10000; // 10秒缓存
    const cached = boardCardCountCache.current.get(boardId);
    
    // 使用缓存
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.count;
    }
    
    try {
      const storageKey = `whiteboard-data-${boardId}`;
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const boardData = JSON.parse(savedData);
        const count = (boardData.nodes || []).length;
        
        // 缓存结果
        boardCardCountCache.current.set(boardId, {
          count,
          timestamp: now
        });
        
        return count;
      }
    } catch (error) {
      console.warn(`读取白板 ${boardId} 的数据失败:`, error);
    }
    
    return 0;
  }, [nodes]);

  // 工具函数：从 localStorage 读取所有白板元数据
  function getAllBoardsFromStorage(): any[] {
    const boards: any[] = [];
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('whiteboard-data-')) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const boardData = JSON.parse(data);
            // 移除自动生成shareId的逻辑，确保数据读取函数不执行写入操作
            boards.push({
              id: key.replace('whiteboard-data-', ''),
              title: boardData.title || '未命名白板',
              cardCount: (boardData.nodes || []).length,
              isActive: false,
              isPinned: boardData.isPinned || false,
              createdAt: boardData.createdAt ? new Date(boardData.createdAt) : new Date(),
              icon: boardData.icon || getRandomIcon(),
              shareId: boardData.shareId, // 保持原有shareId，不自动生成
            });
          } catch {}
        }
      }
    });
    return boards;
  }

  // 防抖更新白板列表，避免频繁重新计算
  const updateBoardListDebounced = useMemo(() => {
    let timeoutId: number;
    return () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        setBoardList(prev => prev.map(board => ({
          ...board,
          title: board.id === 'current' ? boardTitle : board.title,
          cardCount: board.id === 'current' ? nodes.length : board.cardCount, // 只实时更新当前白板
        })));
      }, 300); // 300ms防抖
    };
  }, [boardTitle, nodes.length]);

  // 初始化白板列表
  React.useEffect(() => {
    if (!isInitialized.current) {
      setIsLoading(true);
      // 使用 requestAnimationFrame 优化渲染性能
      requestAnimationFrame(() => {
        try {
          // 读取所有本地白板
          const boards = getAllBoardsFromStorage();
          // 如果没有任何白板，自动创建一个当前白板
          if (boards.length === 0) {
            setBoardList([
              {
                id: 'current',
                title: boardTitle,
                cardCount: nodes.length,
                isActive: true,
                isPinned: false,
                createdAt: new Date(),
                icon: getRandomIcon(),
              },
            ]);
          } else {
            // 默认激活第一个白板
            boards[0].isActive = true;
            setBoardList(boards);
          }
          isInitialized.current = true;
        } finally {
          setIsLoading(false);
        }
      });
    } else {
      // 使用防抖更新，避免频繁重新计算
      updateBoardListDebounced();
    }
  }, [boardTitle, nodes.length, updateBoardListDebounced]);

  // 预定义的标签颜色
  const tagColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
    '#6366F1', '#EC4899', '#14B8A6', '#F43F5E'
  ];

  // 标签数据缓存 - 避免重复计算
  const tagsCache = useRef<Map<string, { tags: any[], timestamp: number }>>(new Map());
  
  // 优化的标签提取函数 - 添加缓存和节流
  const extractedTagsWithRealTimeUpdate = useMemo(() => {
    const now = Date.now();
    const CACHE_DURATION = 5000; // 5秒缓存
    
    // 只计算当前白板的标签（实时更新）和最近访问的白板
    const tagMap = new Map<string, { boardIds: Set<string>, cardCount: number }>();
    
    // 处理当前白板（始终实时计算）
    nodes.forEach((node: NodeData) => {
      const allTags = new Set<string>();
      [node.content, node.frontContent, node.backContent]
        .filter(content => content && Array.isArray(content))
        .forEach(content => {
          extractTags(content as any).forEach(tag => allTags.add(tag));
        });
      
      allTags.forEach(tag => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, { boardIds: new Set(), cardCount: 0 });
        }
        tagMap.get(tag)!.boardIds.add('current');
        tagMap.get(tag)!.cardCount += 1;
      });
    });
    
    // 仅在打开标签页时才计算其他白板的标签
    if (activeTab === 'tags') {
      // 限制只处理前20个白板，避免性能问题
      const limitedBoardList = boardList.slice(0, 20).filter(board => board.id !== 'current');
      
      limitedBoardList.forEach(board => {
        const cacheKey = `board-${board.id}`;
        const cached = tagsCache.current.get(cacheKey);
        
        // 使用缓存
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          cached.tags.forEach(tag => {
            if (!tagMap.has(tag.name)) {
              tagMap.set(tag.name, { boardIds: new Set(), cardCount: 0 });
            }
            tagMap.get(tag.name)!.boardIds.add(board.id);
            tagMap.get(tag.name)!.cardCount += tag.count;
          });
          return;
        }
        
        // 重新计算并缓存
        try {
          const storageKey = `whiteboard-data-${board.id}`;
          const savedData = localStorage.getItem(storageKey);
          if (savedData) {
            const boardData = JSON.parse(savedData);
            const boardNodes = boardData.nodes || [];
            const boardTagMap = new Map<string, number>();
            
            boardNodes.forEach((node: NodeData) => {
              const allTags = new Set<string>();
              [node.content, node.frontContent, node.backContent]
                .filter(content => content && Array.isArray(content))
                .forEach(content => {
                  extractTags(content as any).forEach(tag => allTags.add(tag));
                });
              
              allTags.forEach(tag => {
                boardTagMap.set(tag, (boardTagMap.get(tag) || 0) + 1);
                if (!tagMap.has(tag)) {
                  tagMap.set(tag, { boardIds: new Set(), cardCount: 0 });
                }
                tagMap.get(tag)!.boardIds.add(board.id);
              });
            });
            
            // 计算该白板的标签计数
            Array.from(boardTagMap.entries()).forEach(([tagName, count]) => {
              if (tagMap.has(tagName)) {
                tagMap.get(tagName)!.cardCount += count;
              }
            });
            
            // 缓存结果
            const tagsForCache = Array.from(boardTagMap.entries()).map(([name, count]) => ({
              name,
              count
            }));
            tagsCache.current.set(cacheKey, {
              tags: tagsForCache,
              timestamp: now
            });
          }
        } catch (error) {
          console.warn(`读取白板 ${board.id} 的数据失败:`, error);
        }
      });
    }
    
    return Array.from(tagMap.entries()).map(([name, info], index) => ({
      id: name,
      name,
      color: tagColors[index % tagColors.length],
      nodeCount: info.cardCount,
      boardIds: Array.from(info.boardIds),
    }));
  }, [boardList, nodes, tagColors, activeTab]);

  // 获取选中标签的相关卡片（从所有白板中搜索）
  const getSelectedTagNodes = () => {
    if (!selectedTagId) return [];
    
    const selectedTag = extractedTagsWithRealTimeUpdate.find(t => t.id === selectedTagId);
    if (!selectedTag) return [];
    
    const allMatchingNodes: (NodeData & { _boardId: string; _boardTitle: string })[] = [];
    
    // 遍历包含该标签的所有白板
    selectedTag.boardIds.forEach(boardId => {
      const storageKey = `whiteboard-data-${boardId}`;
      try {
        let boardNodes: NodeData[] = [];
        
        if (boardId === 'current') {
          // 当前白板使用实时数据
          boardNodes = nodes;
        } else {
          // 其他白板从localStorage读取
          const savedData = localStorage.getItem(storageKey);
          if (savedData) {
            const boardData = JSON.parse(savedData);
            boardNodes = boardData.nodes || [];
          }
        }
        
        // 筛选包含该标签的卡片
        const matchingNodes = boardNodes.filter((node: NodeData) => {
          const contents = [
            node.content,
            node.frontContent,
            node.backContent
          ].filter(content => content && Array.isArray(content));
          
          return contents.some(content => {
            const tagsFromContent = extractTags(content as any);
            return tagsFromContent.includes(selectedTag.name);
          });
        });
        
        // 为每个卡片添加所属白板信息
        const nodesWithBoardInfo = matchingNodes.map((node: NodeData) => ({
          ...node,
          _boardId: boardId,
          _boardTitle: boardList.find(b => b.id === boardId)?.title || '未知白板'
        }));
        
        allMatchingNodes.push(...nodesWithBoardInfo);
        
      } catch (error) {
        console.warn(`读取白板 ${boardId} 的标签数据失败:`, error);
      }
    });
    
    // 去重：同一 id 只显示一张（无论 _boardId）
    const nodeMap = new Map<string, NodeData & { _boardId: string; _boardTitle: string }>();
    for (const node of allMatchingNodes) {
      nodeMap.set(node.id, node); // 后出现的会覆盖前面的
    }
    return Array.from(nodeMap.values());
  };

  // 获取当前要显示的卡片列表
  const getDisplayNodes = () => {
    // 如果选择了标签，显示标签相关的卡片
    if (selectedTagId) {
      return getSelectedTagNodes();
    }
    
    // 如果在白板Tab并且有搜索关键词，过滤当前白板的卡片
    if (activeTab === 'boards' && boardSearchQuery.trim()) {
      const query = boardSearchQuery.toLowerCase();
      const filteredNodes = nodes.filter((node: NodeData) => {
        const contents = [
          node.content,
          node.frontContent,
          node.backContent
        ].filter(content => content && Array.isArray(content));
        
        const hasMatch = contents.some(content => {
          const textContent = extractTextFromSlateContent(content as any);
          const match = textContent.toLowerCase().includes(query);
          
          // 添加调试信息
          console.log('白板卡片搜索:', {
            query,
            nodeId: node.id,
            textContent,
            match
          });
          
          return match;
        });
        
        return hasMatch;
      });
      
      console.log('白板搜索结果:', {
        query,
        totalCards: nodes.length,
        matchedCards: filteredNodes.length,
        filteredNodes
      });
      
      return filteredNodes;
    }
    
    // 如果在标签Tab并且有搜索关键词，过滤包含搜索关键词的卡片
    if (activeTab === 'tags' && tagSearchQuery.trim()) {
      const query = tagSearchQuery.toLowerCase();
      const filteredNodes = nodes.filter((node: NodeData) => {
        const contents = [
          node.content,
          node.frontContent,
          node.backContent
        ].filter(content => content && Array.isArray(content));
        
        const hasMatch = contents.some(content => {
          const textContent = extractTextFromSlateContent(content as any);
          const match = textContent.toLowerCase().includes(query);
          
          // 添加调试信息
          console.log('标签卡片搜索:', {
            query,
            nodeId: node.id,
            textContent,
            match
          });
          
          return match;
        });
        
        return hasMatch;
      });
      
      console.log('标签搜索结果:', {
        query,
        totalCards: nodes.length,
        matchedCards: filteredNodes.length,
        filteredNodes
      });
      
      return filteredNodes;
    }
    
    // 默认显示当前白板的所有卡片
    return nodes;
  };

  const displayNodes = getDisplayNodes();

  // 处理白板标题编辑
  const handleEditBoardTitle = () => {
    setEditingTitle(boardTitle);
    setIsEditingBoardTitle(true);
  };

  const handleSaveBoardTitle = () => {
    if (editingTitle.trim()) {
      setBoardTitle(editingTitle.trim());
    }
    setIsEditingBoardTitle(false);
    setEditingTitle('');
  };

  const handleCancelBoardTitleEdit = () => {
    setIsEditingBoardTitle(false);
    setEditingTitle('');
  };

  // 白板管理相关函数
  const handleAddNewBoard = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const defaultName = `${year}/${month}/${day} ${hour}:${minute}`;
    
    setNewBoardName(defaultName);
    setShowNewBoardDialog(true);
  };

  const handleConfirmNewBoard = () => {
    if (!newBoardName.trim()) return;
    
    const now = new Date();
    const newBoardId = `board_${Date.now()}`;
    
    const newBoard = {
      id: newBoardId,
      title: newBoardName.trim(),
      cardCount: 0,
      isActive: false,
      isPinned: false,
      createdAt: now,
      icon: getRandomIcon()
    };
    
    setBoardList(prev => {
      const updatedList = [...prev, newBoard];
      // 新建白板时立即保存 title
      const storageKey = `whiteboard-data-${newBoardId}`;
      localStorage.setItem(storageKey, JSON.stringify({ title: newBoard.title, icon: newBoard.icon, isPinned: newBoard.isPinned, createdAt: now, nodes: [], connections: [] }));
      return updatedList;
    });
    
    handleSwitchBoard(newBoardId);
    
    setShowNewBoardDialog(false);
    setNewBoardName('');
    
    onClose();
    
    console.log('创建新白板:', newBoard);
  };

  const handleCancelNewBoard = () => {
    setShowNewBoardDialog(false);
    setNewBoardName('');
  };

  const handleSwitchBoard = async (boardId: string) => {
    console.log('尝试切换到白板:', boardId);
    
    // 在切换前保存当前白板数据
    const currentBoard = boardList.find(b => b.isActive);
    if (currentBoard) {
      await saveCurrentBoardDataForSpecificBoard(currentBoard.id);
    }
    
    setBoardList(prev => {
      const updatedList = prev.map(board => ({
        ...board,
        isActive: board.id === boardId,
        cardCount: getBoardCardCount(board.id) // 更新所有白板的卡片数量
      }));
      console.log('切换后的白板列表:', updatedList);
      return updatedList;
    });
    
    // 加载目标白板的数据
    loadBoardData(boardId);
    
    // 清除标签选择，显示所有卡片
    setSelectedTagId(null);
    
    console.log('切换到白板:', boardId);
  };

  // 新增：为特定白板保存数据的函数，避免时序冲突
  const saveCurrentBoardDataForSpecificBoard = async (boardId: string) => {
    const currentState = useBoardStore.getState();
    const targetBoard = boardList.find(b => b.id === boardId);
    
    const boardData = {
      nodes: currentState.nodes,
      connections: currentState.connections,
      currentBackground: currentState.currentBackground,
      showGrid: currentState.showGrid,
      backgroundMode: currentState.backgroundMode,
      videoBackgroundUrl: currentState.videoBackgroundUrl,
      imageBackgroundUrl: currentState.imageBackgroundUrl,
      imageBlurLevel: currentState.imageBlurLevel,
      builtinBackgroundPath: currentState.builtinBackgroundPath,
      interactiveTheme: currentState.interactiveTheme,
      scale: currentState.scale,
      panX: currentState.panX,
      panY: currentState.panY,
      lastSavedAt: new Date().toISOString(),
      // 保存白板元数据
      title: targetBoard?.title || '未命名白板',
      icon: targetBoard?.icon || getRandomIcon(),
      isPinned: targetBoard?.isPinned || false,
      createdAt: targetBoard?.createdAt || new Date(),
      shareId: targetBoard?.shareId, // 保持原有shareId
    };
    
    // 保存到localStorage，使用指定的白板ID
    const storageKey = `whiteboard-data-${boardId}`;
    localStorage.setItem(storageKey, JSON.stringify(boardData));
    console.log(`💾 白板 "${targetBoard?.title || boardId}" 数据已保存到专用存储`);
  };

  // 白板数据自动保存相关函数
  const saveCurrentBoardData = () => {
    const currentState = useBoardStore.getState();
    const currentBoard = boardList.find(b => b.isActive);
    if (!currentBoard) return;
    
    const boardData = {
      nodes: currentState.nodes,
      connections: currentState.connections,
      currentBackground: currentState.currentBackground,
      showGrid: currentState.showGrid,
      backgroundMode: currentState.backgroundMode,
      videoBackgroundUrl: currentState.videoBackgroundUrl,
      imageBackgroundUrl: currentState.imageBackgroundUrl,
      imageBlurLevel: currentState.imageBlurLevel,
      builtinBackgroundPath: currentState.builtinBackgroundPath,
      interactiveTheme: currentState.interactiveTheme,
      scale: currentState.scale,
      panX: currentState.panX,
      panY: currentState.panY,
      lastSavedAt: new Date().toISOString(),
      title: currentBoard.title, // 新增：保存白板名称
      icon: currentBoard.icon, // 可选：保存图标
      isPinned: currentBoard.isPinned, // 可选：保存置顶状态
      createdAt: currentBoard.createdAt, // 可选：保存创建时间
    };
    // 保存到localStorage，使用白板ID作为键
    const storageKey = `whiteboard-data-${currentBoard.id}`;
    localStorage.setItem(storageKey, JSON.stringify(boardData));
    console.log(`💾 白板 "${currentBoard.title}" 数据已保存`);
  };

  // 新增白板管理功能
  const handleDeleteBoard = (boardId: string) => {
    // 允许删除主白板
    setDeleteConfirm({ show: true, boardId });
  };
  // 真正执行删除
  const confirmDeleteBoard = () => {
    if (!deleteConfirm.boardId) return;
    const isCurrentActive = boardList.find(b => b.id === deleteConfirm.boardId)?.isActive;
    if (isCurrentActive) {
      // 先切换到剩余的第一个白板（如果有），再删除
      const boards = getAllBoardsFromStorage().filter(b => b.id !== deleteConfirm.boardId);
      if (boards.length > 0) {
        handleSwitchBoard(boards[0].id);
      } else {
        clearBoard();
        handleAddNewBoard();
      }
      // 延迟删除，确保切换完成后再删
      setTimeout(() => {
        setBoardList(prev => prev.filter(board => board.id !== deleteConfirm.boardId));
        setContextMenu(null);
        setShowDropdown(null);
        localStorage.removeItem(`whiteboard-data-${deleteConfirm.boardId}`);
        setDeleteConfirm({ show: false, boardId: null });
      }, 100);
    } else {
      setBoardList(prev => prev.filter(board => board.id !== deleteConfirm.boardId));
      setContextMenu(null);
      setShowDropdown(null);
      localStorage.removeItem(`whiteboard-data-${deleteConfirm.boardId}`);
      setDeleteConfirm({ show: false, boardId: null });
    }
  };

  const handleTogglePinBoard = (boardId: string) => {
    setBoardList(prev => prev.map(board => 
      board.id === boardId 
        ? { ...board, isPinned: !board.isPinned }
        : board
    ));
    setContextMenu(null);
    setShowDropdown(null); // 关闭下拉菜单
  };

  const handleStartRename = (boardId: string, currentTitle: string) => {
    setRenamingBoardId(boardId);
    setRenamingTitle(currentTitle);
    setContextMenu(null);
    setShowDropdown(null); // 关闭下拉菜单
  };

  const handleSaveRename = () => {
    if (renamingBoardId && renamingTitle.trim()) {
      setBoardList(prev => prev.map(board =>
        board.id === renamingBoardId
          ? { ...board, title: renamingTitle.trim() }
          : board
      ));
      // 同步更新本地存储的 title
      const storageKey = `whiteboard-data-${renamingBoardId}`;
      const data = localStorage.getItem(storageKey);
      if (data) {
        try {
          const boardData = JSON.parse(data);
          boardData.title = renamingTitle.trim();
          localStorage.setItem(storageKey, JSON.stringify(boardData));
        } catch {}
      }
    }
    setRenamingBoardId(null);
    setRenamingTitle('');
  };

  const handleCancelRename = () => {
    setRenamingBoardId(null);
    setRenamingTitle('');
  };

  // 处理图标选择
  const handleChangeIcon = (boardId: string) => {
    setSelectedBoardForIcon(boardId);
    setShowIconSelector(true);
    setShowDropdown(null); // 关闭下拉菜单
  };

  const handleSelectIcon = (iconFileName: string) => {
    if (!selectedBoardForIcon) return;
    setBoardList(prev => prev.map(board =>
      board.id === selectedBoardForIcon
        ? { ...board, icon: iconFileName }
        : board
    ));
    // 同步更新本地存储的 icon
    const storageKey = `whiteboard-data-${selectedBoardForIcon}`;
    const data = localStorage.getItem(storageKey);
    if (data) {
      try {
        const boardData = JSON.parse(data);
        boardData.icon = iconFileName;
        localStorage.setItem(storageKey, JSON.stringify(boardData));
      } catch {}
    }
    setShowIconSelector(false);
    setSelectedBoardForIcon(null);
  };

  const handleCancelIconSelection = () => {
    setShowIconSelector(false);
    setSelectedBoardForIcon(null);
  };

  const handleBoardContextMenu = (e: React.MouseEvent, boardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      boardId
    });
  };

  // 点击其他地方关闭右键菜单
  React.useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    
    if (contextMenu?.show) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // 处理下拉菜单显示
  const handleToggleDropdown = (e: React.MouseEvent, boardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDropdown(showDropdown === boardId ? null : boardId);
  };

  // 点击其他地方关闭下拉菜单
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(null);
    };
    
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  // 点击其他地方关闭背景选择器
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowBackgroundSelector(false);
    };
    
    if (showBackgroundSelector) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showBackgroundSelector]);

  // 点击其他地方关闭卡片设置
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowCardSettings(false);
    };
    
    if (showCardSettings) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showCardSettings]);

  // 点击其他地方关闭图标选择器
  React.useEffect(() => {
    const handleClickOutside = () => {
      setShowIconSelector(false);
      setSelectedBoardForIcon(null);
    };
    
    if (showIconSelector) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showIconSelector]);

  // 过滤白板列表
  const filteredBoards = React.useMemo(() => {
    if (!boardSearchQuery.trim()) {
      return boardList.sort((a, b) => {
        // 置顶的白板排在前面
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // 其他按创建时间排序（移除当前白板优先规则）
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    }
    
    const query = boardSearchQuery.toLowerCase();
    
    return boardList
      .filter(board => {
        // 1. 搜索白板名称
        if (board.title.toLowerCase().includes(query)) {
          return true;
        }
        
        // 2. 搜索白板内卡片的内容
        const storageKey = `whiteboard-data-${board.id}`;
        try {
          let boardNodes: NodeData[] = [];
          
          if (board.id === 'current') {
            // 当前白板使用实时数据
            boardNodes = nodes;
          } else {
            // 其他白板从localStorage读取
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
              const boardData = JSON.parse(savedData);
              boardNodes = boardData.nodes || [];
            }
          }
          
          // 搜索卡片内容
          return boardNodes.some((node: NodeData) => {
            const contents = [
              node.content,
              node.frontContent,
              node.backContent
            ].filter(content => content && Array.isArray(content));
            
            return contents.some(content => {
              // 将 Slate 内容转换为纯文本进行搜索
              const textContent = extractTextFromSlateContent(content as any);
              const hasMatch = textContent.toLowerCase().includes(query);
              
              // 添加调试信息
              if (query === '23' || query === '123') {
                console.log('搜索调试信息:', {
                  query,
                  boardId: board.id,
                  nodeId: node.id,
                  textContent,
                  hasMatch,
                  originalContent: content
                });
              }
              
              return hasMatch;
            });
          });
          
        } catch (error) {
          console.warn(`搜索白板 ${board.id} 的内容失败:`, error);
          return false;
        }
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }, [boardList, boardSearchQuery, nodes]);

  // 过滤标签（根据搜索关键词）
  const filteredTags = useMemo(() => {
    if (!tagSearchQuery.trim()) {
      return extractedTagsWithRealTimeUpdate;
    }
    
    const query = tagSearchQuery.toLowerCase();
    
    return extractedTagsWithRealTimeUpdate.filter(tag => {
      // 1. 搜索标签名称
      if (tag.name.toLowerCase().includes(query)) {
        return true;
      }
      
      // 2. 搜索包含该关键词的卡片内容
      return tag.boardIds.some(boardId => {
        const storageKey = `whiteboard-data-${boardId}`;
        try {
          let boardNodes: NodeData[] = [];
          
          if (boardId === 'current') {
            // 当前白板使用实时数据
            boardNodes = nodes;
          } else {
            // 其他白板从localStorage读取
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
              const boardData = JSON.parse(savedData);
              boardNodes = boardData.nodes || [];
            }
          }
          
          // 搜索卡片内容
          return boardNodes.some((node: NodeData) => {
            const contents = [
              node.content,
              node.frontContent,
              node.backContent
            ].filter(content => content && Array.isArray(content));
            
            return contents.some(content => {
              // 将 Slate 内容转换为纯文本进行搜索
              const textContent = extractTextFromSlateContent(content as any);
              const hasMatch = textContent.toLowerCase().includes(query);
              
              // 添加调试信息
              if (query === '23' || query === '123') {
                console.log('标签搜索调试信息:', {
                  query,
                  tagName: tag.name,
                  boardId,
                  nodeId: node.id,
                  textContent,
                  hasMatch,
                  originalContent: content
                });
              }
              
              return hasMatch;
            });
          });
          
        } catch (error) {
          console.warn(`搜索标签 ${tag.name} 相关内容失败:`, error);
          return false;
        }
      });
    });
  }, [extractedTagsWithRealTimeUpdate, tagSearchQuery, nodes]);

  const renderTagsContent = () => {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        height: '100%',
      }}>
        {/* 左侧面板 */}
        <div style={{
          width: '220px',
          backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
          borderRight: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
          height: '100%', // 确保占满整个高度
        }}>
          {/* Tab切换区域 */}
          <div style={{
            borderBottom: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
            display: 'flex',
          }}>
            {/* 白板Tab */}
            <button
              onClick={() => setActiveTab('boards')}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: 'none',
                backgroundColor: activeTab === 'boards' 
                  ? (isDark ? '#374151' : '#F3F4F6')
                  : 'transparent',
                color: activeTab === 'boards'
                  ? (isDark ? '#F9FAFB' : '#111827')
                  : (isDark ? '#9CA3AF' : '#6B7280'),
                fontSize: '14px',
                fontWeight: activeTab === 'boards' ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                borderBottom: activeTab === 'boards'
                  ? `2px solid ${isDark ? '#4F46E5' : '#3B82F6'}`
                  : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'boards') {
                  e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'boards') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              📋 白板
            </button>
            
            {/* 标签Tab */}
            <button
              onClick={() => setActiveTab('tags')}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: 'none',
                backgroundColor: activeTab === 'tags' 
                  ? (isDark ? '#374151' : '#F3F4F6')
                  : 'transparent',
                color: activeTab === 'tags'
                  ? (isDark ? '#F9FAFB' : '#111827')
                  : (isDark ? '#9CA3AF' : '#6B7280'),
                fontSize: '14px',
                fontWeight: activeTab === 'tags' ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                borderBottom: activeTab === 'tags'
                  ? `2px solid ${isDark ? '#4F46E5' : '#3B82F6'}`
                  : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'tags') {
                  e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'tags') {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              🏷️ 标签
            </button>
          </div>

          {/* Tab内容区域 */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0, // 关键：允许flex子元素收缩
            overflow: 'hidden', // 防止内容溢出
          }}>
            {activeTab === 'boards' ? (
              /* 白板模块内容 */
              <>
                {/* 白板标题栏 */}
                <div style={{
                  padding: '16px',
                  borderBottom: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end', // 改为右对齐，因为移除了标题
                  gap: 12,
                }}>
                  
                  {/* 搜索框 - 优化样式 */}
                  <div style={{ 
                    position: 'relative', 
                    flex: 1,
                    minWidth: 140,
                    maxWidth: 200, // 增加最大宽度
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: isDark ? '#9CA3AF' : '#6B7280',
                      pointerEvents: 'none',
                      fontSize: '13px',
                      zIndex: 1,
                    }}>
                      🔍
                    </div>
                    <input
                      type="text"
                      placeholder="搜索..."
                      value={boardSearchQuery}
                      onChange={(e) => setBoardSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        height: '32px', // 增加高度
                        padding: '0 32px 0 32px',
                        border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                        borderRadius: '16px', // 更圆的角度
                        backgroundColor: isDark ? '#111827' : '#F9FAFB', // 使用更柔和的背景色
                        color: isDark ? '#F9FAFB' : '#111827',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        fontWeight: 400,
                        boxShadow: 'none', // 移除默认阴影
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = isDark ? '#4F46E5' : '#3B82F6';
                        e.currentTarget.style.boxShadow = isDark 
                          ? '0 0 0 2px rgba(79, 70, 229, 0.1)' 
                          : '0 0 0 2px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = isDark ? '#374151' : '#E5E7EB';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    {boardSearchQuery && (
                      <button
                        onClick={() => setBoardSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: 6,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 16,
                          height: 16,
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: isDark ? '#9CA3AF' : '#6B7280',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F3F4F6';
                          e.currentTarget.style.color = isDark ? '#F9FAFB' : '#111827';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = isDark ? '#9CA3AF' : '#6B7280';
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  
                  {/* 新增白板按钮 */}
                  <button
                    onClick={handleAddNewBoard}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '10px', // 更圆润的角度
                      border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                      backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                      color: isDark ? '#F9FAFB' : '#374151',
                      cursor: 'pointer',
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                      boxShadow: isDark 
                        ? '0 1px 3px rgba(0,0,0,0.3)' 
                        : '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.borderColor = isDark ? '#4B5563' : '#D1D5DB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? '#1F2937' : '#FFFFFF';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.borderColor = isDark ? '#374151' : '#E5E7EB';
                    }}
                    title="新增白板"
                  >
                    +
                  </button>
                </div>
                
                {/* 白板列表 */}
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '8px',
                  minHeight: 0, // 关键：允许flex子元素收缩
                  // 自定义滚动条样式
                  scrollbarWidth: 'thin',
                  scrollbarColor: isDark ? '#4B5563 #1F2937' : '#D1D5DB #F9FAFB',
                }}
                className="custom-scrollbar">
                  {filteredBoards.map((board) => (
                    <div key={board.id} style={{ marginBottom: 4 }}>
                      <div style={{
                        padding: '10px',
                        borderRadius: '8px',
                        backgroundColor: board.isActive
                          ? (isDark ? '#374151' : '#E5E7EB')
                          : 'transparent',
                        transition: 'all 0.15s ease',
                        cursor: 'pointer',
                        border: board.isActive 
                          ? (isDark ? '1px solid #4B5563' : '1px solid #D1D5DB') 
                          : '1px solid transparent',
                        position: 'relative',
                      }}
                      onClick={() => handleSwitchBoard(board.id)}
                      onMouseEnter={() => {
                        setHoveredBoardId(board.id);
                        if (!board.isActive) {
                          const element = document.querySelector(`[data-board-id="${board.id}"]`) as HTMLElement;
                          if (element) {
                            element.style.backgroundColor = isDark ? '#374151' : '#F3F4F6';
                          }
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredBoardId(null);
                        if (!board.isActive) {
                          const element = document.querySelector(`[data-board-id="${board.id}"]`) as HTMLElement;
                          if (element) {
                            element.style.backgroundColor = 'transparent';
                          }
                        }
                      }}
                      data-board-id={board.id}
                      >
                        {/* 置顶标识和操作按钮等保持原样... */}
                        {board.isPinned && (
                          <div style={{
                            position: 'absolute',
                            top: 6,
                            right: hoveredBoardId === board.id ? 34 : 6,
                            width: 12,
                            height: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isDark ? '#F59E0B' : '#D97706',
                            fontSize: '8px',
                            transition: 'right 0.15s ease',
                          }}>
                            📌
                          </div>
                        )}
                        
                        {hoveredBoardId === board.id && (
                          <div style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 10,
                          }}>
                            <button
                              onClick={(e) => handleToggleDropdown(e, board.id)}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: isDark ? '#4B5563' : '#D1D5DB',
                                color: isDark ? '#F9FAFB' : '#374151',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                                opacity: 0.8,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = isDark ? '#6B7280' : '#9CA3AF';
                                e.currentTarget.style.opacity = '1';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = isDark ? '#4B5563' : '#D1D5DB';
                                e.currentTarget.style.opacity = '0.8';
                              }}
                              title="更多操作"
                            >
                              ⋯
                            </button>
                          </div>
                        )}
                        
                        {/* 白板标题 */}
                        {renamingBoardId === board.id ? (
                          <div style={{ marginBottom: 6 }}>
                            <input
                              type="text"
                              value={renamingTitle}
                              onChange={(e) => setRenamingTitle(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '2px 4px',
                                border: isDark ? '1px solid #4B5563' : '1px solid #D1D5DB',
                                borderRadius: '4px',
                                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                color: isDark ? '#F9FAFB' : '#111827',
                                fontSize: '12px',
                                fontWeight: 600,
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveRename();
                                } else if (e.key === 'Escape') {
                                  handleCancelRename();
                                }
                              }}
                              onBlur={handleSaveRename}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10, // 从8增加到10，给更大的图标更多空间
                            marginBottom: 4,
                          }}>
                            {/* 白板图标 */}
                            <img
                              src={getIconPath(board.icon)}
                              alt="白板图标"
                              style={{
                                width: 24, // 从16增加到24
                                height: 24, // 从16增加到24
                                flexShrink: 0,
                                borderRadius: '4px', // 稍微增加圆角
                                cursor: 'pointer', // 添加指针样式，表明可点击
                                transition: 'transform 0.15s ease', // 添加悬停效果
                              }}
                              onClick={(e) => {
                                e.stopPropagation(); // 阻止冒泡到白板点击事件
                                handleChangeIcon(board.id); // 直接触发图标选择
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.1)'; // 悬停时稍微放大
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)'; // 恢复原始大小
                              }}
                              onError={(e) => {
                                // 如果图标加载失败，显示默认图标
                                e.currentTarget.style.display = 'none';
                              }}
                              title="点击更换图标" // 添加提示文本
                            />
                            
                            {/* 白板标题 */}
                            <div 
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: board.isActive 
                                  ? (isDark ? '#F9FAFB' : '#111827')
                                  : (isDark ? '#D1D5DB' : '#6B7280'),
                                cursor: 'pointer',
                                flex: 1,
                                paddingRight: hoveredBoardId === board.id ? '28px' : (board.isPinned ? '16px' : '0'),
                                transition: 'padding-right 0.15s ease',
                              }}
                              title="双击编辑标题，悬停查看更多操作"
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                handleStartRename(board.id, board.title);
                              }}
                            >
                              {board.title}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* 空状态 */}
                  {filteredBoards.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '20px 10px',
                      color: isDark ? '#6B7280' : '#9CA3AF',
                    }}>
                      {boardList.length === 0 ? (
                        <>
                          <div style={{ fontSize: '12px', marginBottom: 4 }}>暂无白板</div>
                          <div style={{ fontSize: '10px' }}>点击 + 创建白板</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '12px', marginBottom: 4 }}>未找到匹配的白板</div>
                          <div style={{ fontSize: '10px' }}>试试其他搜索关键词</div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* 标签模块内容 */
              <>
                <div style={{
                  padding: '16px',
                  borderBottom: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center', // 居中对齐搜索框
                  gap: 12,
                }}>
                  
                  {/* 标签搜索框 - 优化样式 */}
                  <div style={{ 
                    position: 'relative', 
                    flex: 1,
                    minWidth: 140,
                    maxWidth: 200, // 增加最大宽度
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: isDark ? '#9CA3AF' : '#6B7280',
                      pointerEvents: 'none',
                      fontSize: '13px',
                      zIndex: 1,
                    }}>
                      🔍
                    </div>
                    <input
                      type="text"
                      placeholder="搜索..."
                      value={tagSearchQuery}
                      onChange={(e) => setTagSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        height: '32px', // 增加高度
                        padding: '0 32px 0 32px',
                        border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                        borderRadius: '16px', // 更圆的角度
                        backgroundColor: isDark ? '#111827' : '#F9FAFB', // 使用更柔和的背景色
                        color: isDark ? '#F9FAFB' : '#111827',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        fontWeight: 400,
                        boxShadow: 'none', // 移除默认阴影
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = isDark ? '#4F46E5' : '#3B82F6';
                        e.currentTarget.style.backgroundColor = isDark ? '#1F2937' : '#FFFFFF';
                        e.currentTarget.style.boxShadow = isDark 
                          ? '0 0 0 2px rgba(79, 70, 229, 0.1)' 
                          : '0 0 0 2px rgba(59, 130, 246, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = isDark ? '#374151' : '#E5E7EB';
                        e.currentTarget.style.backgroundColor = isDark ? '#111827' : '#F9FAFB';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    {tagSearchQuery && (
                      <button
                        onClick={() => setTagSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 18,
                          height: 18,
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: isDark ? '#9CA3AF' : '#6B7280',
                          cursor: 'pointer',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#E5E7EB';
                          e.currentTarget.style.color = isDark ? '#F9FAFB' : '#111827';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = isDark ? '#9CA3AF' : '#6B7280';
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* 标签列表 */}
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '8px',
                  minHeight: 0, // 关键：允许flex子元素收缩
                  // 自定义滚动条样式
                  scrollbarWidth: 'thin',
                  scrollbarColor: isDark ? '#4B5563 #1F2937' : '#D1D5DB #F9FAFB',
                }}
                className="custom-scrollbar">
                  {filteredTags.map((tag) => (
                    <div key={tag.id} style={{ marginBottom: 4 }}>
                      <button
                        onClick={() => setSelectedTagId(tag.id)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: 'none',
                          borderRadius: '6px',
                          backgroundColor: selectedTagId === tag.id 
                            ? (isDark ? '#374151' : '#E5E7EB')
                            : 'transparent',
                          color: selectedTagId === tag.id 
                            ? (isDark ? '#F9FAFB' : '#111827')
                            : (isDark ? '#D1D5DB' : '#6B7280'),
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedTagId === tag.id) return;
                          e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#E5E7EB';
                        }}
                        onMouseLeave={(e) => {
                          if (selectedTagId === tag.id) return;
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        title={`标签 "${tag.name}" 出现在 ${tag.nodeCount} 个白板中`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {(() => {
                            const icon = getTagIcon(tag.name);
                            return icon ? (
                              <img
                                src={getIconPath(icon)}
                                alt="icon"
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: 4,
                                  marginRight: 2,
                                  cursor: 'pointer',
                                  background: isDark ? '#374151' : '#F3F4F6',
                                }}
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedTagForIcon(tag.name);
                                  setShowTagIconSelector(true);
                                }}
                                title="点击更换标签icon"
                              />
                            ) : (
                              <span
                                style={{
                                  display: 'inline-block',
                                  minWidth: 18,
                                  height: 20,
                                  lineHeight: '20px',
                                  borderRadius: 6,
                                  background: isDark ? '#374151' : '#F3F4F6',
                                  color: isDark ? '#F3F4F6' : '#6B7280',
                                  fontWeight: 700,
                                  fontSize: 15,
                                  textAlign: 'center',
                                  marginRight: 2,
                                  padding: '0 6px',
                                  boxSizing: 'border-box',
                                  cursor: 'pointer',
                                }}
                                onClick={e => {
                                  e.stopPropagation();
                                  setSelectedTagForIcon(tag.name);
                                  setShowTagIconSelector(true);
                                }}
                                title="点击更换标签icon"
                              >#</span>
                            );
                          })()}
                          <span>{tag.name}</span>
                        </div>
                        <span style={{
                          fontSize: '10px',
                          color: isDark ? '#9CA3AF' : '#6B7280',
                        }}>
                          {tag.nodeCount}个卡片
                        </span>
                      </button>
                    </div>
                  ))}

                  {filteredTags.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      padding: '20px 10px',
                      color: isDark ? '#6B7280' : '#9CA3AF',
                    }}>
                      {boardList.length === 0 ? (
                        <>
                          <div style={{ fontSize: '12px', marginBottom: 4 }}>暂无标签</div>
                          <div style={{ fontSize: '10px' }}>在任意白板的卡片中使用 #标签名 创建标签</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: '12px', marginBottom: 4 }}>未找到匹配的标签</div>
                          <div style={{ fontSize: '10px' }}>试试其他搜索关键词</div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
            
          {/* 底部按钮区域 */}
          <div style={{
            padding: '12px 16px',
            borderTop: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
            display: 'flex',
            gap: 8,
            flexShrink: 0, // 防止收缩
            backgroundColor: isDark ? '#1F2937' : '#F9FAFB', // 确保背景色一致
          }}>
            {/* 主题切换按钮 */}
            <button
              onClick={theme.toggleDarkMode}
              style={{
                width: '32px',
                height: '32px',
                border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                borderRadius: '8px',
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                color: isDark ? '#F9FAFB' : '#374151',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                e.currentTarget.style.borderColor = isDark ? '#4B5563' : '#D1D5DB';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#1F2937' : '#FFFFFF';
                e.currentTarget.style.borderColor = isDark ? '#374151' : '#E5E7EB';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title={`切换到${isDark ? '浅色' : '深色'}主题`}
            >
              {isDark ? '🌙' : '☀️'}
            </button>
            {/* 背景切换按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowBackgroundSelector(true);
              }}
              style={{
                width: '32px',
                height: '32px',
                border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                borderRadius: '8px',
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                color: isDark ? '#F9FAFB' : '#374151',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                e.currentTarget.style.borderColor = isDark ? '#4B5563' : '#D1D5DB';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#1F2937' : '#FFFFFF';
                e.currentTarget.style.borderColor = isDark ? '#374151' : '#E5E7EB';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title={`当前背景：${
                interactiveTheme === 'rainy' ? '雨天主题' :
                interactiveTheme === 'campfire' ? '篝火主题' :
                builtinBackgroundPath ? '内置背景' :
                backgroundMode === 'grid' ? '网格背景' : backgroundMode === 'dots' ? '点状背景' : backgroundMode === 'brickwall' ? '砖墙背景' : '空白背景'
              }，点击选择背景`}
            >
              {interactiveTheme === 'rainy' ? '🌧️' :
               interactiveTheme === 'campfire' ? '🔥' :
               interactiveTheme === 'night' ? '🌃' :
               builtinBackgroundPath ? (
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                   <rect x="3" y="3" width="18" height="18" rx="2"/>
                   <circle cx="9" cy="9" r="2"/>
                   <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                 </svg>
               ) :
               backgroundMode === 'grid' ? (
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                   <rect x="3" y="3" width="18" height="18" rx="2"/>
                   <path d="M9 3v18"/>
                   <path d="M15 3v18"/>
                   <path d="M3 9h18"/>
                   <path d="M3 15h18"/>
                 </svg>
               ) : 
               backgroundMode === 'dots' ? (
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                   <circle cx="5" cy="5" r="1"/>
                   <circle cx="12" cy="5" r="1"/>
                   <circle cx="19" cy="5" r="1"/>
                   <circle cx="5" cy="12" r="1"/>
                   <circle cx="12" cy="12" r="1"/>
                   <circle cx="19" cy="12" r="1"/>
                   <circle cx="5" cy="19" r="1"/>
                   <circle cx="12" cy="19" r="1"/>
                   <circle cx="19" cy="19" r="1"/>
                 </svg>
               ) :
               backgroundMode === 'brickwall' ? (
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                   <rect x="3" y="3" width="18" height="18" rx="2"/>
                   <rect x="4" y="6" width="4" height="3" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                   <rect x="8.5" y="6" width="4" height="3" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                   <rect x="13" y="6" width="4" height="3" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                   <rect x="6.25" y="9.5" width="4" height="3" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                   <rect x="10.75" y="9.5" width="4" height="3" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                 </svg>
               ) : (
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                   <rect x="3" y="3" width="18" height="18" rx="2"/>
                 </svg>
               )}
            </button>
            {/* 卡片设置按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCardSettings(true);
              }}
              style={{
                width: '32px',
                height: '32px',
                border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                borderRadius: '8px',
                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                color: isDark ? '#F9FAFB' : '#374151',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                e.currentTarget.style.borderColor = isDark ? '#4B5563' : '#D1D5DB';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#1F2937' : '#FFFFFF';
                e.currentTarget.style.borderColor = isDark ? '#374151' : '#E5E7EB';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="卡片设置"
            >
              ⚙️
            </button>
            {/* AI助手按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onShowAI) onShowAI();
                onClose();
              }}
              style={{
                width: '32px',
                height: '32px',
                border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                borderRadius: '8px',
                background: isDark ? '#1F2937' : '#FFFFFF',
                color: isDark ? '#fff' : '#374151',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
                boxShadow: '0 2px 8px rgba(79,140,255,0.10)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDark ? '#374151' : '#F9FAFB';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDark ? '#1F2937' : '#FFFFFF';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="AI助手"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="2.5" width="15" height="15" rx="4" stroke="currentColor" fill="none"/>
                {/* 字母A */}
                <path d="M7.2 14L9 6L10.8 14M7.7 12h2.6" stroke="currentColor" strokeWidth="1.1"/>
                {/* 字母I */}
                <line x1="12.5" y1="7" x2="12.5" y2="13" stroke="currentColor" strokeWidth="1.1"/>
                <line x1="12" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.1"/>
                <line x1="12" y1="13" x2="13" y2="13" stroke="currentColor" strokeWidth="1.1"/>
              </svg>
            </button>
          </div>
        </div>

        {/* 右侧：卡片展示区域 */}
        <div style={{
          flex: 1,
          backgroundColor: isDark ? '#23272F' : '#F5F6FA',
          overflow: 'auto',
          position: 'relative',
        }}>
          {/* 卡片展示区域 */}
          <div style={{
            padding: '16px',
            position: 'relative',
            height: '100%',
          }}>
            {displayNodes.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '400px',
                color: isDark ? '#6B7280' : '#9CA3AF',
              }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 16 }}>
                  {selectedTagId ? (
                    <path d="M10 34L32 56L54 34C56.8 31.2 56.8 26.4 54 23.6L40.4 10C37.6 7.2 32.8 7.2 30 10L10 30C7.2 32.8 7.2 37.6 10 40.4z" stroke="currentColor" strokeWidth="2"/>
                  ) : (
                    <rect x="8" y="8" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="2"/>
                  )}
                </svg>
                <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: 8 }}>
                  {selectedTagId ? '该标签下暂无卡片' : '当前白板没有卡片'}
                </div>
                <div style={{ fontSize: '14px', textAlign: 'center' }}>
                  {selectedTagId ? `在任意白板中添加 #${selectedTagId} 标签即可在这里看到` : '在白板中创建卡片后在这里管理'}
                </div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px',
                alignItems: 'start',
              }}>
                {displayNodes.map((node: any) => (
                  <div
                    key={`${node._boardId || 'current'}-${node.id}`}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: 'auto',
                      transform: 'none',
                    }}
                    onDoubleClick={() => {
                      // 进入编辑态
                      setNodeEditing(node.id, true);
                    }}
                  >
                    <div style={{
                      width: '100%',
                      height: 200,
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      <NodeCard
                        node={{
                          ...node,
                          pinned: false,
                          pinnedX: undefined,
                          pinnedY: undefined,
                          x: 0,
                          y: 0,
                          width: '100%',
                          height: 200,
                          selected: false,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {/* 新增卡片按钮：仅在白板Tab显示 */}
                {activeTab === 'boards' && (
                  <div
                    key="add-card"
                    style={{
                      width: '100%',
                      height: 200,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px dashed ${tagBorderColor}`,
                      borderRadius: 12,
                      background: tagBgColor,
                      color: tagTextColor,
                      fontSize: 22,
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onClick={() => {
                      // 新建卡片并进入编辑
                      const { addNode, setNodeEditing, nodes } = useBoardStore.getState();
                      addNode(100, 100); // 默认放在(100,100)，实际位置无影响
                      setTimeout(() => {
                        const latest = useBoardStore.getState().nodes.slice(-1)[0];
                        if (latest) setNodeEditing(latest.id, true);
                        // 立即保存新建的卡片
                        saveCurrentBoardData();
                        console.log('💾 新建卡片后立即保存');
                      }, 100); // 稍微延迟确保状态更新完成
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = isDark ? '#6366f1' : '#3b82f6';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = tagBorderColor;
                    }}
                    title="新建卡片"
                  >
                    <div style={{ textAlign: 'center', width: '100%' }}>
                      <div style={{ fontSize: 38, lineHeight: 1, marginBottom: 6, color: tagTextColor }}>＋</div>
                      <div style={{ fontSize: 16, color: tagTextColor }}>新建卡片</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const loadBoardData = (boardId: string) => {
    try {
      const storageKey = `whiteboard-data-${boardId}`;
      const savedData = localStorage.getItem(storageKey);
      
      if (savedData) {
        const boardData = JSON.parse(savedData);
        const { loadBoard, setBuiltinBackgroundPath } = useBoardStore.getState();
        loadBoard(boardData);
        // 单独设置内置背景路径
        if (boardData.builtinBackgroundPath) {
          setBuiltinBackgroundPath(boardData.builtinBackgroundPath);
        }
        console.log(`📂 白板数据已加载: ${boardId}`);
      } else {
        // 如果没有保存的数据，清空当前白板
        clearBoard();
        console.log(`🆕 新白板已准备就绪: ${boardId}`);
      }
    } catch (error) {
      console.error('❌ 加载白板数据失败:', error);
      clearBoard(); // 发生错误时清空白板
    }
  };

  // 刷新所有白板的卡片数量
  const refreshAllBoardCardCounts = React.useCallback(() => {
    setBoardList(prev => prev.map(board => ({
      ...board,
      cardCount: getBoardCardCount(board.id)
    })));
  }, [getBoardCardCount]);

  // 当管理器打开时刷新卡片数量
  React.useEffect(() => {
    if (isOpen) {
      refreshAllBoardCardCounts();
    }
  }, [isOpen, refreshAllBoardCardCounts]);

  // 标签icon选择弹窗状态
  const [showTagIconSelector, setShowTagIconSelector] = useState(false);
  const [selectedTagForIcon, setSelectedTagForIcon] = useState<string | null>(null);

  // 标签icon选择回调
  const handleTagIconSelect = (iconFileName: string) => {
    if (!selectedTagForIcon) return;
    setTagIcon(selectedTagForIcon, iconFileName);
    setShowTagIconSelector(false);
    setSelectedTagForIcon(null);
    // 触发刷新（可用forceUpdate或setState）
    setTagIconRefreshFlag(flag => !flag);
  };
  const handleCancelTagIconSelection = () => {
    setShowTagIconSelector(false);
    setSelectedTagForIcon(null);
  };
  // 用于强制刷新标签icon
  const [tagIconRefreshFlag, setTagIconRefreshFlag] = useState(false);

  // 1. 新增分享弹窗状态
  const [shareDialog, setShareDialog] = useState<{ show: boolean; boardId: string | null }>({ show: false, boardId: null });
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Toast 状态
  const [toast, setToast] = useState('');

  // 在组件顶部添加ref
  const newBoardInputRef = useRef<HTMLInputElement>(null);

  // 在showNewBoardDialog弹窗渲染后自动选中全部内容
  React.useEffect(() => {
    if (showNewBoardDialog && newBoardInputRef.current) {
      newBoardInputRef.current.focus();
      newBoardInputRef.current.select();
    }
  }, [showNewBoardDialog]);

  if (!isOpen) return null;

  // 显示loading状态
  if (isLoading) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDark ? '#23272F' : '#F5F6FA',
          backdropFilter: 'blur(12px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{
          color: isDark ? '#F9FAFB' : '#111827',
          fontSize: '16px',
          fontWeight: '500',
        }}>
          🔄 正在加载项目中心...
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDark ? '#23272F' : '#F5F6FA',
        backdropFilter: 'blur(12px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}
      onClick={handleClose} // 点击背景关闭
    >
      {/* 主容器 */}
      <div 
        style={{
          width: '100%',
          maxWidth: '1200px',
          height: '90vh',
          backgroundColor: isDark ? '#0F1419' : '#FFFFFF',
          borderRadius: '16px',
          boxShadow: isDark 
            ? '0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
            : '0 24px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()} // 阻止点击内容区域时关闭
      >
        {/* 直接显示标签页内容，移除顶部导航栏 */}
        {renderTagsContent()}
        
        {/* 右键菜单 - 保持作为备用方案 */}
        {contextMenu?.show && (
          <div style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
            borderRadius: '8px',
            boxShadow: isDark 
              ? '0 8px 24px rgba(0,0,0,0.4)' 
              : '0 8px 24px rgba(0,0,0,0.15)',
            minWidth: '140px',
            overflow: 'hidden',
          }}>
            {/* 重命名 */}
            <button
              onClick={() => {
                const board = boardList.find(b => b.id === contextMenu.boardId);
                if (board) {
                  handleStartRename(board.id, board.title);
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                color: isDark ? '#F9FAFB' : '#111827',
                fontSize: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>✏️</span>
              重命名
            </button>
            
            {/* 置顶/取消置顶 */}
            <button
              onClick={(e) => handleTogglePinBoard(contextMenu.boardId)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                color: isDark ? '#F9FAFB' : '#111827',
                fontSize: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>{boardList.find(b => b.id === contextMenu.boardId)?.isPinned ? '📌' : '📍'}</span>
              {boardList.find(b => b.id === contextMenu.boardId)?.isPinned ? '取消置顶' : '置顶'}
            </button>
            
            {/* 删除 - 当前白板不可删除 */}
            {true && (
              <>
                <div style={{
                  height: '1px',
                  backgroundColor: isDark ? '#374151' : '#E5E7EB',
                  margin: '4px 0',
                }} />
                <button
                  onClick={(e) => handleDeleteBoard(contextMenu.boardId)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#EF4444',
                    fontSize: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#FEF2F2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span>🗑️</span>
                  删除
                </button>
              </>
            )}
            {/* 分享菜单项 */}
            <button
              onClick={() => {
                const board = boardList.find(b => b.id === contextMenu.boardId);
                if (board) {
                  // 检查 shareId
                  let shareId = board.shareId;
                  if (!shareId) {
                    // 自动生成 shareId 并持久化
                    const storageKey = `whiteboard-data-${board.id}`;
                    const data = localStorage.getItem(storageKey);
                    if (data) {
                      try {
                        const boardData = JSON.parse(data);
                        shareId = generateShareId();
                        boardData.shareId = shareId;
                        localStorage.setItem(storageKey, JSON.stringify(boardData));
                      } catch {}
                    }
                  }
                  setShareEnabled(!!shareId);
                  setShareUrl(shareId ? `${window.location.origin}/share/${shareId}` : '');
                  setShareDialog({ show: true, boardId: board.id });
                }
                setContextMenu(null);
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                backgroundColor: 'transparent',
                color: isDark ? '#F9FAFB' : '#111827',
                fontSize: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>🔗</span>
              分享
            </button>
          </div>
        )}
        
        {/* 新增白板弹窗 */}
        {showNewBoardDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}>
            <div style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderRadius: '12px',
              boxShadow: isDark 
                ? '0 20px 40px rgba(0,0,0,0.6)' 
                : '0 20px 40px rgba(0,0,0,0.15)',
              width: '100%',
              maxWidth: '400px',
              padding: '24px',
              border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
            }}>
              {/* 弹窗标题 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px',
                gap: 12,
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                }}>
                  📋
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: isDark ? '#F9FAFB' : '#111827',
                }}>
                  新建白板
                </h3>
              </div>
              
              {/* 输入框 */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: isDark ? '#D1D5DB' : '#374151',
                  marginBottom: '8px',
                }}>
                  白板名称
                </label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="请输入白板名称"
                  ref={newBoardInputRef}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: isDark ? '1px solid #374151' : '1px solid #D1D5DB',
                    borderRadius: '8px',
                    backgroundColor: isDark ? '#111827' : '#FFFFFF',
                    color: isDark ? '#F9FAFB' : '#111827',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = isDark ? '#4F46E5' : '#3B82F6';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = isDark ? '#374151' : '#D1D5DB';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmNewBoard();
                    } else if (e.key === 'Escape') {
                      handleCancelNewBoard();
                    }
                  }}
                  autoFocus
                />
              </div>
              
              {/* 按钮组 */}
              <div style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'flex-end',
              }}>
                <button
                  onClick={handleCancelNewBoard}
                  style={{
                    padding: '10px 20px',
                    border: isDark ? '1px solid #374151' : '1px solid #D1D5DB',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: isDark ? '#D1D5DB' : '#6B7280',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmNewBoard}
                  disabled={!newBoardName.trim()}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: newBoardName.trim() 
                      ? (isDark ? '#4F46E5' : '#3B82F6')
                      : (isDark ? '#374151' : '#E5E7EB'),
                    color: newBoardName.trim() 
                      ? '#FFFFFF' 
                      : (isDark ? '#6B7280' : '#9CA3AF'),
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: newBoardName.trim() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (newBoardName.trim()) {
                      e.currentTarget.style.backgroundColor = isDark ? '#5B21B6' : '#2563EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (newBoardName.trim()) {
                      e.currentTarget.style.backgroundColor = isDark ? '#4F46E5' : '#3B82F6';
                    }
                  }}
                >
                  创建白板
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 背景选择下拉菜单 */}
        {showBackgroundSelector && (
          <>
            {/* 透明背景遮罩，点击关闭 */}
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                backgroundColor: 'transparent',
              }}
              onClick={() => setShowBackgroundSelector(false)}
            />
            
            {/* 下拉菜单 */}
            <div style={{
              position: 'fixed',
              bottom: '60px', // 在按钮上方
              left: '60px', // 对齐左下角
              zIndex: 10000,
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: isDark 
                ? '0 8px 24px rgba(0,0,0,0.4)' 
                : '0 8px 24px rgba(0,0,0,0.15)',
              minWidth: '120px',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
            >
              {/* 所有背景选项 */}
              <div style={{
                padding: '4px 0',
              }}>
                <button
                  onClick={() => {
                    setBackgroundMode('grid');
                    setInteractiveTheme(null);
                    setShowBackgroundSelector(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: (backgroundMode === 'grid' && !interactiveTheme)
                      ? (isDark ? '#374151' : '#F3F4F6')
                      : 'transparent',
                    color: isDark ? '#F9FAFB' : '#111827',
                    fontSize: '13px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!(backgroundMode === 'grid' && !interactiveTheme)) {
                      e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(backgroundMode === 'grid' && !interactiveTheme)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M9 3v18"/>
                    <path d="M15 3v18"/>
                    <path d="M3 9h18"/>
                    <path d="M3 15h18"/>
                  </svg>
                  网格背景
                </button>
                
                <button
                  onClick={() => {
                    setBackgroundMode('dots');
                    setInteractiveTheme(null);
                    setShowBackgroundSelector(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: (backgroundMode === 'dots' && !interactiveTheme)
                      ? (isDark ? '#374151' : '#F3F4F6')
                      : 'transparent',
                    color: isDark ? '#F9FAFB' : '#111827',
                    fontSize: '13px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!(backgroundMode === 'dots' && !interactiveTheme)) {
                      e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(backgroundMode === 'dots' && !interactiveTheme)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="5" r="1"/>
                    <circle cx="12" cy="5" r="1"/>
                    <circle cx="19" cy="5" r="1"/>
                    <circle cx="5" cy="12" r="1"/>
                    <circle cx="12" cy="12" r="1"/>
                    <circle cx="19" cy="12" r="1"/>
                    <circle cx="5" cy="19" r="1"/>
                    <circle cx="12" cy="19" r="1"/>
                    <circle cx="19" cy="19" r="1"/>
                  </svg>
                  点状背景
                </button>
                
                <button
                  onClick={() => {
                    setBackgroundMode('blank');
                    setInteractiveTheme(null);
                    setShowBackgroundSelector(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: (backgroundMode === 'blank' && !interactiveTheme)
                      ? (isDark ? '#374151' : '#F3F4F6')
                      : 'transparent',
                    color: isDark ? '#F9FAFB' : '#111827',
                    fontSize: '13px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!(backgroundMode === 'blank' && !interactiveTheme)) {
                      e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(backgroundMode === 'blank' && !interactiveTheme)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                  </svg>
                  空白背景
                </button>
                
                <button
                  onClick={() => {
                    setBackgroundMode('brickwall');
                    setInteractiveTheme(null);
                    setShowBackgroundSelector(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: (backgroundMode === 'brickwall' && !interactiveTheme)
                      ? (isDark ? '#374151' : '#F3F4F6')
                      : 'transparent',
                    color: isDark ? '#F9FAFB' : '#111827',
                    fontSize: '13px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!(backgroundMode === 'brickwall' && !interactiveTheme)) {
                      e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(backgroundMode === 'brickwall' && !interactiveTheme)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <rect x="4" y="6" width="4" height="3" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                    <rect x="8.5" y="6" width="4" height="3" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                    <rect x="13" y="6" width="4" height="3" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                    <rect x="6.25" y="9.5" width="4" height="3" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                    <rect x="10.75" y="9.5" width="4" height="3" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                  </svg>
                  砖墙背景
                </button>
                
                <button
                  onClick={() => {
                    setShowBackgroundSelector(false);
                    setShowBackgroundImageSelector(true);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: (backgroundMode === 'image' && !interactiveTheme)
                      ? (isDark ? '#374151' : '#F3F4F6')
                      : 'transparent',
                    color: isDark ? '#F9FAFB' : '#111827',
                    fontSize: '13px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!(backgroundMode === 'image' && !interactiveTheme)) {
                      e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(backgroundMode === 'image' && !interactiveTheme)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                  图片背景
                </button>

              </div>
            </div>
          </>
        )}
        
        {/* 卡片设置弹窗 */}
        {showCardSettings && (
          <>
            {/* 透明背景遮罩，点击关闭 */}
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                backgroundColor: 'transparent',
              }}
              onClick={() => setShowCardSettings(false)}
            />
            
            {/* 卡片设置弹窗 */}
            <div style={{
              position: 'fixed',
              bottom: '60px', // 在按钮上方
              left: '110px', // 在卡片设置按钮上方
              zIndex: 10000,
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: isDark 
                ? '0 12px 32px rgba(0,0,0,0.5)' 
                : '0 12px 32px rgba(0,0,0,0.15)',
              minWidth: '280px',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
            >
              {/* 弹窗标题 */}
              <div style={{
                padding: '16px 20px 12px',
                borderBottom: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '6px',
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                }}>
                  ⚙️
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 600,
                  color: isDark ? '#F9FAFB' : '#111827',
                }}>
                  卡片设置
                </h3>
              </div>
              
              {/* 设置选项 */}
              <div style={{
                padding: '18px',
                maxHeight: '50vh',
                overflowY: 'auto',
                // 自定义滚动条样式
                scrollbarWidth: 'thin',
                scrollbarColor: isDark ? '#4B5563 transparent' : '#D1D5DB transparent',
              }}
              className="custom-scrollbar"
              >
                {/* 基础设置 */}
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isDark ? '#F3F4F6' : '#1F2937',
                    margin: '0 0 12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    📐 基础设置
                  </h3>
                  
                  {/* 默认尺寸设置 */}
                  <div style={{ 
                    padding: '14px',
                    backgroundColor: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 0.5)',
                    borderRadius: '8px',
                    border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                  }}>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: isDark ? '#D1D5DB' : '#374151',
                      marginBottom: '8px',
                    }}>
                      默认卡片尺寸
                    </label>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                    }}>
                      {/* 宽度输入 */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '11px',
                          color: isDark ? '#9CA3AF' : '#6B7280',
                          marginBottom: '4px',
                        }}>
                          宽度 (px)
                        </label>
                        <input
                          type="number"
                          value={defaultCardConfig.width}
                          onChange={(e) => updateDefaultCardConfig({ width: parseInt(e.target.value) || 250 })}
                          min="200"
                          max="500"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: isDark ? '1px solid #374151' : '1px solid #D1D5DB',
                            borderRadius: '6px',
                            backgroundColor: isDark ? '#111827' : '#FFFFFF',
                            color: isDark ? '#F9FAFB' : '#111827',
                            fontSize: '12px',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      
                      {/* 高度输入 */}
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '11px',
                          color: isDark ? '#9CA3AF' : '#6B7280',
                          marginBottom: '4px',
                        }}>
                          高度 (px)
                        </label>
                        <input
                          type="number"
                          value={defaultCardConfig.height}
                          onChange={(e) => updateDefaultCardConfig({ height: parseInt(e.target.value) || 150 })}
                          min="120"
                          max="400"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: isDark ? '1px solid #374151' : '1px solid #D1D5DB',
                            borderRadius: '6px',
                            backgroundColor: isDark ? '#111827' : '#FFFFFF',
                            color: isDark ? '#F9FAFB' : '#111827',
                            fontSize: '12px',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 外观设置 */}
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isDark ? '#F3F4F6' : '#1F2937',
                    margin: '0 0 12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    🎨 外观设置
                  </h3>
                  
                  {/* 外观设置统一面板 */}
                  <div style={{ 
                    padding: '14px',
                    backgroundColor: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 0.5)',
                    borderRadius: '8px',
                    border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                  }}>
                    {/* 背景样式 */}
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: isDark ? '#D1D5DB' : '#374151',
                        marginBottom: '12px',
                      }}>
                        背景样式
                      </label>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* 透明背景 */}
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                        }}>
                          <input
                            type="radio"
                            name="backgroundStyle"
                            checked={defaultCardConfig.transparent}
                            onChange={() => {
                              updateDefaultCardConfig({ 
                                transparent: true,
                                frosted: false
                              });
                            }}
                            style={{
                              width: 16,
                              height: 16,
                              accentColor: isDark ? '#4F46E5' : '#3B82F6',
                            }}
                          />
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: isDark ? '#D1D5DB' : '#374151',
                          }}>
                            透明背景
                          </span>
                        </label>
                        
                        {/* 毛玻璃效果 */}
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                        }}>
                          <input
                            type="radio"
                            name="backgroundStyle"
                            checked={defaultCardConfig.frosted && !defaultCardConfig.transparent}
                            onChange={() => {
                              updateDefaultCardConfig({ 
                                transparent: false,
                                frosted: true
                              });
                            }}
                            style={{
                              width: 16,
                              height: 16,
                              accentColor: isDark ? '#4F46E5' : '#3B82F6',
                            }}
                          />
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: isDark ? '#D1D5DB' : '#374151',
                          }}>
                            毛玻璃效果
                          </span>
                        </label>
                        
                        {/* 普通背景 */}
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                        }}>
                          <input
                            type="radio"
                            name="backgroundStyle"
                            checked={!defaultCardConfig.transparent && !defaultCardConfig.frosted}
                            onChange={() => {
                              updateDefaultCardConfig({ 
                                transparent: false,
                                frosted: false
                              });
                            }}
                            style={{
                              width: 16,
                              height: 16,
                              accentColor: isDark ? '#4F46E5' : '#3B82F6',
                            }}
                          />
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: isDark ? '#D1D5DB' : '#374151',
                          }}>
                            普通背景
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* 背景颜色（只在普通背景时显示） */}
                    {!defaultCardConfig.transparent && !defaultCardConfig.frosted && (
                      <div style={{ marginBottom: '16px' }}>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: isDark ? '#D1D5DB' : '#374151',
                          marginBottom: '8px',
                        }}>
                          背景颜色
                        </label>
                        
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '11px',
                            color: isDark ? '#9CA3AF' : '#6B7280',
                            marginBottom: '8px',
                          }}>
                            {isDark ? '深色模式' : '浅色模式'}
                          </label>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 8,
                          }}>
                            {(isDark ? DARK_CARD_COLORS : LIGHT_CARD_COLORS).map((color) => {
                              const isSelected = isDark 
                                ? defaultCardConfig.darkBackgroundColor === color.color
                                : defaultCardConfig.lightBackgroundColor === color.color;
                              
                              return (
                                <button
                                  key={color.id}
                                  onClick={() => {
                                    if (isDark) {
                                      updateDefaultCardConfig({ darkBackgroundColor: color.color });
                                    } else {
                                      updateDefaultCardConfig({ lightBackgroundColor: color.color });
                                    }
                                  }}
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 6,
                                    border: isSelected
                                      ? (isDark ? '2px solid #4F46E5' : '2px solid #3B82F6')
                                      : (isDark ? '1px solid #374151' : '1px solid #E5E7EB'),
                                    backgroundColor: color.color,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    position: 'relative',
                                  }}
                                  title={color.name}
                                >
                                  {/* 选中标识 */}
                                  {isSelected && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      backgroundColor: isDark ? '#4F46E5' : '#3B82F6',
                                      border: '1px solid white',
                                    }} />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 边框设置 */}
                    <div>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        marginBottom: '12px',
                      }}>
                        <input
                          type="checkbox"
                          checked={defaultCardConfig.showBorder}
                          onChange={(e) => {
                            updateDefaultCardConfig({ 
                              showBorder: e.target.checked
                            });
                          }}
                          style={{
                            width: 16,
                            height: 16,
                            accentColor: isDark ? '#4F46E5' : '#3B82F6',
                          }}
                        />
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: isDark ? '#D1D5DB' : '#374151',
                        }}>
                          显示边框
                        </span>
                      </label>
                      
                      {/* 边框颜色选择 */}
                      {defaultCardConfig.showBorder && (
                        <div>
                          <label style={{
                            display: 'block',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: isDark ? '#9CA3AF' : '#6B7280',
                            marginBottom: '8px',
                          }}>
                            边框颜色
                          </label>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 8,
                          }}>
                            {[
                              { name: '浅灰', color: '#D1D5DB' },
                              { name: '深灰', color: '#6B7280' },
                              { name: '蓝色', color: '#3B82F6' },
                              { name: '绿色', color: '#10B981' },
                              { name: '红色', color: '#EF4444' },
                              { name: '紫色', color: '#8B5CF6' },
                              { name: '橙色', color: '#F59E0B' },
                              { name: '粉色', color: '#EC4899' },
                            ].map((borderColorOption) => {
                              const isSelected = defaultCardConfig.borderColor === borderColorOption.color;
                              
                              return (
                                <button
                                  key={borderColorOption.color}
                                  onClick={() => {
                                    updateDefaultCardConfig({ borderColor: borderColorOption.color });
                                  }}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 6,
                                    border: isSelected
                                      ? '2px solid #3B82F6'
                                      : '1px solid #E5E7EB',
                                    backgroundColor: borderColorOption.color,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    position: 'relative',
                                  }}
                                  title={borderColorOption.name}
                                >
                                  {isSelected && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '50%',
                                      left: '50%',
                                      transform: 'translate(-50%, -50%)',
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      backgroundColor: '#FFFFFF',
                                      border: '1px solid #3B82F6',
                                    }} />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 文字设置 */}
                <div style={{ marginBottom: '0px' }}>
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isDark ? '#F3F4F6' : '#1F2937',
                    margin: '0 0 12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    📝 文字设置
                  </h3>
                  
                  <div style={{ 
                    padding: '14px',
                    backgroundColor: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 0.5)',
                    borderRadius: '8px',
                    border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                  }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={defaultCardConfig.textAlign === 'center' && defaultCardConfig.textVerticalAlign === 'center'}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateDefaultCardConfig({ 
                              textAlign: 'center',
                              textVerticalAlign: 'center'
                            });
                          } else {
                            updateDefaultCardConfig({ 
                              textAlign: 'left',
                              textVerticalAlign: 'top'
                            });
                          }
                        }}
                        style={{
                          width: 16,
                          height: 16,
                          accentColor: isDark ? '#4F46E5' : '#3B82F6',
                        }}
                      />
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: isDark ? '#D1D5DB' : '#374151',
                      }}>
                        文字居中显示
                      </span>
                    </label>
                    <p style={{
                      margin: '8px 0 0 24px',
                      fontSize: '10px',
                      color: isDark ? '#9CA3AF' : '#6B7280',
                      lineHeight: 1.4,
                    }}>
                      水平和垂直居中对齐
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </>
        )}

        {/* 下拉菜单 */}
        {showDropdown && (
          <>
            {/* 透明背景遮罩 */}
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9998,
                backgroundColor: 'transparent',
              }}
              onClick={() => setShowDropdown(null)}
            />
            
            {/* 下拉菜单内容 */}
            <div style={{
              position: 'fixed',
              top: '30%',
              left: '20%',
              zIndex: 9999,
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: isDark 
                ? '0 8px 24px rgba(0,0,0,0.4)' 
                : '0 8px 24px rgba(0,0,0,0.15)',
              minWidth: '140px',
              overflow: 'hidden',
            }}>
              {/* 重命名 */}
              <button
                onClick={() => {
                  const board = boardList.find(b => b.id === showDropdown);
                  if (board) {
                    handleStartRename(board.id, board.title);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: isDark ? '#F9FAFB' : '#111827',
                  fontSize: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>✏️</span>
                重命名
              </button>
              
              {/* 更换图标 */}
              <button
                onClick={() => {
                  if (showDropdown) {
                    handleChangeIcon(showDropdown);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: isDark ? '#F9FAFB' : '#111827',
                  fontSize: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>🎨</span>
                更换图标
              </button>
              
              {/* 置顶/取消置顶 */}
              <button
                onClick={() => {
                  if (showDropdown) {
                    handleTogglePinBoard(showDropdown);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: isDark ? '#F9FAFB' : '#111827',
                  fontSize: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>{boardList.find(b => b.id === showDropdown)?.isPinned ? '📌' : '📍'}</span>
                {boardList.find(b => b.id === showDropdown)?.isPinned ? '取消置顶' : '置顶'}
              </button>
              
              {/* 删除 - 当前白板不可删除 */}
              {true && (
                <>
                  <div style={{
                    height: '1px',
                    backgroundColor: isDark ? '#374151' : '#E5E7EB',
                    margin: '4px 0',
                  }} />
                  <button
                    onClick={() => {
                      if (showDropdown) {
                        handleDeleteBoard(showDropdown);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#EF4444',
                      fontSize: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#FEF2F2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>🗑️</span>
                    删除
                  </button>
                </>
              )}
              {/* 分享菜单项 */}
              <button
                onClick={() => {
                  const board = boardList.find(b => b.id === showDropdown);
                  if (board) {
                    // 检查 shareId
                    let shareId = board.shareId;
                    if (!shareId) {
                      // 自动生成 shareId 并持久化
                      const storageKey = `whiteboard-data-${board.id}`;
                      const data = localStorage.getItem(storageKey);
                      if (data) {
                        try {
                          const boardData = JSON.parse(data);
                          shareId = generateShareId();
                          boardData.shareId = shareId;
                          localStorage.setItem(storageKey, JSON.stringify(boardData));
                        } catch {}
                      }
                    }
                    setShareEnabled(!!shareId);
                    setShareUrl(shareId ? `${window.location.origin}/share/${shareId}` : '');
                    setShareDialog({ show: true, boardId: board.id });
                  }
                  setShowDropdown(null);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: isDark ? '#F9FAFB' : '#111827',
                  fontSize: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <span>🔗</span>
                分享
              </button>
            </div>
          </>
        )}
        
        {/* 图标选择器弹窗 */}
        {showIconSelector && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={handleCancelIconSelection}
          >
            <div style={{
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderRadius: '12px',
              boxShadow: isDark 
                ? '0 20px 40px rgba(0,0,0,0.6)' 
                : '0 20px 40px rgba(0,0,0,0.15)',
              width: '100%',
              maxWidth: '400px', // 从500px减小到400px
              maxHeight: '480px', // 从600px减小到480px
              padding: '16px', // 从24px减小到16px
              border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
            >
              {/* 弹窗标题 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px', // 从20px减小到12px
                gap: 8, // 从12减小到8
              }}>
                <div style={{
                  width: 24, // 从32减小到24
                  height: 24, // 从32减小到24
                  borderRadius: '6px', // 从8px减小到6px
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px', // 从16px减小到14px
                }}>
                  🎨
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: '16px', // 从18px减小到16px
                  fontWeight: 600,
                  color: isDark ? '#F9FAFB' : '#111827',
                }}>
                  选择白板图标
                </h3>
              </div>
              
              {/* 说明文字 - 删除以节省空间 */}
              
              {/* 图标网格 */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', // 从48px减小到40px
                gap: '6px', // 从8px减小到6px
                marginBottom: '12px', // 从20px减小到12px
              }}>
                {AVAILABLE_ICONS.map((iconFileName) => (
                  <button
                    key={iconFileName}
                    onClick={() => handleSelectIcon(iconFileName)}
                    style={{
                      width: 40, // 从48减小到40
                      height: 40, // 从48减小到40
                      border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                      borderRadius: '6px', // 从8px减小到6px
                      backgroundColor: isDark ? '#111827' : '#F9FAFB',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      padding: 3, // 从4减小到3
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#E5E7EB';
                      e.currentTarget.style.borderColor = isDark ? '#4B5563' : '#D1D5DB';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? '#111827' : '#F9FAFB';
                      e.currentTarget.style.borderColor = isDark ? '#374151' : '#E5E7EB';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title={iconFileName}
                  >
                    <img
                      src={getIconPath(iconFileName)}
                      alt={iconFileName}
                      style={{
                        width: 28, // 从32减小到28
                        height: 28, // 从32减小到28
                        borderRadius: '3px', // 从4px减小到3px
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </button>
                ))}
              </div>
              
              {/* 取消按钮 */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
              }}>
                <button
                  onClick={handleCancelIconSelection}
                  style={{
                    padding: '8px 16px', // 从10px 20px减小到8px 16px
                    border: isDark ? '1px solid #374151' : '1px solid #D1D5DB',
                    borderRadius: '6px', // 从8px减小到6px
                    backgroundColor: 'transparent',
                    color: isDark ? '#D1D5DB' : '#6B7280',
                    fontSize: '12px', // 从14px减小到12px
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDark ? '#374151' : '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* 背景图片选择器 */}
        <BackgroundImageSelector
          isOpen={showBackgroundImageSelector}
          onClose={() => setShowBackgroundImageSelector(false)}
          onSelect={(backgroundPath) => {
            if (backgroundPath) {
              setBackgroundMode('image');
              setInteractiveTheme(null);
              setBuiltinBackgroundPath(backgroundPath);
            } else {
              setBuiltinBackgroundPath(null);
            }
            setShowBackgroundImageSelector(false);
          }}
          onSelectTheme={(theme) => {
            setInteractiveTheme(theme);
            if (theme) {
              setBackgroundMode('blank');
              setBuiltinBackgroundPath(null);
            }
          }}
          currentBackground={builtinBackgroundPath}
          currentTheme={interactiveTheme}
          isDark={isDark}
        />
      </div>
      {/* 删除白板自定义弹窗 */}
      {deleteConfirm.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.35)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            padding: '32px 32px 24px 32px',
            minWidth: 320,
            maxWidth: '90vw',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>确定要删除这个白板吗？</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>此操作无法撤销。</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
              <button
                onClick={() => setDeleteConfirm({ show: false, boardId: null })}
                style={{
                  minWidth: 72,
                  padding: '8px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: '#F3F4F6',
                  color: '#374151',
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  marginRight: 8,
                }}
              >取消</button>
              <button
                onClick={confirmDeleteBoard}
                style={{
                  minWidth: 72,
                  padding: '8px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: '#EF4444',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >确定</button>
            </div>
          </div>
        </div>
      )}
      {/* 标签icon选择器弹窗 */}
      {showTagIconSelector && (
        <div
          style={{
            position: 'fixed',
            left: 0, top: 0, right: 0, bottom: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={handleCancelTagIconSelection}
        >
          <div
            style={{
              background: isDark ? '#23272F' : '#fff',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              padding: 24,
              minWidth: 340,
              minHeight: 320,
              maxHeight: '70vh',
              maxWidth: '90vw',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 8 }}>
              <span style={{ fontSize: 18 }}>选择标签图标</span>
              <button onClick={handleCancelTagIconSelection} style={{ marginLeft: 'auto', border: 'none', background: 'none', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
              gap: '6px',
              maxHeight: '50vh',
              overflowY: 'auto',
            }}>
              {AVAILABLE_ICONS.map((iconFileName) => (
                <button
                  key={iconFileName}
                  onClick={() => handleTagIconSelect(iconFileName)}
                  style={{
                    width: 40,
                    height: 40,
                    border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
                    borderRadius: '6px',
                    backgroundColor: isDark ? '#111827' : '#F9FAFB',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    padding: 3,
                  }}
                  title={iconFileName}
                >
                  <img
                    src={getIconPath(iconFileName)}
                    alt={iconFileName}
                    style={{ width: 28, height: 28, borderRadius: 3 }}
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {shareDialog.show && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.15)',
          zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
          onClick={() => setShareDialog({ show: false, boardId: null })}
        >
          <div
            style={{
              background: isDark ? '#23272F' : '#fff',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              padding: 32,
              minWidth: 340,
              minHeight: 120,
              maxWidth: '90vw',
              position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16 }}>白板分享</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <input
                type="checkbox"
                checked={shareEnabled}
                onChange={e => {
                  const enabled = e.target.checked;
                  setShareEnabled(enabled);
                  if (shareDialog.boardId) {
                    const storageKey = `whiteboard-data-${shareDialog.boardId}`;
                    const data = localStorage.getItem(storageKey);
                    if (data) {
                      try {
                        const boardData = JSON.parse(data);
                        if (enabled) {
                          // 开启分享
                          if (!boardData.shareId) {
                            boardData.shareId = generateShareId();
                            localStorage.setItem(storageKey, JSON.stringify(boardData));
                          }
                          setShareUrl(`${window.location.origin}/share/${boardData.shareId}`);
                        } else {
                          // 关闭分享
                          delete boardData.shareId;
                          localStorage.setItem(storageKey, JSON.stringify(boardData));
                          setShareUrl('');
                        }
                      } catch {}
                    }
                  }
                }}
              />
              允许分享
            </label>
            {shareEnabled && shareUrl && (
              <div style={{ width: '100%', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  value={shareUrl}
                  readOnly
                  style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #eee', fontSize: 14 }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    // 显示 toast
                    setToast('复制成功');
                    // 2秒后关闭弹窗和 toast
                    setTimeout(() => {
                      setShareDialog({ show: false, boardId: null });
                      setToast('');
                    }, 2000);
                  }}
                  style={{
                    marginLeft: 8,
                    padding: '6px 16px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'background 0.15s',
                  }}
                >
                  复制
                </button>
              </div>
            )}
            <button
              onClick={() => setShareDialog({ show: false, boardId: null })}
              style={{ marginTop: 8, padding: '6px 18px', borderRadius: 6, border: 'none', background: isDark ? '#374151' : '#eee', color: isDark ? '#fff' : '#222', fontWeight: 500, cursor: 'pointer' }}
            >关闭</button>
          </div>
        </div>
      )}
      {/* Toast 渲染 */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          color: '#fff',
          padding: '10px 24px',
          borderRadius: 8,
          fontSize: 16,
          zIndex: 99999,
          pointerEvents: 'none',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default ModernProjectManager; 