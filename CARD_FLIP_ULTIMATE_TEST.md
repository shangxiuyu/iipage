# 卡片反转功能终极测试与修复

## 立即执行测试

请打开 http://localhost:5195/ 并在浏览器控制台执行以下脚本：

```javascript
// 🔧 终极卡片反转功能诊断与修复脚本
console.log('🚀 开始终极卡片反转功能测试...');

// 第一步：清空所有数据，重新开始
window.useBoardStore.setState({ nodes: [] });
console.log('✅ 已清空现有数据');

// 第二步：检查store方法是否存在
const store = window.useBoardStore.getState();
console.log('📋 Store方法检查:', {
  addNode: typeof store.addNode,
  updateCardSide: typeof store.updateCardSide,
  flipCard: typeof store.flipCard,
  updateNode: typeof store.updateNode
});

// 第三步：手动创建测试卡片
console.log('\n📝 手动创建测试卡片...');
const testId = 'test-card-' + Date.now();

// 创建完全独立的内容对象
const createUniqueContent = (text) => [{ type: 'paragraph', children: [{ text }] }];

const testCard = {
  id: testId,
  x: 200,
  y: 200,
  width: 200,
  height: 80,
  content: createUniqueContent(''), // 传统内容字段
  frontContent: createUniqueContent(''), // 正面内容
  backContent: createUniqueContent(''), // 反面内容
  isFlipped: false,
  editing: false,
  selected: false
};

// 添加测试卡片
window.useBoardStore.setState(state => ({
  nodes: [...state.nodes, testCard]
}));

console.log('✅ 测试卡片已创建，ID:', testId);

// 第四步：检查初始状态的引用独立性
let nodes = window.useBoardStore.getState().nodes;
let card = nodes.find(n => n.id === testId);

console.log('\n🔍 初始状态引用检查:');
console.log('- frontContent === content:', card.frontContent === card.content, '(应该为false)');
console.log('- backContent === content:', card.backContent === card.content, '(应该为false)');
console.log('- frontContent === backContent:', card.frontContent === card.backContent, '(应该为false)');

// 如果有引用问题，先修复
if (card.frontContent === card.content || card.backContent === card.content || card.frontContent === card.backContent) {
  console.log('❌ 发现引用问题，正在修复...');
  window.useBoardStore.setState(state => ({
    nodes: state.nodes.map(n => n.id === testId ? {
      ...n,
      content: createUniqueContent(''),
      frontContent: createUniqueContent(''),
      backContent: createUniqueContent('')
    } : n)
  }));
  
  // 重新检查
  nodes = window.useBoardStore.getState().nodes;
  card = nodes.find(n => n.id === testId);
  console.log('🔧 修复后引用检查:');
  console.log('- frontContent === content:', card.frontContent === card.content, '(应该为false)');
  console.log('- backContent === content:', card.backContent === card.content, '(应该为false)');
  console.log('- frontContent === backContent:', card.frontContent === card.backContent, '(应该为false)');
}

// 第五步：测试正面内容编辑
console.log('\n📝 测试正面内容编辑...');
const frontTestContent = createUniqueContent('这是正面内容测试');

// 模拟正面编辑
window.useBoardStore.getState().updateCardSide(testId, 'front', frontTestContent);
window.useBoardStore.getState().updateNode(testId, { content: frontTestContent });

// 检查结果
nodes = window.useBoardStore.getState().nodes;
card = nodes.find(n => n.id === testId);

console.log('✅ 正面编辑结果:');
console.log('- frontContent:', JSON.stringify(card.frontContent));
console.log('- content:', JSON.stringify(card.content));
console.log('- backContent:', JSON.stringify(card.backContent));
console.log('- content正确更新:', JSON.stringify(card.content) === JSON.stringify(frontTestContent));

// 第六步：翻转到反面
console.log('\n🔄 测试翻转到反面...');
window.useBoardStore.getState().flipCard(testId);

// 等待翻转动画
setTimeout(() => {
  nodes = window.useBoardStore.getState().nodes;
  card = nodes.find(n => n.id === testId);
  
  console.log('✅ 翻转后状态:');
  console.log('- isFlipped:', card.isFlipped, '(应该为true)');
  console.log('- isFlipping:', card.isFlipping, '(应该为false)');
  
  // 第七步：测试反面内容编辑
  console.log('\n📝 测试反面内容编辑...');
  const backTestContent = createUniqueContent('这是反面内容测试');
  
  window.useBoardStore.getState().updateCardSide(testId, 'back', backTestContent);
  
  // 检查反面编辑结果
  nodes = window.useBoardStore.getState().nodes;
  card = nodes.find(n => n.id === testId);
  
  console.log('✅ 反面编辑结果:');
  console.log('- frontContent:', JSON.stringify(card.frontContent));
  console.log('- backContent:', JSON.stringify(card.backContent));
  console.log('- content:', JSON.stringify(card.content));
  console.log('- content被污染?', JSON.stringify(card.content) !== JSON.stringify(frontTestContent) ? '❌ 被污染' : '✅ 未被污染');
  
  // 第八步：翻转回正面验证
  console.log('\n🔄 翻转回正面验证...');
  window.useBoardStore.getState().flipCard(testId);
  
  setTimeout(() => {
    nodes = window.useBoardStore.getState().nodes;
    card = nodes.find(n => n.id === testId);
    
    console.log('✅ 最终验证:');
    console.log('- 当前显示面:', card.isFlipped ? '反面' : '正面');
    console.log('- 正面内容保持:', JSON.stringify(card.frontContent) === JSON.stringify(frontTestContent) ? '✅' : '❌');
    console.log('- 反面内容保持:', JSON.stringify(card.backContent) === JSON.stringify(backTestContent) ? '✅' : '❌');
    console.log('- content字段保持正面:', JSON.stringify(card.content) === JSON.stringify(frontTestContent) ? '✅' : '❌');
    
    // 最终评估
    const allGood = 
      !card.isFlipped && 
      JSON.stringify(card.frontContent) === JSON.stringify(frontTestContent) &&
      JSON.stringify(card.backContent) === JSON.stringify(backTestContent) &&
      JSON.stringify(card.content) === JSON.stringify(frontTestContent);
    
    console.log('\n🎯 测试结果:');
    if (allGood) {
      console.log('🎉 所有测试通过！卡片反转功能正常工作！');
    } else {
      console.log('❌ 测试失败，存在以下问题:');
      if (card.isFlipped) console.log('  - 翻转状态错误');
      if (JSON.stringify(card.frontContent) !== JSON.stringify(frontTestContent)) console.log('  - 正面内容丢失');
      if (JSON.stringify(card.backContent) !== JSON.stringify(backTestContent)) console.log('  - 反面内容丢失');
      if (JSON.stringify(card.content) !== JSON.stringify(frontTestContent)) console.log('  - content字段被污染');
      
      // 提供进一步的诊断信息
      console.log('\n🔍 详细诊断信息:');
      console.log('当前卡片状态:', card);
      console.log('期望正面内容:', frontTestContent);
      console.log('期望反面内容:', backTestContent);
    }
    
  }, 1000); // 等待翻转动画完成
}, 1000); // 等待第一次翻转动画完成
```

## 如果测试失败，执行以下修复步骤：

### 1. 如果是引用问题，执行强制修复：
```javascript
// 强制修复所有卡片的引用问题
window.useBoardStore.setState(state => ({
  nodes: state.nodes.map(node => {
    const createUniqueContent = (text = '') => [{ type: 'paragraph', children: [{ text }] }];
    return {
      ...node,
      content: createUniqueContent(),
      frontContent: createUniqueContent(),
      backContent: createUniqueContent()
    };
  })
}));
console.log('🔧 已强制修复所有卡片的引用问题');
```

### 2. 如果是content字段污染问题，检查NodeCard组件：
```javascript
// 检查当前正在编辑的卡片
const editingNode = window.useBoardStore.getState().nodes.find(n => n.editing);
if (editingNode) {
  console.log('⚠️ 发现正在编辑的卡片:', editingNode.id);
  console.log('当前面:', editingNode.isFlipped ? '反面' : '正面');
}
```

### 3. 完全重新加载页面并重试
如果以上都不能解决问题，刷新页面重新测试。

请执行上述测试脚本并告诉我结果！ 