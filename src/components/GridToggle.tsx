import React from 'react';
import { useBoardStore } from '../store/useBoardStore';

const GridToggle: React.FC = () => {
  const { showGrid, toggleGrid } = useBoardStore();

  return (
    <div style={{ position: 'fixed', top: 20, left: 20, zIndex: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={toggleGrid}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            border: '3px solid #ffffff',
            background: showGrid ? '#007acc' : '#ffffff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
          title={`${showGrid ? '隐藏' : '显示'}网格 (按G键)`}
        >
          {/* 网格图标 */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            style={{
              color: showGrid ? '#ffffff' : '#666666',
            }}
          >
            {showGrid ? (
              // 显示网格时的图标 - 实心网格
              <g>
                <rect x="3" y="3" width="5" height="5" fill="currentColor" />
                <rect x="10" y="3" width="5" height="5" fill="currentColor" />
                <rect x="17" y="3" width="4" height="5" fill="currentColor" />
                <rect x="3" y="10" width="5" height="5" fill="currentColor" />
                <rect x="10" y="10" width="5" height="5" fill="currentColor" />
                <rect x="17" y="10" width="4" height="5" fill="currentColor" />
                <rect x="3" y="17" width="5" height="4" fill="currentColor" />
                <rect x="10" y="17" width="5" height="4" fill="currentColor" />
                <rect x="17" y="17" width="4" height="4" fill="currentColor" />
              </g>
            ) : (
              // 隐藏网格时的图标 - 线框网格
              <g stroke="currentColor" strokeWidth="1.5" fill="none">
                {/* 垂直线 */}
                <line x1="8" y1="3" x2="8" y2="21" />
                <line x1="16" y1="3" x2="16" y2="21" />
                {/* 水平线 */}
                <line x1="3" y1="8" x2="21" y2="8" />
                <line x1="3" y1="16" x2="21" y2="16" />
                {/* 边框 */}
                <rect x="3" y="3" width="18" height="18" />
              </g>
            )}
          </svg>
        </button>
        
        {/* 状态文字 */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#ffffff',
            padding: '4px 8px',
            borderRadius: 12,
            fontSize: 11,
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            userSelect: 'none',
            opacity: 0.9,
            transition: 'all 0.2s ease',
          }}
        >
          {showGrid ? '网格' : '无网格'}
        </div>
      </div>
    </div>
  );
};

export default GridToggle; 