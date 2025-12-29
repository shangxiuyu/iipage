import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { FixedSizeGrid as Grid } from 'react-window';
import { AVAILABLE_ICONS, getIconPath } from './utils/iconUtils';

interface IconSelectorModalProps {
    isOpen: boolean;
    onSelect: (iconFileName: string) => void;
    onClose: () => void;
    isDarkMode: boolean;
}

const IconSelectorModal: React.FC<IconSelectorModalProps> = ({
    isOpen,
    onSelect,
    onClose,
    isDarkMode
}) => {
    const [iconSearch, setIconSearch] = useState('');

    const filteredIcons = useMemo(() => {
        if (!iconSearch.trim()) return AVAILABLE_ICONS;
        const query = iconSearch.toLowerCase();
        return AVAILABLE_ICONS.filter(icon => icon.toLowerCase().includes(query));
    }, [iconSearch]);

    if (!isOpen) return null;

    const COLUMN_COUNT = 8;
    const ICON_SIZE = 48;
    const ROW_COUNT = Math.ceil(filteredIcons.length / COLUMN_COUNT);

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
                onClose();
            }}
        >
            <div
                style={{
                    backgroundColor: isDarkMode ? '#1e1e1e' : '#fff',
                    borderRadius: '12px',
                    padding: '20px',
                    maxWidth: '450px',
                    width: '90%',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={{
                    margin: '0 0 16px 0',
                    color: isDarkMode ? '#fff' : '#333',
                }}>
                    选择图标
                </h3>

                {/* 搜索框 */}
                <input
                    type="text"
                    placeholder="搜索图标..."
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '8px 12px',
                        marginBottom: '12px',
                        borderRadius: '6px',
                        border: `1px solid ${isDarkMode ? '#444' : '#ddd'}`,
                        backgroundColor: isDarkMode ? '#2a2a2a' : '#fff',
                        color: isDarkMode ? '#fff' : '#333',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                    }}
                />

                {/* 图标网格 */}
                <div style={{ flex: 1, minHeight: '300px' }}>
                    <Grid
                        columnCount={COLUMN_COUNT}
                        columnWidth={ICON_SIZE}
                        height={300}
                        rowCount={ROW_COUNT}
                        rowHeight={ICON_SIZE}
                        width={COLUMN_COUNT * ICON_SIZE}
                    >
                        {({ columnIndex, rowIndex, style }) => {
                            const index = rowIndex * COLUMN_COUNT + columnIndex;
                            const icon = filteredIcons[index];
                            if (!icon) return null;

                            return (
                                <div
                                    style={{
                                        ...style,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        transition: 'background 0.2s',
                                    }}
                                    onClick={() => onSelect(icon)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = isDarkMode ? '#333' : '#f0f0f0';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <img
                                        src={getIconPath(icon)}
                                        alt={icon}
                                        style={{ width: 32, height: 32 }}
                                    />
                                </div>
                            );
                        }}
                    </Grid>
                </div>

                {/* 取消按钮 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button
                        onClick={onClose}
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
                </div>
            </div>
        </div>,
        document.body
    );
};

export default IconSelectorModal;
