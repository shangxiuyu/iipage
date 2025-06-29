import React, { useRef, useState, useEffect } from 'react';
import type { Descendant } from 'slate';
import RichTextEditor from '../RichTextEditor';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import WebPageRenderer from '../WebPageRenderer';
import type { NodeData } from '../../store/useBoardStore';

// 简单的错误边界组件
class ErrorBoundary extends React.Component<{children: React.ReactNode, fallback: React.ReactNode}> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error) {
    console.error("内容渲染错误:", error);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface NodeCardContentProps {
  node: NodeData;
  isBack?: boolean;
  displayContent: any;
  contentContainerRef: React.RefObject<HTMLDivElement>;
  codeInfo: { code: string, language: string } | null;
  detectedUrl: string | null;
  isWebPageMode: boolean;
  webpageInteractive: boolean;
  iframeInteractive: boolean;
  draggingWebPage: boolean;
  onEditorChange: (value: Descendant[]) => void;
  onTagsChange: (tags: string[]) => void;
  onMarkdownDetected: (markdownText: string, confidence: number) => void;
  onWebPageMaskMouseDown: (e: React.MouseEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onSetWebpageInteractive: (value: boolean) => void;
  onSetIframeInteractive: (value: boolean) => void;
  onInsertImage: (fn: ((url: string, width?: number, height?: number, aspectRatio?: number) => void) | null) => void;
  shouldRemovePadding: (content: Descendant[]) => boolean;
  generateHtmlFromCode: (codeInfo: { code: string, language: string }, nodeId: string) => string;
  readOnly?: boolean;
}

const NodeCardContent: React.FC<NodeCardContentProps> = ({
  node,
  isBack = false,
  displayContent,
  contentContainerRef,
  codeInfo,
  detectedUrl,
  isWebPageMode,
  webpageInteractive,
  iframeInteractive,
  draggingWebPage,
  onEditorChange,
  onTagsChange,
  onMarkdownDetected,
  onWebPageMaskMouseDown,
  onMouseDown,
  onSetWebpageInteractive,
  onSetIframeInteractive,
  onInsertImage,
  shouldRemovePadding,
  generateHtmlFromCode,
  readOnly = false,
}) => {
  // 正面内容渲染
  if (!isBack) {
    return (
      <>
        {typeof displayContent === 'string' && (node.editMode === 'markdown' && node.markdownContent) ? (
          <div className="card-content-container markdown-body" style={{ padding: 12, width: '100%', height: '100%', overflowY: 'auto' }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              rehypePlugins={[rehypeRaw]}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="card-content-container" ref={contentContainerRef} style={{
            touchAction: 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: node.textVerticalAlign === 'center' ? 'center' : 
                          node.textVerticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
            alignItems: node.textAlign === 'center' ? 'center' : 
                       node.textAlign === 'right' ? 'flex-end' : 'flex-start',
            textAlign: node.textAlign || 'left',
            height: '100%',
            width: '100%',
            padding: 0,
            margin: 0,
            boxSizing: 'border-box',
          }}>
            <ErrorBoundary fallback={<div style={{ padding: 4, color: '#666', fontSize: '14px' }}>内容加载失败</div>}>
              <RichTextEditor
                key={`front-view-${node.id}`}
                value={displayContent}
                onChange={onEditorChange}
                onTagsChange={onTagsChange}
                onMarkdownDetected={onMarkdownDetected}
                style={{
                  padding: (shouldRemovePadding(displayContent) || 
                           (node.textAlign === 'center' && node.textVerticalAlign === 'center')) ? 0 : '8px',
                  margin: 0,
                  minHeight: 'auto',
                  height: 'auto',
                  width: '100%',
                  textAlign: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: node.textVerticalAlign === 'center' ? 'center' : 
                                node.textVerticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
                }}
                readOnly={readOnly}
                onInsertImage={onInsertImage}
              />
            </ErrorBoundary>
          </div>
        )}
      </>
    );
  }

  // 背面内容渲染
  if (codeInfo) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <iframe
          style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, pointerEvents: iframeInteractive ? 'auto' : 'none', opacity: iframeInteractive ? 1 : 1 }}
          srcDoc={generateHtmlFromCode(codeInfo, node.id)}
          sandbox="allow-scripts allow-same-origin"
          title="代码预览"
        />
        {!iframeInteractive && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              cursor: 'pointer',
              background: 'transparent',
            }}
            onMouseDown={onMouseDown}
            onClick={e => {
              e.stopPropagation();
              onSetIframeInteractive(true);
            }}
            title="单击进入代码交互，单击可选中/拖动/调整大小"
          />
        )}
      </div>
    );
  }

  if (isWebPageMode && detectedUrl) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {!draggingWebPage && (
          <WebPageRenderer
            url={detectedUrl}
            width={node.width || 200}
            height={node.height || 120}
            nodeId={node.id}
            disabled={!!node.editing || !webpageInteractive}
          />
        )}
        {!webpageInteractive && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              cursor: 'pointer',
              background: 'transparent',
            }}
            onMouseDown={onWebPageMaskMouseDown}
            onClick={e => {
              e.stopPropagation();
              onSetWebpageInteractive(true);
            }}
            title="单击进入网页交互，单击可选中/拖动/调整大小"
          />
        )}
      </div>
    );
  }

  if (node.backEditMode === 'markdown' && node.backMarkdownContent) {
    return (
      <div className="card-content-container markdown-body" style={{ padding: 12, width: '100%', height: '100%', overflowY: 'auto' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} rehypePlugins={[rehypeRaw]}>
          {node.backMarkdownContent}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="card-content-container" ref={contentContainerRef} style={{
      touchAction: 'auto',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: node.textVerticalAlign === 'center' ? 'center' : 
                    node.textVerticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
      alignItems: node.textAlign === 'center' ? 'center' : 
                 node.textAlign === 'right' ? 'flex-end' : 'flex-start',
      textAlign: node.textAlign || 'left',
      height: '100%',
      width: '100%',
      padding: 0,
      margin: 0,
      boxSizing: 'border-box',
    }}>
      <ErrorBoundary fallback={<div style={{ padding: 4, color: '#666', fontSize: '14px' }}>内容加载失败</div>}>
        <RichTextEditor
          key={`back-view-${node.id}`}
          value={displayContent}
          onChange={onEditorChange}
          onTagsChange={onTagsChange}
          onMarkdownDetected={onMarkdownDetected}
          style={{
            padding: (shouldRemovePadding(displayContent) || 
                     (node.textAlign === 'center' && node.textVerticalAlign === 'center')) ? 0 : '8px',
            margin: 0,
            minHeight: 'auto',
            height: 'auto',
            width: '100%',
            textAlign: 'inherit',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: node.textVerticalAlign === 'center' ? 'center' : 
                          node.textVerticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
          }}
          readOnly={readOnly}
          onInsertImage={onInsertImage}
        />
      </ErrorBoundary>
    </div>
  );
};

export default NodeCardContent; 