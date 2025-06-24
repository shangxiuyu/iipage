# 重构后卡片反转功能测试

## 测试重构后的功能

请在浏览器控制台执行以下脚本：

```javascript
// 🎯 重构后卡片反转功能测试
console.log('🎯 开始测试重构后的卡片反转功能...');

// 步骤1：清空并创建新卡片
window.useBoardStore.setState({ nodes: [] });
const { addNode, updateCardSide, flipCard } = window.useBoardStore.getState();
addNode(300, 200);

// 获取测试卡片
let nodes = window.useBoardStore.getState().nodes;
let card = nodes[0];
const cardId = card.id;

console.log('✅ 已创建测试卡片，ID:', cardId);

// 步骤2：设置正面内容
console.log('\n📝 设置正面内容...');
updateCardSide(cardId, 'front', [{ type: 'paragraph', children: [{ text: '正面内容 - 前面' }] }]);

// 等待状态更新
setTimeout(() => {
  // 步骤3：翻转到反面
  console.log('\n🔄 翻转到反面...');
  flipCard(cardId);
  
  setTimeout(() => {
    // 步骤4：设置反面内容
    console.log('\n📝 设置反面内容...');
    updateCardSide(cardId, 'back', [{ type: 'paragraph', children: [{ text: '反面内容 - 后面' }] }]);
    
    setTimeout(() => {
      // 步骤5：验证最终状态
      const finalNodes = window.useBoardStore.getState().nodes;
      const finalCard = finalNodes[0];
      
      console.log('\n🎯 最终验证结果:');
      console.log('- 当前显示面:', finalCard.isFlipped ? '反面' : '正面');
      console.log('- 正面内容:', (finalCard.frontContent[0] as any)?.children?.[0]?.text || '空');
      console.log('- 反面内容:', (finalCard.backContent[0] as any)?.children?.[0]?.text || '空');
      console.log('- 传统content:', (finalCard.content[0] as any)?.children?.[0]?.text || '空');
      
      // 步骤6：翻转回正面验证
      console.log('\n🔄 翻转回正面验证...');
      flipCard(cardId);
      
      setTimeout(() => {
        const verifyNodes = window.useBoardStore.getState().nodes;
        const verifyCard = verifyNodes[0];
        
        console.log('\n🎉 翻转回正面后的验证:');
        console.log('- 当前显示面:', verifyCard.isFlipped ? '反面' : '正面');
        console.log('- 正面内容:', (verifyCard.frontContent[0] as any)?.children?.[0]?.text || '空');
        console.log('- 反面内容:', (verifyCard.backContent[0] as any)?.children?.[0]?.text || '空');
        
        console.log('\n✅ 重构测试完成！现在界面应该显示正确的内容。');
        console.log('📋 操作指南:');
        console.log('1. 点击卡片选中它');
        console.log('2. 在动作菜单中找到翻转按钮（双箭头图标）');
        console.log('3. 点击翻转按钮查看内容是否正确切换');
        console.log('4. 观察右下角的F/B标识是否正确显示');
      }, 100);
    }, 100);
  }, 100);
}, 100);
```

## 预期结果

执行脚本后，你应该看到：
- ✅ 正面内容："正面内容 - 前面"
- ✅ 反面内容："反面内容 - 后面"
- ✅ 界面显示与当前面相匹配的内容
- ✅ 控制台输出显示内容更新日志

## 界面验证

脚本执行完成后：
1. **当前应该显示正面**（F标识，蓝色）
2. **卡片内容应该是**："正面内容 - 前面"
3. **点击翻转按钮后**，应该显示："反面内容 - 后面"
4. **右下角标识应该变成**：B（粉色） 