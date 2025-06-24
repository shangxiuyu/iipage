import React, { useState } from 'react';
import AICodeGenerator from './AICodeGenerator';

const AITestPage: React.FC = () => {
  const [showAI, setShowAI] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: 40,
        borderRadius: 16,
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: '0 0 20px', color: '#333' }}>🤖 AI代码生成器测试</h1>
        <p style={{ margin: '0 0 30px', color: '#666' }}>
          点击下方按钮测试AI代码生成功能
        </p>
        
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setPosition({ 
              x: rect.left + rect.width / 2 - 240, 
              y: rect.top - 300 
            });
            setShowAI(true);
          }}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          🚀 启动AI代码生成器
        </button>
        
        <div style={{ 
          marginTop: 30, 
          padding: 20, 
          background: '#f8f9fa', 
          borderRadius: 8,
          textAlign: 'left'
        }}>
          <h3 style={{ margin: '0 0 10px', color: '#333' }}>💡 使用提示：</h3>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#666' }}>
            <li>尝试输入"创建一个按钮"</li>
            <li>尝试输入"制作一个卡片"</li>
            <li>或者描述任何你想要的组件</li>
          </ul>
        </div>
      </div>

      {showAI && (
        <AICodeGenerator
          isOpen={showAI}
          position={position}
          onClose={() => setShowAI(false)}
        />
      )}
    </div>
  );
};

export default AITestPage; 