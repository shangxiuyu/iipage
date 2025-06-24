# 🤖 AI代码生成器集成指南

## 功能概述

AI代码生成器允许用户通过自然语言描述需求，AI自动生成HTML/CSS/JS代码并创建可渲染的卡片。

## 当前实现

目前使用模拟数据进行演示，支持以下功能：
- 🎯 自然语言交互界面
- 💬 聊天式对话体验
- 🎨 预设模板（按钮、卡片等）
- 🚀 一键生成卡片
- 🔄 自动翻转显示渲染效果

## 接入真实AI API

### 1. OpenAI GPT-4 集成

在 `AICodeGenerator.tsx` 中的 `generateCodeWithAI` 函数替换为：

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
            "title": "组件标题",
            "description": "组件描述",
            "html": "HTML代码",
            "css": "CSS代码", 
            "javascript": "JavaScript代码"
          }
          
          要求：
          1. 代码要完整可运行
          2. 样式要现代美观
          3. 交互要流畅自然
          4. 兼容现代浏览器`
        },
        ...history,
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (error) {
    // 解析失败时的备用处理
    return {
      title: '自定义组件',
      description: '根据您的需求生成的组件',
      html: `<div class="ai-component"><h2>AI生成内容</h2><p>${prompt}</p></div>`,
      css: '.ai-component { padding: 20px; border-radius: 8px; background: #f0f0f0; }',
      javascript: 'console.log("AI组件已加载");'
    };
  }
};
```

### 2. Claude API 集成

```typescript
const generateCodeWithAI = async (prompt: string, history: Array<{role: string, content: string}> = []): Promise<GeneratedCode> => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.REACT_APP_CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      messages: [
        ...history,
        { role: 'user', content: prompt }
      ],
      system: `你是一个专业的前端开发助手...` // 同上
    })
  });

  const data = await response.json();
  const content = data.content[0].text;
  
  try {
    return JSON.parse(content);
  } catch (error) {
    // 备用处理...
  }
};
```

### 3. 本地大模型集成（Ollama）

```typescript
const generateCodeWithAI = async (prompt: string, history: Array<{role: string, content: string}> = []): Promise<GeneratedCode> => {
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'codellama', // 或其他代码生成模型
      messages: [
        { role: 'system', content: '你是一个专业的前端开发助手...' },
        ...history,
        { role: 'user', content: prompt }
      ],
      stream: false
    })
  });

  const data = await response.json();
  const content = data.message.content;
  
  // 解析逻辑同上...
};
```

## 环境变量配置

在 `.env` 文件中添加：

```env
# OpenAI
REACT_APP_OPENAI_API_KEY=your_openai_api_key

# Claude
REACT_APP_CLAUDE_API_KEY=your_claude_api_key

# 自定义API端点
REACT_APP_AI_API_ENDPOINT=your_custom_endpoint
```

## 高级功能扩展

### 1. 代码优化建议

```typescript
// 添加代码优化功能
const optimizeCode = async (code: string): Promise<string> => {
  // 调用AI API优化代码
};
```

### 2. 多轮对话改进

```typescript
// 支持用户对生成的代码进行修改要求
const refineCode = async (originalCode: GeneratedCode, feedback: string): Promise<GeneratedCode> => {
  // 基于反馈改进代码
};
```

### 3. 代码模板库

```typescript
// 预设常用组件模板
const COMPONENT_TEMPLATES = {
  button: { /* 按钮模板 */ },
  card: { /* 卡片模板 */ },
  form: { /* 表单模板 */ },
  // ...更多模板
};
```

### 4. 代码安全检查

```typescript
// 检查生成的代码安全性
const validateCode = (code: GeneratedCode): boolean => {
  // 检查是否包含危险代码
  const dangerousPatterns = [
    /eval\(/,
    /innerHTML\s*=/,
    /document\.write/,
    // ...更多安全检查
  ];
  
  return !dangerousPatterns.some(pattern => 
    pattern.test(code.html) || 
    pattern.test(code.css) || 
    pattern.test(code.javascript)
  );
};
```

## 使用流程

1. **用户交互**：用户点击AI按钮，打开对话界面
2. **需求描述**：用户用自然语言描述想要的组件
3. **AI生成**：AI根据描述生成HTML/CSS/JS代码
4. **预览确认**：用户可以预览生成的代码
5. **一键创建**：点击"创建卡片"按钮生成可渲染的卡片
6. **查看效果**：卡片自动翻转到背面显示渲染效果

## 注意事项

1. **API密钥安全**：不要在前端代码中暴露API密钥，建议通过后端代理
2. **错误处理**：添加完善的错误处理和用户反馈
3. **速率限制**：注意API调用频率限制
4. **代码安全**：对生成的代码进行安全检查
5. **用户体验**：添加加载状态和进度提示

## 扩展建议

- 🎨 支持更多UI框架（React、Vue、Angular组件）
- 🌐 支持响应式设计生成
- 📱 支持移动端适配
- 🎯 支持特定设计系统（Material Design、Ant Design等）
- 🔧 支持代码片段收藏和复用
- 📊 支持数据可视化组件生成 