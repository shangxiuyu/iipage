# 🤖 AI API 配置指南

## 环境变量设置

在项目根目录创建 `.env` 文件：

```bash
# DeepSeek-Coder 配置 (推荐用于代码生成)
REACT_APP_DEEPSEEK_API_KEY=sk-your-deepseek-api-key
REACT_APP_DEEPSEEK_MODEL=deepseek-coder
REACT_APP_DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions

# OpenAI GPT配置
REACT_APP_OPENAI_API_KEY=sk-your-openai-api-key
REACT_APP_AI_MODEL=gpt-4
REACT_APP_AI_API_URL=https://api.openai.com/v1/chat/completions

# 或者使用其他AI服务
# REACT_APP_CLAUDE_API_KEY=your_claude_api_key
# REACT_APP_GEMINI_API_KEY=your_gemini_api_key
```

## 替换模拟API

修改 `src/components/AICodeGenerator.tsx` 中的 `generateCodeWithAI` 函数：

### DeepSeek-Coder 集成 (推荐)

```typescript
const generateCodeWithAI = async (prompt: string, history: Array<{role: string, content: string}> = []): Promise<GeneratedCode> => {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.REACT_APP_DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-coder',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的前端开发专家。根据用户需求生成高质量的HTML、CSS和JavaScript代码。

          请严格按照以下JSON格式返回，不要包含任何其他文字：
          {
            "html": "完整的HTML代码，要求语义化标签",
            "css": "完整的CSS样式代码，使用现代CSS特性",
            "javascript": "JavaScript代码（如果需要交互功能）",
            "title": "简短有意义的标题",
            "description": "功能和特点的简要描述"
          }

          代码要求：
          1. HTML要语义化，结构清晰
          2. CSS使用现代特性（flexbox、grid、CSS变量等）
          3. 样式要美观、响应式、有良好的用户体验
          4. JavaScript代码要简洁、高效、无依赖
          5. 如果不需要JavaScript交互则返回空字符串
          6. 确保代码可以直接运行，无需额外依赖
          7. 适配移动端和桌面端
          8. 使用合适的颜色搭配和动画效果`
        },
        ...history,
        { role: 'user', content: prompt }
      ],
      temperature: 0.1, // 降低温度以获得更稳定的代码输出
      max_tokens: 4000, // 增加token限制以支持更复杂的代码
      top_p: 0.95
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API请求失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();
  
  try {
    // 尝试解析JSON响应
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // 如果没有找到JSON，尝试解析markdown代码块
    const htmlMatch = content.match(/```html\n([\s\S]*?)\n```/);
    const cssMatch = content.match(/```css\n([\s\S]*?)\n```/);
    const jsMatch = content.match(/```javascript\n([\s\S]*?)\n```/) || 
                    content.match(/```js\n([\s\S]*?)\n```/);
    
    return {
      html: htmlMatch ? htmlMatch[1].trim() : '<div>未能生成HTML代码</div>',
      css: cssMatch ? cssMatch[1].trim() : '',
      javascript: jsMatch ? jsMatch[1].trim() : '',
      title: prompt.slice(0, 20) + '...',
      description: '由DeepSeek-Coder生成的代码'
    };
  } catch (error) {
    console.error('解析DeepSeek响应失败:', error);
    return {
      html: '<div style="padding: 20px; text-align: center; color: #e11d48;">生成失败，请重试</div>',
      css: '',
      javascript: '',
      title: '生成失败',
      description: '请重新描述需求，或检查API配置'
    };
  }
};
```

### OpenAI GPT-4 集成

```typescript
const generateCodeWithAI = async (prompt: string, history: Array<{role: string, content: string}> = []): Promise<GeneratedCode> => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `你是一个专业的前端开发助手。根据用户需求生成HTML、CSS和JavaScript代码。
          
          请严格按照以下JSON格式返回：
          {
            "html": "完整的HTML代码",
            "css": "完整的CSS样式代码", 
            "javascript": "完整的JavaScript代码（如果需要）",
            "title": "简短的标题",
            "description": "功能描述"
          }
          
          要求：
          1. 代码要完整可运行
          2. 样式要美观现代
          3. 如果不需要JavaScript可以返回空字符串
          4. HTML要语义化
          5. CSS使用现代特性（flexbox、grid等）`
        },
        ...history,
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch {
    // 如果返回的不是JSON，尝试解析
    return {
      html: '<div>生成失败，请重试</div>',
      css: '',
      javascript: '',
      title: '生成失败',
      description: '请重新描述需求'
    };
  }
};
```

### Claude API 集成

```typescript
const generateCodeWithAI = async (prompt: string, history: Array<{role: string, content: string}> = []): Promise<GeneratedCode> => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.REACT_APP_CLAUDE_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      messages: [
        ...history,
        { 
          role: 'user', 
          content: `作为前端开发专家，根据以下需求生成代码：${prompt}
          
          请返回JSON格式：
          {
            "html": "HTML代码",
            "css": "CSS代码",
            "javascript": "JS代码",
            "title": "标题",
            "description": "描述"
          }` 
        }
      ]
    })
  });

  const data = await response.json();
  const content = data.content[0].text;
  
  try {
    return JSON.parse(content);
  } catch {
    return {
      html: '<div>生成失败，请重试</div>',
      css: '',
      javascript: '',
      title: '生成失败',
      description: '请重新描述需求'
    };
  }
};
```

## 本地AI模型

如果想使用本地AI模型（如Ollama）：

```typescript
const generateCodeWithAI = async (prompt: string): Promise<GeneratedCode> => {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'codellama:7b',
      prompt: `Generate HTML, CSS and JavaScript code for: ${prompt}`,
      stream: false
    })
  });

  const data = await response.json();
  // 解析Ollama返回的代码...
};
```

## 测试配置

1. 确保API密钥正确
2. 检查网络连接
3. 测试简单的代码生成请求
4. 查看浏览器开发者工具的网络面板确认API调用

## 错误处理

- 添加API限流处理
- 实现重试机制
- 提供降级方案（使用预设模板）
- 用户友好的错误提示 