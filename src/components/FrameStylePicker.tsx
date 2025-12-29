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
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const { isDarkMode } = useContext(ThemeContext);
  const [title, setTitle] = useState(currentTitle || '');

  useEffect(() => {
    const panelWidth = 260;
    const panelHeight = 380;

    let newX = position.x + 20;
    let newY = position.y;

    if (newX + panelWidth > window.innerWidth) {
      newX = window.innerWidth - panelWidth - 20;
    }
    if (newY + panelHeight > window.innerHeight) {
      newY = window.innerHeight - panelHeight - 20;
    }
    if (newX < 10) newX = 10;
    if (newY < 10) newY = 10;

    setAdjustedPosition({ x: newX, y: newY });
  }, [position]);

  // Styles
  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    color: isDarkMode ? '#94A3B8' : '#64748B', // Muted slate/gray
    marginBottom: '8px',
    letterSpacing: '0.02em',
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: '20px',
  };

  const panelBg = isDarkMode ? '#1E293B' : '#FFFFFF';
  const panelBorder = isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0';
  const inputBg = isDarkMode ? '#0F172A' : '#F1F5F9';

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
          padding: '20px',
          background: panelBg,
          borderRadius: '12px',
          boxShadow: '0 10px 30px -5px rgba(0,0,0,0.2), 0 4px 6px -4px rgba(0,0,0,0.1)',
          border: panelBorder,
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          color: isDarkMode ? '#F8FAFC' : '#0F172A',
          fontFamily: "'Inter', sans-serif",
          animation: 'fadeIn 0.15s ease-out',
        }}
      >
        {/* Title Input */}
        <div style={sectionStyle}>
          <div style={labelStyle}>名称</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onTitleChange(title);
                onClose();
              }
            }}
            placeholder="输入背景框名称..."
            autoFocus
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid transparent',
              background: inputBg,
              color: isDarkMode ? '#F8FAFC' : '#1E293B',
              outline: 'none',
              fontSize: '14px',
              boxSizing: 'border-box',
              transition: 'all 0.2s',
            }}
            onFocus={(e) => {
              e.target.style.background = isDarkMode ? '#020617' : '#FFFFFF';
              e.target.style.borderColor = isDarkMode ? '#3B82F6' : '#2563EB';
              e.target.style.boxShadow = `0 0 0 3px ${isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)'}`;
            }}
            onBlur={(e) => {
              e.target.style.background = inputBg;
              e.target.style.borderColor = 'transparent';
              e.target.style.boxShadow = 'none';
              onTitleChange(title); // Ensure save on blur
            }}
          />
        </div>

        {/* Border Colors */}
        <div style={sectionStyle}>
          <div style={labelStyle}>边框</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', justifyItems: 'center' }}>
            {FRAME_BORDER_COLORS.map((c) => {
              const isSelected = currentBorderColor === c.color;
              return (
                <button
                  key={c.id}
                  onClick={() => onBorderColorChange(c.color)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: 'none',
                    background: c.color === 'none'
                      ? (isDarkMode ? '#334155' : '#CBD5E1')
                      : c.color,
                    cursor: 'pointer',
                    padding: 0,
                    position: 'relative',
                    boxShadow: isSelected
                      ? `0 0 0 2px ${panelBg}, 0 0 0 4px ${c.color === 'none' ? '#64748B' : c.color}`
                      : 'inset 0 0 0 1px rgba(0,0,0,0.05)',
                    transition: 'box-shadow 0.2s',
                  }}
                  title={c.name}
                >
                  {c.color === 'none' && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '60%',
                      height: '2px',
                      background: isDarkMode ? '#94A3B8' : '#fff',
                      transform: 'translate(-50%, -50%) rotate(45deg)',
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fill Colors */}
        <div style={sectionStyle}>
          <div style={labelStyle}>填充</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', justifyItems: 'center' }}>
            {FRAME_BACKGROUND_COLORS.map((c) => {
              const isSelected = currentBackgroundColor === c.color;
              return (
                <button
                  key={c.id}
                  onClick={() => onBackgroundColorChange(c.color)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    border: 'none',
                    background: c.color,
                    cursor: 'pointer',
                    padding: 0,
                    position: 'relative',
                    boxShadow: isSelected
                      ? `0 0 0 2px ${panelBg}, 0 0 0 4px ${c.color === 'transparent' ? '#64748B' : c.color}`
                      : 'inset 0 0 0 1px rgba(0,0,0,0.05)',
                    backgroundImage: c.color === 'transparent'
                      ? 'conic-gradient(#cbd5e1 90deg, transparent 90deg 180deg, #cbd5e1 180deg 270deg, transparent 270deg)'
                      : 'none',
                    backgroundSize: '6px 6px'
                  }}
                  title={c.name}
                />
              );
            })}
          </div>
        </div>

        {/* Opacity Slider */}
        <div style={sectionStyle}>
          <div style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>透明度</span>
            <span style={{ fontSize: '12px', fontWeight: 500, opacity: 0.8 }}>
              {typeof currentBackgroundColor === 'string' && currentBackgroundColor.startsWith('rgba')
                ? Math.round((parseFloat(currentBackgroundColor.split(',')[3]) || 0.5) * 100) + '%'
                : '50%'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', height: 28 }}>
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
                // Ensure we don't accidentally close the panel here (this logic is now safe)
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
              style={{
                width: '100%',
                height: '4px',
                background: isDarkMode ? '#334155' : '#E2E8F0',
                borderRadius: '2px',
                appearance: 'none',
                outline: 'none',
                cursor: 'grab',
              }}
              className="styled-slider"
            />
            <style>{`
              .styled-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: ${isDarkMode ? '#3B82F6' : '#2563EB'};
                cursor: grab;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                border: 2px solid ${panelBg};
                transition: transform 0.1s;
              }
              .styled-slider::-webkit-slider-thumb:hover {
                transform: scale(1.1);
              }
              .styled-slider::-webkit-slider-thumb:active {
                cursor: grabbing;
                transform: scale(1.2);
              }
            `}</style>
          </div>
        </div>

        {/* Copy as Image Button */}
        {onCopyAsImage && (
          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0' }}>
            <button
              onClick={() => {
                onCopyAsImage();
                onClose();
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: isDarkMode ? '#334155' : '#F1F5F9',
                border: 'none',
                borderRadius: '8px',
                color: isDarkMode ? '#F8FAFC' : '#0F172A',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode ? '#475569' : '#E2E8F0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isDarkMode ? '#334155' : '#F1F5F9';
              }}
            >
              <span style={{ fontSize: '16px' }}>📷</span> 复制为图片
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>,
    document.body
  );
};

export default FrameStylePicker;