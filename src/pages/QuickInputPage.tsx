import React, { useState, useEffect } from 'react';
import { useBoardStore, defaultContent } from '../store/useBoardStore';
import RichTextEditor from '../components/RichTextEditor';
import type { Descendant } from 'slate';

const QuickInputPage: React.FC = () => {
  const [content, setContent] = useState<Descendant[]>(defaultContent);
  const addNode = useBoardStore(state => state.addNode);

  // ESC 键关闭窗口
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.close();
      }
      // Command/Ctrl + Enter 快速创建卡片
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        handleCreateCard();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [content]);

  const handleCreateCard = () => {
    // 在画布中心创建卡片（这个需要与主窗口通信）
    // 暂时先关闭窗口，后续需要添加 IPC 通信
    console.log('创建卡片:', content);
    window.close();
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
    >
      <div
        style={{
          width: '90%',
          maxWidth: 600,
          backgroundColor: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>✨</span>
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: '#111827',
              }}
            >
              快速创建卡片
            </h3>
          </div>
          <button
            onClick={() => window.close()}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              color: '#6b7280',
              cursor: 'pointer',
              padding: 4,
              lineHeight: 1,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6b7280';
            }}
            title="关闭 (ESC)"
          >
            ×
          </button>
        </div>

        {/* 编辑区域 */}
        <div
          style={{
            padding: '20px',
            minHeight: 200,
            maxHeight: 400,
            overflow: 'auto',
          }}
        >
          <RichTextEditor
            value={content}
            onChange={setContent}
            autoFocus={true}
            style={{
              minHeight: 200,
              fontSize: 16,
              lineHeight: 1.6,
            }}
          />
        </div>

        {/* 底部操作栏 */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f9fafb',
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: '#6b7280',
            }}
          >
            <kbd
              style={{
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: '#e5e7eb',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              ⌘/Ctrl
            </kbd>
            {' + '}
            <kbd
              style={{
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: '#e5e7eb',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              Enter
            </kbd>
            {' 创建  '}
            <kbd
              style={{
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: '#e5e7eb',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
            >
              ESC
            </kbd>
            {' 关闭'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => window.close()}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid #d1d5db',
                backgroundColor: 'transparent',
                color: '#6b7280',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              取消
            </button>
            <button
              onClick={handleCreateCard}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              创建卡片
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickInputPage;
