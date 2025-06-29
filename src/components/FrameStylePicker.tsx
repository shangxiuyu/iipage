import React, { useState, useEffect, useContext } from 'react';
import ReactDOM from 'react-dom';
import { ThemeContext } from '../App';

// 为背景框定义一组预设的边框颜色
const FRAME_BORDER_COLORS = [
  { id: 'none', color: 'none', name: '无边框' },
  { id: 'blue', color: '#3B82F6', name: '经典蓝' },
  { id: 'gray', color: '#6B7280', name: '石墨灰' },
  { id: 'green', color: '#10B981', name: '森林绿' },
  { id: 'red', color: '#EF4444', name: '珊瑚红' },
  { id: 'purple', color: '#8B5CF6', name: '薰衣草紫' },
  { id: 'orange', color: '#F59E0B', name: '活力橙' },
  { id: 'pink', color: '#EC4899', name: '樱花粉' },
];

// 新增：为背景框定义一组预设的背景颜色（半透明）
const FRAME_BACKGROUND_COLORS = [
  { id: 'transparent', color: 'transparent', name: '透明' },
  { id: 'blue-bg', color: 'rgba(59, 130, 246, 0.4)', name: '浅蓝' },
  { id: 'gray-bg', color: 'rgba(107, 114, 128, 0.4)', name: '浅灰' },
  { id: 'green-bg', color: 'rgba(16, 185, 129, 0.4)', name: '浅绿' },
  { id: 'red-bg', color: 'rgba(239, 68, 68, 0.4)', name: '浅红' },
  { id: 'purple-bg', color: 'rgba(139, 92, 246, 0.4)', name: '浅紫' },
  { id: 'orange-bg', color: 'rgba(245, 159, 11, 0.4)', name: '浅橙' },
  { id: 'pink-bg', color: 'rgba(236, 72, 153, 0.4)', name: '浅粉' },
];

interface FrameStylePickerProps {
  currentBorderColor?: string;
  onBorderColorChange: (color: string) => void;
  currentBackgroundColor?: string;
  onBackgroundColorChange: (color: string) => void;
  currentTitle?: string;
  onTitleChange: (title: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
  onCopyAsImage?: () => void;
}

const FrameStylePicker: React.FC<FrameStylePickerProps> = ({
  currentBorderColor,
  onBorderColorChange,
  currentBackgroundColor,
  onBackgroundColorChange,
  currentTitle,
  onTitleChange,
  onClose,
  position,
  onCopyAsImage,
}) => {
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const { isDarkMode } = useContext(ThemeContext);
  const [title, setTitle] = useState(currentTitle || '');

  useEffect(() => {
    const panelWidth = 200;
    const panelHeight = 340; // 增加高度以容纳标题
    
    let newX = position.x;
    let newY = position.y;
    
    if (newX + panelWidth > window.innerWidth) {
      newX = window.innerWidth - panelWidth - 10;
    }
    if (newY + panelHeight > window.innerHeight) {
      newY = window.innerHeight - panelHeight - 10;
    }
    if (newX < 10) newX = 10;
    if (newY < 10) newY = 10;
    
    setAdjustedPosition({ x: newX, y: newY });
  }, [position]);

  return ReactDOM.createPortal(
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: adjustedPosition.y,
          left: adjustedPosition.x,
          width: 260,
          padding: 12,
          background: isDarkMode ? '#2D3748' : '#FFFFFF',
          borderRadius: 10,
          boxShadow: '0 6px 18px rgba(0,0,0,0.13)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* 名称 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
          <div style={{ width: 54, fontSize: 13, fontWeight: 600, color: isDarkMode ? '#E2E8F0' : '#222', textAlign: 'right', marginRight: 8 }}>
            名称
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => onTitleChange(title)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onTitleChange(title);
                onClose();
              }
            }}
            placeholder="输入背景框名称..."
            style={{
              flex: 1,
              padding: '4px 8px',
              borderRadius: 5,
              border: `1px solid ${isDarkMode ? '#4A5568' : '#E2E8F0'}`,
              background: isDarkMode ? '#1A202C' : '#F7FAFC',
              color: isDarkMode ? '#E2E8F0' : '#2D3748',
              outline: 'none',
              boxSizing: 'border-box',
              fontSize: 13,
            }}
          />
        </div>
        {/* 边框颜色 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
          <div style={{ width: 54, fontSize: 13, fontWeight: 600, color: isDarkMode ? '#E2E8F0' : '#222', textAlign: 'right', marginRight: 8 }}>
            边框颜色
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', justifyItems: 'center', flex: 1 }}>
            {FRAME_BORDER_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => onBorderColorChange(c.color)}
                onMouseEnter={() => setHoveredColor(c.id)}
                onMouseLeave={() => setHoveredColor(null)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: currentBorderColor === c.color
                    ? `2px solid ${isDarkMode ? '#fff' : '#000'}`
                    : (hoveredColor === c.id
                      ? `1.5px solid ${isDarkMode ? '#A0AEC0' : '#A0AEC0'}`
                      : `1.5px solid ${isDarkMode ? '#4A5568' : '#E5E7EB'}`),
                  background: c.color === 'none' ? (isDarkMode ? '#4A5568' : '#E5E7EB') : c.color,
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  position: 'relative',
                }}
                title={c.name}
              >
                {c.color === 'none' && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '15%',
                    width: '70%',
                    height: '2px',
                    background: '#EF4444',
                    transform: 'rotate(45deg)',
                    transformOrigin: 'center',
                  }}/>
                )}
              </button>
            ))}
          </div>
        </div>
        {/* 背景颜色 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
          <div style={{ width: 54, fontSize: 13, fontWeight: 600, color: isDarkMode ? '#E2E8F0' : '#222', textAlign: 'right', marginRight: 8 }}>
            背景颜色
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', justifyItems: 'center', flex: 1 }}>
            {FRAME_BACKGROUND_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => onBackgroundColorChange(c.color)}
                onMouseEnter={() => setHoveredColor(c.id)}
                onMouseLeave={() => setHoveredColor(null)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: currentBackgroundColor === c.color
                    ? `2px solid ${isDarkMode ? '#fff' : '#000'}`
                    : (hoveredColor === c.id
                      ? `1.5px solid ${isDarkMode ? '#A0AEC0' : '#A0AEC0'}`
                      : `1.5px solid ${isDarkMode ? '#4A5568' : '#E5E7EB'}`),
                  background: c.color,
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  backgroundImage: c.color === 'transparent' ? 'linear-gradient(to top right, transparent 49.5%, #9ca3af 49.5%, #9ca3af 50.5%, transparent 50.5%)' : 'none',
                }}
                title={c.name}
              />
            ))}
          </div>
        </div>
        {/* 透明度 */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
          <div style={{ width: 54, fontSize: 13, fontWeight: 600, color: isDarkMode ? '#E2E8F0' : '#222', textAlign: 'right', marginRight: 8 }}>
            透明度
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={typeof currentBackgroundColor === 'string' && currentBackgroundColor.startsWith('rgba')
                ? parseFloat(currentBackgroundColor.split(',')[3]) || 0.5
                : 0.5}
              onChange={e => {
                let baseColor = currentBackgroundColor || 'rgba(59, 130, 246, 0.5)';
                let alpha = parseFloat(e.target.value);
                if (baseColor.startsWith('rgba')) {
                  const parts = baseColor.split(',');
                  if (parts.length === 4) {
                    baseColor = parts.slice(0, 3).join(',') + ',' + alpha + ')';
                  } else {
                    baseColor = baseColor.replace(/\d?\.?\d+\)$/g, alpha + ')');
                  }
                } else if (baseColor.startsWith('rgb')) {
                  baseColor = baseColor.replace('rgb', 'rgba').replace(')', `,${alpha})`);
                } else {
                  baseColor = `rgba(59,130,246,${alpha})`;
                }
                onBackgroundColorChange(baseColor);
              }}
              style={{ width: '100%' }}
            />
            <div style={{ width: 32, textAlign: 'right', fontSize: 12, color: '#aaa' }}>
              {typeof currentBackgroundColor === 'string' && currentBackgroundColor.startsWith('rgba')
                ? (parseFloat(currentBackgroundColor.split(',')[3]) || 0.5).toFixed(2)
                : '0.50'}
            </div>
          </div>
        </div>
        
        {/* 复制为图片按钮 */}
        {onCopyAsImage && (
          <div style={{ 
            marginTop: '12px', 
            paddingTop: '8px', 
            borderTop: `1px solid ${isDarkMode ? '#4A5568' : '#E2E8F0'}` 
          }}>
            <button
              onClick={() => {
                onCopyAsImage();
                onClose();
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: isDarkMode ? '#4A5568' : '#F7FAFC',
                border: `1px solid ${isDarkMode ? '#718096' : '#E2E8F0'}`,
                borderRadius: '6px',
                color: isDarkMode ? '#E2E8F0' : '#2D3748',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode ? '#718096' : '#EDF2F7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDarkMode ? '#4A5568' : '#F7FAFC';
              }}
            >
              📷 复制为图片
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  );
};

export default FrameStylePicker; 