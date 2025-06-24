import React, { useState, useEffect, useContext, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { LIGHT_CARD_COLORS, DARK_CARD_COLORS } from '../store/useBoardStore';
import { ThemeContext } from '../App';

interface CardColorPickerProps {
  currentColor?: string;
  onColorChange: (colorId: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
  frosted?: boolean;
  onFrostedChange?: (val: boolean) => void;
  transparent?: boolean;
  onTransparentChange?: (val: boolean) => void;
  showBorder?: boolean;
  onShowBorderChange?: (val: boolean) => void;
  borderColor?: string;
  onBorderColorChange?: (color: string) => void;
  textAlign?: 'left' | 'center' | 'right';
  onTextAlignChange?: (align: 'left' | 'center' | 'right') => void;
  textVerticalAlign?: 'top' | 'center' | 'bottom';
  onTextVerticalAlignChange?: (align: 'top' | 'center' | 'bottom') => void;
}

const CardColorPicker: React.FC<CardColorPickerProps> = ({
  currentColor = 'default',
  onColorChange,
  onClose,
  position,
  frosted = false,
  onFrostedChange,
  transparent = false,
  onTransparentChange,
  showBorder = false,
  onShowBorderChange,
  borderColor = '#D1D5DB',
  onBorderColorChange,
  textAlign = 'left',
  onTextAlignChange,
  textVerticalAlign = 'top',
  onTextVerticalAlignChange,
}) => {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const { isDarkMode } = useContext(ThemeContext);
  const colorList = isDarkMode ? DARK_CARD_COLORS : LIGHT_CARD_COLORS;
  
  // 边框颜色预设
  const borderColors = [
    { id: 'gray-light', color: '#D1D5DB', name: '浅灰' },
    { id: 'gray-dark', color: '#6B7280', name: '深灰' },
    { id: 'blue', color: '#3B82F6', name: '蓝色' },
    { id: 'green', color: '#10B981', name: '绿色' },
    { id: 'red', color: '#EF4444', name: '红色' },
    { id: 'purple', color: '#8B5CF6', name: '紫色' },
    { id: 'orange', color: '#F59E0B', name: '橙色' },
    { id: 'pink', color: '#EC4899', name: '粉色' },
  ];

  useEffect(() => {
    // 计算调整后的位置，防止超出屏幕
    const panelWidth = 240;
    const panelHeight = 350; // 增加高度以适应更多选项
    
    let newX = position.x;
    let newY = position.y;
    
    // 检查右边界
    if (newX + panelWidth > window.innerWidth) {
      newX = window.innerWidth - panelWidth - 10;
    }
    
    // 检查下边界
    if (newY + panelHeight > window.innerHeight) {
      newY = window.innerHeight - panelHeight - 10;
    }
    
    // 检查左边界
    if (newX < 10) {
      newX = 10;
    }
    
    // 检查上边界
    if (newY < 10) {
      newY = 10;
    }
    
    setAdjustedPosition(prev => {
      if (prev.x !== newX || prev.y !== newY) {
        return { x: newX, y: newY };
      }
      return prev;
    });
  }, [position.x, position.y]);

  // 背景样式选项（单选）
  const backgroundStyles = [
    { id: 'transparent', name: '透明背景', icon: '⚡', description: '只显示文字内容' },
    { id: 'frosted', name: '毛玻璃效果', icon: '❄️', description: '半透明模糊背景' },
    { id: 'normal', name: '普通背景', icon: '🎨', description: '使用纯色背景' },
  ];

  const currentBackgroundStyle = transparent ? 'transparent' : (frosted ? 'frosted' : 'normal');

  const handleBackgroundStyleChange = (styleId: string) => {
    switch (styleId) {
      case 'transparent':
        onTransparentChange?.(true);
        onFrostedChange?.(false);
        break;
      case 'frosted':
        onTransparentChange?.(false);
        onFrostedChange?.(true);
        onColorChange('default'); // 毛玻璃时使用默认颜色
        break;
      case 'normal':
        onTransparentChange?.(false);
        onFrostedChange?.(false);
        break;
    }
  };

  return ReactDOM.createPortal(
    <>
      {/* 背景遮罩 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
        }}
        onClick={onClose}
      />
      
      {/* 卡片设置面板 */}
      <div
        style={{
          position: 'fixed',
          left: adjustedPosition.x,
          top: adjustedPosition.y,
          background: isDarkMode ? '#2D3748' : '#ffffff',
          borderRadius: 12,
          padding: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          border: `1px solid ${isDarkMode ? '#4A5568' : '#e0e0e0'}`,
          zIndex: 9999,
          minWidth: 240,
          maxHeight: '50vh',
          overflow: 'auto',
          color: isDarkMode ? '#E2E8F0' : '#333',
        }}
        className="custom-scrollbar"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h4
          style={{
            margin: '0 0 16px 0',
            fontSize: 14,
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          🎨 卡片外观设置
        </h4>
        
        {/* 背景样式选择 */}
        <div style={{ marginBottom: 20 }}>
          <h5 style={{
            margin: '0 0 8px 0',
            fontSize: 12,
            fontWeight: 600,
            color: isDarkMode ? '#A0AEC0' : '#666',
          }}>
            背景样式
          </h5>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            {backgroundStyles.map((style) => (
              <label
                key={style.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: 8,
                  borderRadius: 8,
                  border: `1px solid ${currentBackgroundStyle === style.id 
                    ? '#3B82F6' 
                    : (isDarkMode ? '#4A5568' : '#E5E7EB')}`,
                  backgroundColor: currentBackgroundStyle === style.id 
                    ? (isDarkMode ? '#1E3A8A20' : '#EBF4FF') 
                    : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <input
                  type="radio"
                  name="backgroundStyle"
                  value={style.id}
                  checked={currentBackgroundStyle === style.id}
                  onChange={() => handleBackgroundStyleChange(style.id)}
                  style={{ marginRight: 8 }}
                />
                <span style={{ marginRight: 8, fontSize: 16 }}>{style.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{style.name}</div>
                  <div style={{ 
                    fontSize: 10, 
                    color: isDarkMode ? '#718096' : '#9CA3AF',
                    marginTop: 2,
                  }}>
                    {style.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* 背景颜色选择 - 只在普通背景时显示 */}
        {currentBackgroundStyle === 'normal' && (
          <div style={{ marginBottom: 20 }}>
            <h5 style={{
              margin: '0 0 8px 0',
              fontSize: 12,
              fontWeight: 600,
              color: isDarkMode ? '#A0AEC0' : '#666',
            }}>
              背景颜色
            </h5>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
              }}
            >
              {colorList.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onColorChange(c.id)}
                  onMouseEnter={() => setHoveredColor(c.id)}
                  onMouseLeave={() => setHoveredColor(null)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    border: currentColor === c.id
                      ? '3px solid #3B82F6'
                      : hoveredColor === c.id
                      ? '2px solid #ccc'
                      : '2px solid transparent',
                    background: c.color,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={c.name}
                >
                  {currentColor === c.id && (
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        background: '#3B82F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          background: '#ffffff',
                        }}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 边框设置 */}
        <div style={{ marginBottom: 20 }}>
          <h5 style={{
            margin: '0 0 8px 0',
            fontSize: 12,
            fontWeight: 600,
            color: isDarkMode ? '#A0AEC0' : '#666',
          }}>
            边框设置
          </h5>
          
          {/* 显示边框开关 */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: 8,
              borderRadius: 8,
              backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
              cursor: 'pointer',
              marginBottom: showBorder ? 12 : 0,
            }}
          >
            <input
              type="checkbox"
              checked={showBorder}
              onChange={(e) => onShowBorderChange?.(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            <span style={{ fontSize: 12, fontWeight: 500 }}>显示卡片边框</span>
          </label>

          {/* 边框颜色选择 - 只在启用边框时显示 */}
          {showBorder && (
            <>
              <div style={{
                fontSize: 11,
                color: isDarkMode ? '#718096' : '#9CA3AF',
                marginBottom: 8,
              }}>
                边框颜色
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 6,
                }}
              >
                {borderColors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => onBorderColorChange?.(color.color)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      border: borderColor === color.color
                        ? '2px solid #3B82F6'
                        : '1px solid #E5E7EB',
                      background: color.color,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={color.name}
                  >
                    {borderColor === color.color && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          background: '#ffffff',
                          border: '1px solid #3B82F6',
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* 文字对齐设置 */}
        <div style={{ marginBottom: 20 }}>
          <h5 style={{
            margin: '0 0 8px 0',
            fontSize: 12,
            fontWeight: 600,
            color: isDarkMode ? '#A0AEC0' : '#666',
          }}>
            文字对齐
          </h5>
          
          {/* 快速居中按钮 */}
          <button
            onClick={() => {
              const isCentered = textAlign === 'center' && textVerticalAlign === 'center';
              if (isCentered) {
                onTextAlignChange?.('left');
                onTextVerticalAlignChange?.('top');
              } else {
                onTextAlignChange?.('center');
                onTextVerticalAlignChange?.('center');
              }
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: (textAlign === 'center' && textVerticalAlign === 'center')
                ? `2px solid #3B82F6`
                : `1px solid ${isDarkMode ? '#4A5568' : '#E5E7EB'}`,
              background: (textAlign === 'center' && textVerticalAlign === 'center')
                ? (isDarkMode ? '#1E3A8A20' : '#EBF4FF')
                : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              color: isDarkMode ? '#E2E8F0' : '#374151',
            }}
            title="切换文字完全居中"
          >
            <span style={{ fontSize: 14 }}>🎯</span>
            <span>完全居中</span>
          </button>
        </div>
        
        {/* 颜色名称显示 */}
        {hoveredColor && currentBackgroundStyle === 'normal' && (
          <div
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: isDarkMode ? '#718096' : '#666',
              minHeight: 16,
              paddingTop: 8,
              borderTop: `1px solid ${isDarkMode ? '#4A5568' : '#E5E7EB'}`,
            }}
          >
            {colorList.find(c => c.id === hoveredColor)?.name}
          </div>
        )}
      </div>
    </>,
    document.body
  );
};

export default CardColorPicker; 