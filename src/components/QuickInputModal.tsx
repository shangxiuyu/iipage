import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useBoardStore, defaultContent } from '../store/useBoardStore';
import RichTextEditor from './RichTextEditor';
import type { Descendant } from 'slate';
import { ThemeContext } from '../App';

interface QuickInputModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuickInputModal: React.FC<QuickInputModalProps> = ({ isOpen, onClose }) => {
  const [content, setContent] = useState<Descendant[]>(defaultContent);
  const { isDarkMode } = React.useContext(ThemeContext);
  const [selectedBoardId, setSelectedBoardId] = useState<string>('current');
  const addNode = useBoardStore(state => state.addNode);
  const scale = useBoardStore(state => state.scale);
  const panX = useBoardStore(state => state.panX);
  const panY = useBoardStore(state => state.panY);
  const updateNode = useBoardStore(state => state.updateNode);
  
  const modalRef = useRef<HTMLDivElement>(null);

  // 获取所有白板列表
  const boardList = useMemo(() => {
    const boards: Array<{
      id: string;
      title: string;
      cardCount: number;
    }> = [];
    
    // 添加当前白板
    boards.push({
      id: 'current',
      title: '当前白板',
      cardCount: useBoardStore.getState().nodes.length
    });
    
    // 从localStorage读取其他白板
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('whiteboard-data-') && key !== 'whiteboard-data-current') {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const boardData = JSON.parse(data);
            boards.push({
              id: key.replace('whiteboard-data-', ''),
              title: boardData.title || '未命名白板',
              cardCount: (boardData.nodes || []).length
            });
          }
        } catch (error) {
          console.warn(`读取白板 ${key} 失败:`, error);
        }
      }
    });
    
    return boards;
  }, [isOpen]);

  // ESC 键关闭弹窗
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
      // Command/Ctrl + Enter 快速创建卡片
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleCreateCard();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, content]);

  // 点击外部关闭弹窗
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleClose = () => {
    setContent(defaultContent);
    onClose();
  };

  const handleCreateCard = () => {
    if (selectedBoardId === 'current') {
      // 在当前白板的画布中心创建卡片
      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = window.innerHeight / 2;
      
      // 转换为世界坐标
      const worldX = (viewportCenterX - panX) / scale;
      const worldY = (viewportCenterY - panY) / scale;
      
      // 创建新卡片
      addNode(worldX, worldY);
      
      // 获取新创建的卡片ID并更新内容
      const newNodeId = useBoardStore.getState().nodes[useBoardStore.getState().nodes.length - 1]?.id;
      if (newNodeId && content.length > 0) {
        updateNode(newNodeId, { 
          content, 
          frontContent: content 
        });
      }
    } else {
      // 在指定白板中创建卡片
      const storageKey = `whiteboard-data-${selectedBoardId}`;
      const savedData = localStorage.getItem(storageKey);
      
      if (savedData) {
        try {
          const boardData = JSON.parse(savedData);
          
          // 创建新卡片数据
          const newCard = {
            id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200,
            width: 250,
            height: 150,
            content: JSON.parse(JSON.stringify(content)),
            frontContent: JSON.parse(JSON.stringify(content)),
            backContent: [{ type: 'paragraph', children: [{ text: '' }] }],
            isFlipped: false,
            editing: false,
            selected: false,
            lightBackgroundColor: 'rgba(255,255,255,0.95)',
            darkBackgroundColor: 'rgba(40,40,40,0.96)',
          };
          
          // 添加到白板数据
          boardData.nodes = boardData.nodes || [];
          boardData.nodes.push(newCard);
          
          // 保存回localStorage
          localStorage.setItem(storageKey, JSON.stringify(boardData));
          
          console.log(`✅ 卡片已创建到白板: ${boardData.title || selectedBoardId}`);
        } catch (error) {
          console.error('创建卡片失败:', error);
        }
      }
    }
    
    // 关闭弹窗并重置内容
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        ref={modalRef}
        style={{
          width: '90%',
          maxWidth: 600,
          maxHeight: '80vh',
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          borderRadius: 16,
          boxShadow: isDarkMode 
            ? '0 20px 60px rgba(0, 0, 0, 0.6)' 
            : '0 20px 60px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(99, 102, 241, 0.02) 100%)'
              : 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(99, 102, 241, 0.02) 100%)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: isDarkMode
                ? 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'
                : 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              boxShadow: isDarkMode
                ? '0 4px 12px rgba(79, 70, 229, 0.25)'
                : '0 4px 12px rgba(59, 130, 246, 0.25)',
            }}>
              ✨
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: isDarkMode ? '#f3f4f6' : '#111827',
                letterSpacing: '-0.02em',
              }}
            >
              快速创建卡片
            </h3>
          </div>
          
          {/* 白板选择下拉框 */}
          <div>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 500,
              color: isDarkMode ? '#d1d5db' : '#6b7280',
              marginBottom: 8,
            }}>
              选择白板
            </label>
            <select
              value={selectedBoardId}
              onChange={(e) => setSelectedBoardId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: isDarkMode ? '1px solid #374151' : '1px solid #d1d5db',
                backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                color: isDarkMode ? '#f3f4f6' : '#111827',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = isDarkMode ? '#4F46E5' : '#3B82F6';
                e.currentTarget.style.boxShadow = isDarkMode
                  ? '0 0 0 3px rgba(79, 70, 229, 0.1)'
                  : '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#d1d5db';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {boardList.map(board => (
                <option key={board.id} value={board.id}>
                  {board.title} ({board.cardCount} 张卡片)
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'none',
              border: 'none',
              width: 32,
              height: 32,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#f3f4f6';
              e.currentTarget.style.color = isDarkMode ? '#f3f4f6' : '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280';
            }}
            title="关闭 (ESC)"
          >
            ×
          </button>
        </div>

        {/* 编辑区域 */}
        <div
          style={{
            flex: 1,
            padding: '24px',
            overflow: 'auto',
            minHeight: 240,
            backgroundColor: isDarkMode ? '#111827' : '#f9fafb',
          }}
        >
          <div style={{
            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            minHeight: 200,
            boxShadow: isDarkMode
              ? '0 2px 8px rgba(0, 0, 0, 0.3)'
              : '0 2px 8px rgba(0, 0, 0, 0.05)',
          }}>
            <RichTextEditor
              value={content}
              onChange={setContent}
              autoFocus={true}
              style={{
                minHeight: 200,
                fontSize: 15,
                lineHeight: 1.7,
              }}
            />
          </div>
        </div>

        {/* 底部操作栏 */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: isDarkMode ? '#0f1419' : '#ffffff',
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: isDarkMode ? '#9ca3af' : '#6b7280',
            }}
          >
            <kbd
              style={{
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              ⌘/Ctrl
            </kbd>
            {' + '}
            <kbd
              style={{
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              Enter
            </kbd>
            {' 创建  '}
            <kbd
              style={{
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              ESC
            </kbd>
            {' 关闭'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleClose}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: isDarkMode ? '1px solid #374151' : '1px solid #d1d5db',
                backgroundColor: 'transparent',
                color: isDarkMode ? '#9ca3af' : '#6b7280',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1f2937' : '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              取消
            </button>
            <button
              onClick={handleCreateCard}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: isDarkMode
                  ? 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)'
                  : 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isDarkMode
                  ? '0 4px 12px rgba(79, 70, 229, 0.25)'
                  : '0 4px 12px rgba(59, 130, 246, 0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = isDarkMode
                  ? '0 6px 16px rgba(79, 70, 229, 0.35)'
                  : '0 6px 16px rgba(59, 130, 246, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isDarkMode
                  ? '0 4px 12px rgba(79, 70, 229, 0.25)'
                  : '0 4px 12px rgba(59, 130, 246, 0.25)';
              }}
            >
              创建卡片
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickInputModal;
