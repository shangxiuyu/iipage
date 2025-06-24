import type { Descendant } from 'slate';

// URL正则表达式，匹配各种格式的网址
const URL_REGEX = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;

// 更严格的URL检测正则，确保是完整的网址
const STRICT_URL_REGEX = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;

// 全局URL匹配正则，用于从文本中提取所有URL
const GLOBAL_URL_REGEX = /(https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/g;

// 增强的URL提取正则，支持更多边界情况
const ENHANCED_URL_REGEX = /(https?:\/\/[^\s]+|(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;

// 常见的网站域名后缀
const COMMON_DOMAINS = [
  '.com', '.org', '.net', '.edu', '.gov', '.mil', '.int',
  '.cn', '.uk', '.de', '.fr', '.jp', '.au', '.ca', '.it',
  '.io', '.ai', '.me', '.co', '.app', '.dev', '.tech'
];

/**
 * 从Slate编辑器内容中提取纯文本
 */
export const extractTextFromSlateContent = (content: Descendant[]): string => {
  if (!content || !Array.isArray(content)) return '';
  
  return content.map(node => {
    if ('children' in node && Array.isArray(node.children)) {
      // 如果是段落节点，在段落之间添加换行符
      if ((node as any).type === 'paragraph') {
        return extractTextFromSlateContent(node.children);
      }
      return extractTextFromSlateContent(node.children);
    }
    return (node as any).text || '';
  }).join('\n').trim(); // 使用换行符连接段落
};

/**
 * 检查文本是否为有效的网址
 */
export const isValidUrl = (text: string): boolean => {
  if (!text || typeof text !== 'string') return false;
  
  const trimmedText = text.trim();
  
  // 基本长度检查
  if (trimmedText.length < 4) return false;
  
  // 检查是否包含常见域名后缀
  const hasValidDomain = COMMON_DOMAINS.some(domain => 
    trimmedText.toLowerCase().includes(domain)
  );
  
  if (!hasValidDomain) return false;
  
  // 使用正则表达式验证
  return STRICT_URL_REGEX.test(trimmedText);
};

/**
 * 规范化URL，添加协议前缀
 */
export const normalizeUrl = (url: string): string => {
  if (!url) return '';
  
  const trimmedUrl = url.trim();
  
  // 如果已经有协议，直接返回
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }
  
  // 默认添加https协议
  return `https://${trimmedUrl}`;
};

/**
 * 智能从文本中提取URL
 */
const extractUrlFromText = (text: string): string | null => {
  if (!text) return null;
  
  // 方法1: 使用增强正则全局匹配所有可能的URL
  const urlMatches = text.match(ENHANCED_URL_REGEX);
  if (urlMatches && urlMatches.length > 0) {
    // 找到最长的匹配（通常是最完整的URL）
    const sortedMatches = urlMatches.sort((a, b) => b.length - a.length);
    for (const match of sortedMatches) {
      const cleanUrl = match.trim();
      if (isValidUrl(cleanUrl)) {
        return cleanUrl;
      }
    }
  }
  
  // 方法2: 按行检查，寻找单独一行的URL
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (isValidUrl(line)) {
      return line;
    }
  }
  
  // 方法3: 按词分割，寻找包含域名的词
  const words = text.split(/[\s,，。.!！?？;；:：]+/).filter(Boolean);
  for (const word of words) {
    const cleanWord = word.trim();
    if (isValidUrl(cleanWord)) {
      return cleanWord;
    }
  }
  
  // 方法4: 特殊处理，移除常见的干扰字符
  const cleanedText = text.replace(/[""''「」【】()（）]/g, ' ');
  const specialWords = cleanedText.split(/\s+/).filter(Boolean);
  for (const word of specialWords) {
    if (isValidUrl(word)) {
      return word;
    }
  }
  
  return null;
};

/**
 * 检查卡片内容是否包含网址
 */
export const detectUrlInCard = (content: Descendant[]): string | null => {
  const text = extractTextFromSlateContent(content);
  
  if (!text) return null;
  
  console.log('🔍 检测文本中的URL:', text);
  
  // 使用增强的URL提取逻辑
  const detectedUrl = extractUrlFromText(text);
  
  if (detectedUrl) {
    console.log('✅ 找到URL:', detectedUrl);
    return detectedUrl;
  }
  
  console.log('❌ 未找到有效URL');
  return null;
};

/**
 * 从文本中提取所有网址
 */
export const extractAllUrls = (text: string): string[] => {
  if (!text) return [];
  
  const urls: string[] = [];
  
  // 使用增强正则提取所有URL
  const urlMatches = text.match(ENHANCED_URL_REGEX);
  if (urlMatches) {
    for (const match of urlMatches) {
      const cleanUrl = match.trim();
      if (isValidUrl(cleanUrl) && !urls.includes(cleanUrl)) {
        urls.push(cleanUrl);
      }
    }
  }
  
  // 如果正则没找到，再用传统方法
  if (urls.length === 0) {
    const words = text.split(/[\s,，。.!！?？;；:：]+/).filter(Boolean);
    for (const word of words) {
      const cleanWord = word.trim();
      if (isValidUrl(cleanWord) && !urls.includes(cleanWord)) {
        urls.push(cleanWord);
      }
    }
  }
  
  return urls;
};

/**
 * 检查URL是否可以在iframe中显示
 */
export const canDisplayInIframe = (url: string): boolean => {
  try {
    const urlObj = new URL(normalizeUrl(url));
    const hostname = urlObj.hostname.toLowerCase();
    
    // 一些网站不允许在iframe中显示（X-Frame-Options: DENY）
    const blockedSites = [
      'google.com',
      'facebook.com', 
      'twitter.com',
      'youtube.com',
      'instagram.com',
      'linkedin.com'
    ];
    
    return !blockedSites.some(site => hostname.includes(site));
  } catch {
    return false;
  }
}; 