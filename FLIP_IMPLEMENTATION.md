# 卡片翻转功能实现文档

## 功能概述

卡片翻转功能允许用户在白板上创建双面卡片，类似于实体世界中的卡片或便签，卡片的两面可以包含不同的内容。此功能特别适合创建闪卡（记忆卡）、问答卡片或需要隐藏部分信息的场景。

## 主要实现

### 数据模型

在 `useBoardStore.ts` 中，我们为 `NodeData` 接口添加了以下字段：

```typescript
// 卡片反转相关属性
frontContent?: Descendant[]; // 正面内容
backContent?: Descendant[]; // 反面内容
isFlipped?: boolean; // 是否显示反面
isFlipping?: boolean; // 是否正在翻转动画中
```

### 翻转动画

翻转动画使用 CSS 3D 变换实现，主要 CSS 类如下：

```css
.flip-card {
  perspective: 1000px;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  transform-style: preserve-3d;
}

.flip-card.flipped .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-front, .flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  overflow: hidden;
}

.flip-card-back {
  transform: rotateY(180deg);
}
```

### 状态管理

在 `useBoardStore.ts` 中，我们添加了以下方法：

```typescript
// 卡片翻转相关方法
flipCard: (id: string) => {
  set((state) => {
    // 先标记为翻转中，触发动画
    return {
      nodes: state.nodes.map(n =>
        n.id === id ? { 
          ...n, 
          isFlipped: !n.isFlipped,
          isFlipping: true // 开始翻转动画
        } : n
      ),
    };
  });
  
  // 动画结束后重置翻转状态标记
  setTimeout(() => {
    set((state) => ({
      nodes: state.nodes.map(n =>
        n.id === id ? { ...n, isFlipping: false } : n
      ),
    }));
  }, 600); // 与CSS动画时长匹配
},

updateCardSide: (id: string, side: 'front' | 'back', content: Descendant[]) =>
  set((state) => ({
    nodes: state.nodes.map(n =>
      n.id === id ? { ...n, [side + 'Content']: JSON.parse(JSON.stringify(content)) } : n
    ),
  })),
```

## 用户界面

在 `NodeCard.tsx` 中，我们使用分离的前后面视图，并添加了翻转按钮：

1. 卡片结构被分为前面和后面两个部分，使用 CSS 3D 变换进行翻转。
2. 每一面都有自己独立的 `RichTextEditor` 组件。
3. 添加了紫色的翻转按钮，当卡片被选中时显示。
4. 在背面时显示"B"标记，以便用户知道当前在查看卡片的背面。

## 内容管理

我们使用以下策略管理卡片的前后面内容：

1. 分别使用 `frontContent` 和 `backContent` 存储两面的内容。
2. 为了向后兼容，同时更新了旧的 `content` 字段（保持与前面内容同步）。
3. 当用户在不同面之间切换时，我们确保当前编辑的内容被正确保存到对应的面。
4. 在状态管理中，我们通过使用 `useMemo` 和 `useEffect` 确保内容在编辑过程中不会被意外重置。

## 使用说明

1. 创建卡片：点击画布创建一个新卡片。
2. 编辑卡片：双击卡片进入编辑模式。
3. 翻转卡片：选中卡片后，点击出现在卡片上方的紫色翻转按钮。
4. 编辑背面：在卡片翻转到背面后，双击即可编辑背面内容。
5. 识别当前面：当卡片显示背面时，右上角会显示一个"B"标记。

## 技术要点

1. **性能优化**：使用 CSS 3D 变换进行硬件加速的动画，确保翻转流畅。
2. **状态管理**：使用 zustand 管理卡片的复杂状态。
3. **内容独立**：确保前后面内容完全独立，不会相互干扰。
4. **翻转动画**：使用 CSS transition 和 transform 属性实现平滑的翻转效果。
5. **向后兼容**：保持与旧版本的兼容性，确保现有卡片正常显示。

## 注意事项

1. 卡片翻转时，连线和锚点会保持在相同位置，确保连线不会断开。
2. 两面的尺寸和背景色是共享的，只有内容是独立的。
3. 当卡片处于编辑状态时，翻转按钮被禁用，需要先完成编辑再进行翻转。 