# 简化卡片反转测试

请打开 http://localhost:5195/ 并在浏览器控制台逐步执行以下命令：

## 步骤1：检查基本功能
```javascript
// 检查store是否可用
console.log('Store 可用性:', typeof window.useBoardStore);
console.log('Store 对象:', window.useBoardStore);
```

## 步骤2：检查方法可用性
```javascript
// 检查具体方法
const store = window.useBoardStore;
if (store) {
  const state = store.getState();
  console.log('addNode:', typeof state.addNode);
  console.log('flipCard:', typeof state.flipCard);
  console.log('updateCardSide:', typeof state.updateCardSide);
}
```

## 步骤3：创建测试卡片
```javascript
// 清空现有卡片
window.useBoardStore.setState({ nodes: [] });

// 创建一张卡片
const { addNode } = window.useBoardStore.getState();
addNode(200, 200);

// 检查卡片
const nodes = window.useBoardStore.getState().nodes;
console.log('创建的卡片:', nodes);
```

## 步骤4：测试手动翻转
```javascript
// 获取卡片
const nodes = window.useBoardStore.getState().nodes;
const card = nodes[0];
console.log('翻转前状态:', {
  isFlipped: card.isFlipped,
  frontContent: card.frontContent,
  backContent: card.backContent
});

// 执行翻转
const { flipCard } = window.useBoardStore.getState();
flipCard(card.id);

// 等待一会儿再检查
setTimeout(() => {
  const updatedNodes = window.useBoardStore.getState().nodes;
  const updatedCard = updatedNodes[0];
  console.log('翻转后状态:', {
    isFlipped: updatedCard.isFlipped,
    frontContent: updatedCard.frontContent,
    backContent: updatedCard.backContent
  });
}, 1000);
```

## 如果上述步骤都正常，说明基本功能没问题，问题可能在界面显示逻辑 