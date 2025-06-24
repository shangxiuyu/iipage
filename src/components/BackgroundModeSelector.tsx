import React, { useState } from 'react';
import type { InteractiveTheme } from './InteractiveThemeBackground';
import BackgroundImageSelector from './BackgroundImageSelector';

export type BackgroundMode = 'grid' | 'dots' | 'image' | 'video' | 'blank' | 'brickwall';

interface BackgroundModeSelectorProps {
  currentMode: BackgroundMode;
  onModeChange: (mode: BackgroundMode) => void;
  currentTheme?: InteractiveTheme;
  onThemeChange?: (theme: InteractiveTheme) => void;
  // 新增：内置背景图片相关
  currentBuiltinBackground?: string | null;
  onBuiltinBackgroundChange?: (backgroundPath: string | null) => void;
}

const BackgroundModeSelector: React.FC<BackgroundModeSelectorProps> = ({
  currentMode,
  onModeChange,
  currentTheme,
  onThemeChange,
  currentBuiltinBackground,
  onBuiltinBackgroundChange
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState(false);

  const modes = [
    {
      id: 'grid' as BackgroundMode,
      name: '网格背景',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 3v18"/>
          <path d="M15 3v18"/>
          <path d="M3 9h18"/>
          <path d="M3 15h18"/>
        </svg>
      ),
      color: '#6b7280'
    },
    {
      id: 'dots' as BackgroundMode,
      name: '点状背景',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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
      ),
      color: '#6b7280'
    },
    {
      id: 'blank' as BackgroundMode,
      name: '空白背景',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
        </svg>
      ),
      color: '#9ca3af'
    },
    {
      id: 'image' as BackgroundMode,
      name: '图片背景',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>
      ),
      color: '#8b5cf6'
    },
    {
      id: 'video' as BackgroundMode,
      name: '视频背景',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <polygon points="10,8 16,12 10,16"/>
        </svg>
      ),
      color: '#10b981'
    },
    {
      id: 'brickwall' as BackgroundMode,
      name: '砖墙背景',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <rect x="4" y="6" width="4" height="3" fill="#b5651d" stroke="#8d5524" strokeWidth="0.5"/>
          <rect x="8.5" y="6" width="4" height="3" fill="#b5651d" stroke="#8d5524" strokeWidth="0.5"/>
          <rect x="13" y="6" width="4" height="3" fill="#b5651d" stroke="#8d5524" strokeWidth="0.5"/>
          <rect x="6.25" y="9.5" width="4" height="3" fill="#b5651d" stroke="#8d5524" strokeWidth="0.5"/>
          <rect x="10.75" y="9.5" width="4" height="3" fill="#b5651d" stroke="#8d5524" strokeWidth="0.5"/>
          <rect x="4" y="13" width="4" height="3" fill="#b5651d" stroke="#8d5524" strokeWidth="0.5"/>
          <rect x="8.5" y="13" width="4" height="3" fill="#b5651d" stroke="#8d5524" strokeWidth="0.5"/>
          <rect x="13" y="13" width="4" height="3" fill="#b5651d" stroke="#8d5524" strokeWidth="0.5"/>
        </svg>
      ),
      color: '#b5651d'
    }
  ];

  const interactiveThemes = [
    {
      id: 'rainy' as InteractiveTheme,
      name: '雨天主题',
      icon: '🌧️',
      color: '#3b82f6',
      description: '沉浸式雨天体验'
    },
    {
      id: 'campfire' as InteractiveTheme,
      name: '篝火主题',
      icon: '🔥',
      color: '#f97316',
      description: '温暖的篝火氛围'
    }
  ];

  const getCurrentDisplayInfo = () => {
    if (currentTheme) {
      const theme = interactiveThemes.find(t => t.id === currentTheme);
      return {
        icon: theme?.icon || '🎨',
        color: theme?.color || '#6b7280',
        name: theme?.name || '主题模式'
      };
    }
    
    // 如果有内置背景图片，显示图片图标
    if (currentBuiltinBackground && currentMode === 'image') {
      return {
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
        ),
        color: '#8b5cf6',
        name: '内置背景'
      };
    }
    
    const mode = modes.find(mode => mode.id === currentMode) || modes[0];
    return {
      icon: mode.icon,
      color: mode.color,
      name: mode.name
    };
  };

  const currentDisplay = getCurrentDisplayInfo();

  const handleModeSelect = (mode: BackgroundMode) => {
    if (mode === 'image') {
      // 如果选择图片背景，打开内置背景选择器
      setShowImageSelector(true);
      setShowDropdown(false);
    } else {
      onModeChange(mode);
      onThemeChange?.(null);
      // 清除内置背景
      onBuiltinBackgroundChange?.(null);
      setShowDropdown(false);
    }
  };

  const handleThemeSelect = (theme: InteractiveTheme) => {
    onThemeChange?.(theme);
    onModeChange('blank');
    // 清除内置背景
    onBuiltinBackgroundChange?.(null);
    setShowDropdown(false);
  };

  const handleBuiltinBackgroundSelect = (backgroundPath: string | null) => {
    if (backgroundPath) {
      onModeChange('image');
      onThemeChange?.(null);
    }
    onBuiltinBackgroundChange?.(backgroundPath);
  };

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            border: '2px solid rgba(255, 255, 255, 0.8)',
            background: 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(10px)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)';
          }}
          title="背景模式"
        >
          <div style={{ color: currentDisplay.color, fontSize: typeof currentDisplay.icon === 'string' ? '20px' : '18px' }}>
            {currentDisplay.icon}
          </div>
        </button>

        {showDropdown && (
          <div
            style={{
              position: 'absolute',
              top: 60,
              right: 0,
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 12,
              padding: 8,
              boxShadow: '0 20px 64px rgba(0, 0, 0, 0.1), 0 8px 32px rgba(0, 0, 0, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              minWidth: 200,
              animation: 'slideIn 0.2s ease-out',
            }}
          >
            <div style={{ 
              padding: '8px 0 4px 0', 
              fontSize: '11px', 
              fontWeight: '600', 
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              基础背景
            </div>
            
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeSelect(mode.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: (currentMode === mode.id && !currentTheme) ? `${mode.color}15` : 'transparent',
                  color: (currentMode === mode.id && !currentTheme) ? mode.color : '#374151',
                  fontSize: 13,
                  fontWeight: (currentMode === mode.id && !currentTheme) ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => {
                  if (!(currentMode === mode.id && !currentTheme)) {
                    e.currentTarget.style.background = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(currentMode === mode.id && !currentTheme)) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ color: mode.color }}>
                  {mode.icon}
                </div>
                {mode.name}
              </button>
            ))}

            <div style={{ 
              height: '1px', 
              background: 'rgba(0, 0, 0, 0.08)', 
              margin: '8px 4px' 
            }} />

            <div style={{ 
              padding: '4px 0 4px 0', 
              fontSize: '11px', 
              fontWeight: '600', 
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              可交互主题
            </div>
            
            {interactiveThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeSelect(theme.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: currentTheme === theme.id ? `${theme.color}15` : 'transparent',
                  color: currentTheme === theme.id ? theme.color : '#374151',
                  fontSize: 13,
                  fontWeight: currentTheme === theme.id ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  marginBottom: 2,
                }}
                onMouseEnter={(e) => {
                  if (currentTheme !== theme.id) {
                    e.currentTarget.style.background = '#f9fafb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentTheme !== theme.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ fontSize: '16px' }}>
                  {theme.icon}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>
                    {theme.name}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#6b7280',
                    fontWeight: '400'
                  }}>
                    {theme.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

      {/* 背景图片选择器 */}
      <BackgroundImageSelector
        isOpen={showImageSelector}
        onClose={() => setShowImageSelector(false)}
        onSelect={handleBuiltinBackgroundSelect}
        onSelectTheme={onThemeChange}
        onModeChange={onModeChange}
        currentBackground={currentBuiltinBackground}
        currentTheme={currentTheme}
        currentMode={currentMode}
        isDark={false} // 可以根据需要传入主题状态
      />
    </div>
  );
};

export default BackgroundModeSelector; 