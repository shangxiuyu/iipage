# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

# 白板应用

基于 React + TypeScript + Vite 的白板应用，支持节点创建、拖拽、富文本编辑、连线、缩放、主题切换等功能。

## 功能特性

### 核心功能
- ✅ 无限白板画布
- ✅ 卡片节点创建和拖拽
- ✅ 富文本编辑器（Slate.js）
- ✅ 节点连线系统
- ✅ 画布缩放和平移
- ✅ 卡片正反面翻转
- ✅ 深色/浅色主题切换
- ✅ 数据持久化

### 标签功能 🏷️
- ✅ **创建标签**：在编辑器中输入 `#标签名` + 回车
- ✅ **多标签支持**：可添加多个标签
- ✅ **实时显示**：编辑时标签立即在当前位置显示
- ✅ **主题适配**：完全兼容深色模式和毛玻璃效果
- ✅ **样式优化**：
  - 浅色模式：白色背景 + 深色边框，确保清晰可读
  - 深色模式：深灰背景 + 浅色边框，保持良好对比度
  - 毛玻璃效果：增强背景模糊和透明度，提升视觉层次
  - 动态字体粗细和阴影效果

### 富文本功能
- ✅ 标题（# + 空格、## + 空格）
- ✅ 列表（- + 空格、数字. + 空格）
- ✅ 待办事项（[ + 空格）
- ✅ 分割线（--- + 回车、-- + 回车）
- ✅ 图标插入（/ + 点击选择）
- ✅ 图片粘贴和拖拽
- ✅ 代码检测和语法高亮

### 交互特性
- ✅ 多选操作（Cmd/Ctrl + 点击）
- ✅ 批量拖拽
- ✅ 连线创建（拖拽锚点）
- ✅ 卡片调整大小
- ✅ 颜色主题切换
- ✅ 固定卡片位置

## 技术栈

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite
- **状态管理**：Zustand
- **富文本编辑**：Slate.js
- **样式方案**：CSS-in-JS（内联样式）
- **代码高亮**：Prism.js

## 开发指南

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 使用说明

### 标签使用
1. **创建标签**：双击卡片进入编辑模式，输入 `#标签名` 然后按回车
2. **添加多个标签**：继续在同一行或新行输入更多 `#标签名` + 回车
3. **标签样式**：标签会以特殊样式显示，自动适配当前主题
4. **主题兼容**：标签在浅色模式、深色模式和毛玻璃效果下都有优化的显示效果

### 快捷键
- `双击` - 进入/退出编辑模式
- `#标签名 + 回车` - 创建标签
- `# + 空格` - 一级标题
- `## + 空格` - 二级标题
- `- + 空格` - 无序列表
- `数字. + 空格` - 有序列表
- `[ + 空格` - 待办事项
- `/` - 打开图标选择器
- `--- + 回车` - 分割线
- `-- + 回车` - 虚线

### 主题切换
点击右上角的主题切换按钮，支持：
- ☀️ 浅色模式
- 🌙 深色模式
- 🥰 毛玻璃效果（在颜色选择器中启用）

标签样式会自动适配所选主题，确保在任何背景下都有良好的可读性。

## 项目结构
```
src/
├── components/          # 组件目录
│   ├── BoardCanvas.tsx     # 主画布组件
│   ├── NodeCard.tsx        # 卡片节点组件
│   ├── RichTextEditor.tsx  # 富文本编辑器（包含标签功能）
│   └── ...
├── store/              # 状态管理
│   └── useBoardStore.ts    # Zustand状态管理
├── utils/              # 工具函数
└── App.tsx             # 主应用组件（包含主题上下文）
```

## 更新日志

### v1.2.0 - 标签功能增强
- ✅ 新增标签创建功能（`#标签名` + 回车）
- ✅ 完全适配深色模式和毛玻璃效果
- ✅ 优化标签视觉效果，增强可读性
- ✅ 改进标签在不同主题下的对比度
- ✅ 添加标签数据持久化支持
