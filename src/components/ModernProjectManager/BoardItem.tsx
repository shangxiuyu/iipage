import React from 'react';
import { getIconPath } from './utils/iconUtils';
import type { BoardInfo } from './utils/boardStorage';

interface BoardItemProps {
    board: BoardInfo;
    isActive: boolean;
    isRenaming: boolean;
    showDropdown: boolean;
    isDarkMode: boolean;
    onSelect: (boardId: string) => void;
    onContextMenu: (e: React.MouseEvent, boardId: string) => void;
    onToggleDropdown: (e: React.MouseEvent, boardId: string) => void;
    onStartRename: (boardId: string, currentTitle: string) => void;
    onSaveRename: (newTitle: string) => void;
    onCancelRename: () => void;
    onTogglePin: (boardId: string) => void;
    onChangeIcon: (boardId: string) => void;
    onDelete: (boardId: string) => void;
    renamingTitle: string;
    onRenamingTitleChange: (title: string) => void;
}

const BoardItem: React.FC<BoardItemProps> = ({
    board,
    isActive,
    isRenaming,
    showDropdown,
    isDarkMode,
    onSelect,
    onContextMenu,
    onToggleDropdown,
    onStartRename,
    onSaveRename,
    onCancelRename,
    onTogglePin,
    onChangeIcon,
    onDelete,
    renamingTitle,
    onRenamingTitleChange,
}) => {
    const baseStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background 0.2s',
        backgroundColor: isActive
            ? (isDarkMode ? '#2a3f5f' : '#e0f0ff')
            : 'transparent',
        position: 'relative',
    };

    return (
        <div
            style={baseStyle}
            onClick={() => onSelect(board.id)}
            onContextMenu={(e) => onContextMenu(e, board.id)}
            onMouseEnter={(e) => {
                if (!isActive) {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#2a2a2a' : '#f0f0f0';
                }
            }}
            onMouseLeave={(e) => {
                if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }
            }}
        >
            {/* 图标 */}
            <img
                src={getIconPath(board.icon)}
                alt=""
                style={{ width: 24, height: 24, flexShrink: 0 }}
            />

            {/* 标题 */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {isRenaming ? (
                    <input
                        type="text"
                        value={renamingTitle}
                        onChange={(e) => onRenamingTitleChange(e.target.value)}
                        onBlur={() => onSaveRename(renamingTitle)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRename(renamingTitle);
                            if (e.key === 'Escape') onCancelRename();
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: `1px solid ${isDarkMode ? '#444' : '#ddd'}`,
                            backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
                            color: isDarkMode ? '#fff' : '#333',
                            fontSize: '14px',
                        }}
                    />
                ) : (
                    <div
                        style={{
                            fontSize: '14px',
                            fontWeight: isActive ? 500 : 400,
                            color: isDarkMode ? '#fff' : '#333',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {board.isPinned && <span style={{ marginRight: 4 }}>📌</span>}
                        {board.title}
                    </div>
                )}
                <div
                    style={{
                        fontSize: '12px',
                        color: isDarkMode ? '#888' : '#999',
                        marginTop: 2,
                    }}
                >
                    {board.cardCount} 张卡片
                </div>
            </div>

            {/* 更多按钮 */}
            <div
                onClick={(e) => onToggleDropdown(e, board.id)}
                style={{
                    padding: '4px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    opacity: 0.6,
                }}
            >
                ⋮
            </div>

            {/* 下拉菜单 */}
            {showDropdown && (
                <div
                    style={{
                        position: 'absolute',
                        right: 8,
                        top: '100%',
                        backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        padding: '4px',
                        zIndex: 100,
                        minWidth: '120px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
                        onClick={() => onStartRename(board.id, board.title)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#333' : '#f0f0f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        ✏️ 重命名
                    </div>
                    <div
                        style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
                        onClick={() => onChangeIcon(board.id)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#333' : '#f0f0f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        🎨 换图标
                    </div>
                    <div
                        style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px' }}
                        onClick={() => onTogglePin(board.id)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#333' : '#f0f0f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        {board.isPinned ? '📍 取消置顶' : '📌 置顶'}
                    </div>
                    <div
                        style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', color: '#ef4444' }}
                        onClick={() => onDelete(board.id)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? '#333' : '#f0f0f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        🗑️ 删除
                    </div>
                </div>
            )}
        </div>
    );
};

export default BoardItem;
