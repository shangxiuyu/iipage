# 卡片反转调试分析

## 问题重现步骤

1. 创建新卡片
2. 在正面写入内容 "正面内容"
3. 翻转到反面
4. 在反面写入内容 "反面内容"
5. 翻转回正面
6. 检查是否显示 "正面内容"

## 当前数据流分析

### 新卡片创建 (addNode)
```typescript
{
  content: initialValue,        // 传统字段
  frontContent: initialValue,   // 正面内容
  backContent: initialValue,    // 反面内容  
  isFlipped: false             // 默认显示正面
}
```

### 编辑器内容变化 (handleEditorChange)
- 正面编辑：保存到 `frontContent` 和 `content`
- 反面编辑：只保存到 `backContent`

### 显示逻辑 (displayContent)
- 正面：优先显示 `frontContent`，备用 `content`
- 反面：显示 `backContent`

## 可能的问题点

1. **初始化问题**：所有内容字段都指向同一个 `initialValue` 对象引用
2. **React状态同步**：`editorValue` 的状态更新可能有延迟
3. **引用问题**：多个字段共享同一个对象引用，导致意外修改

## 调试方案

### 方案1：检查对象引用问题
修改 `addNode` 使每个内容字段都是独立的对象：

```typescript
addNode: (x, y) => ({
  // ...
  content: [...initialValue],
  frontContent: [...initialValue], 
  backContent: [{ type: 'paragraph', children: [{ text: '' }] }],
  // ...
})
```

### 方案2：增强调试日志
在关键位置添加 console.log：
- handleEditorChange
- updateCardSide
- displayContent getter

### 方案3：检查编辑器状态同步
确保翻转后编辑器状态正确更新到新面的内容。

## 测试计划

1. 修复对象引用问题
2. 重新测试反转功能
3. 验证内容隔离是否生效 