/**
 * 代码检测工具，用于自动检测代码类型和语言
 */

/**
 * 检测代码是否为HTML代码
 * @param code 要检测的代码
 * @returns 是否为HTML代码
 */
export const isHtmlCode = (code: string): boolean => {
  // 空内容不是HTML
  if (!code || code.trim() === '') return false;
  
  // 🔥 修复：长度限制，避免灾难性回溯
  if (code.length > 5000) {
    console.log('🚨 HTML检测: 代码过长，跳过复杂检测');
    return false;
  }
  
  // 简化的HTML标签模式，避免复杂回溯
  const htmlPattern = /<(doctype|html|head|body|div|span|p|a|img|ul|ol|li|table|form|input|button|h[1-6]|br|hr|section|article|nav|header|footer|canvas)/i;
  
  // 检查是否包含常见的HTML实体
  const htmlEntityPattern = /&(lt|gt|amp|quot|apos|nbsp|copy|reg);/i;
  
  // 如果内容以<开头并包含>，很可能是HTML
  const simpleHtmlCheck = code.trim().startsWith('<') && code.includes('>') && code.includes('</');
  
  return htmlPattern.test(code.trim()) || 
         htmlEntityPattern.test(code.trim()) ||
         simpleHtmlCheck;
};

/**
 * 检测代码是否为CSS代码
 * @param code 要检测的代码
 * @returns 是否为CSS代码
 */
export const isCssCode = (code: string): boolean => {
  // 空内容不是CSS
  if (!code || code.trim() === '') return false;
  
  // 🔥 修复：长度限制
  if (code.length > 3000) {
    console.log('🚨 CSS检测: 代码过长，跳过检测');
    return false;
  }
  
  // 简化的CSS模式，避免复杂回溯
  const cssPattern = /\{[^{}]{1,500}\}/; // 限制大括号内容长度
  const cssPropertyPattern = /(color|background|margin|padding|font|display|width|height|border|flex|grid|position)\s*:/i;
  
  // 确保不是HTML代码
  return (cssPattern.test(code.trim()) || cssPropertyPattern.test(code.trim())) && !isHtmlCode(code);
};

/**
 * 检测代码是否为JavaScript代码
 * @param code 要检测的代码
 * @returns 是否为JavaScript代码
 */
export const isJavaScriptCode = (code: string): boolean => {
  // 空内容不是JavaScript
  if (!code || code.trim() === '') return false;
  
  // 🔥 修复：长度限制
  if (code.length > 10000) {
    console.log('🚨 JS检测: 代码过长，跳过检测');
    return false;
  }
  
  // 简化的JS关键字检测，避免复杂正则
  const trimmedCode = code.trim();
  const jsKeywords = [
    'function ', 'const ', 'let ', 'var ', 'import ', 'export ',
    'class ', '=>', 'console.log', 'document.', 'window.',
    'addEventListener', 'return ', 'if (', 'for (', 'while (',
    'setTimeout', 'setInterval', 'fetch(', 'async ', 'await ',
    'forEach', '.map(', 'Object.', 'JSON.'
  ];
  
  const hasJsKeywords = jsKeywords.some(keyword => trimmedCode.includes(keyword));
  const hasCodeStructure = trimmedCode.includes('{') && trimmedCode.includes('}');
  
  return hasJsKeywords && hasCodeStructure && 
         !isHtmlCode(code) && 
         !isCssCode(code);
};

/**
 * 检测代码是否为React/JSX代码
 * @param code 要检测的代码
 * @returns 是否为React/JSX代码
 */
export const isReactCode = (code: string): boolean => {
  // 空内容不是React代码
  if (!code || code.trim() === '') return false;
  
  // 🔥 修复：长度限制
  if (code.length > 8000) {
    console.log('🚨 React检测: 代码过长，跳过检测');
    return false;
  }
  
  const trimmedCode = code.trim();
  const reactKeywords = [
    'import React', 'from "react"', 'from \'react\'',
    'useState(', 'useEffect(', 'useContext(', 'useRef(',
    'useCallback(', 'useMemo(', 'useReducer(',
    'React.', 'export default', 'extends Component', 'render()'
  ];
  
  // 简化的JSX检测 - 避免复杂正则
  const hasReactKeywords = reactKeywords.some(keyword => trimmedCode.includes(keyword));
  const hasJSXLike = trimmedCode.includes('<') && trimmedCode.includes('/>');
  
  return hasReactKeywords || hasJSXLike;
};

/**
 * 检测代码语言
 * @param code 要检测的代码
 * @returns 检测到的语言
 */
export const detectCodeLanguage = (code: string): string => {
  // 空内容返回普通文本
  if (!code || code.trim() === '') return 'text';
  
  // 🔥 关键修复：超长文本直接返回text，避免所有正则检测
  if (code.length > 10000) {
    console.log('🚨 detectCodeLanguage: 文本过长，跳过所有代码检测');
    return 'text';
  }
  
  // 🔥 修复：简化URL检测，快速排除URL
  const trimmedCode = code.trim();
  if (trimmedCode.startsWith('http') && !trimmedCode.includes('\n') && !trimmedCode.includes(' ')) {
    console.log('🚨 detectCodeLanguage: 检测到URL，返回text');
    return 'text';
  }
  
  try {
    // 尝试从代码前几行中检查是否有语言提示注释
    const firstFewLines = code.split('\n').slice(0, 3).join('\n'); // 减少检查行数
    const languageHintMatch = firstFewLines.match(/\/\/\s*language:\s*(\w+)/i) || 
                              firstFewLines.match(/\/\*\s*language:\s*(\w+)\s*\*\//i) ||
                              firstFewLines.match(/<!--\s*language:\s*(\w+)\s*-->/i);
    
    if (languageHintMatch) {
      const hintedLanguage = languageHintMatch[1].toLowerCase();
      return hintedLanguage;
    }
    
    // 优先检测HTML，因为它最容易识别
    if (isHtmlCode(code)) {
      return 'html';
    }
    
    if (isCssCode(code)) {
      return 'css';
    }
    
    if (isReactCode(code)) {
      return 'jsx';
    }
    
    if (isJavaScriptCode(code)) {
      return 'javascript';
    }
    
    // 如果代码长度适中且包含代码特征，默认为JavaScript
    if (code.trim().length > 20 && code.trim().length < 2000 &&
       (code.includes('(') || code.includes('{') || code.includes(';'))) {
      return 'javascript';
    }
    
    // 默认为普通文本
    return 'text';
  } catch (error) {
    console.warn('⚠️ detectCodeLanguage 检测出错:', error);
    return 'text';
  }
};

/**
 * 从Slate编辑器内容中提取代码块
 * @param content Slate编辑器内容
 * @returns 提取的代码和语言
 */
export const extractCodeFromContent = (content: any[]): { code: string, language: string } | null => {
  if (!content || content.length === 0) return null;
  
  // 从编辑器内容中提取纯文本
  const textContent = content
    .map((node: any) => {
      if (node.type === 'paragraph' && node.children) {
        return node.children.map((child: any) => child.text || '').join('');
      }
      return '';
    })
    .join('\n')
    .trim();
  
  if (!textContent) {
    return null;
  }
  
  // 🔥 修复：长度检查
  if (textContent.length > 15000) {
    console.log('🚨 extractCodeFromContent: 内容过长，跳过检测');
    return null;
  }
  
  // 特殊处理：如果内容看起来像HTML，优先检测为HTML
  if (textContent.includes('<') && textContent.includes('>') && textContent.length < 5000) {
    // 简单检查是否包含HTML标签
    if (/<\/?[a-zA-Z][^>]{0,100}>/.test(textContent)) {
      return {
        code: textContent,
        language: 'html'
      };
    }
  }
  
  // 检测代码语言
  const language = detectCodeLanguage(textContent);
  
  // 只有当检测到的不是普通文本时才返回代码
  if (language !== 'text') {
    return {
      code: textContent,
      language
    };
  }
  
  // 作为备选方案，如果内容看起来像代码但没被识别，并且长度适中，尝试将其视为JavaScript
  if (textContent.length > 30 && textContent.length < 3000 &&
     (textContent.includes('{') || textContent.includes('(') || textContent.includes(';'))) {
    return {
      code: textContent,
      language: 'javascript'
    };
  }
  
  return null;
};

export default {
  isHtmlCode,
  isCssCode,
  isJavaScriptCode,
  isReactCode,
  detectCodeLanguage,
  extractCodeFromContent
}; 