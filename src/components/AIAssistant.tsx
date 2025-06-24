import React, { useState, useContext } from 'react';
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
  const [result, setResult] = useState<AICommand | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('deepseek_api_key') || '');
  const theme = useContext(ThemeContext);
  const isDarkMode = theme?.isDarkMode;

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

  // 调用DeepSeek API
  const callDeepSeek = async (text: string): Promise<AICommand> => {
    if (!apiKey) throw new Error('请先配置DeepSeek API密钥');
    const systemPrompt = `你是一个专业的白板内容设计师。请根据用户的需求，自动判断并生成最合适的卡片数量、内容和卡片之间的连线结构。\n\n- 你可以生成任意数量的卡片，每张卡片内容要简明、重点突出、排版美观。\n- 如果卡片之间有逻辑或结构关系（如流程、树状、分支、思维导图等），请用"EDGES"部分描述连线关系；如果没有连线需求，可以省略EDGES部分。\n- 卡片内容请用Markdown格式输出，每张卡片之间用"---"分隔。\n- 如果有连线关系，请在所有卡片内容后，单独用如下格式输出卡片连线关系（EDGES）：\n---\nEDGES:\n[\n  {"from": 0, "to": 1},\n  {"from": 0, "to": 2}\n]\n其中from和to为卡片的顺序编号（从0开始），支持任意结构（线性、树状、分支、放射等）。\n- 输出内容必须逻辑清晰、结构合理、排版美观，避免冗余和杂乱。\n- 只返回Markdown和EDGES，不要多余解释，不要JSON对象包裹。\n\n请根据用户输入的主题或需求，灵活设计卡片和连线结构。`;
    const body = {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.6,
      max_tokens: 2048,
      top_p: 0.95
    };
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`DeepSeek API请求失败: ${resp.status} ${err}`);
    }
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    // 直接返回Markdown字符串，不做JSON.parse
    return content.trim();
  };

  // 兼容：无API密钥时仍可用mock
  const mockAIRequest = async (text: string): Promise<AICommand> => {
    if (text.includes('产品开发')) {
      return {
        nodes: [
          { id: '1', title: '需求分析', desc: '需求分析的简要说明' },
          { id: '2', title: '设计', desc: '设计的简要说明' },
          { id: '3', title: '开发', desc: '开发的简要说明' },
          { id: '4', title: '测试', desc: '测试的简要说明' },
          { id: '5', title: '上线', desc: '上线的简要说明' },
        ],
        edges: [
          { from: '1', to: '2' },
          { from: '2', to: '3' },
          { from: '3', to: '4' },
          { from: '4', to: '5' },
        ],
      };
    } else if (text.includes('会议议程')) {
      return {
        nodes: [
          { id: '1', title: '开场', desc: '开场的简要说明' },
          { id: '2', title: '主题演讲', desc: '主题演讲的简要说明' },
          { id: '3', title: '讨论', desc: '讨论的简要说明' },
          { id: '4', title: '总结', desc: '总结的简要说明' },
        ],
        edges: [
          { from: '1', to: '2' },
          { from: '2', to: '3' },
          { from: '3', to: '4' },
        ],
      };
    } else {
      throw new Error('暂不支持该场景，请输入"产品开发流程"或"会议议程"测试');
    }
  };

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let res: AICommand;
      if (apiKey) {
        res = await callDeepSeek(input);
      } else {
        res = await mockAIRequest(input);
      }
      setResult(res);
      if (onAICommand) onAICommand(res);
    } catch (e: any) {
      setError(e.message || 'AI解析失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      right: 20,
      bottom: 20,
      width: 310,
      background: isDarkMode ? '#23272f' : 'rgba(255,255,255,0.98)',
      border: isDarkMode ? '1px solid #333' : '1px solid #eee',
      borderRadius: 10,
      boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.25)' : '0 2px 12px rgba(0,0,0,0.07)',
      zIndex: 1000,
      padding: 14,
      boxSizing: 'border-box',
      minHeight: 120,
      color: isDarkMode ? '#e5e7eb' : '#222',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 'bold', fontSize: 15, color: isDarkMode ? '#cbd5e1' : '#222' }}>AI助手</span>
        <span
          onClick={onClose}
          style={{
            cursor: 'pointer',
            fontSize: 18,
            color: isDarkMode ? '#888' : '#888',
            fontWeight: 'bold',
            lineHeight: 1,
            padding: '2px 6px',
            borderRadius: 5,
            userSelect: 'none',
          }}
          title="关闭"
        >×</span>
      </div>
      <div style={{ position: 'relative', minHeight: 60 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="请输入需求，如'帮我生成一个产品开发流程'"
          rows={3}
          style={{
            width: '100%',
            resize: 'none',
            marginBottom: 0,
            fontSize: 14,
            padding: '10px 8px',
            borderRadius: 6,
            border: isDarkMode ? '1px solid #444b5a' : '1px solid #d1d5db',
            boxSizing: 'border-box',
            minHeight: 48,
            lineHeight: 1.5,
            background: loading ? (isDarkMode ? '#23272f' : '#f3f4f6') : (isDarkMode ? '#181F2A' : '#fff'),
            color: isDarkMode ? '#e5e7eb' : '#222',
          }}
          disabled={loading}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div
          style={{ fontSize: 12, color: apiKey ? '#28a745' : (isDarkMode ? '#facc15' : '#b45309'), cursor: 'pointer', whiteSpace: 'nowrap' }}
          onClick={() => setShowApiKeyDialog(true)}
        >
          {apiKey ? 'DeepSeek API已配置' : '点击配置DeepSeek API密钥'}
        </div>
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            minWidth: 60,
            height: 30,
            padding: '0 12px',
            borderRadius: 5,
            background: loading || !input.trim() ? (isDarkMode ? '#334155' : '#cbd5e1') : (isDarkMode ? '#4f8cff' : '#4f8cff'),
            color: '#fff',
            border: 'none',
            fontWeight: 'bold',
            fontSize: 13,
            boxShadow: isDarkMode ? '0 1px 3px rgba(79,140,255,0.10)' : '0 1px 3px rgba(79,140,255,0.07)',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !input.trim() ? 0.7 : 1,
            marginLeft: 10,
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'AI生成中...' : '发送'}
        </button>
      </div>
      {error && <div style={{ color: 'red', marginTop: 6, fontSize: 12 }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>AI解析结果：</div>
          {Array.isArray(result) ? (
            <div>
              <div>富文本内容（预览）：</div>
              <pre style={{ fontSize: 12, background: '#f8f8f8', padding: 8, borderRadius: 4, maxHeight: 200, overflow: 'auto' }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ) : (
            <div>
              <div>卡片：</div>
              <ul>
                {result.nodes?.map((n: any) => <li key={n.id}>{n.title} - {n.desc}</li>)}
              </ul>
              <div>连线：</div>
              <ul>
                {result.edges?.map((e: any, i: number) => <li key={i}>{result.nodes?.find((n: any) => n.id === e.from)?.title} → {result.nodes?.find((n: any) => n.id === e.to)?.title}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      {showApiKeyDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, minWidth: 320 }}>
            <div style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 12 }}>配置 DeepSeek API 密钥</div>
            <input
              type="password"
              placeholder="sk-xxxxxx"
              defaultValue={apiKey}
              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #eee', marginBottom: 12 }}
              onChange={e => setApiKey(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => saveApiKey(apiKey)} style={{ flex: 1, background: '#4f8cff', color: '#fff', border: 'none', borderRadius: 6, padding: 8 }}>保存</button>
              <button onClick={clearApiKey} style={{ flex: 1, background: '#eee', color: '#b45309', border: 'none', borderRadius: 6, padding: 8 }}>清除</button>
              <button onClick={() => setShowApiKeyDialog(false)} style={{ flex: 1, background: '#eee', color: '#333', border: 'none', borderRadius: 6, padding: 8 }}>关闭</button>
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
              API密钥仅保存在本地浏览器，不会上传服务器。<br />
              获取密钥请访问 <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer">DeepSeek平台</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant; 