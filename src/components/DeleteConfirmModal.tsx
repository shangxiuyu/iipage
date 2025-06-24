import React from 'react';
import { createPortal } from 'react-dom';

interface Props {
  isOpen: boolean;
  nodeCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmModal: React.FC<Props> = ({
  isOpen,
  nodeCount,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* 背景遮罩 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onCancel}
      >
        {/* 弹窗内容 - 固定尺寸，不受缩放影响 */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '1rem',
            padding: '1.5rem',
            minWidth: 'min(20rem, 90vw)',
            maxWidth: 'min(25rem, 95vw)',
            boxShadow: '0 1.25rem 3.75rem rgba(0, 0, 0, 0.3)',
            border: '1px solid #e0e0e0',
            fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 图标 */}
          <div
            style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
            }}
          >
            <div
              style={{
                width: '1.5rem',
                height: '1.5rem',
                borderRadius: '50%',
                background: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 'bold',
              }}
            >
              !
            </div>
          </div>

          {/* 标题 */}
          <h3
            style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#333',
              textAlign: 'center',
            }}
          >
            确认删除
          </h3>

          {/* 描述 */}
          <p
            style={{
              margin: '0 0 1.5rem 0',
              fontSize: '0.875rem',
              color: '#666',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            {nodeCount === 1 
              ? '确定要删除这个卡片吗？'
              : `确定要删除这 ${nodeCount} 个卡片吗？`
            }
            <br />
            <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>
              此操作无法撤销
            </span>
          </p>

          {/* 按钮组 */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center',
            }}
          >
            {/* 取消按钮 */}
            <button
              onClick={onCancel}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.borderColor = '#9ca3af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
            >
              取消
            </button>

            {/* 确认删除按钮 */}
            <button
              onClick={onConfirm}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '5rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ef4444';
              }}
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // 使用Portal将弹窗渲染到document.body，完全脱离父组件影响
  return createPortal(modalContent, document.body);
};

export default DeleteConfirmModal; 