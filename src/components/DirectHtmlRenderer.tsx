import React, { useEffect, useRef, useState } from 'react';

interface DirectHtmlRendererProps {
  html: string;
  style?: React.CSSProperties;
}

/**
 * 直接HTML渲染组件，使用DOM API进行HTML内容渲染
 * 改进版：增加了更可靠的渲染机制和内容处理
 */
const DirectHtmlRenderer: React.FC<DirectHtmlRendererProps> = ({ html, style }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderCount, setRenderCount] = useState(0);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    try {
      console.log('开始渲染HTML，内容长度:', html.length);
      console.log('HTML内容预览:', html.substring(0, 100) + '...');
      
      // 检查HTML内容是否为空
      if (!html || html.trim() === '') {
        containerRef.current.innerHTML = '<div style="color: #999; font-style: italic; padding: 10px;">空HTML内容</div>';
        return;
      }
      
      // 清空容器
      containerRef.current.innerHTML = '';
      
      // 创建一个div来包含HTML内容
      const contentDiv = document.createElement('div');
      
      // 添加一些基本样式
      contentDiv.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      contentDiv.style.padding = '0';
      contentDiv.style.margin = '0';
      contentDiv.style.width = '100%';
      contentDiv.style.height = '100%';
      contentDiv.style.boxSizing = 'border-box';
      contentDiv.style.overflow = 'auto';
      
      // 处理HTML内容 - 自动添加基本HTML结构
      let processedHtml = html;
      
      // 如果内容不是以HTML标签开始，将其包装在div中
      if (!processedHtml.trim().startsWith('<')) {
        processedHtml = `<div>${processedHtml}</div>`;
      }
      
      // 设置HTML内容
      contentDiv.innerHTML = processedHtml;
      
      // 将内容添加到容器中
      containerRef.current.appendChild(contentDiv);
      
      console.log('直接HTML渲染成功');
      setRenderError(null);
      
      // 尝试解决可能的显示问题：强制重排布局
      setTimeout(() => {
        if (containerRef.current) {
          // 触发强制重排
          const height = containerRef.current.offsetHeight;
          containerRef.current.style.minHeight = `${height}px`;
          
          // 递增渲染计数，强制组件重新渲染
          setRenderCount(prev => prev + 1);
          console.log('强制重排布局完成');
        }
      }, 50);
    } catch (error) {
      console.error('直接HTML渲染失败:', error);
      setRenderError(error instanceof Error ? error.message : '未知错误');
      
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="color: red; padding: 10px; border: 1px solid red; border-radius: 4px; margin: 10px;">
            <h3>渲染HTML时出错</h3>
            <p>${error instanceof Error ? error.message : '未知错误'}</p>
            <pre style="background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; max-height: 200px;">${html.substring(0, 200)}${html.length > 200 ? '...' : ''}</pre>
          </div>
        `;
      }
    }
  }, [html, renderCount]);

  // 使用dangerouslySetInnerHTML作为备选渲染方式
  const safeHtml = useRef(html);
  
  // 确保备选渲染内容也是最新的
  useEffect(() => {
    safeHtml.current = html;
  }, [html]);

  return (
    <>
      <div 
        ref={containerRef}
        className="direct-html-renderer"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'auto',
          backgroundColor: 'white',
          borderRadius: '4px',
          position: 'relative',
          ...style
        }}
      />
      
      {/* 备选渲染方式，使用React的dangerouslySetInnerHTML */}
      {containerRef.current && containerRef.current.childNodes.length === 0 && !renderError && (
        <div
          className="fallback-renderer"
          style={{
            width: '100%',
            height: '100%',
            overflow: 'auto',
            backgroundColor: 'white',
            borderRadius: '4px',
            padding: '10px',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 5
          }}
          dangerouslySetInnerHTML={{ __html: safeHtml.current }}
        />
      )}
      
      {/* 渲染信息 - 仅在开发环境中显示 */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: 2, 
          right: 2, 
          fontSize: '8px', 
          color: '#aaa',
          pointerEvents: 'none',
          backgroundColor: 'rgba(255,255,255,0.5)',
          padding: '1px 3px',
          borderRadius: '2px',
          opacity: 0.5 // 降低不透明度，使其不太明显
        }}
      >
        {renderCount > 0 ? `渲染#${renderCount}` : '初始化'}
      </div>
    </>
  );
};

export default DirectHtmlRenderer; 