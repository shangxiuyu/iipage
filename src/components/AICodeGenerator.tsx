import React, { useState, useRef } from 'react';
import { useBoardStore } from '../store/useBoardStore';
import type { Descendant } from 'slate';

interface AICodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

interface GeneratedCode {
  html: string;
  css: string;
  javascript: string;
  description: string;
  title: string;
}

const AICodeGenerator: React.FC<AICodeGeneratorProps> = ({ isOpen, onClose, position }) => {
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('deepseek_api_key') || '');
  
  const addNode = useBoardStore((s) => s.addNode);
  const updateNode = useBoardStore((s) => s.updateNode);
  const scale = useBoardStore((s) => s.scale);
  const panX = useBoardStore((s) => s.panX);
  const panY = useBoardStore((s) => s.panY);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 检查是否有API密钥
  const hasApiKey = !!apiKey;

  // 保存API密钥
  const saveApiKey = (newApiKey: string) => {
    setApiKey(newApiKey);
    localStorage.setItem('deepseek_api_key', newApiKey);
    setShowApiKeyDialog(false);
  };

  // 清除API密钥
  const clearApiKey = () => {
    setApiKey('');
    localStorage.removeItem('deepseek_api_key');
  };

  // 真实的DeepSeek API调用 - 替换模拟数据
  const generateCodeWithAI = async (prompt: string, history: Array<{role: string, content: string}> = []): Promise<GeneratedCode> => {
    // 检查是否配置了DeepSeek API密钥
    if (!apiKey) {
      console.warn('DeepSeek API密钥未配置，请配置真实API以获得最佳体验');
      // 返回提示用户配置API的响应，而不是使用预设模板
      return {
        title: '🔑 需要配置API密钥',
        description: '请配置DeepSeek API密钥以使用真正的AI代码生成功能。点击上方"配置API"按钮开始设置。',
        html: `<div class="api-required">
  <div class="icon">🤖</div>
  <h2>AI代码生成器</h2>
  <p>要生成真正符合您需求的代码，请先配置DeepSeek API密钥。</p>
  <div class="features">
    <div class="feature">✨ 无限创意：支持任何组件需求</div>
    <div class="feature">🎯 精准理解：AI理解您的具体要求</div>
    <div class="feature">🔄 迭代优化：多轮对话改进代码</div>
    <div class="feature">💎 专业品质：DeepSeek-Coder专为代码优化</div>
  </div>
  <div class="cta">
    <p>您的需求："${prompt}"</p>
    <p class="note">配置API后，AI将为您生成完美的代码！</p>
  </div>
</div>`,
        css: `.api-required {
  max-width: 500px;
  margin: 20px auto;
  padding: 40px;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.api-required .icon {
  font-size: 60px;
  margin-bottom: 20px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  60% { transform: translateY(-5px); }
}

.api-required h2 {
  margin: 0 0 20px 0;
  font-size: 28px;
  font-weight: 700;
}

.api-required p {
  margin: 0 0 20px 0;
  font-size: 16px;
  line-height: 1.6;
  opacity: 0.9;
}

.features {
  text-align: left;
  margin: 30px 0;
  background: rgba(255,255,255,0.1);
  padding: 20px;
  border-radius: 12px;
}

.feature {
  margin: 12px 0;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cta {
  background: rgba(255,255,255,0.1);
  padding: 20px;
  border-radius: 12px;
  margin-top: 20px;
}

.cta p {
  margin: 8px 0;
}

.note {
  font-size: 14px;
  opacity: 0.8;
  font-style: italic;
}`,
        javascript: `document.addEventListener('DOMContentLoaded', function() {
  // 添加呼吸动画
  const apiRequired = document.querySelector('.api-required');
  if (apiRequired) {
    setInterval(() => {
      apiRequired.style.transform = 'scale(1.02)';
      setTimeout(() => {
        apiRequired.style.transform = 'scale(1)';
      }, 500);
    }, 3000);
  }
  
  console.log('请配置DeepSeek API密钥以使用真正的AI代码生成功能');
});`
      };
    }

    try {
      console.log('发送DeepSeek API请求:', { prompt, historyLength: history.length });
      
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-coder',
          messages: [
            {
              role: 'system',
              content: `你是一个专为白板应用优化的前端代码生成专家。你的任务是为白板卡片生成精美、实用的组件代码。

              🎯 白板应用特殊要求：
              - 代码将在卡片中渲染（默认400x300px，可调整）
              - 需要在小空间内展现最佳视觉效果
              - 用户翻转卡片即可看到效果，需要立即产生"wow"效果
              - 支持多轮对话迭代优化

              请严格按照以下JSON格式返回，不要包含任何其他文字：
              {
                "html": "完整的HTML代码，要求语义化标签",
                "css": "完整的CSS样式代码，针对卡片渲染优化",
                "javascript": "JavaScript代码（如果需要交互功能）",
                "title": "简短有意义的标题",
                "description": "功能和特点的简要描述"
              }

              💎 代码质量要求：
              1. **视觉冲击力**: 在小空间内创造令人印象深刻的视觉效果
              2. **自包含性**: 无外部依赖，所有资源内联
              3. **响应式适配**: 适应不同卡片尺寸（200x150px到800x600px）
              4. **性能优化**: 轻量级代码，快速加载和渲染
              5. **交互友好**: 如果有交互，要直观易懂
              6. **美学设计**: 现代化设计语言，优秀的色彩搭配

              🎨 设计指南：
              - 优先使用CSS3动画和过渡效果
              - 合理使用渐变、阴影、圆角等现代视觉元素
              - 确保在暗色和亮色背景下都有良好表现
              - 字体大小适中，保证在小尺寸下可读性
              - 布局紧凑但不拥挤，信息层次清晰

              🔧 技术约束：
              - 不使用外部图片，优先使用CSS绘制图标
              - 不依赖外部字体，使用系统字体栈
              - JavaScript保持简洁，避免复杂的异步操作
              - CSS使用现代特性（flexbox、grid、CSS变量、animations）
              - 确保代码在现代浏览器中完美运行

              🌟 特别注意：
              - 这是一个创意展示平台，鼓励创新和实验性设计
              - 代码应该具有教育意义，展示最佳实践
              - 优先考虑用户体验和视觉愉悦感
              - 支持无障碍访问（合适的对比度、键盘导航等）

              根据用户需求，生成适合白板卡片展示的高质量代码组件。`
            },
            ...history,
            { role: 'user', content: prompt }
          ],
          temperature: 0.1, // 降低温度以获得更稳定的代码输出
          max_tokens: 4000, // 增加token限制以支持更复杂的代码
          top_p: 0.95
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DeepSeek API错误:', response.status, errorText);
        throw new Error(`DeepSeek API请求失败 (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      console.log('DeepSeek API响应:', content);
      
      try {
        // 尝试解析JSON响应
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          console.log('✅ 成功使用DeepSeek AI生成代码:', result.title);
          return result;
        }
        
        // 如果没有找到JSON，尝试解析markdown代码块
        const htmlMatch = content.match(/```html\n([\s\S]*?)\n```/);
        const cssMatch = content.match(/```css\n([\s\S]*?)\n```/);
        const jsMatch = content.match(/```javascript\n([\s\S]*?)\n```/) || 
                        content.match(/```js\n([\s\S]*?)\n```/);
        
        const fallbackResult = {
          html: htmlMatch ? htmlMatch[1].trim() : '<div>未能生成HTML代码</div>',
          css: cssMatch ? cssMatch[1].trim() : '',
          javascript: jsMatch ? jsMatch[1].trim() : '',
          title: prompt.slice(0, 30) + '...',
          description: '由DeepSeek-Coder AI生成的自定义代码'
        };
        
        console.log('✅ 使用DeepSeek AI生成代码（代码块格式）:', fallbackResult.title);
        return fallbackResult;
      } catch (parseError) {
        console.error('解析DeepSeek响应失败:', parseError);
        throw parseError;
      }
    } catch (error) {
      console.error('❌ DeepSeek API调用失败:', error);
      
      // API调用失败时，返回错误提示而不是预设模板
      return {
        title: '⚠️ API调用失败',
        description: '无法连接到DeepSeek API，请检查网络连接和API密钥配置',
        html: `<div class="api-error">
  <div class="error-icon">⚠️</div>
  <h2>API调用失败</h2>
  <p>无法连接到DeepSeek API服务。</p>
  <div class="error-details">
    <p><strong>您的需求：</strong>"${prompt}"</p>
    <p><strong>可能原因：</strong></p>
    <ul>
      <li>API密钥无效或已过期</li>
      <li>网络连接问题</li>
      <li>API服务暂时不可用</li>
      <li>API额度已用完</li>
    </ul>
    <p><strong>解决方案：</strong></p>
    <ul>
      <li>检查API密钥是否正确</li>
      <li>确认网络连接正常</li>
      <li>稍后重试</li>
      <li>查看DeepSeek平台状态</li>
    </ul>
  </div>
</div>`,
        css: `.api-error {
  max-width: 500px;
  margin: 20px auto;
  padding: 30px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 12px;
  color: #856404;
  text-align: center;
}

.error-icon {
  font-size: 50px;
  margin-bottom: 15px;
}

.api-error h2 {
  margin: 0 0 15px 0;
  color: #b45309;
}

.error-details {
  text-align: left;
  background: rgba(255,255,255,0.7);
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.error-details ul {
  margin: 10px 0;
  padding-left: 20px;
}

.error-details li {
  margin: 5px 0;
  font-size: 14px;
}`,
        javascript: `console.error('DeepSeek API调用失败，请检查配置和网络连接');`
      };
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isGenerating) return;

    const newMessage = { role: 'user' as const, content: userInput };
    const updatedHistory = [...chatHistory, newMessage];
    setChatHistory(updatedHistory);
    setUserInput('');
    setIsGenerating(true);
    setError(null);

    try {
      // 调用AI生成代码
      const result = await generateCodeWithAI(userInput, updatedHistory);
      setGeneratedCode(result);
      
      // 添加AI回复到聊天历史
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: `我为您生成了"${result.title}"组件。${result.description}您可以预览代码并一键创建卡片。`
      }]);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成代码时出错');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateCard = () => {
    if (!generatedCode) return;

    // 计算卡片位置（转换为世界坐标）
    const worldX = (position.x - panX) / scale;
    const worldY = (position.y - panY) / scale;

    // 创建AI生成的完整HTML代码
    const combinedCode = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    ${generatedCode.css}
  </style>
</head>
<body>
  ${generatedCode.html}
  <script>
    ${generatedCode.javascript}
  </script>
</body>
</html>`;

    // 正面显示代码渲染效果（设置为代码模式）
    const frontContent: Descendant[] = [
      {
        type: 'paragraph',
        children: [{ text: `🤖 AI生成：${generatedCode.title}` }]
      } as any
    ];

    // 背面显示代码信息
    const backContent: Descendant[] = [
      {
        type: 'heading-two',
        children: [{ text: generatedCode.title }]
      } as any,
      {
        type: 'paragraph',
        children: [{ text: generatedCode.description }]
      } as any,
      {
        type: 'paragraph',
        children: [{ 
          text: '💡 正面显示代码渲染效果',
          bold: true 
        }]
      } as any
    ];

    // 先创建新节点
    addNode(worldX, worldY);
    
    // 获取最新创建的节点（应该是最后一个节点）
    setTimeout(() => {
      const currentState = useBoardStore.getState();
      const latestNode = currentState.nodes[currentState.nodes.length - 1];
      
      if (latestNode) {
        updateNode(latestNode.id, {
          frontContent,
          backContent,
          isCodeMode: true, // 正面是代码模式，直接渲染HTML
          codeContent: combinedCode, // 设置代码内容
          codeLanguage: 'html', // 设置代码语言
          width: 400,
          height: 300,
          lightBackgroundColor: 'blue', // 蓝色表示AI生成
          darkBackgroundColor: 'dark-blue',
          editing: false, // 确保不处于编辑状态
          selected: true, // 选中新创建的卡片
          isFlipped: false // 确保显示正面
        });
      }
    }, 50);

    // 关闭对话框
    onClose();
    
    // 重置状态
    setGeneratedCode(null);
    setChatHistory([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: 480,
        maxHeight: 600,
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 头部 */}
      <div style={{
        padding: '20px 20px 0',
        borderBottom: '1px solid #f0f0f0',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>🤖 AI 代码生成器</h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              width: 28,
              height: 28,
              borderRadius: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: '8px 0 16px', fontSize: 14, opacity: 0.9 }}>
          描述您想要的组件，AI将为您生成HTML/CSS/JS代码
        </p>

        {/* API密钥状态和配置 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: hasApiKey ? '#e8f5e8' : '#fff3cd',
          borderRadius: 8,
          marginBottom: 12,
          fontSize: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{hasApiKey ? '🟢' : '🟡'}</span>
            <span style={{ color: hasApiKey ? '#155724' : '#856404' }}>
              {hasApiKey ? 'DeepSeek API 已配置' : '使用模拟数据（推荐配置真实API）'}
            </span>
          </div>
          <button
            onClick={() => setShowApiKeyDialog(true)}
            style={{
              background: 'transparent',
              border: '1px solid ' + (hasApiKey ? '#28a745' : '#ffc107'),
              color: hasApiKey ? '#155724' : '#856404',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 11,
              cursor: 'pointer'
            }}
          >
            {hasApiKey ? '管理密钥' : '配置API'}
          </button>
        </div>
      </div>

      {/* API密钥配置对话框 */}
      {showApiKeyDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            maxWidth: 480,
            width: '90%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>🔑 配置 DeepSeek API</h3>
              <button
                onClick={() => setShowApiKeyDialog(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ marginBottom: 16, fontSize: 14, color: '#666' }}>
              <p style={{ margin: '0 0 12px' }}>
                🚀 DeepSeek-Coder 是专门优化的代码生成模型，能生成更高质量的代码。
              </p>
              <p style={{ margin: '0 0 12px' }}>
                📍 获取API密钥：访问 <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea' }}>platform.deepseek.com</a>
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#999' }}>
                * API密钥仅保存在您的浏览器本地，不会上传到服务器
              </p>
            </div>

            <input
              type="password"
              placeholder="输入您的 DeepSeek API 密钥..."
              defaultValue={apiKey}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14,
                marginBottom: 16,
                fontFamily: 'monospace'
              }}
              onChange={(e) => {
                const newKey = e.target.value;
                if (newKey.trim()) {
                  saveApiKey(newKey.trim());
                }
              }}
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {hasApiKey && (
                <button
                  onClick={clearApiKey}
                  style={{
                    padding: '8px 16px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  清除密钥
                </button>
              )}
              <button
                onClick={() => setShowApiKeyDialog(false)}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 聊天区域 */}
      <div 
        ref={chatContainerRef}
        style={{
          flex: 1,
          padding: 16,
          overflowY: 'auto',
          maxHeight: 300
        }}
      >
        {chatHistory.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#666',
            fontSize: 14,
            padding: '20px 0'
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            <p>开始与AI对话，描述您想要的组件</p>
            <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
              例如：创建一个按钮、制作一个卡片、设计一个表单
            </div>
          </div>
        )}
        
        {chatHistory.map((message, index) => (
          <div
            key={index}
            style={{
              marginBottom: 12,
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '8px 12px',
                borderRadius: 12,
                background: message.role === 'user' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#f5f5f5',
                color: message.role === 'user' ? 'white' : '#333',
                fontSize: 14,
                lineHeight: 1.4
              }}
            >
              {message.content}
            </div>
          </div>
        ))}
        
        {isGenerating && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <div style={{
              padding: '8px 12px',
              borderRadius: 12,
              background: '#f5f5f5',
              color: '#666',
              fontSize: 14
            }}>
              <span>AI正在生成代码...</span>
              <span style={{ animation: 'pulse 1.5s infinite' }}>⚡</span>
            </div>
          </div>
        )}
      </div>

      {/* 生成的代码预览 */}
      {generatedCode && (
        <div style={{
          margin: '0 16px 16px',
          padding: 16,
          background: '#f8f9fa',
          borderRadius: 12,
          border: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 16, color: '#333' }}>
              📝 {generatedCode.title}
            </h4>
            <button
              onClick={handleCreateCard}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              🚀 创建卡片
            </button>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#666' }}>
            {generatedCode.description}
          </p>
          <div style={{ fontSize: 12, color: '#999' }}>
            包含: HTML ({generatedCode.html.length} 字符) + 
            CSS ({generatedCode.css.length} 字符) + 
            JS ({generatedCode.javascript.length} 字符)
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div style={{
        padding: 16,
        borderTop: '1px solid #f0f0f0',
        background: '#fafafa'
      }}>
        {error && (
          <div style={{
            marginBottom: 12,
            padding: 8,
            background: '#fee',
            color: '#c33',
            borderRadius: 6,
            fontSize: 12
          }}>
            ❌ {error}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="描述您想要的组件..."
            disabled={isGenerating}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              background: 'white'
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!userInput.trim() || isGenerating}
            style={{
              padding: '10px 16px',
              background: userInput.trim() && !isGenerating 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: userInput.trim() && !isGenerating ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 600,
              minWidth: 60
            }}
          >
            {isGenerating ? '⏳' : '发送'}
          </button>
        </div>
        
        <div style={{ fontSize: 11, color: '#999', marginTop: 8, textAlign: 'center' }}>
          按 Enter 发送，Shift+Enter 换行
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default AICodeGenerator; 