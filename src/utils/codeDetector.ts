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
  
  // 更全面的HTML标签模式
  const htmlPattern = /<\s*(!doctype|html|head|body|div|span|p|a|img|ul|ol|li|table|form|input|button|h[1-6]|br|hr|section|article|nav|header|footer|canvas)/i;
  
  // 检查是否包含常见的HTML实体
  const htmlEntityPattern = /&(lt|gt|amp|quot|apos|nbsp|copy|reg);/i;
  
  // 检测更复杂的HTML结构模式
  const htmlStructurePattern = /<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>/is;
  
  // 如果内容以<开头并包含>，很可能是HTML
  const simpleHtmlCheck = code.trim().startsWith('<') && code.includes('>');
  
  return htmlPattern.test(code.trim()) || 
         htmlEntityPattern.test(code.trim()) || 
         htmlStructurePattern.test(code.trim()) ||
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
  
  // 更全面的CSS选择器和属性模式
  const cssPattern = /((body|div|\.[\w-]+|#[\w-]+|\*|[a-z]+)(\s*[>+~]\s*|\s+)([\.\#\w-]+|\*|\[.+?\])*\s*{[\s\S]*?}|([\.\#\w-]+|\*|\[.+?\])*\s*{[\s\S]*?})/i;
  
  // 常见的CSS属性模式
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
  
  // 常见的JS关键字和模式
  const jsPatterns = [
    /function\s+\w+\s*\(/i,
    /const\s+\w+\s*=/i,
    /let\s+\w+\s*=/i,
    /var\s+\w+\s*=/i,
    /import\s+.*?from/i,
    /export\s+(default\s+)?(function|class|const|let|var)/i,
    /class\s+\w+(\s+extends\s+\w+)?\s*{/i,
    /=>\s*{/i,
    /document\.querySelector/i,
    /document\.getElementById/i,
    /window\.(addEventListener|onload)/i,
    /addEventListener\(/i,
    /console\.log\(/i,
    /return\s+[\w\(\{\['"]/i,
    /if\s*\([^)]*\)\s*{/i,
    /for\s*\([^)]*\)\s*{/i,
    /while\s*\([^)]*\)\s*{/i,
    /setTimeout\(/i,
    /setInterval\(/i,
    /fetch\(/i,
    /new\s+Promise\(/i,
    /async\s+function/i,
    /await\s+/i,
    /\[\w+\].forEach\(/i,
    /\[\w+\].map\(/i,
    /Object\.keys\(/i,
    /JSON\.(parse|stringify)\(/i
  ];
  
  // 单行简单JavaScript语句检测
  const simpleJsPattern = /^(\w+\s*=\s*[\w\d'"`.]+|console\.log\(.+\)|alert\(.+\)|document\.\w+\(.+\)|window\.\w+\(.+\));?$/;
  
  return (jsPatterns.some(pattern => pattern.test(code.trim())) || 
         simpleJsPattern.test(code.trim())) && 
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
  
  const reactPatterns = [
    /import\s+React/i,
    /import\s+{.*?}\s+from\s+['"]react['"]/i,
    /React\.useState/i,
    /React\.useEffect/i,
    /React\.Component/i,
    /useState\(/i,
    /useEffect\(/i,
    /useContext\(/i,
    /useRef\(/i,
    /useCallback\(/i,
    /useMemo\(/i,
    /useReducer\(/i,
    /<\s*[A-Z][A-Za-z]*(\s+\w+\s*=\s*{[^}]*}|\s+\w+\s*=\s*["'][^"']*["'])*\s*\/?\s*>/i, // JSX组件
    /<\s*[A-Z][A-Za-z]*(\s+\w+\s*=\s*{[^}]*}|\s+\w+\s*=\s*["'][^"']*["'])*\s*>\s*.*?\s*<\/\s*[A-Z][A-Za-z]*\s*>/i, // 完整的JSX组件带闭合标签
    /export\s+default\s+\w+/i,
    /class\s+\w+\s+extends\s+(React\.)?Component/i,
    /render\(\)\s*{/i
  ];
  
  return reactPatterns.some(pattern => pattern.test(code.trim()));
};

/**
 * 检测代码语言
 * @param code 要检测的代码
 * @returns 检测到的语言
 */
export const detectCodeLanguage = (code: string): string => {
  // 空内容返回普通文本
  if (!code || code.trim() === '') return 'text';
  
  // 尝试从代码前几行中检查是否有语言提示注释
  const firstFewLines = code.split('\n').slice(0, 5).join('\n');
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
  
  // 如果代码长度超过一定阈值且包含代码特征，默认为JavaScript
  if (code.trim().length > 20 && 
     (code.includes('(') || code.includes('{') || code.includes(';'))) {
    return 'javascript';
  }
  
  // 默认为普通文本
  return 'text';
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
  
  // 特殊处理：如果内容看起来像HTML，优先检测为HTML
  if (textContent.includes('<') && textContent.includes('>')) {
    // 简单检查是否包含HTML标签
    const htmlTagRegex = /<\/?[a-zA-Z][^>]*>/;
    if (htmlTagRegex.test(textContent)) {
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
  
  // 作为备选方案，如果内容看起来像代码但没被识别，并且超过一定长度，尝试将其视为JavaScript
  if (textContent.length > 30 && 
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