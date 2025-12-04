import React, { useState, useContext, useRef, useEffect } from 'react';
import { ThemeContext } from '../App';

interface AICommand {
  nodes: Array<{
    id: string;
    title: string;
    desc: string;
    details?: string[];
    conclusion?: string;
  }>;
  edges?: Array<{ from: string; to: string } | { from: number; to: number }>;
  cards?: any[][];
}

interface AIAssistantProps {
  onAICommand?: (cmd: AICommand) => void;
  onClose?: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ onAICommand, onClose }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState(''); // 流式输出的文本
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('deepseek_api_key') || '');
  const [isExpanded, setIsExpanded] = useState(false); // 展开/收起状态
  const [showHistory, setShowHistory] = useState(false); // 显示历史记录
  const [history, setHistory] = useState<Array<{query: string; response: string; timestamp: number}>>(() => {
    const saved = localStorage.getItem('ai_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const theme = useContext(ThemeContext);
  const isDarkMode = theme?.isDarkMode;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 保存API密钥
  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('deepseek_api_key', key);
    setShowApiKeyDialog(false);
  };

  // 清除API密钥
  const clearApiKey = () => {
    setApiKey('');
    localStorage.removeItem('deepseek_api_key');
  };

  // 保存历史记录
  useEffect(() => {
    localStorage.setItem('ai_chat_history', JSON.stringify(history.slice(-20))); // 只保存最近20条
  }, [history]);

  // 流式输出滚动到底部
  useEffect(() => {
    if (streamingContainerRef.current && streamingText) {
      streamingContainerRef.current.scrollTop = streamingContainerRef.current.scrollHeight;
    }
  }, [streamingText]);

  // 调用DeepSeek API - 流式输出
  const callDeepSeekStreaming = async (text: string): Promise<string> => {
    if (!apiKey) throw new Error('请先配置DeepSeek API密钥');
    
    const systemPrompt = `你是一个专业的白板内容设计师。请根据用户的需求，自动判断并生成最合适的卡片数量、内容和卡片之间的连线结构。

- 你可以生成任意数量的卡片，每张卡片内容要简明、重点突出、排版美观。
- 如果卡片之间有逻辑或结构关系（如流程、树状、分支、思维导图等），请用"EDGES"部分描述连线关系；如果没有连线需求，可以省略EDGES部分。
- 卡片内容请用Markdown格式输出，每张卡片之间用"---"分隔。
- 如果有连线关系，请在所有卡片内容后，单独用如下格式输出卡片连线关系（EDGES）：
---
EDGES:
[
  {"from": 0, "to": 1},
  {"from": 0, "to": 2}
]
其中from和to为卡片的顺序编号（从0开始），支持任意结构（线性、树状、分支、放射等）。
- 输出内容必须逻辑清晰、结构合理、排版美观，避免冗余和杂乱。
- 只返回Markdown和EDGES，不要多余解释，不要JSON对象包裹。

请根据用户输入的主题或需求，灵活设计卡片和连线结构。`;

    const body = {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.6,
      max_tokens: 2048,
      top_p: 0.95,
      stream: true // 启用流式输出
    };

    abortControllerRef.current = new AbortController();
    
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: abortControllerRef.current.signal
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`DeepSeek API请求失败: ${resp.status} ${err}`);
    }

    const reader = resp.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (!reader) throw new Error('无法获取响应流');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullText += content;
                setStreamingText(fullText);
              }
            } catch (e) {
              console.warn('解析SSE数据失败:', e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('请求已取消');
      }
      throw error;
    }

    return fullText.trim();
  };

  // 兼容：无API密钥时仍可用mock
  const mockAIRequest = async (text: string): Promise<string> => {
    // 模拟流式输出
    const mockResponse = `# 产品开发流程

## 需求分析
- 收集用户需求
- 市场调研
- 竞品分析

---

# 设计阶段

## UI/UX设计
- 用户界面设计
- 交互设计
- 原型制作

---

# 开发实现

## 技术开发
- 前端开发
- 后端开发
- 数据库设计

---

# 测试验证

## 质量保证
- 单元测试
- 集成测试
- 用户测试

---

# 上线发布

## 产品发布
- 部署准备
- 正式发布
- 运营维护

---
EDGES:
[
  {"from": 0, "to": 1},
  {"from": 1, "to": 2},
  {"from": 2, "to": 3},
  {"from": 3, "to": 4}
]`;

    // 模拟流式输出效果
    for (let i = 0; i <= mockResponse.length; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 30));
      setStreamingText(mockResponse.slice(0, i));
    }

    return mockResponse;
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setError(null);
    setStreamingText('');
    setIsExpanded(true); // 自动展开以显示输出

    try {
      let response: string;
      
      if (apiKey) {
        response = await callDeepSeekStreaming(input);
      } else {
        response = await mockAIRequest(input);
      }

      // 保存到历史记录
      setHistory(prev => [...prev, {
        query: input,
        response,
        timestamp: Date.now()
      }]);

      // 执行AI命令
      if (onAICommand) {
        onAICommand(response as any);
      }

      setInput(''); // 清空输入框
    } catch (e: any) {
      if (e.message !== '请求已取消') {
        setError(e.message || 'AI解析失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 停止生成
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  };

  // 清空历史
  const handleClearHistory = () => {
    setHistory([]);
    setStreamingText('');
  };

  // 使用历史记录
  const handleUseHistory = (item: typeof history[0]) => {
    setInput(item.query);
    setStreamingText(item.response);
    setShowHistory(false);
  };

  return (
    <>
      {/* 主容器 - 根据展开状态调整 */}
      <div style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        width: isExpanded ? 420 : 360,
        maxHeight: isExpanded ? '70vh' : '400px',
        background: isDarkMode 
          ? 'linear-gradient(135deg, #1F2937 0%, #111827 100%)'
          : 'linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%)',
        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
        borderRadius: 16,
        boxShadow: isDarkMode 
          ? '0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
          : '0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* 头部 */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDarkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* AI图标 */}
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: isDarkMode 
                ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)'
                : 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isDarkMode
                ? '0 4px 12px rgba(79, 70, 229, 0.3)'
                : '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="2.5" width="15" height="15" rx="4" stroke="white" fill="none"/>
                <path d="M7.2 14L9 6L10.8 14M7.7 12h2.6" stroke="white" strokeWidth="1.1"/>
                <line x1="12.5" y1="7" x2="12.5" y2="13" stroke="white" strokeWidth="1.1"/>
                <line x1="12" y1="7" x2="13" y2="7" stroke="white" strokeWidth="1.1"/>
                <line x1="12" y1="13" x2="13" y2="13" stroke="white" strokeWidth="1.1"/>
              </svg>
            </div>
            
            <div>
              <h3 style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: isDarkMode ? '#F9FAFB' : '#111827',
                lineHeight: 1.2,
              }}>
                AI 助手
              </h3>
              <p style={{
                margin: '4px 0 0',
                fontSize: 12,
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                lineHeight: 1,
              }}>
                {apiKey ? '已连接 DeepSeek' : 'Demo 模式'}
              </p>
            </div>
          </div>

          {/* 右侧按钮组 */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* 历史记录按钮 */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                background: showHistory
                  ? (isDarkMode ? '#374151' : '#E5E7EB')
                  : 'transparent',
                color: isDarkMode ? '#D1D5DB' : '#6B7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!showHistory) e.currentTarget.style.background = isDarkMode ? '#374151' : '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                if (!showHistory) e.currentTarget.style.background = 'transparent';
              }}
              title="历史记录"
            >
              📜
            </button>

            {/* 展开/收起按钮 */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: isDarkMode ? '#D1D5DB' : '#6B7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode ? '#374151' : '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              title={isExpanded ? '收起' : '展开'}
            >
              {isExpanded ? '📐' : '📏'}
            </button>

            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 'bold',
                lineHeight: 1,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode ? '#374151' : '#F3F4F6';
                e.currentTarget.style.color = isDarkMode ? '#F9FAFB' : '#111827';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
              }}
              title="关闭"
            >
              ×
            </button>
          </div>
        </div>

        {/* 历史记录面板 */}
        {showHistory && (
          <div style={{
            maxHeight: 200,
            overflowY: 'auto',
            borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            background: isDarkMode ? '#111827' : '#F9FAFB',
          }}>
            {history.length === 0 ? (
              <div style={{
                padding: 20,
                textAlign: 'center',
                color: isDarkMode ? '#6B7280' : '#9CA3AF',
                fontSize: 13,
              }}>
                暂无历史记录
              </div>
            ) : (
              <>
                <div style={{
                  padding: '8px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{
                    fontSize: 12,
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  }}>
                    最近对话
                  </span>
                  <button
                    onClick={handleClearHistory}
                    style={{
                      padding: '4px 8px',
                      fontSize: 11,
                      border: 'none',
                      borderRadius: 4,
                      background: isDarkMode ? '#374151' : '#E5E7EB',
                      color: isDarkMode ? '#D1D5DB' : '#6B7280',
                      cursor: 'pointer',
                    }}
                  >
                    清空
                  </button>
                </div>
                {history.slice().reverse().map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleUseHistory(item)}
                    style={{
                      padding: '10px 16px',
                      borderBottom: idx < history.length - 1 
                        ? (isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB')
                        : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDarkMode ? '#1F2937' : '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{
                      fontSize: 12,
                      color: isDarkMode ? '#D1D5DB' : '#374151',
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.query}
                    </div>
                    <div style={{
                      fontSize: 10,
                      color: isDarkMode ? '#6B7280' : '#9CA3AF',
                    }}>
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* 流式输出显示区域 */}
        {(streamingText || loading) && (
          <div
            ref={streamingContainerRef}
            style={{
              flex: 1,
              padding: 16,
              overflowY: 'auto',
              fontSize: 13,
              lineHeight: 1.6,
              color: isDarkMode ? '#D1D5DB' : '#374151',
              background: isDarkMode ? '#0F1419' : '#FFFFFF',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {streamingText}
            {loading && (
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 14,
                background: isDarkMode ? '#4F46E5' : '#3B82F6',
                marginLeft: 2,
                animation: 'blink 1s infinite',
              }} />
            )}
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: isDarkMode ? '#7F1D1D' : '#FEE2E2',
            borderRadius: 8,
            margin: '0 16px 12px',
            fontSize: 12,
            color: isDarkMode ? '#FCA5A5' : '#991B1B',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* 输入区域 */}
        <div style={{
          padding: 16,
          background: isDarkMode ? 'rgba(17, 24, 39, 0.5)' : 'rgba(249, 250, 251, 0.8)',
          backdropFilter: 'blur(10px)',
        }}>
          {/* 文本框 */}
          <div style={{
            position: 'relative',
            marginBottom: 12,
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="输入你的需求...&#10;&#10;例如：&#10;• 帮我生成一个产品开发流程&#10;• 创建一个项目管理思维导图&#10;&#10;Ctrl/Cmd + Enter 发送"
              disabled={loading}
              style={{
                width: '100%',
                minHeight: 80,
                maxHeight: 200,
                padding: '12px 16px',
                border: isDarkMode ? '1px solid #374151' : '1px solid #D1D5DB',
                borderRadius: 12,
                background: isDarkMode ? '#111827' : '#FFFFFF',
                color: isDarkMode ? '#F9FAFB' : '#111827',
                fontSize: 14,
                lineHeight: 1.5,
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = isDarkMode ? '#4F46E5' : '#3B82F6';
                e.currentTarget.style.boxShadow = isDarkMode
                  ? '0 0 0 3px rgba(79, 70, 229, 0.1)'
                  : '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#D1D5DB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* 底部栏 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            {/* API配置按钮 */}
            <button
              onClick={() => setShowApiKeyDialog(true)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: apiKey 
                  ? (isDarkMode ? '#34D399' : '#059669')
                  : (isDarkMode ? '#FBBF24' : '#D97706'),
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isDarkMode ? '#374151' : '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              title={apiKey ? 'DeepSeek API已配置' : '点击配置API密钥'}
            >
              {apiKey ? '✓' : '⚙️'}
              <span>{apiKey ? 'API已配置' : '配置API'}</span>
            </button>

            {/* 发送/停止按钮 */}
            {loading ? (
              <button
                onClick={handleStop}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: 'none',
                  background: isDarkMode ? '#7F1D1D' : '#DC2626',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDarkMode ? '#991B1B' : '#B91C1C';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDarkMode ? '#7F1D1D' : '#DC2626';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
                }}
              >
                <span>⏸</span>
                <span>停止生成</span>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                style={{
                  padding: '10px 24px',
                  borderRadius: 10,
                  border: 'none',
                  background: !input.trim()
                    ? (isDarkMode ? '#374151' : '#E5E7EB')
                    : isDarkMode
                    ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)'
                    : 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                  color: !input.trim()
                    ? (isDarkMode ? '#6B7280' : '#9CA3AF')
                    : '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: !input.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: !input.trim()
                    ? 'none'
                    : '0 4px 12px rgba(79, 70, 229, 0.3)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (input.trim()) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (input.trim()) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
                  }
                }}
              >
                <span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 8L2 8M8 2L14 8L8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <span>发送</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* API密钥配置弹窗 */}
      {showApiKeyDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => setShowApiKeyDialog(false)}
        >
          <div 
            style={{ 
              background: isDarkMode ? '#1F2937' : '#FFFFFF',
              borderRadius: 16,
              padding: 32,
              minWidth: 400,
              maxWidth: '90vw',
              boxShadow: isDarkMode
                ? '0 24px 48px rgba(0,0,0,0.6)'
                : '0 24px 48px rgba(0,0,0,0.2)',
              border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 24,
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: isDarkMode 
                  ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)'
                  : 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}>
                🔑
              </div>
              <div>
                <h3 style={{ 
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 600,
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                }}>
                  配置 DeepSeek API 密钥
                </h3>
                <p style={{
                  margin: '4px 0 0',
                  fontSize: 13,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  输入你的 API 密钥以启用 AI 功能
                </p>
              </div>
            </div>

            <input
              type="password"
              placeholder="sk-xxxxxx"
              defaultValue={apiKey}
              style={{ 
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                border: isDarkMode ? '1px solid #374151' : '1px solid #D1D5DB',
                background: isDarkMode ? '#111827' : '#FFFFFF',
                color: isDarkMode ? '#F9FAFB' : '#111827',
                fontSize: 14,
                marginBottom: 20,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.15s ease',
              }}
              onChange={e => setApiKey(e.target.value)}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = isDarkMode ? '#4F46E5' : '#3B82F6';
                e.currentTarget.style.boxShadow = isDarkMode
                  ? '0 0 0 3px rgba(79, 70, 229, 0.1)'
                  : '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#D1D5DB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />

            <div style={{ 
              display: 'flex',
              gap: 12,
              marginBottom: 16,
            }}>
              <button 
                onClick={() => saveApiKey(apiKey)}
                style={{ 
                  flex: 1,
                  padding: '10px 20px',
                  background: isDarkMode
                    ? 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)'
                    : 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                保存
              </button>
              <button 
                onClick={clearApiKey}
                style={{ 
                  flex: 1,
                  padding: '10px 20px',
                  background: isDarkMode ? '#374151' : '#F3F4F6',
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDarkMode ? '#4B5563' : '#E5E7EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDarkMode ? '#374151' : '#F3F4F6';
                }}
              >
                清除
              </button>
            </div>

            <div style={{ 
              fontSize: 12,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
              lineHeight: 1.6,
            }}>
              💡 API密钥仅保存在本地浏览器，不会上传服务器。
              <br />
              获取密钥请访问 <a 
                href="https://platform.deepseek.com" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: isDarkMode ? '#60A5FA' : '#3B82F6',
                  textDecoration: 'none',
                }}
              >
                DeepSeek平台
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 添加闪烁动画的样式 */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </>
  );
};

export default AIAssistant;
