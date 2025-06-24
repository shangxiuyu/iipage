# 简化版卡片翻转功能实现

## 功能概述

卡片翻转功能允许用户在白板上创建双面卡片，可以在正反两面存储不同的内容。这对于创建闪卡（记忆卡）、问答卡片或需要隐藏部分信息的场景特别有用。

## 实现方式

### 1. 数据结构

在`NodeData`接口中添加以下属性：

```typescript
// 卡片反转相关属性
frontContent?: Descendant[]; // 正面内容
backContent?: Descendant[]; // 反面内容
isFlipped?: boolean; // 是否显示反面
isFlipping?: boolean; // 是否正在翻转动画中
```

### 2. CSS动画

使用CSS 3D变换实现翻转动画效果：

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

### 3. 状态管理

在useBoardStore中添加flipCard方法：

```typescript
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
}
```

### 4. 前后内容管理

- 为卡片的正面和背面创建独立的编辑器和视图
- 添加背面指示器（"B"标志）以便用户识别当前面
- 提供翻转按钮，允许用户切换卡片的正反面
- 保存内容时，根据当前面选择保存到frontContent或backContent

### 5. 编辑器实现

为前面和后面分别创建RichTextEditor实例，通过key属性确保实例能够正确重新渲染：

```jsx
<RichTextEditor
  key={`front-editor-${node.id}`}
  value={frontContent}
  onChange={handleEditorChange}
  onBlur={finishEdit}
  autoFocus
/>

<RichTextEditor
  key={`back-editor-${node.id}`}
  value={backContent}
  onChange={handleEditorChange}
  onBlur={finishEdit}
  autoFocus
/>
```

### 6. 背面指示器

在背面添加一个"B"标志，让用户知道当前在查看卡片的背面：

```jsx
{!node.editing && (
  <div
    style={{
      position: 'absolute',
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      background: 'rgba(139,92,246,0.2)',
      border: '1px solid rgba(139,92,246,0.3)',
      color: '#8b5cf6',
      fontSize: 11,
      fontWeight: 'bold',
      zIndex: 10,
    }}
    title="背面"
  >
    B
  </div>
)}
```

## 使用方法

1. 选择一个卡片
2. 点击卡片上方出现的紫色翻转按钮
3. 卡片会旋转到背面，右上角会显示"B"标记
4. 双击可以编辑当前面的内容
5. 再次点击翻转按钮可以返回正面

## 优化技巧

1. 使用CSS硬件加速确保翻转动画流畅
2. 为正面和背面编辑器添加唯一key，避免状态混淆
3. 使用延迟效果，确保翻转动画完成后再重置isFlipping状态
4. 处理编辑状态下的内容保存，确保切换面时不丢失内容
5. 保持前后面内容的独立性，同时维护向后兼容性 