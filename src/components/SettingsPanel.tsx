import React, { useState, useContext } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { ThemeContext } from '../App';
import ProjectManager from './ProjectManager';
import type { BackgroundMode } from './BackgroundModeSelector';
import type { InteractiveTheme } from './InteractiveThemeBackground';

// 设置选项类型
type SettingTab = 'board' | 'tags' | 'cards';

const SettingsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingTab>('board');
  const [showDataManager, setShowDataManager] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const theme = useContext(ThemeContext);
  const isDark = theme.isDarkMode;
  
  const { 
    defaultCardConfig, 
    updateDefaultCardConfig,
    getDefaultCardConfig,
    // 白板设置相关
    backgroundMode,
    setBackgroundMode,
    interactiveTheme,
    setInteractiveTheme,
    // 数据管理相关
    saveBoard,
    clearBoard,
    loadBoard,
  } = useBoardStore();

  // 颜色选项
  const lightBackgroundOptions = [
    { name: '默认白色', value: 'rgba(255,255,255,0.95)', preview: '#ffffff' },
    { name: '便签黄', value: 'rgba(255,251,230,0.95)', preview: '#fffbe6' },
    { name: '天空蓝', value: 'rgba(240,249,255,0.95)', preview: '#f0f9ff' },
    { name: '薄荷绿', value: 'rgba(240,253,244,0.95)', preview: '#f0fdf4' },
    { name: '粉红色', value: 'rgba(253,242,248,0.95)', preview: '#fdf2f8' },
    { name: '紫罗兰', value: 'rgba(250,245,255,0.95)', preview: '#faf5ff' },
    { name: '橙色', value: 'rgba(255,247,237,0.95)', preview: '#fff7ed' },
    { name: '灰蓝色', value: 'rgba(248,250,252,0.95)', preview: '#f8fafc' },
    // 毛玻璃效果颜色
    { name: '毛玻璃白', value: 'rgba(255,255,255,0.7)', preview: '#ffffff', frosted: true },
    { name: '毛玻璃蓝', value: 'rgba(240,249,255,0.7)', preview: '#f0f9ff', frosted: true },
    { name: '毛玻璃绿', value: 'rgba(240,253,244,0.7)', preview: '#f0fdf4', frosted: true },
    { name: '毛玻璃紫', value: 'rgba(250,245,255,0.7)', preview: '#faf5ff', frosted: true },
  ];

  const darkBackgroundOptions = [
    { name: '夜间白', value: 'rgba(40,40,40,0.96)', preview: '#282828' },
    { name: '夜空蓝', value: 'rgba(30,41,59,0.9)', preview: '#1e293b' },
    { name: '夜紫色', value: 'rgba(44,37,75,0.9)', preview: '#2c254b' },
    { name: '夜墨绿', value: 'rgba(22,44,36,0.9)', preview: '#162c24' },
    { name: '夜粉色', value: 'rgba(60,40,50,0.9)', preview: '#3c2832' },
    { name: '夜紫罗兰', value: 'rgba(60,50,80,0.9)', preview: '#3c3250' },
    { name: '夜橙色', value: 'rgba(80,50,30,0.9)', preview: '#50321e' },
    { name: '夜灰蓝', value: 'rgba(36,42,54,0.95)', preview: '#242a36' },
    // 毛玻璃效果颜色
    { name: '毛玻璃夜白', value: 'rgba(40,40,40,0.7)', preview: '#282828', frosted: true },
    { name: '毛玻璃夜蓝', value: 'rgba(30,41,59,0.7)', preview: '#1e293b', frosted: true },
    { name: '毛玻璃夜紫', value: 'rgba(44,37,75,0.7)', preview: '#2c254b', frosted: true },
    { name: '毛玻璃夜绿', value: 'rgba(22,44,36,0.7)', preview: '#162c24', frosted: true },
  ];

  // 字体选项
  const fontOptions = [
    { name: 'Arial (默认)', value: 'Arial' },
    { name: 'Helvetica', value: 'Helvetica' },
    { name: '微软雅黑', value: 'Microsoft YaHei' },
    { name: 'PingFang SC', value: 'PingFang SC' },
    { name: 'Georgia', value: 'Georgia' },
    { name: 'Times New Roman', value: 'Times New Roman' },
    { name: 'Courier New', value: 'Courier New' },
  ];

  return (
    <>
      {/* 设置图标按钮 */}
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 50,
          height: 50,
          borderRadius: '50%',
          backgroundColor: isDark ? 'rgba(75,85,99,0.9)' : 'rgba(255,255,255,0.9)',
          border: isDark ? '1px solid rgba(156,163,175,0.3)' : '1px solid rgba(0,0,0,0.1)',
          boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          transition: 'all 0.2s ease',
          backdropFilter: 'blur(10px)',
        }}
        onClick={() => setIsOpen(!isOpen)}
        title="设置"
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke={isDark ? '#e5e7eb' : '#374151'} 
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="3"/>
          <path d="m12 1 0 6m0 6 0 6m11-7-6 0m-6 0-6 0"/>
        </svg>
      </div>

      {/* 设置面板 */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            width: 350,
            maxHeight: '70vh',
            backgroundColor: isDark ? 'rgba(31,41,55,0.95)' : 'rgba(255,255,255,0.95)',
            border: isDark ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(0,0,0,0.1)',
            borderRadius: 12,
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(20px)',
            zIndex: 1000,
            overflow: 'hidden',
            color: isDark ? '#e5e7eb' : '#374151',
          }}
        >
          {/* 标题栏 */}
          <div style={{
            padding: '16px 20px',
            borderBottom: isDark ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>设置面板</h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: isDark ? '#9ca3af' : '#6b7280',
                fontSize: '18px',
              }}
            >
              ×
            </button>
          </div>

          {/* 标签栏 */}
          <div style={{
            display: 'flex',
            borderBottom: isDark ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(0,0,0,0.1)',
          }}>
            {[
              { key: 'board', label: '白板', icon: '📋' },
              { key: 'tags', label: '标签', icon: '🏷️' },
              { key: 'cards', label: '卡片', icon: '📄' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as SettingTab)}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: 'none',
                  background: activeTab === tab.key 
                    ? (isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)')
                    : 'none',
                  color: activeTab === tab.key 
                    ? (isDark ? '#60a5fa' : '#3b82f6')
                    : (isDark ? '#9ca3af' : '#6b7280'),
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div>{tab.icon}</div>
                <div style={{ marginTop: 4 }}>{tab.label}</div>
              </button>
            ))}
          </div>

          {/* 内容区域 */}
          <div style={{ 
            padding: '20px', 
            maxHeight: 'calc(70vh - 120px)', 
            overflowY: 'auto' 
          }}>
            {activeTab === 'cards' && (
              <div>
                {/* 默认形状 */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 8, 
                    fontSize: '14px', 
                    fontWeight: 500 
                  }}>
                    默认形状
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { value: 'rectangle', label: '方形', icon: '⬜' },
                      { value: 'circle', label: '圆形', icon: '⭕' },
                      { value: 'table', label: '表格', icon: '📊', disabled: true },
                    ].map((shape) => (
                      <button
                        key={shape.value}
                        onClick={() => !shape.disabled && updateDefaultCardConfig({ shape: shape.value as any })}
                        disabled={shape.disabled}
                        style={{
                          padding: '8px 12px',
                          border: defaultCardConfig.shape === shape.value 
                            ? `2px solid ${isDark ? '#60a5fa' : '#3b82f6'}`
                            : `1px solid ${isDark ? 'rgba(75,85,99,0.3)' : 'rgba(0,0,0,0.1)'}`,
                          borderRadius: 6,
                          background: defaultCardConfig.shape === shape.value
                            ? (isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)')
                            : 'none',
                          color: shape.disabled 
                            ? (isDark ? '#4b5563' : '#9ca3af')
                            : (isDark ? '#e5e7eb' : '#374151'),
                          cursor: shape.disabled ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          opacity: shape.disabled ? 0.5 : 1,
                        }}
                      >
                        <div>{shape.icon}</div>
                        <div style={{ marginTop: 2 }}>{shape.label}</div>
                      </button>
                    ))}
                  </div>
                  {defaultCardConfig.shape !== 'rectangle' && (
                    <div style={{ 
                      marginTop: 8, 
                      fontSize: '12px', 
                      color: isDark ? '#9ca3af' : '#6b7280' 
                    }}>
                      圆形和表格形状即将推出...
                    </div>
                  )}
                </div>

                {/* 默认尺寸 */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 8, 
                    fontSize: '14px', 
                    fontWeight: 500 
                  }}>
                    默认尺寸
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: 4, 
                        fontSize: '12px', 
                        color: isDark ? '#9ca3af' : '#6b7280' 
                      }}>
                        宽度 (px)
                      </label>
                      <input
                        type="number"
                        min="120"
                        max="800"
                        value={defaultCardConfig.width}
                        onChange={(e) => updateDefaultCardConfig({ width: parseInt(e.target.value) || 250 })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: isDark ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(0,0,0,0.1)',
                          borderRadius: 6,
                          background: isDark ? 'rgba(17,24,39,0.5)' : 'rgba(255,255,255,0.8)',
                          color: isDark ? '#e5e7eb' : '#374151',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: 4, 
                        fontSize: '12px', 
                        color: isDark ? '#9ca3af' : '#6b7280' 
                      }}>
                        高度 (px)
                      </label>
                      <input
                        type="number"
                        min="80"
                        max="600"
                        value={defaultCardConfig.height}
                        onChange={(e) => updateDefaultCardConfig({ height: parseInt(e.target.value) || 150 })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: isDark ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(0,0,0,0.1)',
                          borderRadius: 6,
                          background: isDark ? 'rgba(17,24,39,0.5)' : 'rgba(255,255,255,0.8)',
                          color: isDark ? '#e5e7eb' : '#374151',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* 默认背景色 */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 8, 
                    fontSize: '14px', 
                    fontWeight: 500 
                  }}>
                    默认背景色
                  </label>
                  
                  {/* 浅色模式背景 */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ 
                      marginBottom: 8, 
                      fontSize: '12px', 
                      color: isDark ? '#9ca3af' : '#6b7280' 
                    }}>
                      浅色模式
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {lightBackgroundOptions.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => updateDefaultCardConfig({ lightBackgroundColor: option.value })}
                          style={{
                            width: '100%',
                            height: 32,
                            border: defaultCardConfig.lightBackgroundColor === option.value 
                              ? `2px solid ${isDark ? '#60a5fa' : '#3b82f6'}`
                              : '1px solid rgba(0,0,0,0.1)',
                            borderRadius: 6,
                            background: option.frosted 
                              ? `linear-gradient(45deg, ${option.preview} 25%, transparent 25%, transparent 75%, ${option.preview} 75%), linear-gradient(45deg, ${option.preview} 25%, transparent 25%, transparent 75%, ${option.preview} 75%), ${option.preview}`
                              : option.preview,
                            backgroundSize: option.frosted ? '8px 8px' : 'auto',
                            backgroundPosition: option.frosted ? '0 0, 4px 4px' : 'auto',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                          title={option.name}
                        >
                          {option.frosted && (
                            <div style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)',
                              fontSize: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isDark ? '#000' : '#fff',
                            }}>
                              ✨
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 深色模式背景 */}
                  <div>
                    <div style={{ 
                      marginBottom: 8, 
                      fontSize: '12px', 
                      color: isDark ? '#9ca3af' : '#6b7280' 
                    }}>
                      深色模式
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {darkBackgroundOptions.map((option, index) => (
                        <button
                          key={index}
                          onClick={() => updateDefaultCardConfig({ darkBackgroundColor: option.value })}
                          style={{
                            width: '100%',
                            height: 32,
                            border: defaultCardConfig.darkBackgroundColor === option.value 
                              ? `2px solid ${isDark ? '#60a5fa' : '#3b82f6'}`
                              : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 6,
                            background: option.frosted 
                              ? `linear-gradient(45deg, ${option.preview} 25%, transparent 25%, transparent 75%, ${option.preview} 75%), linear-gradient(45deg, ${option.preview} 25%, transparent 25%, transparent 75%, ${option.preview} 75%), ${option.preview}`
                              : option.preview,
                            backgroundSize: option.frosted ? '8px 8px' : 'auto',
                            backgroundPosition: option.frosted ? '0 0, 4px 4px' : 'auto',
                            cursor: 'pointer',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                          title={option.name}
                        >
                          {option.frosted && (
                            <div style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.8)',
                              fontSize: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#000',
                            }}>
                              ✨
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 毛玻璃效果 */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 8, 
                    fontSize: '14px', 
                    fontWeight: 500 
                  }}>
                    毛玻璃效果
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      onClick={() => updateDefaultCardConfig({ frosted: !defaultCardConfig.frosted })}
                      style={{
                        padding: '8px 16px',
                        border: `1px solid ${isDark ? 'rgba(75,85,99,0.3)' : 'rgba(0,0,0,0.1)'}`,
                        borderRadius: 6,
                        background: defaultCardConfig.frosted
                          ? (isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)')
                          : 'none',
                        color: defaultCardConfig.frosted
                          ? (isDark ? '#60a5fa' : '#3b82f6')
                          : (isDark ? '#e5e7eb' : '#374151'),
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      {defaultCardConfig.frosted ? '✨' : '⚪'} 
                      {defaultCardConfig.frosted ? '已启用' : '已禁用'}
                    </button>
                    <div style={{ 
                      fontSize: '12px', 
                      color: isDark ? '#9ca3af' : '#6b7280',
                      flex: 1,
                    }}>
                      毛玻璃效果会使卡片背景呈现半透明毛玻璃质感
                    </div>
                  </div>
                </div>

                {/* 默认字体 */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 8, 
                    fontSize: '14px', 
                    fontWeight: 500 
                  }}>
                    默认字体
                  </label>
                  <select
                    value={defaultCardConfig.fontFamily}
                    onChange={(e) => updateDefaultCardConfig({ fontFamily: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: isDark ? '1px solid rgba(75,85,99,0.3)' : '1px solid rgba(0,0,0,0.1)',
                      borderRadius: 6,
                      background: isDark ? 'rgba(17,24,39,0.5)' : 'rgba(255,255,255,0.8)',
                      color: isDark ? '#e5e7eb' : '#374151',
                      fontSize: '14px',
                    }}
                  >
                    {fontOptions.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.name}
                      </option>
                    ))}
                  </select>
                  <div style={{ 
                    marginTop: 8, 
                    fontSize: '12px', 
                    color: isDark ? '#9ca3af' : '#6b7280' 
                  }}>
                    更多字体支持即将推出...
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'board' && (
              <div>
                {/* 白板主题 */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 8, 
                    fontSize: '14px', 
                    fontWeight: 500 
                  }}>
                    白板主题
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => theme.toggleDarkMode()}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: `1px solid ${isDark ? 'rgba(75,85,99,0.3)' : 'rgba(0,0,0,0.1)'}`,
                        borderRadius: 8,
                        background: isDark ? 'rgba(17,24,39,0.5)' : 'rgba(255,255,255,0.8)',
                        color: isDark ? '#e5e7eb' : '#374151',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isDark ? '🌙' : '☀️'}
                      {isDark ? '深色模式' : '浅色模式'}
                    </button>
                  </div>
                  <div style={{ 
                    marginTop: 8, 
                    fontSize: '12px', 
                    color: isDark ? '#9ca3af' : '#6b7280' 
                  }}>
                    点击切换浅色/深色主题
                  </div>
                </div>

                {/* 背景模式选择 */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 8, 
                    fontSize: '14px', 
                    fontWeight: 500 
                  }}>
                    背景模式
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    <button
                      onClick={() => {
                        setBackgroundMode('grid');
                        setInteractiveTheme(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px',
                        border: (backgroundMode === 'grid' && !interactiveTheme) ? `2px solid ${isDark ? '#60a5fa' : '#3b82f6'}` : `1px solid ${isDark ? 'rgba(75,85,99,0.3)' : 'rgba(0,0,0,0.1)'}`,
                        borderRadius: '8px',
                        background: (backgroundMode === 'grid' && !interactiveTheme) ? (isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)') : (isDark ? 'rgba(17,24,39,0.3)' : 'rgba(255,255,255,0.8)'),
                        color: isDark ? '#e5e7eb' : '#374151',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span>⬜</span>
                      网格背景
                    </button>
                    <button
                      onClick={() => {
                        setBackgroundMode('blank');
                        setInteractiveTheme(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px',
                        border: (backgroundMode === 'blank' && !interactiveTheme) ? `2px solid ${isDark ? '#60a5fa' : '#3b82f6'}` : `1px solid ${isDark ? 'rgba(75,85,99,0.3)' : 'rgba(0,0,0,0.1)'}`,
                        borderRadius: '8px',
                        background: (backgroundMode === 'blank' && !interactiveTheme) ? (isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)') : (isDark ? 'rgba(17,24,39,0.3)' : 'rgba(255,255,255,0.8)'),
                        color: isDark ? '#e5e7eb' : '#374151',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span>⚪</span>
                      空白背景
                    </button>
                    <button
                      onClick={() => {
                        setInteractiveTheme('rainy');
                        setBackgroundMode('blank');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px',
                        border: (interactiveTheme === 'rainy') ? `2px solid ${isDark ? '#60a5fa' : '#3b82f6'}` : `1px solid ${isDark ? 'rgba(75,85,99,0.3)' : 'rgba(0,0,0,0.1)'}`,
                        borderRadius: '8px',
                        background: (interactiveTheme === 'rainy') ? (isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)') : (isDark ? 'rgba(17,24,39,0.3)' : 'rgba(255,255,255,0.8)'),
                        color: isDark ? '#e5e7eb' : '#374151',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span>🌧️</span>
                      雨天
                    </button>
                    <button
                      onClick={() => {
                        setInteractiveTheme('campfire');
                        setBackgroundMode('blank');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px',
                        border: (interactiveTheme === 'campfire') ? `2px solid ${isDark ? '#60a5fa' : '#3b82f6'}` : `1px solid ${isDark ? 'rgba(75,85,99,0.3)' : 'rgba(0,0,0,0.1)'}`,
                        borderRadius: '8px',
                        background: (interactiveTheme === 'campfire') ? (isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)') : (isDark ? 'rgba(17,24,39,0.3)' : 'rgba(255,255,255,0.8)'),
                        color: isDark ? '#e5e7eb' : '#374151',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span>🔥</span>
                      篝火
                    </button>
                    <button
                      onClick={() => {
                        setBackgroundMode('brickwall');
                        setInteractiveTheme(null);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px',
                        border: (backgroundMode === 'brickwall' && !interactiveTheme) ? `2px solid ${isDark ? '#b5651d' : '#b5651d'}` : `1px solid ${isDark ? 'rgba(75,85,99,0.3)' : 'rgba(0,0,0,0.1)'}`,
                        borderRadius: '8px',
                        background: (backgroundMode === 'brickwall' && !interactiveTheme) ? (isDark ? 'rgba(181,101,29,0.15)' : 'rgba(181,101,29,0.08)') : (isDark ? 'rgba(17,24,39,0.3)' : 'rgba(255,255,255,0.8)'),
                        color: isDark ? '#e5e7eb' : '#b5651d',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span style={{fontSize: '18px'}}>🧱</span>
                      砖墙背景
                    </button>
                  </div>
                </div>

                {/* 项目管理 */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 8, 
                    fontSize: '14px', 
                    fontWeight: 500 
                  }}>
                    项目管理
                  </label>
                  <button
                    onClick={() => setShowProjectManager(true)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      borderRadius: 8,
                      background: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
                      color: isDark ? '#60a5fa' : '#3b82f6',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    📁 管理项目
                  </button>
                  <div style={{ 
                    marginTop: 8, 
                    fontSize: '12px', 
                    color: isDark ? '#9ca3af' : '#6b7280' 
                  }}>
                    创建、保存、加载和管理多个白板项目
                  </div>
                </div>

                {/* 数据备份 */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: 8, 
                    fontSize: '14px', 
                    fontWeight: 500 
                  }}>
                    数据备份
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        saveBoard();
                        // 显示保存成功提示
                        const toast = document.createElement('div');
                        toast.textContent = '✅ 白板数据已备份并下载';
                        toast.style.cssText = `
                          position: fixed;
                          top: 20px;
                          left: 50%;
                          transform: translateX(-50%);
                          background: rgba(34,197,94,0.9);
                          color: white;
                          padding: 12px 20px;
                          border-radius: 8px;
                          font-size: 14px;
                          z-index: 9999;
                          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                          backdrop-filter: blur(10px);
                        `;
                        document.body.appendChild(toast);
                        setTimeout(() => document.body.removeChild(toast), 3000);
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: `1px solid ${isDark ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.2)'}`,
                        borderRadius: 6,
                        background: isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.05)',
                        color: isDark ? '#4ade80' : '#16a34a',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      💾 导出备份
                    </button>
                    
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              try {
                                const boardData = JSON.parse(e.target?.result as string);
                                // 调用loadBoard方法加载数据
                                loadBoard(boardData);
                                // 显示加载成功提示
                                const toast = document.createElement('div');
                                toast.textContent = '✅ 备份数据已恢复';
                                toast.style.cssText = `
                                  position: fixed;
                                  top: 20px;
                                  left: 50%;
                                  transform: translateX(-50%);
                                  background: rgba(59,130,246,0.9);
                                  color: white;
                                  padding: 12px 20px;
                                  border-radius: 8px;
                                  font-size: 14px;
                                  z-index: 9999;
                                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                  backdrop-filter: blur(10px);
                                `;
                                document.body.appendChild(toast);
                                setTimeout(() => document.body.removeChild(toast), 3000);
                              } catch (error) {
                                console.error('Error loading board data:', error);
                                // 显示错误提示
                                const toast = document.createElement('div');
                                toast.textContent = '❌ 备份文件格式错误';
                                toast.style.cssText = `
                                  position: fixed;
                                  top: 20px;
                                  left: 50%;
                                  transform: translateX(-50%);
                                  background: rgba(239,68,68,0.9);
                                  color: white;
                                  padding: 12px 20px;
                                  border-radius: 8px;
                                  font-size: 14px;
                                  z-index: 9999;
                                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                  backdrop-filter: blur(10px);
                                `;
                                document.body.appendChild(toast);
                                setTimeout(() => document.body.removeChild(toast), 3000);
                              }
                            };
                            reader.readAsText(file);
                          }
                        };
                        input.click();
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        border: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.2)'}`,
                        borderRadius: 6,
                        background: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
                        color: isDark ? '#60a5fa' : '#2563eb',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      📂 导入备份
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (confirm('确定要清空当前白板吗？此操作不可撤销。\n\n建议先保存当前项目或导出备份。')) {
                        clearBoard();
                        // 显示清空成功提示
                        const toast = document.createElement('div');
                        toast.textContent = '🗑️ 当前白板已清空';
                        toast.style.cssText = `
                          position: fixed;
                          top: 20px;
                          left: 50%;
                          transform: translateX(-50%);
                          background: rgba(107,114,128,0.9);
                          color: white;
                          padding: 12px 20px;
                          border-radius: 8px;
                          font-size: 14px;
                          z-index: 9999;
                          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                          backdrop-filter: blur(10px);
                        `;
                        document.body.appendChild(toast);
                        setTimeout(() => document.body.removeChild(toast), 3000);
                      }
                    }}
                    style={{
                      marginTop: 8,
                      width: '100%',
                      padding: '8px 12px',
                      border: `1px solid ${isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)'}`,
                      borderRadius: 6,
                      background: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)',
                      color: isDark ? '#fca5a5' : '#dc2626',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    🗑️ 清空当前白板
                  </button>
                  
                  <div style={{ 
                    marginTop: 8, 
                    fontSize: '12px', 
                    color: isDark ? '#9ca3af' : '#6b7280' 
                  }}>
                    白板数据会自动保存，导出备份可用于跨设备同步
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tags' && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '24px', marginBottom: 16 }}>🏷️</div>
                <div style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  标签设置功能即将推出...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 项目管理面板 */}
      <ProjectManager 
        isOpen={showProjectManager} 
        onClose={() => setShowProjectManager(false)} 
      />
    </>
  );
};

export default SettingsPanel; 