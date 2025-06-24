import React, { useEffect, useState } from 'react';

interface HtmlPreviewProps {
  html: string;
  style?: React.CSSProperties;
}

/**
 * 极简HTML预览组件
 * 简化设计，只做核心功能：使用iframe安全地渲染HTML内容
 */
const HtmlPreview: React.FC<HtmlPreviewProps> = ({ html, style }) => {
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  // 每次HTML内容变化时重置iframe
  useEffect(() => {
    setIframeKey(Date.now());
    setLoading(true);
  }, [html]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...style }}>
      <iframe
        key={iframeKey}
        title="HTML预览"
        srcDoc={`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  margin: 0;
                  padding: 10px;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                  line-height: 1.5;
                  color: #333;
                }
                img { max-width: 100%; height: auto; }
              </style>
            </head>
            <body>${html || '<div style="color: #999; font-style: italic;">空HTML内容</div>'}</body>
          </html>
        `}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '4px',
          backgroundColor: 'white',
        }}
        sandbox="allow-scripts"
        onLoad={() => setLoading(false)}
      />
      
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          borderRadius: '4px',
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
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

export default HtmlPreview; 