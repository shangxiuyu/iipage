import React from 'react';
import ReactDOM from 'react-dom';

interface DeleteConfirmDialogProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isDarkMode: boolean;
    title?: string;
    message?: string;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
    isOpen,
    onConfirm,
    onCancel,
    isDarkMode,
    title = '确认删除',
    message = '确定要删除这个白板吗？此操作无法撤销。'
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
                    minWidth: '300px',
                    maxWidth: '400px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={{
                    margin: '0 0 12px 0',
                    color: isDarkMode ? '#fff' : '#333',
                    fontSize: '18px',
                }}>
                    {title}
                </h3>

                <p style={{
                    margin: '0 0 20px 0',
                    color: isDarkMode ? '#aaa' : '#666',
                    fontSize: '14px',
                    lineHeight: 1.5,
                }}>
                    {message}
                </p>

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
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        删除
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DeleteConfirmDialog;
