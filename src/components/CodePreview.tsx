import React, { useEffect, useRef, useContext } from 'react';
// @ts-expect-error: prismjs 没有类型声明，忽略类型检查
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
// 主流前端语言高亮支持
import 'prismjs/components/prism-markup';      // HTML/XML/SVG
import 'prismjs/components/prism-xml-doc';     // XML doc
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-sass';
import 'prismjs/components/prism-less';
import 'prismjs/components/prism-stylus';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
// import 'prismjs/components/prism-vue';
// import 'prismjs/components/prism-angular';
// import 'prismjs/components/prism-svelte';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';

// 1. 引入 ThemeContext
import { ThemeContext } from '../App';

// 2. 深色主题的 CDN 路径（也可用本地 node_modules 路径）
const PRISM_DARK_THEME_ID = 'prismjs-dark-theme';
const PRISM_DARK_THEME_HREF =
  'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css';

interface CodePreviewProps {
  code: string;
  language?: string;
  style?: React.CSSProperties;
}

/**
 * 极简代码预览组件
 * 简化设计，专注于核心功能：使用iframe安全地渲染代码
 */
const CodePreview: React.FC<CodePreviewProps> = ({ code, language = 'javascript', style }) => {
  const codeRef = useRef<HTMLElement>(null);
  // 3. 获取深色模式状态
  const { isDarkMode } = useContext(ThemeContext);

  // 4. 动态切换 Prism 主题 CSS
  useEffect(() => {
    if (isDarkMode) {
      // 检查是否已存在深色主题 link
      let link = document.getElementById(PRISM_DARK_THEME_ID) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.id = PRISM_DARK_THEME_ID;
        link.rel = 'stylesheet';
        link.href = PRISM_DARK_THEME_HREF;
        document.head.appendChild(link);
      }
    } else {
      // 移除深色主题 link
      const link = document.getElementById(PRISM_DARK_THEME_ID);
      if (link) link.remove();
    }
    // 卸载时清理
    return () => {
      const link = document.getElementById(PRISM_DARK_THEME_ID);
      if (link) link.remove();
    };
  }, [isDarkMode]);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code, language, isDarkMode]);

  return (
    <pre
      style={{
        ...style,
        background: 'transparent',
        borderRadius: 0,
        padding: 0,
        margin: 0,
        overflow: 'auto',
        fontSize: 14,
        fontFamily: 'monospace',
        minHeight: 0,
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        display: 'flex',
      }}
    >
      <code
        ref={codeRef}
        className={`language-${language}`}
        style={{
          background: 'none',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          width: '100%',
          height: '100%',
          display: 'block',
          padding: 16,
          boxSizing: 'border-box',
          whiteSpace: 'pre',
        }}
      >
        {code || '// 空代码内容'}
      </code>
    </pre>
  );
};

export default CodePreview; 