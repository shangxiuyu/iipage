# 简化卡片反转测试

## 立即执行测试

访问 http://localhost:5195/ 并在控制台执行：

```javascript
// 🎯 简化卡片反转测试
console.log('🎯 开始简化卡片反转测试...');

// 清空并创建卡片
window.useBoardStore.setState({ nodes: [] });
const { addNode, updateCardSide, flipCard } = window.useBoardStore.getState();
addNode(300, 200);

const nodes = window.useBoardStore.getState().nodes;
const card = nodes[0];
console.log('✅ 创建卡片，ID:', card.id);

// 设置正面内容
updateCardSide(card.id, 'front', [{ type: 'paragraph', children: [{ text: '正面测试内容' }] }]);
console.log('📝 已设置正面内容');

// 立即翻转
flipCard(card.id);
console.log('🔄 已翻转到反面');

// 检查状态
const flippedCard = window.useBoardStore.getState().nodes[0];
console.log('📊 翻转后状态:', {
  isFlipped: flippedCard.isFlipped,
  正面内容: (flippedCard.frontContent?.[0] as any)?.children?.[0]?.text || '空',
  反面内容: (flippedCard.backContent?.[0] as any)?.children?.[0]?.text || '空'
});

// 设置反面内容
updateCardSide(card.id, 'back', [{ type: 'paragraph', children: [{ text: '反面测试内容' }] }]);
console.log('📝 已设置反面内容');

// 最终检查
const finalCard = window.useBoardStore.getState().nodes[0];
console.log('🎯 最终状态:', {
  当前显示: finalCard.isFlipped ? '反面' : '正面',
  正面内容: (finalCard.frontContent?.[0] as any)?.children?.[0]?.text || '空',
  反面内容: (finalCard.backContent?.[0] as any)?.children?.[0]?.text || '空'
});

console.log('\n✅ 测试完成！');
console.log('🔍 现在检查界面:');
console.log('- 界面应该显示：反面测试内容');
console.log('- 右下角应该显示：B (粉色)');
console.log('- 点击翻转按钮应该显示：正面测试内容');
```

## 手动验证步骤

1. **执行上面的脚本**
2. **观察界面卡片** - 应该显示"反面测试内容"
3. **点击卡片选中它**
4. **点击翻转按钮** - 应该显示"正面测试内容"
5. **再次翻转** - 应该回到"反面测试内容"

如果还是不行，说明问题在React组件层面，我们需要更深层的修复。 