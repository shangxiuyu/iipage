/**
 * Markdown格式检测工具
 * 用于自动识别用户粘贴的文本是否为Markdown格式
 */

// Markdown语法特征模式
const MARKDOWN_PATTERNS = [
  // 标题 (# ## ### #### ##### ######)
  /^#{1,6}\s+.+$/m,
  
  // 代码块 (```code``` 或 ~~~code~~~)
  /^```[\s\S]*?```$/m,
  /^~~~[\s\S]*?~~~$/m,
  
  // 行内代码 (`code`)
  /`[^`\n]+`/,
  
  // 粗体 (**text** 或 __text__)
  /\*\*[^*\n]+\*\*/,
  /__[^_\n]+__/,
  
  // 斜体 (*text* 或 _text_)
  /\*[^*\n]+\*/,
  /_[^_\n]+_/,
  
  // 链接 [text](url) 或 [text][ref]
  /\[.+?\]\([^)]+\)/,
  /\[.+?\]\[.+?\]/,
  
  // 图片 ![alt](url)
  /!\[.*?\]\([^)]+\)/,
  
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
  
  // 删除线 (~~text~~)
  /~~.+?~~/,
  
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

  const features: string[] = [];
  let score = 0;
  
  // 检测各种Markdown模式
  for (const pattern of MARKDOWN_PATTERNS) {
    if (pattern.test(trimmedText)) {
      const match = trimmedText.match(pattern);
      if (match) {
        features.push(match[0].substring(0, 50)); // 限制特征长度
        score += 1;
      }
    }
  }
  
  // 检测特殊字符指示器
  for (const indicator of MARKDOWN_INDICATORS) {
    if (trimmedText.includes(indicator)) {
      score += 0.3;
      if (!features.includes(indicator)) {
        features.push(indicator);
      }
    }
  }
  
  // 检测换行格式（Markdown通常有特定的换行模式）
  const lines = trimmedText.split('\n');
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
  
  // 快速检测关键特征
  const quickPatterns = [
    /^#{1,6}\s+/, // 标题
    /```/, // 代码块
    /\*\*.*?\*\*/, // 粗体
    /\[.*?\]\(.*?\)/, // 链接
    /^[\s]*[-*+]\s+/m, // 列表
    /^>\s+/m, // 引用
  ];
  
  return quickPatterns.some(pattern => pattern.test(text));
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
  const lines = text.split('\n');
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
  
  return {
    title,
    headings,
    hasCodeBlocks: /```[\s\S]*?```/.test(text),
    hasImages: /!\[.*?\]\([^)]+\)/.test(text),
    hasLinks: /\[.+?\]\([^)]+\)/.test(text),
    lineCount: lines.length
  };
} 