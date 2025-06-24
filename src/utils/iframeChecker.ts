// 检查网站是否可能支持iframe嵌入的工具
export interface IframeCheckResult {
  canEmbed: boolean;
  reason?: string;
  confidence: 'high' | 'medium' | 'low';
}

// 已知不支持iframe的网站列表
const BLOCKED_DOMAINS = [
  'google.com',
  'youtube.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'linkedin.com',
  'amazon.com',
  'ebay.com',
  'paypal.com',
  'apple.com',
  'microsoft.com',
  'netflix.com',
  'github.com', // GitHub有时候会阻止
  'stackoverflow.com', // 有时候会阻止
  'notion.site', // Notion页面严格禁止iframe嵌入
  'notion.so', // Notion的另一个域名
];

// 通常支持iframe的网站类型
const FRIENDLY_DOMAINS = [
  'example.com',
  'httpbin.org',
  'jsonplaceholder.typicode.com',
  'httpstat.us',
  'reqres.in',
  'via.placeholder.com',
  'developer.mozilla.org',
  'css-tricks.com',
  'npmjs.com',
  'codesandbox.io',
  'codepen.io',
  'jsfiddle.net',
];

/**
 * 检查URL是否可能支持iframe嵌入
 */
export function checkIframeCompatibility(url: string): IframeCheckResult {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = urlObj.hostname.toLowerCase();
    
    // 检查是否在友好列表中
    const isFriendly = FRIENDLY_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
    
    if (isFriendly) {
      return {
        canEmbed: true,
        reason: '网站通常支持iframe嵌入',
        confidence: 'high'
      };
    }
    
    // 检查是否在阻止列表中
    const isBlocked = BLOCKED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
    
    if (isBlocked) {
      return {
        canEmbed: false,
        reason: '网站通常阻止iframe嵌入',
        confidence: 'high'
      };
    }
    
    // 基于域名特征判断
    if (hostname.includes('bank') || hostname.includes('payment')) {
      return {
        canEmbed: false,
        reason: '金融网站通常阻止iframe嵌入',
        confidence: 'medium'
      };
    }
    
    if (hostname.includes('gov') || hostname.endsWith('.gov')) {
      return {
        canEmbed: false,
        reason: '政府网站通常阻止iframe嵌入',
        confidence: 'medium'
      };
    }
    
    // 个人博客或小型网站可能支持
    if (hostname.includes('blog') || hostname.includes('github.io') || 
        hostname.includes('netlify') || hostname.includes('vercel')) {
      return {
        canEmbed: true,
        reason: '个人网站或博客通常支持iframe嵌入',
        confidence: 'medium'
      };
    }
    
    // 默认情况：未知，中等可能性
    return {
      canEmbed: true,
      reason: '网站iframe支持状态未知，尝试加载',
      confidence: 'low'
    };
    
  } catch (error) {
    return {
      canEmbed: false,
      reason: '无效的网址格式',
      confidence: 'high'
    };
  }
}

/**
 * 获取优化后的加载策略
 */
export function getLoadingStrategy(url: string) {
  const check = checkIframeCompatibility(url);
  
  return {
    ...check,
    timeout: check.confidence === 'high' && check.canEmbed ? 10000 : 15000, // 高信心度网站更短超时
    retryCount: check.confidence === 'high' && !check.canEmbed ? 1 : 2, // 已知不支持的网站少重试
    showWarning: check.confidence === 'high' && !check.canEmbed, // 显示警告
  };
} 