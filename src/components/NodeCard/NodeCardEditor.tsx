import React, { useRef, useEffect, useState } from 'react';
import type { Descendant } from 'slate';
import RichTextEditor from '../RichTextEditor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import type { NodeData } from '../../store/useBoardStore';

// 简单的错误边界组件
class ErrorBoundary extends React.Component<{children: React.ReactNode, fallback: React.ReactNode}> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error) {
    console.error("编辑器错误:", error);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface NodeCardEditorProps {
  node: NodeData;
  isBack?: boolean;
  localContent: Descendant[];
  localMarkdown: string;
  localBackMarkdown: string;
  backEditMode: 'rich' | 'markdown';
  displayContent: any;
  editorContainerRef: React.RefObject<HTMLDivElement>;
  onEditorChange: (value: Descendant[]) => void;
  onTagsChange: (tags: string[]) => void;
  onMarkdownDetected: (markdownText: string, confidence: number) => void;
  onMarkdownChange: (value: string) => void;
  onBackMarkdownChange: (value: string) => void;
  onSwitchEditMode: () => void;
  onSwitchBackEditMode: () => void;
  onMarkdownSave: () => void;
  onBackMarkdownSave: () => void;
  onInsertImage: (fn: ((url: string, width?: number, height?: number, aspectRatio?: number) => void) | null) => void;
  shouldRemovePadding: (content: Descendant[]) => boolean;
  readOnly?: boolean;
}

const NodeCardEditor: React.FC<NodeCardEditorProps> = ({
  node,
  isBack = false,
  localContent,
  localMarkdown,
  localBackMarkdown,
  backEditMode,
  displayContent,
  editorContainerRef,
  onEditorChange,
  onTagsChange,
  onMarkdownDetected,
  onMarkdownChange,
  onBackMarkdownChange,
  onSwitchEditMode,
  onSwitchBackEditMode,
  onMarkdownSave,
  onBackMarkdownSave,
  onInsertImage,
  shouldRemovePadding,
  readOnly = false,
}) => {
  // 正面编辑
  if (!isBack) {
    return (
      <>
        {/* 正面编辑模式切换按钮 - 暂时隐藏 */}
        {node.editing && false && (
          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 20 }}>
            <button
              onClick={onSwitchEditMode}
              style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, border: '1px solid #ddd', background: '#f3f4f6', cursor: 'pointer' }}
            >
              {node.editMode === 'markdown' ? '切换到富文本' : '切换到Markdown'}
            </button>
          </div>
        )}
        
        {node.editMode === 'markdown' ? (
          <div className="markdown-editor-wrapper" style={{ width: '100%', height: '100%', position: 'relative', background: 'transparent', borderRadius: 'inherit', boxShadow: 'none', padding: 0 }}>
            <div className="markdown-editor-linenumbers">
              {localMarkdown.split('\n').map((_, i) => i + 1).join('\n')}
            </div>
            <textarea
              value={localMarkdown}
              onChange={e => onMarkdownChange(e.target.value)}
              className="markdown-editor-textarea"
              style={{ 
                width: '100%', 
                height: '100%', 
                minHeight: 80, 
                background: 'transparent', 
                border: 'none', 
                borderRadius: 'inherit', 
                boxShadow: 'none', 
                padding: '0 0 0 44px', 
                resize: 'none',
                overflowY: 'auto',
                touchAction: 'auto',
              }}
              placeholder="请输入Markdown内容..."
            />
          </div>
        ) : (
          <div className="editor-container" ref={editorContainerRef}
            style={{
              minHeight: node.height ? `${node.height - 24}px` : '56px',
              height: 'auto',
              maxHeight: node.height ? `${node.height - 24}px` : 'none',
              overflowY: 'auto',
              boxSizing: 'border-box',
              touchAction: 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: node.textVerticalAlign === 'center' ? 'center' : 
                            node.textVerticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
              alignItems: node.textAlign === 'center' ? 'center' : 
                         node.textAlign === 'right' ? 'flex-end' : 'flex-start',
              textAlign: node.textAlign || 'left',
              wordWrap: 'break-word',
              whiteSpace: 'normal',
            }}
          >
            <RichTextEditor
              value={localContent}
              onChange={onEditorChange}
              onTagsChange={onTagsChange}
              onMarkdownDetected={onMarkdownDetected}
              autoFocus
              style={{ 
                padding: '8px 20px 8px 8px',
                minHeight: 'auto',
                width: '100%',
                lineHeight: 1.5,
                wordWrap: 'break-word',
                whiteSpace: 'normal',
              }}
              readOnly={readOnly}
              onInsertImage={onInsertImage}
            />
          </div>
        )}
      </>
    );
  }

  // 背面编辑
  return (
    <div
      className="editor-container"
      ref={editorContainerRef}
      style={{
        minHeight: '100%',
        height: '100%',
        maxHeight: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
        touchAction: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: node.textVerticalAlign === 'center' ? 'center' : node.textVerticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
        alignItems: node.textAlign === 'center' ? 'center' : node.textAlign === 'right' ? 'flex-end' : 'flex-start',
        textAlign: node.textAlign || 'left',
      }}
    >
      {/* 背面编辑模式切换按钮 */}
      {backEditMode !== 'rich' && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 20,
        }}>
          <button
            onClick={onSwitchBackEditMode}
            style={{
              padding: '4px 8px',
              background: backEditMode === 'markdown' ? '#3b82f6' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
            title={`当前: ${backEditMode === 'markdown' ? 'Markdown' : '富文本'}模式，点击切换`}
          >
            {backEditMode === 'markdown' ? 'MD' : 'RT'}
          </button>
        </div>
      )}

      {backEditMode === 'markdown' ? (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <textarea
            value={localBackMarkdown}
            onChange={e => onBackMarkdownChange(e.target.value)}
            className="markdown-editor-textarea"
            style={{ 
              width: '100%', 
              height: '100%', 
              minHeight: 80, 
              background: 'transparent', 
              border: 'none', 
              borderRadius: 'inherit', 
              boxShadow: 'none', 
              padding: '0 0 0 44px', 
              resize: 'none',
              overflowY: 'auto',
              touchAction: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}
            placeholder="请输入Markdown内容..."
          />
          <button
            onClick={onBackMarkdownSave}
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              width: 32,
              height: 32,
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
            title="保存Markdown内容"
          >
            ✓
          </button>
        </div>
      ) : (
        <ErrorBoundary fallback={<div style={{ padding: 10, color: '#e11d48' }}>编辑器加载失败，请尝试刷新页面</div>}>
          <RichTextEditor
            key={`back-editor-${node.id}`}
            value={localContent}
            onChange={onEditorChange}
            onTagsChange={onTagsChange}
            onMarkdownDetected={onMarkdownDetected}
            autoFocus
            style={{
              padding: (shouldRemovePadding(localContent) || (node.textAlign === 'center' && node.textVerticalAlign === 'center')) ? 0 : '8px 20px 8px 8px',
              margin: 0,
              minHeight: 'auto',
              height: 'auto',
              width: '100%',
              textAlign: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: node.textVerticalAlign === 'center' ? 'center' : node.textVerticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
              alignItems: node.textAlign === 'center' ? 'center' : node.textAlign === 'right' ? 'flex-end' : 'flex-start',
            }}
            readOnly={readOnly}
            onInsertImage={onInsertImage}
          />
        </ErrorBoundary>
      )}
    </div>
  );
};

export default NodeCardEditor; 