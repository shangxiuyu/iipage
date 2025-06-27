/**
 * Markdown格式检测工具
 * 用于自动识别用户粘贴的文本是否为Markdown格式
 */

// Markdown语法特征模式 - 优化版本，避免灾难性回溯
const MARKDOWN_PATTERNS = [
  // 标题 (# ## ### #### ##### ######)
  /^#{1,6}\s+.+$/m,
  
  // 代码块 (```code``` 或 ~~~code~~~) - 优化：限制长度，避免回溯
  /^```[\s\S]{0,5000}?```$/m,
  /^~~~[\s\S]{0,5000}?~~~$/m,
  
  // 行内代码 (`code`) - 优化：限制长度
  /`[^`\n]{1,200}`/,
  
  // 粗体 (**text** 或 __text__) - 优化：使用否定字符集，限制长度
  /\*\*[^*\n]{1,200}\*\*/,
  /__[^_\n]{1,200}__/,
  
  // 斜体 (*text* 或 _text_) - 优化：限制长度
  /\*[^*\n]{1,200}\*/,
  /_[^_\n]{1,200}_/,
  
  // 链接 [text](url) 或 [text][ref] - 优化：限制长度，避免回溯
  /\[[^\]]{1,200}\]\([^)]{1,500}\)/,
  /\[[^\]]{1,200}\]\[[^\]]{1,100}\]/,
  
  // 图片 ![alt](url) - 优化：限制长度
  /!\[[^\]]{0,200}\]\([^)]{1,500}\)/,
  
  // 无序列表 (- item, * item, + item)
  /^[\s]*[-*+]\s+.+$/m,
  
  // 有序列表 (1. item, 2. item)
  /^[\s]*\d+\.\s+.+$/m,
  
  // 引用 (> text)
  /^>\s*.+$/m,
  
  // 水平线 (--- 或 *** 或 ___)
  /^[\s]*[-*_]{3,}[\s]*$/m,
  
  // 表格 (| col1 | col2 |)
  /^\|.+\|$/m,
  /^[\s]*\|?[\s]*:?-+:?[\s]*\|/m,
  
  // 删除线 (~~text~~) - 优化：限制长度
  /~~[^~]{1,200}~~/,
  
  // 任务列表 (- [x] task, - [ ] task)
  /^[\s]*[-*+]\s+\[[x\s]\]\s+.+$/m,
];

// 特殊字符组合，增加Markdown可能性
const MARKDOWN_INDICATORS = [
  '```', '~~~', '**', '__', '![', '](', '> ', '- [', '| ',
  '---', '***', '___', '~~', '`'
];

/**
 * 检测文本是否可能是Markdown格式
 * @param text - 要检测的文本
 * @returns 检测结果对象
 */
export function detectMarkdown(text: string): {
  isMarkdown: boolean;
  confidence: number; // 0-1 的置信度
  features: string[]; // 检测到的特征
} {
  if (!text || typeof text !== 'string') {
    return { isMarkdown: false, confidence: 0, features: [] };
  }

  // 去除首尾空白
  const trimmedText = text.trim();
  
  // 如果文本太短，不太可能是复杂的Markdown
  if (trimmedText.length < 10) {
    return { isMarkdown: false, confidence: 0, features: [] };
  }

  // 🔥 关键优化：如果文本过长且看起来像单一URL，快速返回非Markdown
  if (trimmedText.length > 1000) {
    // 检查是否是纯URL（没有空格、换行等）
    const hasSpacesOrNewlines = /[\s\n\r]/.test(trimmedText);
    const looksLikeUrl = /^https?:\/\/[^\s]+$/i.test(trimmedText.substring(0, 100));
    
    if (!hasSpacesOrNewlines && looksLikeUrl) {
      console.log('📎 检测到长URL，跳过Markdown检测');
      return { isMarkdown: false, confidence: 0, features: ['长URL'] };
    }
    
    // 对于超长文本，只检查前2000个字符，避免性能问题
    console.log('📄 文本过长，仅检查前2000字符');
    const limitedText = trimmedText.substring(0, 2000);
    return detectMarkdownLimited(limitedText);
  }

  return detectMarkdownLimited(trimmedText);
}

/**
 * 限制版本的Markdown检测，避免性能问题
 */
function detectMarkdownLimited(text: string): {
  isMarkdown: boolean;
  confidence: number;
  features: string[];
} {
  const features: string[] = [];
  let score = 0;
  
  // 检测各种Markdown模式 - 使用 try-catch 避免正则表达式错误
  for (const pattern of MARKDOWN_PATTERNS) {
    try {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        if (match) {
          features.push(match[0].substring(0, 50)); // 限制特征长度
          score += 1;
        }
      }
    } catch (error) {
      console.warn('⚠️ 正则表达式执行出错:', error);
      // 继续检测其他模式
    }
  }
  
  // 检测特殊字符指示器
  for (const indicator of MARKDOWN_INDICATORS) {
    if (text.includes(indicator)) {
      score += 0.3;
      if (!features.includes(indicator)) {
        features.push(indicator);
      }
    }
  }
  
  // 检测换行格式（Markdown通常有特定的换行模式）
  const lines = text.split('\n');
  if (lines.length > 1) {
    // 检查是否有空行分段（Markdown常见模式）
    const hasBlankLines = lines.some(line => line.trim() === '');
    if (hasBlankLines) {
      score += 0.2;
      features.push('空行分段');
    }
    
    // 检查是否有缩进（代码块或列表）
    const hasIndentation = lines.some(line => line.startsWith('  ') || line.startsWith('\t'));
    if (hasIndentation) {
      score += 0.2;
      features.push('缩进格式');
    }
  }
  
  // 计算置信度
  const confidence = Math.min(score / 5, 1); // 最大分数为5，归一化到0-1
  
  // 判断是否为Markdown（置信度大于0.3认为是Markdown）
  const isMarkdown = confidence > 0.3;
  
  return {
    isMarkdown,
    confidence,
    features: features.slice(0, 10) // 最多返回10个特征
  };
}

/**
 * 快速检测是否可能是Markdown（简化版本，用于实时检测）
 * @param text - 要检测的文本
 * @returns 是否可能是Markdown
 */
export function isLikelyMarkdown(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  // 🔥 快速排除长URL
  if (text.length > 500 && /^https?:\/\/[^\s]+$/i.test(text.substring(0, 100))) {
    return false;
  }
  
  // 快速检测关键特征
  const quickPatterns = [
    /^#{1,6}\s+/, // 标题
    /```/, // 代码块
    /\*\*.*?\*\*/, // 粗体
    /\[.*?\]\(.*?\)/, // 链接
    /^[\s]*[-*+]\s+/m, // 列表
    /^>\s+/m, // 引用
  ];
  
  try {
    return quickPatterns.some(pattern => pattern.test(text));
  } catch (error) {
    console.warn('⚠️ 快速Markdown检测出错:', error);
    return false;
  }
}

/**
 * 提取Markdown文本的摘要信息
 * @param text - Markdown文本
 * @returns 摘要信息
 */
export function getMarkdownSummary(text: string): {
  title?: string;
  headings: string[];
  hasCodeBlocks: boolean;
  hasImages: boolean;
  hasLinks: boolean;
  lineCount: number;
} {
  // 🔥 对长文本进行限制处理
  const limitedText = text.length > 5000 ? text.substring(0, 5000) : text;
  const lines = limitedText.split('\n');
  const headings: string[] = [];
  
  // 提取标题
  let title: string | undefined;
  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      
      if (!title && level === 1) {
        title = text;
      }
      headings.push(text);
    }
  }
  
  try {
    return {
      title,
      headings,
      hasCodeBlocks: /```[\s\S]{0,1000}?```/.test(limitedText), // 限制检测长度
      hasImages: /!\[[^\]]{0,100}\]\([^)]{1,200}\)/.test(limitedText), // 限制检测长度
      hasLinks: /\[[^\]]{1,100}\]\([^)]{1,200}\)/.test(limitedText), // 限制检测长度
      lineCount: lines.length
    };
  } catch (error) {
    console.warn('⚠️ Markdown摘要提取出错:', error);
    return {
      title,
      headings,
      hasCodeBlocks: false,
      hasImages: false,
      hasLinks: false,
      lineCount: lines.length
    };
  }
} 