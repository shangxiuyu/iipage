import React, { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeEditorProps {
  code: string;
  language?: string;
  onChange?: (code: string) => void;
  readOnly?: boolean;
  style?: React.CSSProperties;
}

// 支持的语言列表
const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'html', name: 'HTML' },
  { id: 'css', name: 'CSS' },
  { id: 'jsx', name: 'React JSX' },
  { id: 'tsx', name: 'React TSX' },
  { id: 'json', name: 'JSON' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'csharp', name: 'C#' },
  { id: 'cpp', name: 'C++' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'markdown', name: 'Markdown' },
];

// 自动检测代码语言
const detectLanguage = (code: string): string => {
  if (!code || code.trim() === '') return 'javascript';
  
  // HTML检测
  if (code.includes('<!DOCTYPE html>') || 
      (code.includes('<html') && code.includes('</html>')) || 
      (code.match(/<\w+>.*<\/\w+>/s) && code.includes('<div'))) {
    return 'html';
  }
  
  // CSS检测
  if (code.includes('{') && code.includes('}') && 
      code.match(/[\w\-]+\s*:\s*[\w\-]+\s*;/)) {
    return 'css';
  }
  
  // JavaScript/TypeScript检测
  if (code.includes('function') || code.includes('=>') || 
      code.includes('var ') || code.includes('let ') || code.includes('const ')) {
    // TypeScript特有关键字
    if (code.includes('interface ') || code.includes('type ') || 
        code.includes(':') && code.match(/:\s*(string|number|boolean|any)\b/)) {
      return 'typescript';
    }
    
    // React JSX/TSX
    if (code.includes('import React') || code.includes('<div>') || 
        code.includes('</div>') || code.includes('useState')) {
      return code.includes(':') && code.match(/:\s*(string|number|boolean|any)\b/) 
        ? 'tsx' 
        : 'jsx';
    }
    
    return 'javascript';
  }
  
  // JSON检测
  if ((code.startsWith('{') && code.endsWith('}')) || 
      (code.startsWith('[') && code.endsWith(']'))) {
    try {
      JSON.parse(code);
      return 'json';
    } catch (e) {
      // 不是有效的JSON
    }
  }
  
  // Python检测
  if (code.includes('def ') || code.includes('import ') || 
      code.includes('class ') && code.includes(':')) {
    return 'python';
  }
  
  // 默认为JavaScript
  return 'javascript';
};

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  code, 
  language = 'javascript', 
  onChange, 
  readOnly = false,
  style
}) => {
  const [value, setValue] = useState(code || '');
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  
  useEffect(() => {
    setValue(code || '');
  }, [code]);
  
  useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onChange?.(newValue);
  };
  
  const handleLanguageChange = (langId: string) => {
    setSelectedLanguage(langId);
    setShowLanguageDropdown(false);
  };
  
  const handleAutoDetect = () => {
    const detectedLang = detectLanguage(value);
    setSelectedLanguage(detectedLang);
    setShowLanguageDropdown(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 处理Tab键
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      
      // 在光标位置插入两个空格
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      setValue(newValue);
      onChange?.(newValue);
      
      // 重新设置光标位置
      setTimeout(() => {
        const textarea = e.currentTarget;
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // 如果是只读模式，直接使用语法高亮显示代码
  if (readOnly) {
    return (
      <div className="code-editor-readonly" style={{ ...style, position: 'relative' }}>
        <div className="code-editor-header" style={{ 
          padding: '4px 8px', 
          background: '#2d2d2d', 
          color: '#ccc', 
          borderTopLeftRadius: '4px', 
          borderTopRightRadius: '4px',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{SUPPORTED_LANGUAGES.find(l => l.id === selectedLanguage)?.name || selectedLanguage}</span>
        </div>
        {React.createElement(SyntaxHighlighter, {
          language: selectedLanguage,
          style: tomorrow,
          customStyle: {
            margin: 0,
            borderBottomLeftRadius: '4px',
            borderBottomRightRadius: '4px',
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            fontSize: '14px',
            padding: '12px',
            overflow: 'auto'
          }
        }, value || '// 空代码块')}
      </div>
    );
  }

  // 编辑模式：创建一个可编辑的文本区域
  return (
    <div className="code-editor-container" style={{ position: 'relative', ...style }}>
      <div className="code-editor-header" style={{ 
        padding: '4px 8px', 
        background: '#2d2d2d', 
        color: '#ccc', 
        borderTopLeftRadius: '4px', 
        borderTopRightRadius: '4px',
        fontSize: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        userSelect: 'none'
      }}>
        <div style={{ position: 'relative' }}>
          <span 
            style={{ cursor: 'pointer' }}
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
          >
            {SUPPORTED_LANGUAGES.find(l => l.id === selectedLanguage)?.name || selectedLanguage} ▼
          </span>
          
          {showLanguageDropdown && (
            <div style={{ 
              position: 'absolute', 
              top: '100%', 
              left: 0, 
              zIndex: 100,
              background: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              width: '150px',
              maxHeight: '200px',
              overflowY: 'auto',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}>
              <div 
                style={{ padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid #444' }}
                onClick={handleAutoDetect}
              >
                自动检测语言
              </div>
              {SUPPORTED_LANGUAGES.map(lang => (
                <div 
                  key={lang.id}
                  style={{ 
                    padding: '6px 8px', 
                    cursor: 'pointer',
                    background: selectedLanguage === lang.id ? '#444' : 'transparent',
                    color: selectedLanguage === lang.id ? '#fff' : '#ccc'
                  }}
                  onClick={() => handleLanguageChange(lang.id)}
                >
                  {lang.name}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <span 
            style={{ cursor: 'pointer', fontSize: '12px', opacity: 0.7 }}
            title="自动检测代码语言"
            onClick={handleAutoDetect}
          >
            检测语言
          </span>
          <span
            style={{ cursor: 'pointer', fontSize: '12px', opacity: 0.7 }}
            title="格式化代码"
          >
            格式化
          </span>
        </div>
      </div>
      
      <textarea
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          minHeight: '100px',
          height: 'calc(100% - 28px)', // 减去header高度
          padding: '10px',
          fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
          fontSize: '14px',
          lineHeight: 1.5,
          color: '#eee',
          backgroundColor: '#2d2d2d',
          border: 'none',
          borderBottomLeftRadius: '4px',
          borderBottomRightRadius: '4px',
          resize: 'vertical',
          outline: 'none',
          overflow: 'auto',
          tabSize: 2
        }}
        spellCheck={false}
        placeholder="在此输入代码..."
      />
      
      {/* 简单的行号指示器 */}
      <div style={{
        position: 'absolute',
        top: '28px', // header高度
        left: 0,
        bottom: 0,
        width: '30px',
        backgroundColor: '#252525',
        color: '#666',
        fontSize: '14px',
        fontFamily: 'monospace',
        userSelect: 'none',
        textAlign: 'right',
        borderBottomLeftRadius: '4px',
        overflow: 'hidden',
        pointerEvents: 'none',
        display: 'none' // 暂时隐藏，需要滚动同步才能正确显示
      }}>
        {value.split('\n').map((_, i) => (
          <div key={i} style={{ padding: '0 4px' }}>{i + 1}</div>
        ))}
      </div>
    </div>
  );
};

export default CodeEditor; 