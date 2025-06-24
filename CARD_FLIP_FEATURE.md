# 卡片反转功能实现总结

## 功能概述
为白板应用的卡片组件实现了双面翻转功能，用户可以在卡片的正面和反面分别书写不同的内容。

## 技术实现

### 1. 数据结构更新
在 `NodeData` 接口中添加了反转相关属性：
```typescript
// 卡片反转相关属性
frontContent?: Descendant[]; // 正面内容
backContent?: Descendant[]; // 反面内容
isFlipped?: boolean; // 是否显示反面
isFlipping?: boolean; // 是否正在翻转动画中
```

### 2. 状态管理功能
在 `useBoardStore` 中添加了反转相关方法：
- `flipCard(id: string)`: 翻转指定卡片，支持动画效果
- `updateCardSide(id, side, content)`: 更新指定面（正面/反面）的内容

### 3. 动画效果
添加了CSS翻转动画：
```css
@keyframes cardFlip {
  0% { transform: scale(1) rotateY(0deg); }
  50% { transform: scale(0.95) rotateY(90deg); }
  100% { transform: scale(1) rotateY(0deg); }
}
```

### 4. 用户界面
- **翻转按钮**: 在卡片选中时显示的动作菜单中添加了翻转按钮
- **状态指示器**: 在卡片右下角显示当前面状态（F表示正面，B表示反面）
- **平滑动画**: 翻转时有0.6秒的旋转动画效果

### 5. 内容管理
- **双面内容独立**: 正面和反面的内容完全独立，可分别编辑
- **实时保存**: 编辑时内容实时保存到对应的面
- **状态同步**: 翻转时自动切换显示内容
- **兼容性**: 保持与现有content字段的兼容性

## 使用方法

1. **创建卡片**: 双击白板空白处创建新卡片
2. **选中卡片**: 单击卡片进行选中
3. **翻转卡片**: 点击动作菜单中的翻转按钮（🔄图标）
4. **编辑内容**: 双击卡片进入编辑模式，在正面或反面分别书写内容
5. **查看状态**: 观察右下角的F/B指示器了解当前显示的面

## 动画流程

1. 用户点击翻转按钮
2. 卡片进入翻转动画状态（`isFlipping: true`）
3. 执行CSS旋转动画（0.6秒）
4. 动画中间点（0.3秒）时切换显示的内容面
5. 动画结束后重置翻转状态（`isFlipping: false`）

## 技术亮点

- **平滑动画**: 使用CSS3 transform实现流畅的3D翻转效果
- **内容隔离**: 正反面内容完全独立，不会相互影响
- **状态管理**: 完整的状态管理确保数据一致性
- **用户体验**: 直观的视觉反馈和操作流程
- **向后兼容**: 不影响现有卡片的功能

## 代码位置

- **数据接口**: `src/store/useBoardStore.ts` - NodeData接口
- **状态管理**: `src/store/useBoardStore.ts` - flipCard, updateCardSide方法
- **组件实现**: `src/components/NodeCard.tsx` - 完整的反转功能实现
- **样式动画**: `src/components/NodeCard.tsx` - CSS动画定义

这个功能为白板应用增加了更丰富的内容组织能力，用户可以在一张卡片上记录更多信息，提高了使用效率和灵活性。 