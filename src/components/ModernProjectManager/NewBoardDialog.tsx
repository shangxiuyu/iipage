import React from 'react';
import ReactDOM from 'react-dom';

interface NewBoardDialogProps {
    isOpen: boolean;
    boardName: string;
    onBoardNameChange: (name: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    isDarkMode: boolean;
}

const NewBoardDialog: React.FC<NewBoardDialogProps> = ({
    isOpen,
    boardName,
    onBoardNameChange,
    onConfirm,
    onCancel,
    isDarkMode
}) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
            }}
            onClick={(e) => {
                e.stopPropagation();
                onCancel();
            }}
        >
            <div
                style={{
                    backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
                    borderRadius: '12px',
                    padding: '24px',
                    minWidth: '320px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={{
                    margin: '0 0 16px 0',
                    color: isDarkMode ? '#fff' : '#333',
                    fontSize: '18px',
                }}>
                    新建白板
                </h3>

                <input
                    type="text"
                    value={boardName}
                    onChange={(e) => onBoardNameChange(e.target.value)}
                    placeholder="请输入白板名称"
                    autoFocus
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${isDarkMode ? '#444' : '#ddd'}`,
                        backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
                        color: isDarkMode ? '#fff' : '#333',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                        marginBottom: '16px',
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            onConfirm();
                        } else if (e.key === 'Escape') {
                            onCancel();
                        }
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: isDarkMode ? '#444' : '#e5e5e5',
                            color: isDarkMode ? '#fff' : '#333',
                            cursor: 'pointer',
                        }}
                    >
                        取消
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!boardName.trim()}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: boardName.trim() ? '#3b82f6' : '#888',
                            color: '#fff',
                            cursor: boardName.trim() ? 'pointer' : 'not-allowed',
                        }}
                    >
                        创建
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default NewBoardDialog;
