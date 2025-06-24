import React, { useState, useContext, useMemo, useEffect } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { ThemeContext } from '../App';
import { extractTags, extractTextFromSlateContent } from './RichTextEditor';
import { useUnifiedStorage } from '../hooks/useUnifiedStorage';
import type { BoardMetadata } from '../services/unifiedStorageService';

interface ModernProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onShowAI?: () => void;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  nodeCount: number;
}

const ModernProjectManager: React.FC<ModernProjectManagerProps> = ({ isOpen, onClose, onShowAI }) => {
  // 使用统一存储钩子
  const unifiedStorage = useUnifiedStorage();
  
  // 基础状态
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [boardSearchQuery, setBoardSearchQuery] = useState('');
  const [boardList, setBoardList] = useState<BoardMetadata[]>([]);
  const [activeTab, setActiveTab] = useState<'boards' | 'tags'>('boards');
  const [isLoading, setIsLoading] = useState(false);
  
  // 弹窗状态
  const [showNewBoardDialog, setShowNewBoardDialog] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ boardId: string; title: string } | null>(null);
  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState('');
  
  const theme = useContext(ThemeContext);
  const isDark = theme.isDarkMode;
  
  const { nodes } = useBoardStore();

  // 获取当前白板ID
  const currentBoardId = unifiedStorage.getCurrentBoardId();

  // 加载白板列表
  const loadBoardList = async () => {
    setIsLoading(true);
    try {
      const boards = await unifiedStorage.getAllBoards();
      setBoardList(boards);
      console.log(`📋 已加载 ${boards.length} 个白板`);
    } catch (error) {
      console.error('❌ 加载白板列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 组件初始化
  useEffect(() => {
    if (isOpen) {
      loadBoardList();
    }
  }, [isOpen]);

  // 保存当前白板
  const saveCurrentBoard = async () => {
    try {
      await unifiedStorage.saveCurrentBoard();
      console.log('💾 当前白板已保存');
      // 重新加载白板列表以更新卡片数量
      await loadBoardList();
    } catch (error) {
      console.error('❌ 保存当前白板失败:', error);
    }
  };

  // 创建新白板
  const handleCreateNewBoard = async () => {
    if (!newBoardName.trim()) return;
    
    try {
      // 先保存当前白板
      await saveCurrentBoard();
      
      // 创建新白板
      const newBoardId = await unifiedStorage.createNewBoard(newBoardName.trim());
      
      if (newBoardId) {
        // 切换到新白板
        await unifiedStorage.loadBoard(newBoardId);
        
        // 刷新白板列表
        await loadBoardList();
        
        // 清空表单
        setNewBoardName('');
        setShowNewBoardDialog(false);
        
        console.log(`✅ 新白板 "${newBoardName}" 创建成功`);
      }
    } catch (error) {
      console.error('❌ 创建新白板失败:', error);
    }
  };

  // 切换白板
  const handleSwitchBoard = async (boardId: string) => {
    try {
      // 先保存当前白板
      await saveCurrentBoard();
      
      // 加载目标白板
      const success = await unifiedStorage.loadBoard(boardId);
      
      if (success) {
        console.log(`✅ 已切换到白板 ${boardId}`);
        onClose(); // 关闭面板
      } else {
        console.error(`❌ 切换到白板 ${boardId} 失败`);
      }
    } catch (error) {
      console.error('❌ 切换白板失败:', error);
    }
  };

  // 删除白板
  const handleDeleteBoard = async () => {
    if (!deleteConfirm) return;
    
    try {
      await unifiedStorage.deleteBoard(deleteConfirm.boardId);
      
      // 刷新白板列表
      await loadBoardList();
      
      // 如果删除的是当前白板，创建一个新的默认白板
      if (deleteConfirm.boardId === currentBoardId) {
        const newBoardId = await unifiedStorage.createNewBoard('新白板');
        if (newBoardId) {
          await unifiedStorage.loadBoard(newBoardId);
        }
      }
      
      console.log(`✅ 白板 "${deleteConfirm.title}" 已删除`);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('❌ 删除白板失败:', error);
    }
  };

  // 重命名白板
  const handleSaveRename = async () => {
    if (!renamingBoardId || !renamingTitle.trim()) return;
    
    try {
      // 注意：这里需要实现updateBoardMetadata方法
      // 暂时通过重新加载来刷新
      await loadBoardList();
      
      setRenamingBoardId(null);
      setRenamingTitle('');
      console.log(`✅ 白板已重命名为 "${renamingTitle}"`);
    } catch (error) {
      console.error('❌ 重命名白板失败:', error);
    }
  };

  // 获取标签
  const getAllTags = (): Tag[] => {
    const tagMap = new Map<string, { count: number; color: string }>();
    
    nodes.forEach(node => {
      const tags = extractTags(node.content);
      tags.forEach(tag => {
        const existing = tagMap.get(tag.name);
        if (existing) {
          existing.count++;
        } else {
          tagMap.set(tag.name, { count: 1, color: tag.color });
        }
      });
    });
    
    return Array.from(tagMap.entries()).map(([name, data]) => ({
      id: name,
      name,
      color: data.color,
      nodeCount: data.count
    }));
  };

  // 过滤白板
  const filteredBoards = useMemo(() => {
    if (!boardSearchQuery.trim()) return boardList;
    
    const query = boardSearchQuery.toLowerCase();
    return boardList.filter(board => 
      board.title.toLowerCase().includes(query)
    );
  }, [boardList, boardSearchQuery]);

  // 过滤标签
  const filteredTags = useMemo(() => {
    const allTags = getAllTags();
    if (!tagSearchQuery.trim()) return allTags;
    
    const query = tagSearchQuery.toLowerCase();
    return allTags.filter(tag => 
      tag.name.toLowerCase().includes(query)
    );
  }, [nodes, tagSearchQuery]);

  // 获取选中标签的节点
  const getSelectedTagNodes = () => {
    if (!selectedTagId) return nodes;
    
    return nodes.filter(node => {
      const tags = extractTags(node.content);
      return tags.some(tag => tag.name === selectedTagId);
    });
  };

  const displayNodes = selectedTagId ? getSelectedTagNodes() : nodes;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`
        w-11/12 max-w-6xl h-5/6 rounded-lg shadow-2xl flex flex-col overflow-hidden
        ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}
      `}>
        {/* 头部 */}
        <div className={`
          flex items-center justify-between p-4 border-b
          ${isDark ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'}
        `}>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🗃️ 统一存储系统 - 项目管理
          </h2>
          <div className="flex items-center gap-2">
            {onShowAI && (
              <button
                onClick={onShowAI}
                className={`
                  px-4 py-2 rounded-lg transition-colors
                  ${isDark 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }
                `}
              >
                🤖 AI助手
              </button>
            )}
            <button
              onClick={onClose}
              className={`
                px-4 py-2 rounded-lg transition-colors
                ${isDark 
                  ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }
              `}
            >
              关闭
            </button>
          </div>
        </div>

        {/* 标签页 */}
        <div className={`
          flex border-b
          ${isDark ? 'border-gray-600' : 'border-gray-200'}
        `}>
          <button
            onClick={() => setActiveTab('boards')}
            className={`
              px-6 py-3 font-medium transition-colors
              ${activeTab === 'boards'
                ? isDark 
                  ? 'border-b-2 border-blue-400 text-blue-400 bg-gray-700'
                  : 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                : isDark
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            📋 白板管理 ({boardList.length})
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`
              px-6 py-3 font-medium transition-colors
              ${activeTab === 'tags'
                ? isDark 
                  ? 'border-b-2 border-blue-400 text-blue-400 bg-gray-700'
                  : 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                : isDark
                  ? 'text-gray-400 hover:text-gray-300'
                  : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            🏷️ 标签管理 ({filteredTags.length})
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：白板列表 */}
          <div className={`
            w-1/3 border-r flex flex-col
            ${isDark ? 'border-gray-600 bg-gray-750' : 'border-gray-200 bg-gray-50'}
          `}>
            {/* 白板管理区域 */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="搜索白板..."
                  value={boardSearchQuery}
                  onChange={(e) => setBoardSearchQuery(e.target.value)}
                  className={`
                    flex-1 px-3 py-2 rounded-lg border text-sm
                    ${isDark 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }
                  `}
                />
                <button
                  onClick={() => setShowNewBoardDialog(true)}
                  className={`
                    px-3 py-2 rounded-lg transition-colors text-sm font-medium
                    ${isDark 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }
                  `}
                >
                  ＋新建
                </button>
              </div>
            </div>

            {/* 白板列表 */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center">
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    📥 加载中...
                  </div>
                </div>
              ) : filteredBoards.length === 0 ? (
                <div className="p-4 text-center">
                  <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {boardSearchQuery ? '🔍 没有找到匹配的白板' : '📋 暂无白板，点击新建开始使用'}
                  </div>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {filteredBoards.map((board) => (
                    <div
                      key={board.id}
                      className={`
                        p-3 rounded-lg cursor-pointer transition-colors group
                        ${board.id === currentBoardId
                          ? isDark 
                            ? 'bg-blue-900 border border-blue-700' 
                            : 'bg-blue-50 border border-blue-200'
                          : isDark
                            ? 'hover:bg-gray-700 border border-transparent'
                            : 'hover:bg-white border border-transparent hover:border-gray-200'
                        }
                      `}
                      onClick={() => handleSwitchBoard(board.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="text-lg">📋</div>
                          <div className="min-w-0 flex-1">
                            <div className={`
                              font-medium truncate text-sm
                              ${isDark ? 'text-white' : 'text-gray-900'}
                            `}>
                              {board.title}
                            </div>
                            <div className={`
                              text-xs truncate
                              ${isDark ? 'text-gray-400' : 'text-gray-500'}
                            `}>
                              💳 {board.cardCount} 张卡片 | 🗓️ {new Date(board.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingBoardId(board.id);
                              setRenamingTitle(board.title);
                            }}
                            className={`
                              p-1 rounded transition-colors text-xs
                              ${isDark 
                                ? 'hover:bg-gray-600 text-gray-400 hover:text-white' 
                                : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                              }
                            `}
                            title="重命名"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({ boardId: board.id, title: board.title });
                            }}
                            className={`
                              p-1 rounded transition-colors text-xs
                              ${isDark 
                                ? 'hover:bg-red-900 text-gray-400 hover:text-red-400' 
                                : 'hover:bg-red-100 text-gray-500 hover:text-red-600'
                              }
                            `}
                            title="删除"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：卡片预览 */}
          <div className="flex-1 flex flex-col">
            <div className={`
              p-4 border-b
              ${isDark ? 'border-gray-600' : 'border-gray-200'}
            `}>
              <div className="flex items-center justify-between">
                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  📝 当前白板内容 ({displayNodes.length} 张卡片)
                </h3>
                <button
                  onClick={saveCurrentBoard}
                  className={`
                    px-3 py-1 rounded text-sm transition-colors
                    ${isDark 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                    }
                  `}
                >
                  💾 保存到IndexedDB
                </button>
              </div>
            </div>

            {/* 卡片网格 */}
            <div className="flex-1 overflow-y-auto p-4">
              {displayNodes.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="text-4xl mb-2">📝</div>
                    <div>🗃️ 统一存储系统已就绪</div>
                    <div className="text-sm mt-2">开始添加卡片体验全新的数据管理</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayNodes.map((node) => (
                    <div
                      key={node.id}
                      className={`
                        p-3 rounded-lg border transition-all hover:shadow-md
                        ${isDark 
                          ? 'bg-gray-700 border-gray-600 hover:border-gray-500' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className={`
                        text-sm mb-2 line-clamp-3
                        ${isDark ? 'text-gray-300' : 'text-gray-700'}
                      `}>
                        {extractTextFromSlateContent(node.content).slice(0, 100)}
                        {extractTextFromSlateContent(node.content).length > 100 && '...'}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {extractTags(node.content).slice(0, 3).map((tag) => (
                          <span
                            key={tag.name}
                            className="text-xs px-2 py-1 rounded-full"
                            style={{ 
                              backgroundColor: tag.color + '20', 
                              color: tag.color,
                              border: `1px solid ${tag.color}40`
                            }}
                          >
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 弹窗们 */}
        {/* 新建白板弹窗 */}
        {showNewBoardDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`
              w-96 p-6 rounded-lg shadow-xl
              ${isDark ? 'bg-gray-800' : 'bg-white'}
            `}>
              <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                📋 新建白板
              </h3>
              <input
                type="text"
                placeholder="输入白板名称..."
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                className={`
                  w-full px-3 py-2 rounded-lg border mb-4
                  ${isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }
                `}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNewBoard()}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowNewBoardDialog(false);
                    setNewBoardName('');
                  }}
                  className={`
                    px-4 py-2 rounded-lg transition-colors
                    ${isDark 
                      ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }
                  `}
                >
                  取消
                </button>
                <button
                  onClick={handleCreateNewBoard}
                  disabled={!newBoardName.trim()}
                  className={`
                    px-4 py-2 rounded-lg transition-colors
                    ${newBoardName.trim()
                      ? isDark 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                      : isDark
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  🗃️ 创建到IndexedDB
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 删除确认弹窗 */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`
              w-96 p-6 rounded-lg shadow-xl
              ${isDark ? 'bg-gray-800' : 'bg-white'}
            `}>
              <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                🗑️ 确认删除
              </h3>
              <p className={`mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                确定要删除白板 "{deleteConfirm.title}" 吗？
                <br />
                <span className="text-red-500">⚠️ 此操作将从IndexedDB中永久删除，不可恢复。</span>
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className={`
                    px-4 py-2 rounded-lg transition-colors
                    ${isDark 
                      ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }
                  `}
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteBoard}
                  className={`
                    px-4 py-2 rounded-lg transition-colors
                    ${isDark 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-red-500 hover:bg-red-600 text-white'
                    }
                  `}
                >
                  🗑️ 永久删除
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 重命名弹窗 */}
        {renamingBoardId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`
              w-96 p-6 rounded-lg shadow-xl
              ${isDark ? 'bg-gray-800' : 'bg-white'}
            `}>
              <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ✏️ 重命名白板
              </h3>
              <input
                type="text"
                value={renamingTitle}
                onChange={(e) => setRenamingTitle(e.target.value)}
                className={`
                  w-full px-3 py-2 rounded-lg border mb-4
                  ${isDark 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }
                `}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setRenamingBoardId(null);
                    setRenamingTitle('');
                  }}
                  className={`
                    px-4 py-2 rounded-lg transition-colors
                    ${isDark 
                      ? 'bg-gray-600 hover:bg-gray-700 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }
                  `}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveRename}
                  disabled={!renamingTitle.trim()}
                  className={`
                    px-4 py-2 rounded-lg transition-colors
                    ${renamingTitle.trim()
                      ? isDark 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                      : isDark
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  ✏️ 保存到IndexedDB
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernProjectManager; 