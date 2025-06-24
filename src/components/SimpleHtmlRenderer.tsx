import React, { useEffect, useRef, useState } from 'react';

interface SimpleHtmlRendererProps {
  html: string;
  style?: React.CSSProperties;
}

/**
 * 简化版HTML渲染组件 - 使用iframe直接渲染HTML内容
 * 这样可以避免HTML内容与主应用的CSS冲突
 */
const SimpleHtmlRenderer: React.FC<SimpleHtmlRendererProps> = ({ html, style }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  
  // 每当HTML内容变化时重新渲染
  useEffect(() => {
    if (!iframeRef.current) return;
    
    // 设置加载状态
    setLoading(true);
    console.log('SimpleHtmlRenderer: 准备渲染HTML内容，长度:', html.length);
    
    try {
      // 处理空内容情况
      if (!html || html.trim() === '') {
        iframeRef.current.srcdoc = `
          <html>
          <body style="font-family: system-ui, -apple-system, sans-serif; color: #999; padding: 10px;">
            <div style="font-style: italic;">空HTML内容</div>
          </body>
          </html>
        `;
        return;
      }
      
      // 准备HTML内容 - 添加必要的包装
      let processedHtml = html;
      
      // 如果内容不是完整的HTML文档，添加基本包装
      if (!processedHtml.includes('<html') && !processedHtml.includes('</html>')) {
        // 检查是否需要body标签
        if (!processedHtml.includes('<body') && !processedHtml.includes('</body>')) {
          processedHtml = `
            <body style="margin: 0; padding: 10px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.4;">
              ${processedHtml}
            </body>
          `;
        }
        
        // 添加完整的HTML包装
        processedHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                margin: 0;
                padding: 10px;
                font-family: system-ui, -apple-system, sans-serif;
                line-height: 1.4;
                color: #333;
              }
              img {
                max-width: 100%;
                height: auto;
              }
            </style>
            <script>
              // 告诉父窗口渲染完成
              window.addEventListener('load', function() {
                window.parent.postMessage('html-rendered', '*');
              });
            </script>
          </head>
          ${processedHtml}
          </html>
        `;
      }
      
      // 设置iframe内容
      iframeRef.current.srcdoc = processedHtml;
      console.log('SimpleHtmlRenderer: HTML内容已设置到iframe');
      
      // 监听iframe加载完成
      const handleIframeLoad = () => {
        console.log('SimpleHtmlRenderer: iframe加载完成');
        setLoading(false);
      };
      
      // 监听来自iframe的消息
      const handleMessage = (event: MessageEvent) => {
        if (event.data === 'html-rendered') {
          console.log('SimpleHtmlRenderer: 收到渲染完成消息');
          setLoading(false);
        }
      };
      
      iframeRef.current.addEventListener('load', handleIframeLoad);
      window.addEventListener('message', handleMessage);
      
      // 确保即使加载过程有问题，也不会一直显示加载状态
      const loadingTimeout = setTimeout(() => {
        setLoading(false);
      }, 2000);
      
      return () => {
        if (iframeRef.current) {
          iframeRef.current.removeEventListener('load', handleIframeLoad);
        }
        window.removeEventListener('message', handleMessage);
        clearTimeout(loadingTimeout);
      };
      
    } catch (error) {
      console.error('SimpleHtmlRenderer: 渲染失败', error);
      setLoading(false);
      
      // 显示错误信息
      if (iframeRef.current) {
        iframeRef.current.srcdoc = `
          <html>
          <body style="font-family: system-ui, -apple-system, sans-serif; color: #d32f2f; padding: 10px;">
            <h3>HTML渲染失败</h3>
            <p>${error instanceof Error ? error.message : '未知错误'}</p>
            <pre style="background: #f5f5f5; padding: 10px; overflow: auto; border-radius: 3px; font-size: 12px; max-height: 200px;">${html.substring(0, 200)}${html.length > 200 ? '...' : ''}</pre>
          </body>
          </html>
        `;
      }
    }
  }, [html]);
  
  return (
    <div className="simple-html-renderer-container" style={{ height: '100%', width: '100%', position: 'relative', ...style }}>
      <iframe
        ref={iframeRef}
        title="HTML渲染结果"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: 'white'
        }}
        sandbox="allow-scripts"
      />
      
      {loading && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 10,
            borderRadius: '4px'
          }}
        >
          <div 
            style={{
              width: '30px',
              height: '30px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default SimpleHtmlRenderer; 