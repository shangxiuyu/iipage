
# 卡片正反面内容独立性测试

## 测试目标
验证卡片正面和反面的内容完全独立，翻转后不会带入对方的内容。

## 立即执行测试

请打开 http://localhost:5195/ 并在浏览器控制台执行以下脚本：

```javascript
// 🎯 卡片正反面内容独立性测试
console.log('🎯 开始卡片正反面内容独立性测试...');

// 步骤1：清空所有数据
window.useBoardStore.setState({ nodes: [] });
console.log('✅ 已清空现有数据');

// 步骤2：创建测试卡片
console.log('\n📝 创建测试卡片...');
const { addNode } = window.useBoardStore.getState();
addNode(200, 200);

// 获取刚创建的卡片
let nodes = window.useBoardStore.getState().nodes;
let testCard = nodes[nodes.length - 1];
console.log('✅ 已创建测试卡片，ID:', testCard.id);

// 步骤3：编辑正面内容
console.log('\n📝 测试正面内容编辑...');
const { updateCardSide } = window.useBoardStore.getState();
const frontContent = [{ type: 'paragraph', children: [{ text: '这是正面的内容' }] }];
updateCardSide(testCard.id, 'front', frontContent);

// 验证正面内容
nodes = window.useBoardStore.getState().nodes;
testCard = nodes.find(n => n.id === testCard.id);
console.log('正面内容设置后:');
console.log('- frontContent:', JSON.stringify(testCard.frontContent));
console.log('- backContent:', JSON.stringify(testCard.backContent));

// 步骤4：翻转到反面
console.log('\n🔄 翻转到反面...');
const { flipCard } = window.useBoardStore.getState();
flipCard(testCard.id);

// 等待翻转动画完成
setTimeout(() => {
  // 获取翻转后的卡片状态
  nodes = window.useBoardStore.getState().nodes;
  testCard = nodes.find(n => n.id === testCard.id);
  
  console.log('翻转后状态:');
  console.log('- isFlipped:', testCard.isFlipped);
  console.log('- frontContent:', JSON.stringify(testCard.frontContent));
  console.log('- backContent:', JSON.stringify(testCard.backContent));
  
  // 步骤5：编辑反面内容
  console.log('\n📝 测试反面内容编辑...');
  const backContent = [{ type: 'paragraph', children: [{ text: '这是反面的内容' }] }];
  updateCardSide(testCard.id, 'back', backContent);
  
  // 验证反面编辑后的状态
  nodes = window.useBoardStore.getState().nodes;
  testCard = nodes.find(n => n.id === testCard.id);
  
  console.log('反面内容设置后:');
  console.log('- frontContent:', JSON.stringify(testCard.frontContent));
  console.log('- backContent:', JSON.stringify(testCard.backContent));
  
  // 步骤6：翻转回正面验证
  console.log('\n🔄 翻转回正面验证...');
  flipCard(testCard.id);
  
  setTimeout(() => {
    nodes = window.useBoardStore.getState().nodes;
    testCard = nodes.find(n => n.id === testCard.id);
    
    console.log('翻转回正面后:');
    console.log('- isFlipped:', testCard.isFlipped);
    console.log('- frontContent:', JSON.stringify(testCard.frontContent));
    console.log('- backContent:', JSON.stringify(testCard.backContent));
    
    // 步骤7：验证结果
    console.log('\n🎯 测试结果验证:');
    
    const frontText = testCard.frontContent?.[0]?.children?.[0]?.text || '';
    const backText = testCard.backContent?.[0]?.children?.[0]?.text || '';
    
    console.log('正面内容文本:', frontText);
    console.log('反面内容文本:', backText);
    
    const frontCorrect = frontText === '这是正面的内容';
    const backCorrect = backText === '这是反面的内容';
    const contentIndependent = frontText !== backText;
    
    console.log('✅ 正面内容正确:', frontCorrect);
    console.log('✅ 反面内容正确:', backCorrect);
    console.log('✅ 内容独立性:', contentIndependent);
    
    if (frontCorrect && backCorrect && contentIndependent) {
      console.log('\n🎉 测试通过！卡片正反面内容完全独立！');
    } else {
      console.log('\n❌ 测试失败！存在内容混淆问题。');
    }
    
  }, 800); // 等待翻转动画完成
}, 800); // 等待翻转动画完成
```

## 预期结果

如果修复成功，应该看到：
- ✅ 正面内容正确: true
- ✅ 反面内容正确: true  
- ✅ 内容独立性: true
- 🎉 测试通过！卡片正反面内容完全独立！

## 如果测试失败

如果仍然看到内容混淆，请将控制台输出截图发给我，我将进一步诊断问题。 