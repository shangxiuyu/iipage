import React, { useState, useRef, useEffect, useContext } from 'react';
import { ThemeContext } from '../App';
import { useBoardStore } from '../store/useBoardStore';
import { extractTextFromSlateContent } from './RichTextEditor';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface AIBrainstormChatProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIBrainstormChat: React.FC<AIBrainstormChatProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('deepseek_api_key') || '');
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const theme = useContext(ThemeContext);
  const isDarkMode = theme?.isDarkMode;
  const { nodes } = useBoardStore();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const getAllCardsContent = (): string => {
    if (!nodes || nodes.length === 0) {
      return '当前白板还没有任何卡片内容。';
    }

    const cardsContent = nodes.map((node, index) => {
      let textContent = '';
      if (node.content && Array.isArray(node.content)) {
        textContent = extractTextFromSlateContent(node.content);
      }
      if (node.frontContent && Array.isArray(node.frontContent)) {
        const frontText = extractTextFromSlateContent(node.frontContent);
        if (frontText) textContent = frontText;
      }
      if (node.backContent && Array.isArray(node.backContent)) {
        const backText = extractTextFromSlateContent(node.backContent);
        if (backText && !textContent) textContent = backText;
      }

      const tags = node.tags && node.tags.length > 0 ? node.tags.map(t => `#${t}`).join(' ') : '';
      
      return `卡片${index + 1}:\n${textContent || '(空内容)'}${tags ? `\n标签: ${tags}` : ''}`;
    }).join('\n\n');

    return `当前白板共有 ${nodes.length} 张卡片，内容如下：\n\n${cardsContent}`;
  };

  const callAIStreaming = async (userMessage: string, conversationHistory: Message[]): Promise<void> => {
    if (!apiKey) {
      throw new Error('请先配置DeepSeek API密钥');
    }

    const systemPrompt = `你是一位思维猎手（Insight Hunter），专注于从碎片化的信息中捕捉洞察、发现模式、提炼智慧。

你的核心能力：
1. **模式识别**：在看似无关的卡片间发现隐藏的联系和规律
2. **深度洞察**：透过表象挖掘深层逻辑和本质问题
3. **知识提炼**：将零散信息整合为有价值的知识体系
4. **战略建议**：基于洞察提供切实可行的优化方案

工作原则：
- 保持客观、理性的分析视角
- 用简洁、精准的语言表达
- 提供具体、可执行的建议
- 帮助用户看到自己看不到的东西

请基于用户提供的白板卡片内容，提供专业的分析和指导。`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ];

    abortControllerRef.current = new AbortController();

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 0.95,
        stream: true
      }),
      signal: abortControllerRef.current.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API请求失败: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) throw new Error('无法获取响应流');

    const aiMsgId = (Date.now() + 1).toString();
    
    const aiMsg: Message = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    setMessages(prev => [...prev, aiMsg]);

    let fullText = '';

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
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMsgId ? { ...msg, content: fullText } : msg
                ));
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
    } finally {
      setMessages(prev => prev.map(msg => 
        msg.id === aiMsgId ? { ...msg, isStreaming: false } : msg
      ));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      let finalUserMessage = userMessage;
      if (messages.length === 0 || userMessage.includes('梳理') || userMessage.includes('整理') || userMessage.includes('分析')) {
        const cardsContent = getAllCardsContent();
        finalUserMessage = `${userMessage}\n\n${cardsContent}`;
      }

      await callAIStreaming(finalUserMessage, [...messages, userMsg]);
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `错误: ${error.message || 'AI请求失败，请检查网络连接和API配置。'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  };

  const handleQuickOrganize = async () => {
    const quickPrompt = '请帮我分析这些卡片，发现其中的模式和洞察，并提供优化建议。';
    const cardsContent = getAllCardsContent();
    const finalMessage = `${quickPrompt}\n\n${cardsContent}`;
    
    setLoading(true);
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: quickPrompt,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      await callAIStreaming(finalMessage, [userMsg]);
    } catch (error: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `错误: ${error.message || 'AI请求失败，请检查网络连接和API配置。'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('deepseek_api_key', key);
    setShowApiKeyDialog(false);
  };

  const clearApiKey = () => {
    setApiKey('');
    localStorage.removeItem('deepseek_api_key');
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)',
          zIndex: 9998,
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '420px',
          height: '100vh',
          background: isDarkMode ? '#1a1d29' : '#ffffff',
          boxShadow: isDarkMode ? '-2px 0 12px rgba(0,0,0,0.3)' : '-2px 0 12px rgba(0,0,0,0.08)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: isDarkMode ? '1px solid #2d3142' : '1px solid #e5e7eb',
        }}
      >
        {/* 极简头部 */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: isDarkMode ? '1px solid #2d3142' : '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: isDarkMode ? '#e5e7eb' : '#111827',
            }}>
              AI
            </div>
            
            {/* 功能图标组 */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {/* 新增对话 */}
              <button
                onClick={() => {
                  handleClearChat();
                }}
                style={{
                  width: 28,
                  height: 28,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDarkMode ? '#2d3142' : '#f3f4f6';
                  e.currentTarget.style.color = isDarkMode ? '#e5e7eb' : '#111827';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280';
                }}
                title="新建对话"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              
              {/* 删除当前对话 */}
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  style={{
                    width: 28,
                    height: 28,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isDarkMode ? '#2d3142' : '#f3f4f6';
                    e.currentTarget.style.color = isDarkMode ? '#e5e7eb' : '#111827';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280';
                  }}
                  title="清空对话"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              )}
              
              {/* 历史记录 */}
              <button
                onClick={() => {
                  // TODO: 实现历史记录功能
                  console.log('查看历史记录');
                }}
                style={{
                  width: 28,
                  height: 28,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDarkMode ? '#2d3142' : '#f3f4f6';
                  e.currentTarget.style.color = isDarkMode ? '#e5e7eb' : '#111827';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280';
                }}
                title="历史记录"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </button>
              
              {/* API设置 */}
              <button
                onClick={() => setShowApiKeyDialog(true)}
                style={{
                  width: 28,
                  height: 28,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: apiKey 
                    ? (isDarkMode ? '#9ca3af' : '#6b7280')
                    : (isDarkMode ? '#f59e0b' : '#d97706'),
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDarkMode ? '#2d3142' : '#f3f4f6';
                  e.currentTarget.style.color = isDarkMode ? '#e5e7eb' : '#111827';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = apiKey 
                    ? (isDarkMode ? '#9ca3af' : '#6b7280')
                    : (isDarkMode ? '#f59e0b' : '#d97706');
                }}
                title={apiKey ? 'API设置' : '配置API'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6m5.2-14.2l-4.2 4.2m-1.8 1.8l-4.2 4.2M23 12h-6m-6 0H1m14.2 5.2l-4.2-4.2m-1.8-1.8l-4.2-4.2"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              color: isDarkMode ? '#9ca3af' : '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              lineHeight: 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDarkMode ? '#2d3142' : '#f3f4f6';
              e.currentTarget.style.color = isDarkMode ? '#e5e7eb' : '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = isDarkMode ? '#9ca3af' : '#6b7280';
            }}
            title="关闭"
          >
            ×
          </button>
        </div>

        {/* 消息区域 */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.length === 0 && (
            <div style={{ 
              padding: '60px 20px',
              textAlign: 'center',
              color: isDarkMode ? '#6b7280' : '#9ca3af',
            }}>
              <div style={{ 
                fontSize: '14px',
                marginBottom: '20px',
                lineHeight: 1.6,
              }}>
                从碎片化的卡片中<br />发现模式，提炼洞察
              </div>
              <button
                onClick={handleQuickOrganize}
                disabled={nodes.length === 0}
                style={{
                  padding: '8px 20px',
                  background: nodes.length === 0
                    ? (isDarkMode ? '#2d3142' : '#f3f4f6')
                    : (isDarkMode ? '#e5e7eb' : '#111827'),
                  color: nodes.length === 0 
                    ? (isDarkMode ? '#6b7280' : '#9ca3af')
                    : (isDarkMode ? '#111827' : '#ffffff'),
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (nodes.length > 0) {
                    e.currentTarget.style.opacity = '0.9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (nodes.length > 0) {
                    e.currentTarget.style.opacity = '1';
                  }
                }}
              >
                开始分析
              </button>
              {nodes.length === 0 && (
                <p style={{
                  marginTop: '12px',
                  fontSize: '12px',
                  color: isDarkMode ? '#6b7280' : '#9ca3af',
                }}>
                  请先在白板上创建卡片
                </p>
              )}
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: msg.role === 'user' 
                    ? (isDarkMode ? '#374151' : '#e5e7eb')
                    : (isDarkMode ? '#2d3142' : '#f3f4f6'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  flexShrink: 0,
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                }}
              >
                {msg.role === 'user' ? '我' : 'AI'}
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: msg.role === 'user'
                    ? (isDarkMode ? '#2d3142' : '#f9fafb')
                    : 'transparent',
                  color: isDarkMode ? '#e5e7eb' : '#111827',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  border: msg.role === 'assistant' 
                    ? (isDarkMode ? '1px solid #2d3142' : '1px solid #e5e7eb')
                    : 'none',
                }}
              >
                {msg.role === 'assistant' ? (
                  <div className="markdown-content">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.isStreaming && (
                      <span style={{
                        display: 'inline-block',
                        width: 2,
                        height: 14,
                        background: isDarkMode ? '#9ca3af' : '#6b7280',
                        marginLeft: 2,
                        animation: 'blink 1s infinite',
                        verticalAlign: 'middle',
                      }} />
                    )}
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* 极简输入区域 */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: isDarkMode ? '1px solid #2d3142' : '1px solid #e5e7eb',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="输入你的问题..."
              rows={2}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '6px',
                border: isDarkMode ? '1px solid #2d3142' : '1px solid #e5e7eb',
                background: isDarkMode ? '#23272f' : '#ffffff',
                color: isDarkMode ? '#e5e7eb' : '#111827',
                fontSize: '13px',
                lineHeight: '1.5',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = isDarkMode ? '#4b5563' : '#d1d5db';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isDarkMode ? '#2d3142' : '#e5e7eb';
              }}
            />
            {loading ? (
              <button
                onClick={handleStop}
                style={{
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isDarkMode ? '#374151' : '#f3f4f6',
                  color: isDarkMode ? '#e5e7eb' : '#111827',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                停止
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                style={{
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: !input.trim()
                    ? (isDarkMode ? '#2d3142' : '#f3f4f6')
                    : (isDarkMode ? '#e5e7eb' : '#111827'),
                  color: !input.trim()
                    ? (isDarkMode ? '#6b7280' : '#9ca3af')
                    : (isDarkMode ? '#111827' : '#ffffff'),
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: !input.trim() ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                发送
              </button>
            )}
          </div>

          {!apiKey && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: isDarkMode ? '#6b7280' : '#9ca3af',
              }}
            >
              <button
                onClick={() => setShowApiKeyDialog(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: isDarkMode ? '#f59e0b' : '#d97706',
                  cursor: 'pointer',
                  fontSize: '11px',
                  padding: '4px 6px',
                  borderRadius: 4,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                配置API
              </button>
              <span>Enter 发送</span>
            </div>
          )}
        </div>
      </div>

      {/* API配置对话框 */}
      {showApiKeyDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowApiKeyDialog(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDarkMode ? '#1a1d29' : '#ffffff',
              borderRadius: 8,
              padding: 24,
              minWidth: 360,
              maxWidth: '90vw',
              border: isDarkMode ? '1px solid #2d3142' : '1px solid #e5e7eb',
            }}
          >
            <h3 style={{ 
              margin: '0 0 16px 0',
              fontSize: 15,
              fontWeight: 500,
              color: isDarkMode ? '#e5e7eb' : '#111827',
            }}>
              配置 API 密钥
            </h3>

            <input
              type="password"
              placeholder="sk-xxxxxx"
              defaultValue={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 6,
                border: isDarkMode ? '1px solid #2d3142' : '1px solid #e5e7eb',
                background: isDarkMode ? '#23272f' : '#ffffff',
                color: isDarkMode ? '#e5e7eb' : '#111827',
                fontSize: 13,
                marginBottom: 16,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => saveApiKey(apiKey)}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  background: isDarkMode ? '#e5e7eb' : '#111827',
                  color: isDarkMode ? '#111827' : '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                保存
              </button>
              <button
                onClick={clearApiKey}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  background: isDarkMode ? '#2d3142' : '#f3f4f6',
                  color: isDarkMode ? '#e5e7eb' : '#111827',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                清除
              </button>
            </div>

            <p style={{
              fontSize: 11,
              color: isDarkMode ? '#6b7280' : '#9ca3af',
              marginTop: 12,
              marginBottom: 0,
              lineHeight: 1.5,
            }}>
              获取密钥：<a 
                href="https://platform.deepseek.com" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: isDarkMode ? '#9ca3af' : '#6b7280',
                }}
              >
                DeepSeek平台
              </a>
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        
        .markdown-content {
          font-size: 13px;
          line-height: 1.6;
        }
        
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          margin: 16px 0 8px 0;
          font-weight: 600;
        }
        
        .markdown-content h1 { font-size: 16px; }
        .markdown-content h2 { font-size: 15px; }
        .markdown-content h3 { font-size: 14px; }
        
        .markdown-content p {
          margin: 8px 0;
        }
        
        .markdown-content ul,
        .markdown-content ol {
          margin: 8px 0;
          padding-left: 20px;
        }
        
        .markdown-content li {
          margin: 4px 0;
        }
        
        .markdown-content code {
          background: ${isDarkMode ? '#23272f' : '#f3f4f6'};
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 12px;
          font-family: 'Monaco', 'Menlo', monospace;
        }
        
        .markdown-content pre {
          background: ${isDarkMode ? '#23272f' : '#f3f4f6'};
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
          margin: 12px 0;
        }
        
        .markdown-content pre code {
          background: none;
          padding: 0;
        }
        
        .markdown-content blockquote {
          border-left: 3px solid ${isDarkMode ? '#4b5563' : '#d1d5db'};
          padding-left: 12px;
          margin: 12px 0;
          color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
        }
        
        .markdown-content strong {
          font-weight: 600;
        }
        
        .markdown-content em {
          font-style: italic;
        }
      `}</style>
    </>
  );
};

export default AIBrainstormChat;
