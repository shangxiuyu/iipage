# 卡片反转功能内容隔离修复

## 问题描述
在之前的实现中，反面编辑的内容会错误地保存到正面的 `content` 字段，导致正反面内容混淆。

## 修复内容

### 1. 编辑器内容变化处理 (handleEditorChange)
**修复前**：反面编辑时也会保存到 `content` 字段
**修复后**：只有正面编辑时才保存到 `content` 字段

```typescript
const handleEditorChange = (value: Descendant[]) => {
  setEditorValue(value);
  
  // 实时保存到当前显示的面
  const side = node.isFlipped ? 'back' : 'front';
  updateCardSide(node.id, side, value);
  
  // 只有在正面时才更新传统的content字段以保持兼容性
  if (!node.isFlipped) {
    updateNode(node.id, { content: value });
  }
};
```

### 2. 编辑完成处理 (finishEdit)
**修复前**：所有面编辑完成都会保存到 `content` 字段
**修复后**：只有正面编辑完成才保存到 `content` 字段

```typescript
// 保存到当前显示的面
const side = node.isFlipped ? 'back' : 'front';
updateCardSide(node.id, side, currentContent);

// 只有在正面时才更新传统的content字段以保持兼容性
if (!node.isFlipped) {
  updateNode(node.id, { content: currentContent });
}
```

### 3. 翻转按钮点击处理
**修复前**：翻转前保存内容时也会保存到 `content` 字段
**修复后**：只有正面内容才保存到 `content` 字段

```typescript
// 如果当前正在编辑，先保存当前面的内容
if (node.editing) {
  const currentContent = currentContentRef.current;
  const side = node.isFlipped ? 'back' : 'front';
  if (currentContent) {
    updateCardSide(node.id, side, currentContent);
    // 只有在正面时才更新传统的content字段
    if (!node.isFlipped) {
      updateNode(node.id, { content: currentContent });
    }
  }
}
```

### 4. 全局点击退出编辑处理
**修复前**：所有编辑退出都会保存到 `content` 字段
**修复后**：只有正面编辑退出才保存到 `content` 字段

```typescript
// 保存到当前显示的面
const side = node.isFlipped ? 'back' : 'front';
updateCardSide(node.id, side, validContent);

// 同时保存内容和高度，但只有在正面时才更新content字段
if (!node.isFlipped) {
  updateNode(node.id, { 
    content: validContent,
    height: newHeight 
  });
} else {
  // 反面时只更新高度
  updateNode(node.id, { 
    height: newHeight 
  });
}
```

### 5. 编辑状态变化监听 (useEffect)
**修复前**：状态变化时都会保存到 `content` 字段
**修复后**：只有正面内容才保存到 `content` 字段

## 数据结构说明

修复后的数据结构：
- `frontContent`: 正面专用内容
- `backContent`: 反面专用内容  
- `content`: 兼容性字段，只存储正面内容
- `isFlipped`: 当前显示状态（false=正面，true=反面）

## 逻辑保证

1. **正面编辑**：
   - 内容同时保存到 `frontContent` 和 `content`
   - 保持与旧版本的兼容性

2. **反面编辑**：
   - 内容只保存到 `backContent`
   - 不影响 `content` 字段
   - 不影响正面内容

3. **显示逻辑**：
   - 正面显示：优先使用 `frontContent`，备用 `content`
   - 反面显示：使用 `backContent`

## 测试验证

1. 创建新卡片，在正面写入内容A
2. 翻转到反面，写入内容B
3. 翻转回正面，确认显示内容A
4. 再次翻转到反面，确认显示内容B
5. 确认正面内容A没有被反面内容B覆盖

修复完成后，正反面内容完全隔离，互不影响。 