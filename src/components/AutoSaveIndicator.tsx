import React, { useContext, useEffect, useState } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import { ThemeContext } from '../App';

const AutoSaveIndicator: React.FC = () => {
  const { autoSaveStatus, lastSavedAt } = useBoardStore();
  const theme = useContext(ThemeContext);
  const isDark = theme.isDarkMode;
  const [isVisible, setIsVisible] = useState(true);

  // 在idle状态下3秒后自动隐藏
  useEffect(() => {
    if (autoSaveStatus === 'idle') {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [autoSaveStatus]);

  // 根据状态获取不同的显示内容
  const getStatusInfo = () => {
    switch (autoSaveStatus) {
      case 'saving':
        return {
          text: '保存中...',
          icon: '💾',
          color: isDark ? '#F59E0B' : '#D97706',
          bgColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(252, 211, 77, 0.15)',
          borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(252, 211, 77, 0.4)',
        };
      case 'saved':
        return {
          text: '已保存',
          icon: '✓',
          color: isDark ? '#10B981' : '#059669',
          bgColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.4)',
        };
      case 'error':
        return {
          text: '保存失败',
          icon: '⚠️',
          color: isDark ? '#EF4444' : '#DC2626',
          bgColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.4)',
        };
      default:
        return {
          text: '等待编辑',
          icon: '📝',
          color: isDark ? '#6B7280' : '#9CA3AF',
          bgColor: isDark ? 'rgba(107, 114, 128, 0.1)' : 'rgba(156, 163, 175, 0.1)',
          borderColor: isDark ? 'rgba(107, 114, 128, 0.2)' : 'rgba(156, 163, 175, 0.3)',
        };
    }
  };

  const statusInfo = getStatusInfo();

  // 格式化最后保存时间
  const formatLastSaved = () => {
    if (!lastSavedAt) return '';
    
    const now = new Date();
    const saved = new Date(lastSavedAt);
    const diffInSeconds = Math.floor((now.getTime() - saved.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return '刚刚保存';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}分钟前保存`;
    } else {
      return saved.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  if (!isVisible && autoSaveStatus === 'idle') {
    return null; // 在idle状态且3秒后隐藏
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: '80px', // 避开顶部工具栏
          right: '20px',
          zIndex: 1500, // 确保在其他元素之上
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: statusInfo.bgColor,
          border: `1px solid ${statusInfo.borderColor}`,
          borderRadius: '12px',
          backdropFilter: 'blur(12px)',
          fontSize: '12px',
          fontWeight: 500,
          color: statusInfo.color,
          transition: 'all 0.3s ease',
          cursor: 'default',
          userSelect: 'none',
          opacity: isVisible ? 1 : 0,
          transform: `translateX(${isVisible ? '0' : '20px'}) scale(${autoSaveStatus === 'saving' ? '1.02' : '1'})`,
          boxShadow: isDark 
            ? '0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        }}
        title={lastSavedAt ? `最后保存：${formatLastSaved()}` : '尚未保存'}
        onClick={() => setIsVisible(true)} // 点击重新显示
      >
        {/* 状态图标 */}
        <span
          style={{
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: autoSaveStatus === 'saving' ? 'autosave-pulse 1.5s ease-in-out infinite' : 'none',
          }}
        >
          {statusInfo.icon}
        </span>
        
        {/* 状态文本 */}
        <span>{statusInfo.text}</span>
        
        {/* 最后保存时间（仅在已保存状态下显示） */}
        {autoSaveStatus === 'saved' && lastSavedAt && (
          <span
            style={{
              fontSize: '10px',
              opacity: 0.7,
              marginLeft: '4px',
            }}
          >
            · {formatLastSaved()}
          </span>
        )}
      </div>

      {/* 全局动画样式 */}
      <style>{`
        @keyframes autosave-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.1);
          }
        }
        
        /* 优化毛玻璃效果 */
        @supports (backdrop-filter: blur(12px)) {
          .autosave-indicator {
            backdrop-filter: blur(12px);
          }
        }
      `}</style>
    </>
  );
};

export default AutoSaveIndicator; 