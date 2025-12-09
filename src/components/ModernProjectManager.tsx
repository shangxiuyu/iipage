import React, { useState, useContext, useMemo, useRef } from 'react';
import { useBoardStore, type NodeData, LIGHT_CARD_COLORS, DARK_CARD_COLORS } from '../store/useBoardStore';
import { ThemeContext } from '../App';
import { extractTags, extractTextFromSlateContent } from './RichTextEditor';
import NodeCard from './NodeCard';
import type { InteractiveTheme } from './InteractiveThemeBackground';
import BackgroundImageSelector from './BackgroundImageSelector';
import { cloudDataManager } from '../services/cloudDataManager';
import { FixedSizeList as List } from 'react-window';
import BoardRenameInput from './BoardRenameInput';

// 动态获取可用的图标列表
const getAvailableIcons = (): string[] => {
  // 使用Vite的import.meta.glob动态获取所有图标文件
  // 这是最简单的方式，自动包含所有1996个图标
  
  try {
    // 获取所有图标文件的模块
    const iconModules = import.meta.glob('../assets/icons/*.png', { query: '?url', import: 'default', eager: true });
    
    // 提取文件名
    const iconNames = Object.keys(iconModules).map(path => {
      // 从路径 '../assets/icons/filename.png' 提取 'filename.png'
      return path.split('/').pop() || '';
    }).filter(name => name && name !== '.DS_Store');
    
    console.log(`🎨 自动加载了 ${iconNames.length} 个图标`);
    return iconNames;
  } catch (error) {
    console.warn('动态加载图标失败，使用备用图标列表:', error);
    
    // 备用图标列表（防止动态加载失败）
    return [
      '1F97F.png', '1F9A7.png', '1F96B.png', '1F958.png', '1F970.png', '1F9AA.png', '1F964.png',
      'E1D1.png', '23E9.png', '23FC.png', '1F596.png', '1F58D.png', '1F443-1F3FB.png', '2699.png',
      '1F642-200D-2194-FE0F.png', 'E318.png', 'E32B.png', '2666.png', '1F642-200D-2195-FE0F.png',
      '1F5C2.png', '1F55C.png', 'E324.png', '1F384.png', '1F390.png', '1F38B.png', '1F574-1F3FF.png',
      '2935.png', '1F39F.png', '1F347.png', 'E24B.png', '1F421.png', '1F3BF.png',
      '1F3C3-1F3FB-200D-2640-FE0F-200D-27A1-FE0F.png', 'E25F.png', '1F435.png', '2712.png', '1F4ED.png',
      '1F353.png', 'E2C7.png', '1F4D6.png', '1F34A.png', 'E244.png', '1F3B0.png', '271D.png', 'E250.png',
      '1F409.png', '1F43C.png', '1F3C4.png', '1F4E2.png', '1F35E.png', 'E2CA.png', 'E08C.png', '1FAF5.png',
      '1F192.png', 'E085.png', 'E091.png', '1F623.png', '25FE.png', 'E0B1.png', 'E0C5.png', '1F637.png',
      'E05D.png', '1F62E.png', 'E046.png', 'E0CC.png', '1F6E0.png', '1F63A.png', 'E052.png', '1F6E1.png',
      'E0CB.png', 'E053.png', 'E047.png', '1F62D.png', '1F6D5.png', 'E0C4.png', 'E05E.png', '1F636.png',
      'E04A.png', '1F622.png', '1F6DC.png', 'E0B0.png', '25FD.png', '2BEA.png', 'E090.png', '2B24.png',
      'E084.png', '1FAE8.png', '1F193.png', '1FAF5-1F3FB.png', 'E09F.png', 'E08B.png', '1FAF4.png',
      '1F3C5.png', '1F43B.png', '1F408.png', 'E251.png', '2049.png', '1F35D.png', '1F4E3.png', '1F4D7.png',
      '270A.png', '1F3B1.png', '1F42F.png', 'E245.png', '1F9CE-1F3FB-200D-2640-FE0F.png', '1F434.png',
      'E2C6.png', '1F352.png', '1F4EE.png', '1FBC6-200D-1F457.png', '1F346.png', '1F4DA.png',
      '1F9CD-200D-2642-FE0F.png', '1F420.png', 'E24C.png', '2934.png', '1F38C.png', '1F391.png', 'E325.png',
      '1F5C3.png', '267E.png', '1F55B.png', 'E319.png', '26AB.png', '1F554.png', '1F443-1F3FC.png',
      '1F48F-1F3FB.png', '231A.png', 'E1D0.png', '23FB.png', '1F575-1F3FB-200D-2640-FE0F.png', '1F965.png',
      '1F971.png', '1F959.png', '1F96C.png', '1F9A6.png', '1F96A.png', '1F9A4.png', '1F97E.png', '1F967.png',
      '1F9AB.png', '1F973.png', '1F998.png', 'E1D2.png', '0034-FE0F-20E3.png', '1F595.png', '1FBC8.png',
      '0023-FE0F-20E3.png', '1F5BC.png', '2665.png', '2117.png', '1F54D.png', 'E327.png', '1F3C2-1F3FD.png',
      '1F393.png', '1F9D1-200D-1F373.png', '1F387.png', '1F3F3-FE0F-200D-1F7E9-200D-2B50-200D-1F7E9.png',
      '1F39E.png', '1F38A.png', 'F000.png', '1F350.png', 'E2C4.png', 'E25E.png', '1F436.png', '2705.png',
      'E24A.png', '1F422.png', '1F3BE.png', '1F4DC.png', '1F3F3-FE0F-200D-1F7E6-200D-1F30C.png', '1F344.png',
      '1F4E1.png', '1F35F.png', 'E2CB.png', '1F4AA-1F3FC.png', 'E253.png', 'E247.png', '1F42D.png', '1F3B3.png',
      '270C.png', '1F4D5.png', '1F378.png', '1F34B.png', '1F91F-1F3FB.png', 'E09D.png', '1F191.png', '1FAF6.png',
      'E092.png', 'E086.png', '1F634.png', 'E0C6.png', 'E0B2.png', '1F620.png', 'E04C.png', '1F63B.png',
      '1F608.png', 'E051.png', '1F6E3.png', '1F6D7.png'
    ];
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
  // 在生产环境中，使用相对路径访问 assets 目录
  return new URL(`../assets/icons/${iconFileName}`, import.meta.url).href;
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

// 1. 标签icon持久化工具
function getTagIcon(tagName: string) {
  return localStorage.getItem(`tag-icon-${tagName}`) || '';
}
function setTagIcon(tagName: string, icon: string) {
  localStorage.setItem(`tag-icon-${tagName}`, icon);
}

// 工具函数：生成唯一shareId
function generateShareId(length = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const ModernProjectManager: React.FC<ModernProjectManagerProps> = ({ isOpen, onClose }) => {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [tagSearchQuery, setTagSearchQuery] = useState(''); // 添加标签搜索状态
  
  // 白板标题相关状态
  const [boardTitle, setBoardTitle] = useState(() => {
    // 🔥 修复：优先从localStorage读取ID为'current'的白板标题
    try {
      const currentBoardData = localStorage.getItem('whiteboard-data-current');
      if (currentBoardData) {
        const boardData = JSON.parse(currentBoardData);
        if (boardData.title) {
          return boardData.title;
        }
      }
    } catch (error) {
      console.warn('读取当前白板标题失败:', error);
    }
    
    // 如果没有保存的标题，使用当前日期时间作为默认值
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
  
  // 白板管理相关状态
  const [boardSearchQuery, setBoardSearchQuery] = useState('');
  const [boardList, setBoardList] = useState<Array<{
    id: string;
    title: string;
    cardCount: number;
    isActive: boolean;
    isPinned?: boolean;
    createdAt: Date;
    icon: string; // 添加图标字段
    shareId?: string; // 可选：shareId
  }>>([]);
  
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
  
  const theme = useContext(ThemeContext);
  const isDark = theme.isDarkMode;
  // 深色模式下的颜色
  const tagBgColor = isDark ? '#23272F' : '#F9FAFB';
  const tagBorderColor = isDark ? '#374151' : '#d1d5db';
  const tagTextColor = isDark ? '#D1D5DB' : '#6B7280';
  
  const { 
    nodes,
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

  // 计算白板的真实卡片数量
  const getBoardCardCount = React.useCallback((boardId: string): number => {
    if (boardId === 'current') {
      return nodes.length;
    }
    
    try {
      const storageKey = `whiteboard-data-${boardId}`;
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const boardData = JSON.parse(savedData);
        return (boardData.nodes || []).length;
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
            // 🚫 移除自动生成shareId的逻辑，只在用户主动分享时生成
            // shareId只在用户点击分享时才生成，避免所有白板都显示为已分享
            boards.push({
              id: key.replace('whiteboard-data-', ''),
              title: boardData.title || '未命名白板',
              cardCount: (boardData.nodes || []).length,
              isActive: boardData.isActive || false, // 🔥 保持原有的活跃状态
              isPinned: boardData.isPinned || false,
              createdAt: boardData.createdAt ? new Date(boardData.createdAt) : new Date(),
              icon: boardData.icon || getRandomIcon(),
              shareId: boardData.shareId,
            });
          } catch {}
        }
      }
    });
    return boards;
  }

  // 初始化白板列表
  React.useEffect(() => {
    if (!isInitialized.current) {
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
        // 🔥 检查是否有活跃白板，如果没有才激活第一个
        const hasActiveBoard = boards.some(board => board.isActive);
        if (!hasActiveBoard) {
          console.log('🔧 没有活跃白板，激活第一个白板');
        boards[0].isActive = true;
        } else {
          console.log('✅ 找到活跃白板，保持原有状态');
        }
        setBoardList(boards);
      }
      isInitialized.current = true;
    } else {
      // 更新所有白板的卡片数量
      setBoardList(prev => prev.map(board => ({
        ...board,
        title: board.id === 'current' ? boardTitle : board.title,
        cardCount: getBoardCardCount(board.id),
      })));
    }
  }, [boardTitle, nodes.length, getBoardCardCount]);

  // 预定义的标签颜色
  const tagColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
    '#6366F1', '#EC4899', '#14B8A6', '#F43F5E'
  ];

  // 从所有白板数据中提取标签并计算数量
  const extractedTags = useMemo(() => {
    const tagMap = new Map<string, Set<string>>(); // 标签名 -> 包含该标签的白板ID集合
    
    // 遍历所有白板，收集标签数据
    boardList.forEach(board => {
      const storageKey = `whiteboard-data-${board.id}`;
      try {
        let boardNodes: NodeData[] = [];
        
        if (board.id === 'current') {
          // 当前白板总是使用实时数据
          boardNodes = nodes;
        } else {
          // 其他白板从localStorage读取
          const savedData = localStorage.getItem(storageKey);
          if (savedData) {
            const boardData = JSON.parse(savedData);
            boardNodes = boardData.nodes || [];
          }
        }
        
        // 收集该白板中的所有标签
        const boardTags = new Set<string>();
        boardNodes.forEach((node: NodeData) => {
          const contents = [
            node.content,
            node.frontContent,
            node.backContent
          ].filter(content => content && Array.isArray(content));
          
          contents.forEach(content => {
            const tagsFromContent = extractTags(content as any);
            tagsFromContent.forEach(tag => boardTags.add(tag));
          });
        });
        
        // 将该白板的标签添加到全局标签映射中
        boardTags.forEach(tag => {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, new Set());
          }
          tagMap.get(tag)!.add(board.id);
        });
        
      } catch (error) {
        console.warn(`读取白板 ${board.id} 的数据失败:`, error);
      }
    });
    
    // 转换为标签对象数组，计算每个标签在多少个白板中出现
    return Array.from(tagMap.entries()).map(([name, boardIds], index) => ({
      id: name, // 使用标签名作为ID
      name,
      color: tagColors[index % tagColors.length],
      nodeCount: boardIds.size, // 改为显示包含该标签的白板数量
      boardIds: Array.from(boardIds), // 保存包含该标签的白板ID列表
    }));
  }, [boardList, nodes, tagColors]);

  // 添加一个用于强制重新计算标签的依赖项
  const nodesContentHash = useMemo(() => {
    return JSON.stringify(nodes.map(node => ({
      id: node.id,
      content: node.content,
      frontContent: node.frontContent,
      backContent: node.backContent
    })));
  }, [nodes]);

  // 重新计算extractedTags，添加nodesContentHash作为依赖
  const extractedTagsWithRealTimeUpdate = useMemo(() => {
    const tagMap = new Map<string, { boardIds: Set<string>, cardCount: number }>(); // 标签名 -> {白板ID集合, 卡片总数}
    boardList.forEach(board => {
      const storageKey = `whiteboard-data-${board.id}`;
      try {
        let boardNodes: NodeData[] = [];
        if (board.id === 'current') {
          boardNodes = nodes;
        } else {
          const savedData = localStorage.getItem(storageKey);
          if (savedData) {
            const boardData = JSON.parse(savedData);
            boardNodes = boardData.nodes || [];
          }
        }
        boardNodes.forEach((node: NodeData) => {
          // 合并所有内容的标签，去重
          const allTags = new Set<string>();
          [node.content, node.frontContent, node.backContent]
            .filter(content => content && Array.isArray(content))
            .forEach((content) => {
              extractTags(content as any).forEach((tag) => allTags.add(tag));
            });
          // 只要这张卡片有该标签，cardCount 只加一次
          allTags.forEach(tag => {
            if (!tagMap.has(tag)) {
              tagMap.set(tag, { boardIds: new Set(), cardCount: 0 });
            }
            tagMap.get(tag)!.boardIds.add(board.id);
            tagMap.get(tag)!.cardCount += 1;
          });
        });
      } catch (error) {
        console.warn(`读取白板 ${board.id} 的数据失败:`, error);
      }
    });
    return Array.from(tagMap.entries()).map(([name, info], index) => ({
      id: name,
      name,
      color: tagColors[index % tagColors.length],
      nodeCount: info.cardCount, // 这里改为卡片总数
      boardIds: Array.from(info.boardIds),
    }));
  }, [boardList, nodes, tagColors, nodesContentHash]);

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
      localStorage.setItem(storageKey, JSON.stringify({ title: newBoard.title, icon: newBoard.icon, isPinned: newBoard.isPinned, createdAt: now, nodes: [], connections: [], backgroundFrames: [] }));
      return updatedList;
    });
    
    handleSwitchBoard(newBoardId);
    
    setShowNewBoardDialog(false);
    setNewBoardName('');
    
    // 不再自动关闭面板，让用户看到新建的白板
    // onClose();
    
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
      await saveCurrentBoardData();
    }
    
    setBoardList(prev => {
      const updatedList = prev.map(board => ({
        ...board,
        isActive: board.id === boardId,
        cardCount: getBoardCardCount(board.id) // 更新所有白板的卡片数量
      }));
      console.log('切换后的白板列表:', updatedList);
      
      // 🔥 更新所有白板在localStorage中的活跃状态
      updatedList.forEach(board => {
        const storageKey = `whiteboard-data-${board.id}`;
        const data = localStorage.getItem(storageKey);
        if (data) {
          try {
            const boardData = JSON.parse(data);
            boardData.isActive = board.isActive;
            localStorage.setItem(storageKey, JSON.stringify(boardData));
          } catch (error) {
            console.warn(`更新白板 ${board.id} 活跃状态失败:`, error);
          }
        }
      });
      
      return updatedList;
    });
    
    // 加载目标白板的数据
    loadBoardData(boardId);
    
    // 清除标签选择，显示所有卡片
    setSelectedTagId(null);
    
    console.log('✅ 切换到白板:', boardId);
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

  const handleSaveRename = (newTitle?: string) => {
    // 🔥 修复：使用传入的新标题，或者当前的 renamingTitle
    const titleToUse = newTitle || renamingTitle;
    
    if (renamingBoardId && titleToUse.trim()) {
      // 🔥 修复：如果重命名的是'current'白板，同步更新boardTitle状态
      if (renamingBoardId === 'current') {
        setBoardTitle(titleToUse.trim());
      }
      
      setBoardList(prev => prev.map(board =>
        board.id === renamingBoardId
          ? { ...board, title: titleToUse.trim() }
          : board
      ));
      
      // 同步更新本地存储的 title
      const storageKey = `whiteboard-data-${renamingBoardId}`;
      const data = localStorage.getItem(storageKey);
      if (data) {
        try {
          const boardData = JSON.parse(data);
          boardData.title = titleToUse.trim();
          localStorage.setItem(storageKey, JSON.stringify(boardData));
        } catch {}
      } else {
        // 🔥 修复：如果localStorage中没有数据，创建新的数据（特别是'current'白板）
        const newBoardData = {
          title: titleToUse.trim(),
          nodes: renamingBoardId === 'current' ? nodes : [],
          connections: [],
          backgroundFrames: [],
          isActive: renamingBoardId === 'current',
          createdAt: new Date(),
          icon: getRandomIcon()
        };
        localStorage.setItem(storageKey, JSON.stringify(newBoardData));
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
        flexDirection: 'column',
        height: '100%',
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
            minHeight: 0,
          }}>
            {activeTab === 'boards' ? (
              /* 白板模块内容 */
              <>
                {/* 白板标题栏 */}
                <div style={{
                  padding: '16px 16px 12px 16px',
                  borderBottom: isDark ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(229, 231, 235, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}>
                  
                  {/* 搜索框 */}
                  <div style={{ 
                    position: 'relative', 
                    flex: 1,
                    minWidth: 120,
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: isDark ? '#6B7280' : '#9CA3AF',
                      pointerEvents: 'none',
                      fontSize: '14px',
                      zIndex: 1,
                      opacity: 0.7,
                    }}>
                      🔍
                    </div>
                    <input
                      type="text"
                      placeholder="搜索白板..."
                      value={boardSearchQuery}
                      onChange={(e) => setBoardSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        height: '36px',
                        padding: '0 36px 0 38px',
                        border: 'none',
                        borderRadius: '10px',
                        backgroundColor: isDark ? 'rgba(55, 65, 81, 0.4)' : 'rgba(243, 244, 246, 0.8)',
                        color: isDark ? '#E5E7EB' : '#1F2937',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        fontWeight: 400,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(55, 65, 81, 0.6)' : 'rgba(249, 250, 251, 1)';
                        e.currentTarget.style.boxShadow = isDark 
                          ? '0 0 0 2px rgba(99, 102, 241, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)' 
                          : '0 0 0 2px rgba(59, 130, 246, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(55, 65, 81, 0.4)' : 'rgba(243, 244, 246, 0.8)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    {boardSearchQuery && (
                      <button
                        onClick={() => setBoardSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 20,
                          height: 20,
                          border: 'none',
                          backgroundColor: isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                          color: isDark ? '#E5E7EB' : '#374151',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          transition: 'all 0.15s ease',
                          fontWeight: 500,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(107, 114, 128, 0.7)' : 'rgba(156, 163, 175, 0.6)';
                          e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)';
                          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
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
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(59, 130, 246, 0.08)',
                      color: isDark ? '#818CF8' : '#3B82F6',
                      cursor: 'pointer',
                      fontSize: '18px',
                      fontWeight: 400,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      flexShrink: 0,
                      boxShadow: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(59, 130, 246, 0.12)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = isDark 
                        ? '0 2px 8px rgba(99, 102, 241, 0.15)' 
                        : '0 2px 8px rgba(59, 130, 246, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(99, 102, 241, 0.12)' : 'rgba(59, 130, 246, 0.08)';
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    title="新增白板"
                  >
                    +
                  </button>
                </div>
                
                {/* 白板列表 */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '8px 12px 12px 12px',
                  minHeight: 0,
                }}>
                  {filteredBoards.map((board) => (
                    <div key={board.id} style={{ marginBottom: 4, flexShrink: 0 }}>
                      <div style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            backgroundColor: board.isActive
                              ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)')
                              : 'transparent',
                            backdropFilter: board.isActive ? 'blur(12px)' : 'none',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer',
                            border: board.isActive
                              ? (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)')
                              : '1px solid transparent',
                            position: 'relative',
                          }}
                          onClick={() => handleSwitchBoard(board.id)}
                          onMouseEnter={() => {
                            setHoveredBoardId(board.id);
                            if (!board.isActive) {
                              const element = document.querySelector(`[data-board-id="${board.id}"]`) as HTMLElement;
                              if (element) {
                                element.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)';
                                element.style.backdropFilter = 'blur(12px)';
                                element.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)';
                              }
                            }
                          }}
                          onMouseLeave={() => {
                            setHoveredBoardId(null);
                            if (!board.isActive) {
                              const element = document.querySelector(`[data-board-id="${board.id}"]`) as HTMLElement;
                              if (element) {
                                element.style.backgroundColor = 'transparent';
                                element.style.backdropFilter = 'none';
                                element.style.borderColor = 'transparent';
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
                                <BoardRenameInput
                                  initialValue={renamingTitle}
                                  onSave={(newTitle) => {
                                    handleSaveRename(newTitle);
                                  }}
                                  onCancel={handleCancelRename}
                                />
                              </div>
                            ) : (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                marginBottom: 0,
                              }}>
                                {/* 白板图标 */}
                                <img
                                  src={getIconPath(board.icon)}
                                  alt="白板图标"
                                  style={{
                                    width: 28,
                                    height: 28,
                                    flexShrink: 0,
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    opacity: board.isActive ? 1 : 0.8,
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
                                    fontSize: '13px',
                                    fontWeight: board.isActive ? 600 : 500,
                                    color: board.isActive 
                                      ? (isDark ? '#F3F4F6' : '#1F2937')
                                      : (isDark ? '#9CA3AF' : '#6B7280'),
                                    cursor: 'pointer',
                                    flex: 1,
                                    paddingRight: hoveredBoardId === board.id ? '28px' : (board.isPinned ? '16px' : '0'),
                                    transition: 'all 0.2s ease',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    lineHeight: 1.6,
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
                  padding: '16px 16px 12px 16px',
                  borderBottom: isDark ? '1px solid rgba(55, 65, 81, 0.5)' : '1px solid rgba(229, 231, 235, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                }}>
                  
                  {/* 标签搜索框 */}
                  <div style={{ 
                    position: 'relative', 
                    flex: 1,
                    minWidth: 120,
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: isDark ? '#6B7280' : '#9CA3AF',
                      pointerEvents: 'none',
                      fontSize: '14px',
                      zIndex: 1,
                      opacity: 0.7,
                    }}>
                      🔍
                    </div>
                    <input
                      type="text"
                      placeholder="搜索标签..."
                      value={tagSearchQuery}
                      onChange={(e) => setTagSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        height: '36px',
                        padding: '0 36px 0 38px',
                        border: 'none',
                        borderRadius: '10px',
                        backgroundColor: isDark ? 'rgba(55, 65, 81, 0.4)' : 'rgba(243, 244, 246, 0.8)',
                        color: isDark ? '#E5E7EB' : '#1F2937',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        fontWeight: 400,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(55, 65, 81, 0.6)' : 'rgba(249, 250, 251, 1)';
                        e.currentTarget.style.boxShadow = isDark 
                          ? '0 0 0 2px rgba(99, 102, 241, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)' 
                          : '0 0 0 2px rgba(59, 130, 246, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.backgroundColor = isDark ? 'rgba(55, 65, 81, 0.4)' : 'rgba(243, 244, 246, 0.8)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    {tagSearchQuery && (
                      <button
                        onClick={() => setTagSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 20,
                          height: 20,
                          border: 'none',
                          backgroundColor: isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)',
                          color: isDark ? '#E5E7EB' : '#374151',
                          cursor: 'pointer',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          transition: 'all 0.15s ease',
                          fontWeight: 500,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(107, 114, 128, 0.7)' : 'rgba(156, 163, 175, 0.6)';
                          e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(75, 85, 99, 0.5)' : 'rgba(209, 213, 219, 0.5)';
                          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* 标签列表和卡片预览 */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  gap: 8,
                }}>
                  {/* 标签列表 */}
                  <div style={{
                    flex: selectedTagId ? '0 0 auto' : 1,
                    maxHeight: selectedTagId ? '30%' : 'none',
                    overflow: 'auto',
                    padding: '8px 12px 12px 12px',
                  }}>
                    {filteredTags.map((tag) => (
                      <div key={tag.id} style={{ marginBottom: 6 }}>
                      <button
                        onClick={() => setSelectedTagId(tag.id)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: 'none',
                          borderRadius: '10px',
                          backgroundColor: selectedTagId === tag.id 
                            ? (isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(59, 130, 246, 0.1)')
                            : 'transparent',
                          color: selectedTagId === tag.id 
                            ? (isDark ? '#F3F4F6' : '#111827')
                            : (isDark ? '#9CA3AF' : '#6B7280'),
                          fontSize: '13px',
                          fontWeight: selectedTagId === tag.id ? 600 : 500,
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: selectedTagId === tag.id
                            ? (isDark ? '0 1px 3px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(99, 102, 241, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(59, 130, 246, 0.15)')
                            : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedTagId === tag.id) return;
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(55, 65, 81, 0.4)' : 'rgba(249, 250, 251, 1)';
                          e.currentTarget.style.boxShadow = isDark 
                            ? '0 1px 3px rgba(0, 0, 0, 0.1)' 
                            : '0 1px 3px rgba(0, 0, 0, 0.03)';
                        }}
                        onMouseLeave={(e) => {
                          if (selectedTagId === tag.id) return;
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        title={`标签 "${tag.name}" 包含 ${tag.nodeCount} 张卡片`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {(() => {
                            const icon = getTagIcon(tag.name);
                            return icon ? (
                              <img
                                src={getIconPath(icon)}
                                alt="icon"
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  background: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.8)',
                                  boxShadow: isDark 
                                    ? '0 1px 3px rgba(0, 0, 0, 0.2)' 
                                    : '0 1px 3px rgba(0, 0, 0, 0.08)',
                                  transition: 'all 0.2s ease',
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
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: 22,
                                  height: 22,
                                  borderRadius: 6,
                                  background: isDark ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.8)',
                                  color: isDark ? '#9CA3AF' : '#6B7280',
                                  fontWeight: 600,
                                  fontSize: 14,
                                  padding: '0 6px',
                                  boxSizing: 'border-box',
                                  cursor: 'pointer',
                                  boxShadow: isDark 
                                    ? '0 1px 3px rgba(0, 0, 0, 0.2)' 
                                    : '0 1px 3px rgba(0, 0, 0, 0.08)',
                                  transition: 'all 0.2s ease',
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
                          <span style={{ lineHeight: 1.4 }}>{tag.name}</span>
                        </div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          color: isDark ? '#6B7280' : '#9CA3AF',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(243, 244, 246, 0.6)',
                        }}>
                          {tag.nodeCount}
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
          </div>
      </div>
    );
  };

  // 白板数据自动保存相关函数
  const saveCurrentBoardData = async () => {
    const currentState = useBoardStore.getState();
    const currentBoard = boardList.find(b => b.isActive);
    if (!currentBoard) return;
    
    const boardData = {
      nodes: currentState.nodes,
      connections: currentState.connections,
      backgroundFrames: currentState.backgroundFrames, // 补上遗漏的背景框数据
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
      isActive: currentBoard.isActive, // 🔥 保存活跃状态
    };
    
    // 保存到localStorage，使用白板ID作为键
    const storageKey = `whiteboard-data-${currentBoard.id}`;
    localStorage.setItem(storageKey, JSON.stringify(boardData));
    console.log(`💾 白板 "${currentBoard.title}" 数据已保存到本地，活跃状态: ${currentBoard.isActive}`);
    
    // 🔥 云端同步：标记白板需要同步到云端
    try {
      const { cloudDataManager } = await import('../services/cloudDataManager');
      if (cloudDataManager.isReady()) {
        cloudDataManager.markForSync(currentBoard.id);
        console.log(`☁️ 白板 "${currentBoard.title}" 已标记为待云端同步`);
      }
    } catch (error) {
      // 云端同步失败不影响本地保存
      console.warn('标记云端同步失败:', error);
    }
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

  // 🚀 云端分享功能：启用分享时上传到云端
  const handleEnableShare = async (boardId: string): Promise<string | null> => {
    try {
      console.log(`🔄 正在启用白板分享，上传到云端: ${boardId}`);
      
      // 如果是当前活跃白板，先保存最新数据
      const currentBoard = boardList.find(b => b.isActive);
      if (currentBoard && currentBoard.id === boardId) {
        await saveCurrentBoardData();
      }
      
      // 从localStorage获取白板数据
      const storageKey = `whiteboard-data-${boardId}`;
      const localData = localStorage.getItem(storageKey);
      
      if (!localData) {
        console.error(`白板 ${boardId} 在本地不存在`);
        return null;
      }

      const boardData = JSON.parse(localData);
      
      // 生成shareId
      const shareId = boardData.shareId || generateShareId();
      boardData.shareId = shareId;
      
      // 验证数据完整性
      if (!boardData.nodes) boardData.nodes = [];
      if (!boardData.connections) boardData.connections = [];
      
      console.log(`📤 白板数据验证完成，节点数量: ${boardData.nodes.length}, 连接数量: ${boardData.connections.length}`);
      
      // 上传到阿里云OSS
      const success = await cloudDataManager.saveToCloud(boardId);
      
      if (success) {
        // 更新本地数据，确保shareId被保存
        localStorage.setItem(storageKey, JSON.stringify(boardData));
        
        // 更新白板列表中的shareId
        setBoardList(prev => prev.map(board => 
          board.id === boardId 
            ? { ...board, shareId: shareId }
            : board
        ));
        
        const shareUrl = `${window.location.origin}/share/${boardId}`;
        console.log(`✅ 白板分享启用成功，分享链接: ${shareUrl}`);
        return shareUrl;
      } else {
        console.error('❌ 上传到云端失败');
        return null;
      }
    } catch (error) {
      console.error('❌ 启用分享失败:', error);
      return null;
    }
  };

  // 🚀 云端分享功能：禁用分享时从云端删除
  const handleDisableShare = async (boardId: string): Promise<boolean> => {
    try {
      console.log(`🔄 正在禁用白板分享，禁用云端访问: ${boardId}`);
      
      // 🔒 第一步：尝试禁用云端分享（不删除文件，只修改访问权限）
      const cloudResult = await cloudDataManager.disableCloudShare(boardId);
      
              if (cloudResult) {
          // ✅ 云端分享禁用成功，执行本地清理
          console.log('✅ 云端分享已禁用，正在清理本地标记...');
        
        // 从本地数据中移除shareId
        const storageKey = `whiteboard-data-${boardId}`;
        const localData = localStorage.getItem(storageKey);
        
        if (localData) {
          const boardData = JSON.parse(localData);
          delete boardData.shareId;
          localStorage.setItem(storageKey, JSON.stringify(boardData));
        }
        
        // 更新白板列表
        setBoardList(prev => prev.map(board => 
          board.id === boardId 
            ? { ...board, shareId: undefined }
            : board
        ));
        
        console.log(`✅ 白板分享已完全禁用：云端访问已阻断，本地标记已清除`);
        return true;
      } else {
        // ❌ 云端分享禁用失败，但仍然清理本地标记（用户体验优先）
        console.warn('⚠️ 云端分享禁用失败，但仍会清理本地分享标记');
        
        // 清理本地shareId（即使云端删除失败，也要让用户看到状态更新）
        const storageKey = `whiteboard-data-${boardId}`;
        const localData = localStorage.getItem(storageKey);
        
        if (localData) {
          const boardData = JSON.parse(localData);
          delete boardData.shareId;
          localStorage.setItem(storageKey, JSON.stringify(boardData));
        }
        
        // 更新白板列表UI状态
        setBoardList(prev => prev.map(board => 
          board.id === boardId 
            ? { ...board, shareId: undefined }
            : board
        ));
        
        console.log('🔧 本地分享标记已清除，但云端访问权限可能未完全禁用');
        return false; // 返回false表示部分失败
      }
    } catch (error: any) {
      console.error('❌ 禁用分享过程中发生错误:', error);
      
      // 🚨 根据错误类型提供不同的用户提示
      if (error.message && error.message.includes('CORS')) {
        console.error('💥 CORS配置错误：需要在阿里云OSS控制台配置跨域规则');
        // 即使有CORS错误，也要清理本地状态
        try {
          const storageKey = `whiteboard-data-${boardId}`;
          const localData = localStorage.getItem(storageKey);
          if (localData) {
            const boardData = JSON.parse(localData);
            delete boardData.shareId;
            localStorage.setItem(storageKey, JSON.stringify(boardData));
          }
          setBoardList(prev => prev.map(board => 
            board.id === boardId ? { ...board, shareId: undefined } : board
          ));
          console.log('🔧 已清理本地分享标记，但云端访问权限因CORS问题无法禁用');
        } catch {}
      }
      
      return false;
    }
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

  // 🔍 自动检查分享对话框的初始状态
  React.useEffect(() => {
    if (shareDialog.show && shareDialog.boardId) {
      const board = boardList.find(b => b.id === shareDialog.boardId);
      if (board && board.shareId) {
        // 如果白板有shareId，说明已经分享，设置为已启用状态
        setShareEnabled(true);
        setShareUrl(`${window.location.origin}/share/${board.id}`);
        console.log(`🔍 自动检测到已分享白板: ${board.title}, shareId: ${board.shareId}`);
      } else {
        // 如果没有shareId，设置为未启用状态
        setShareEnabled(false);
        setShareUrl('');
        console.log(`📋 检测到未分享白板: ${board?.title || shareDialog.boardId}`);
      }
    }
  }, [shareDialog.show, shareDialog.boardId, boardList]);

  // 在showNewBoardDialog弹窗渲染后自动选中全部内容
  React.useEffect(() => {
    if (showNewBoardDialog && newBoardInputRef.current) {
      newBoardInputRef.current.focus();
      newBoardInputRef.current.select();
    }
  }, [showNewBoardDialog]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        data-sidebar
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: isDark ? 'rgba(26, 32, 44, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          borderRight: isDark ? '1px solid rgba(55, 65, 81, 0.4)' : '1px solid rgba(229, 231, 235, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 标签页内容 */}
        {renderTagsContent()}
      </div>
      
      {/* 右键菜单 */}
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
              onClick={async () => {
                const board = boardList.find(b => b.id === contextMenu.boardId);
                if (board) {
                  setContextMenu(null);
                  
                  // 检查白板是否已经分享
                  if (board.shareId) {
                    // 🔍 已分享：打开分享对话框查看/管理分享
                    console.log(`🔍 查看白板 "${board.title || board.id}" 的分享状态...`);
                    
                    // 设置分享对话框状态
                    setShareEnabled(true);
                    setShareUrl(`${window.location.origin}/share/${board.id}`);
                    setShareDialog({ show: true, boardId: board.id });
                  } else {
                    // 🚀 未分享：直接执行云端分享
                    console.log(`🔄 启用白板 "${board.title || board.id}" 的云端分享...`);
                    setToast('正在上传到云端...');
                    
                    const shareUrl = await handleEnableShare(board.id);
                    
                    if (shareUrl) {
                      // 成功后复制分享链接到剪贴板
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        setToast('✅ 分享链接已复制到剪贴板');
                        console.log(`🎉 分享成功！链接: ${shareUrl}`);
                      } catch (err) {
                        console.error('复制到剪贴板失败:', err);
                        setToast(`✅ 分享成功: ${shareUrl}`);
                      }
                      
                      // 3秒后清除提示
                      setTimeout(() => setToast(''), 3000);
                    } else {
                      setToast('❌ 云端分享失败');
                      setTimeout(() => setToast(''), 3000);
                    }
                  }
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
              {(() => {
                const board = boardList.find(b => b.id === contextMenu.boardId);
                return board?.shareId ? (
                  <>
                    <span>👁️</span>
                    查看分享
                  </>
                ) : (
                  <>
                    <span>🔗</span>
                    分享
                  </>
                );
              })()}
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
              bottom: '70px', // 在按钮上方，稍微远一点
              left: '16px', // 从左侧边距开始
              zIndex: 10000,
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              border: isDark ? '1px solid #374151' : '1px solid #E5E7EB',
              borderRadius: '12px',
              boxShadow: isDark 
                ? '0 12px 32px rgba(0,0,0,0.5)' 
                : '0 12px 32px rgba(0,0,0,0.15)',
              width: 'calc(100% - 32px)', // 左右各留16px边距
              maxWidth: '320px',
              maxHeight: 'calc(100vh - 140px)', // 限制最大高度，确保不会超出视口
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
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
                flex: 1,
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
                onClick={async () => {
                  const board = boardList.find(b => b.id === showDropdown);
                  if (board) {
                    setShowDropdown(null);
                    
                    // 检查白板是否已经分享
                    if (board.shareId) {
                      // 🔍 已分享：打开分享对话框查看/管理分享
                      console.log(`🔍 查看白板 "${board.title || board.id}" 的分享状态...`);
                      
                      // 设置分享对话框状态
                      setShareEnabled(true);
                      setShareUrl(`${window.location.origin}/share/${board.id}`);
                      setShareDialog({ show: true, boardId: board.id });
                    } else {
                      // 🚀 未分享：直接执行云端分享
                      console.log(`🔄 启用白板 "${board.title || board.id}" 的云端分享...`);
                      setToast('正在上传到云端...');
                      
                      const shareUrl = await handleEnableShare(board.id);
                      
                      if (shareUrl) {
                        // 成功后复制分享链接到剪贴板
                        try {
                          await navigator.clipboard.writeText(shareUrl);
                          setToast('✅ 分享链接已复制到剪贴板');
                          console.log(`🎉 分享成功！链接: ${shareUrl}`);
                        } catch (err) {
                          console.error('复制到剪贴板失败:', err);
                          setToast(`✅ 分享成功: ${shareUrl}`);
                        }
                        
                        // 3秒后清除提示
                        setTimeout(() => setToast(''), 3000);
                      } else {
                        setToast('❌ 云端分享失败');
                        setTimeout(() => setToast(''), 3000);
                      }
                    }
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
                {(() => {
                  const board = boardList.find(b => b.id === showDropdown);
                  return board?.shareId ? (
                    <>
                      <span>👁️</span>
                      查看分享
                    </>
                  ) : (
                    <>
                      <span>🔗</span>
                      分享
                    </>
                  );
                })()}
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
    </>
  );
};

export default ModernProjectManager;
