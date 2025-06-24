# 卡片反转功能问题诊断指南

## 立即诊断步骤

### 1. 打开白板应用
访问：http://localhost:5195/

### 2. 执行诊断测试
```javascript
// 在浏览器控制台执行以下代码

// 步骤1：检查store是否正确暴露
console.log('Store 可用性:', typeof window.useBoardStore !== 'undefined');

// 步骤2：清空现有卡片，重新测试
window.useBoardStore.setState({ nodes: [] });
console.log('已清空现有卡片');

// 步骤3：创建测试卡片
const testNode = {
  id: 'test-card-' + Date.now(),
  x: 100,
  y: 100,
  content: [{ type: 'paragraph', children: [{ text: '测试正面内容' }] }],
  frontContent: [{ type: 'paragraph', children: [{ text: '测试正面内容' }] }],
  backContent: [{ type: 'paragraph', children: [{ text: '测试反面内容' }] }],
  editing: false,
  selected: false,
  isFlipped: false
};

window.useBoardStore.setState(state => ({
  nodes: [...state.nodes, testNode]
}));
console.log('已创建测试卡片');

// 步骤4：检查卡片状态
const nodes = window.useBoardStore.getState().nodes;
const testCard = nodes[nodes.length - 1];
console.log('测试卡片状态:', {
  正面内容: testCard.frontContent,
  反面内容: testCard.backContent,
  传统内容: testCard.content,
  当前显示: testCard.isFlipped ? '反面' : '正面',
  是否有引用问题: testCard.frontContent === testCard.backContent
});

// 步骤5：测试翻转功能
console.log('开始测试翻转...');
window.useBoardStore.getState().flipCard(testCard.id);

// 等待动画完成后检查
setTimeout(() => {
  const updatedNodes = window.useBoardStore.getState().nodes;
  const updatedCard = updatedNodes.find(n => n.id === testCard.id);
  console.log('翻转后状态:', {
    当前显示: updatedCard.isFlipped ? '反面' : '正面',
    正面内容: updatedCard.frontContent,
    反面内容: updatedCard.backContent,
    传统内容: updatedCard.content
  });
}, 1000);
```

### 3. 分析诊断结果

#### 如果控制台显示：
- ✅ "Store 可用性: true" - 状态管理正常
- ✅ "是否有引用问题: false" - 内容字段独立
- ✅ "翻转后状态: 反面" - 翻转功能正常

#### 如果有问题，检查：

**问题A：引用共享**
```javascript
// 检查对象引用是否相同
const card = window.useBoardStore.getState().nodes[0];
console.log('引用检查:', {
  frontContent === content: card.frontContent === card.content,
  backContent === content: card.backContent === card.content,
  frontContent === backContent: card.frontContent === card.backContent
});
```

**问题B：状态更新失效**
```javascript
// 手动测试状态更新
window.useBoardStore.getState().updateCardSide('test-card-' + Date.now(), 'front', [
  { type: 'paragraph', children: [{ text: '手动更新正面' }] }
]);
```

**问题C：显示逻辑错误**
```javascript
// 检查displayContent逻辑
const card = window.useBoardStore.getState().nodes[0];
const displayContent = card.isFlipped 
  ? (card.backContent || [{ type: 'paragraph', children: [{ text: '' }] }])
  : (card.frontContent || card.content || [{ type: 'paragraph', children: [{ text: '' }] }]);
console.log('应该显示的内容:', displayContent);
```

## 常见问题及解决方案

### 问题1：反面编辑影响正面content字段
**症状**：反面编辑后，card.content 被修改
**原因**：handleEditorChange 没有正确判断当前面
**解决**：检查 NodeCard.tsx 第426行的条件判断

### 问题2：翻转后显示内容不变
**症状**：翻转动画正常，但显示内容不切换
**原因**：displayContent 逻辑或 useEffect 依赖问题
**解决**：检查 NodeCard.tsx 第76行的 useEffect

### 问题3：内容创建时引用共享
**症状**：修改任何面的内容，其他面也会变化
**原因**：addNode 创建时使用了共享引用
**解决**：检查 useBoardStore.ts 第275行的 createEmptyContent

## 立即修复命令

如果确认是引用问题，执行：
```javascript
// 强制重新创建所有卡片的内容字段
window.useBoardStore.setState(state => ({
  nodes: state.nodes.map(node => ({
    ...node,
    content: JSON.parse(JSON.stringify(node.content || [{ type: 'paragraph', children: [{ text: '' }] }])),
    frontContent: JSON.parse(JSON.stringify(node.frontContent || [{ type: 'paragraph', children: [{ text: '' }] }])),
    backContent: JSON.parse(JSON.stringify(node.backContent || [{ type: 'paragraph', children: [{ text: '' }] }]))
  }))
}));
console.log('已修复所有卡片的引用问题');
```

请按照步骤执行诊断，并将控制台输出结果发送给我进行进一步分析。 