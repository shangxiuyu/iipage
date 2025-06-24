import React, { useEffect, useRef, useState } from 'react';

interface CodeRendererProps {
  code: string;
  language?: string;
  style?: React.CSSProperties;
}

/**
 * 代码渲染器 - 根据代码类型提供不同的渲染方式
 */
const CodeRenderer: React.FC<CodeRendererProps> = ({ code, language = 'javascript', style }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 每当代码或语言变化时重新渲染
  useEffect(() => {
    if (!iframeRef.current) return;
    
    // 重置状态
    setLoading(true);
    setError(null);
    
    console.log(`CodeRenderer: 准备渲染 ${language} 代码，长度:`, code.length);
    
    try {
      // 根据不同语言准备HTML内容
      let html = '';
      let css = '';
      let js = '';
      
      // 根据语言类型处理代码
      switch (language) {
        case 'html':
          html = code;
          break;
          
        case 'css':
          css = code;
          html = `
            <div id="root">
              <h2 style="margin-bottom: 20px;">CSS 预览</h2>
              <div id="css-demo">
                <div class="demo-element">CSS样式应用区域</div>
                <div class="demo-element">第二个元素</div>
                <div class="demo-element">第三个元素</div>
                <div class="container">
                  <div class="item">容器内的元素1</div>
                  <div class="item">容器内的元素2</div>
                  <div class="item">容器内的元素3</div>
                </div>
              </div>
            </div>
          `;
          break;
          
        case 'jsx':
        case 'tsx':
        case 'react':
          // 处理React代码，需要引入React库
          html = '<div id="root"></div>';
          js = `
            try {
              // 加载React和ReactDOM
              const scriptReact = document.createElement('script');
              scriptReact.src = 'https://unpkg.com/react@17/umd/react.development.js';
              document.head.appendChild(scriptReact);
              
              const scriptReactDOM = document.createElement('script');
              scriptReactDOM.src = 'https://unpkg.com/react-dom@17/umd/react-dom.development.js';
              document.head.appendChild(scriptReactDOM);
              
              // 在React加载完成后执行用户代码
              scriptReactDOM.onload = function() {
                try {
                  // 使用Babel转换JSX
                  const scriptBabel = document.createElement('script');
                  scriptBabel.src = 'https://unpkg.com/@babel/standalone/babel.min.js';
                  document.head.appendChild(scriptBabel);
                  
                  scriptBabel.onload = function() {
                    try {
                      // 创建一个脚本元素来运行转换后的代码
                      const script = document.createElement('script');
                      script.type = 'text/babel';
                      script.text = \`${code}\`;
                      document.body.appendChild(script);
                    } catch (error) {
                      console.error('执行React代码出错:', error);
                      const errorDiv = document.createElement('div');
                      errorDiv.style.cssText = 'color: #d32f2f; margin: 10px; padding: 10px; border: 1px solid #d32f2f; border-radius: 4px;';
                      errorDiv.textContent = '转换React代码出错: ' + error.message;
                      document.body.appendChild(errorDiv);
                    }
                  };
                } catch (error) {
                  console.error('加载Babel出错:', error);
                }
              };
            } catch (error) {
              console.error('加载React出错:', error);
            }
          `;
          break;
        
        default:
          // 默认处理为JavaScript
          html = '<div id="root"><h2>执行结果：</h2><div id="output"></div></div>';
          js = `
            try {
              // 创建输出函数
              const output = document.getElementById('output');
              
              // 重定向console.log
              const originalLog = console.log;
              console.log = function(...args) {
                originalLog.apply(console, args);
                
                const logDiv = document.createElement('div');
                logDiv.className = 'log-item';
                logDiv.style.cssText = 'margin: 5px 0; padding: 8px; background: #f5f5f5; border-left: 3px solid #666; font-family: monospace; white-space: pre-wrap;';
                
                // 将参数转换为可读字符串
                const content = args.map(arg => {
                  if (typeof arg === 'object') {
                    try {
                      return JSON.stringify(arg, null, 2);
                    } catch (e) {
                      return String(arg);
                    }
                  }
                  return String(arg);
                }).join(' ');
                
                logDiv.textContent = content;
                output.appendChild(logDiv);
              };
              
              // 执行用户代码
              ${code}
            } catch (e) {
              const errorDiv = document.createElement('div');
              errorDiv.style.cssText = 'color: #d32f2f; margin: 5px 0; padding: 8px; border: 1px solid #d32f2f; border-radius: 4px; font-family: monospace;';
              errorDiv.textContent = 'Error: ' + e.message;
              document.getElementById('output').appendChild(errorDiv);
            }
          `;
      }
      
      // 基础样式
      const baseStyle = `
        body {
          font-family: system-ui, -apple-system, sans-serif;
          margin: 0;
          padding: 16px;
          color: #333;
          line-height: 1.5;
          font-size: 14px;
        }
        #root {
          padding: 0;
        }
        .demo-element {
          margin: 10px 0;
          padding: 10px;
          border: 1px dashed #ccc;
        }
        .container {
          margin: 15px 0;
          padding: 10px;
          border: 1px dashed #aaa;
        }
        .item {
          margin: 5px;
          padding: 5px;
        }
        pre {
          background: #f5f5f5;
          padding: 8px;
          border-radius: 4px;
          overflow: auto;
        }
        code {
          font-family: monospace;
        }
      `;
      
      // 构建完整的HTML文档
      const iframeContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${baseStyle}
            /* 用户CSS */
            ${css}
          </style>
        </head>
        <body>
          ${html}
          <script>
            try {
              // 向父窗口发送加载完成消息
              window.addEventListener('load', function() {
                window.parent.postMessage('code-rendered', '*');
              });
              
              // 捕获全局错误
              window.onerror = function(message, source, lineno, colno, error) {
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'color: #d32f2f; margin: 10px 0; padding: 10px; border: 1px solid #d32f2f; border-radius: 4px; font-family: monospace;';
                errorDiv.textContent = '错误: ' + message + ' (行 ' + lineno + ')';
                document.body.appendChild(errorDiv);
                return true; // 阻止错误继续传播
              };
              
              // 用户JavaScript
              ${js}
            } catch (e) {
              const errorDiv = document.createElement('div');
              errorDiv.style.cssText = 'color: #d32f2f; margin: 10px 0; padding: 10px; border: 1px solid #d32f2f; border-radius: 4px; font-family: monospace;';
              errorDiv.textContent = '执行错误: ' + e.message;
              document.body.appendChild(errorDiv);
            }
          </script>
        </body>
        </html>
      `;
      
      // 使用srcdoc直接设置iframe内容
      iframeRef.current.srcdoc = iframeContent;
      
      // 监听iframe加载完成
      const handleIframeLoad = () => {
        console.log('CodeRenderer: iframe加载完成');
        setLoading(false);
      };
      
      // 监听来自iframe的消息
      const handleMessage = (event: MessageEvent) => {
        if (event.data === 'code-rendered') {
          console.log('CodeRenderer: 收到渲染完成消息');
          setLoading(false);
        }
      };
      
      iframeRef.current.addEventListener('load', handleIframeLoad);
      window.addEventListener('message', handleMessage);
      
      // 确保即使加载过程有问题，也不会一直显示加载状态
      const loadingTimeout = setTimeout(() => {
        setLoading(false);
      }, 3000);
      
      return () => {
        if (iframeRef.current) {
          iframeRef.current.removeEventListener('load', handleIframeLoad);
        }
        window.removeEventListener('message', handleMessage);
        clearTimeout(loadingTimeout);
      };
      
    } catch (error) {
      console.error('CodeRenderer: 渲染失败', error);
      setLoading(false);
      setError(error instanceof Error ? error.message : '未知错误');
      
      // 显示错误信息
      if (iframeRef.current) {
        iframeRef.current.srcdoc = `
          <html>
          <body style="font-family: system-ui, -apple-system, sans-serif; color: #d32f2f; padding: 16px;">
            <h3>渲染失败</h3>
            <p>${error instanceof Error ? error.message : '未知错误'}</p>
            <pre style="background: #f5f5f5; padding: 10px; overflow: auto; border-radius: 4px;">${code.substring(0, 200)}${code.length > 200 ? '...' : ''}</pre>
          </body>
          </html>
        `;
      }
    }
  }, [code, language]);
  
  return (
    <div className="code-renderer-container" style={{ height: '100%', width: '100%', position: 'relative', ...style }}>
      <iframe
        ref={iframeRef}
        title="代码渲染结果"
        style={{
          width: '100%',
          height: '100%', // 直接100%
          border: 'none',
          borderRadius: '4px',
          backgroundColor: 'white'
        }}
        sandbox="allow-scripts allow-modals"
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
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
      {error && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            padding: '16px',
            backgroundColor: 'rgba(255, 235, 235, 0.9)',
            color: '#d32f2f',
            fontSize: '14px',
            zIndex: 10,
            borderRadius: '4px',
            overflow: 'auto'
          }}
        >
          <h3>渲染错误</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default CodeRenderer; 