import React from 'react';
import { useBoardStore } from '../store/useBoardStore';

const ZoomControls: React.FC = () => {
  const { scale, zoomIn, zoomOut, resetView, zoomToFit } = useBoardStore();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 1000,
      }}
    >
      {/* 缩放比例显示 */}
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#ffffff',
          padding: '4px 8px',
          borderRadius: 6,
          fontSize: 12,
          textAlign: 'center',
          minWidth: 60,
        }}
      >
        {Math.round(scale * 100)}%
      </div>

      {/* 控制按钮组 */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 8,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          border: '1px solid #e0e0e0',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* 放大按钮 */}
        <button
          onClick={zoomIn}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: 'none',
            background: '#f8f9fa',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 'bold',
            color: '#333',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e9ecef';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f8f9fa';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="放大"
        >
          +
        </button>

        {/* 缩小按钮 */}
        <button
          onClick={zoomOut}
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            border: 'none',
            background: '#f8f9fa',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 'bold',
            color: '#333',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e9ecef';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f8f9fa';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="缩小"
        >
          −
        </button>

        {/* 分割线 */}
        <div
          style={{
            height: 1,
            background: '#e0e0e0',
            margin: '4px 0',
          }}
        />

        {/* 重置视图按钮 */}
        <button
          onClick={resetView}
          style={{
            width: 36,
            height: 32,
            borderRadius: 6,
            border: 'none',
            background: '#f8f9fa',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            color: '#333',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e9ecef';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f8f9fa';
          }}
          title="重置视图 (100%)"
        >
          1:1
        </button>

        {/* 适应窗口按钮 */}
        <button
          onClick={zoomToFit}
          style={{
            width: 36,
            height: 32,
            borderRadius: 6,
            border: 'none',
            background: '#f8f9fa',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color: '#333',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e9ecef';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f8f9fa';
          }}
          title="适应窗口"
        >
          ⊞
        </button>
      </div>
    </div>
  );
};

export default ZoomControls; 