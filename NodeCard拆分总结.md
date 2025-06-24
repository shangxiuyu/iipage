# NodeCard 组件拆分总结

## 已完成的拆分组件

### 1. NodeCardEditor.tsx ✅
**功能**: 负责卡片编辑状态下的内容渲染
- 正面和背面的富文本编辑
- Markdown 编辑模式
- 编辑模式切换
- 图片粘贴和插入
- 支持自动Markdown检测

**接口**:
```typescript
interface NodeCardEditorProps {
  node: NodeData;
  isBack?: boolean;
  localContent: Descendant[];
  localMarkdown: string;
  localBackMarkdown: string;
  backEditMode: 'rich' | 'markdown';
  // ... 其他props
}
```

### 2. NodeCardContent.tsx ✅
**功能**: 负责卡片非编辑状态下的内容展示
- 富文本内容渲染
- Markdown 内容渲染
- 代码块 iframe 渲染
- 网页内容渲染
- 交互状态管理

**接口**:
```typescript
interface NodeCardContentProps {
  node: NodeData;
  isBack?: boolean;
  displayContent: any;
  codeInfo: { code: string, language: string } | null;
  detectedUrl: string | null;
  // ... 其他props
}
```

### 3. NodeCardActions.tsx ✅
**功能**: 负责卡片的操作按钮区域
- 固定图钉图标
- 翻转指示器和按钮
- 动作菜单（颜色、固定、删除、翻转）
- 网页新窗口打开按钮

**接口**:
```typescript
interface NodeCardActionsProps {
  node: NodeData;
  readOnly?: boolean;
  showActionMenu: boolean;
  onToggleActionMenu: () => void;
  onFlipCard: (e: React.MouseEvent) => void;
  // ... 其他事件处理
}
```

### 4. NodeCardResizeHandles.tsx ✅
**功能**: 负责卡片尺寸调整的拖拽区域
- 8个方向的调整手柄
- 编辑状态特殊样式
- 背面富文本模式条件渲染

**接口**:
```typescript
interface NodeCardResizeHandlesProps {
  node: NodeData;
  isBack?: boolean;
  onResizeMouseDown: (e: React.MouseEvent, direction: string) => void;
  backEditMode?: 'rich' | 'markdown';
}
```

## 主组件 NodeCard.tsx 进展

### 已完成 ✅
1. **引入子组件**: 已添加所有子组件的 import
2. **正面内容替换**: 正面的编辑和展示内容已用 NodeCardEditor 和 NodeCardContent 替换
3. **回调函数准备**: 为子组件准备了必要的事件处理函数
4. **类型修复**: 修复了 ref 类型错误

### 进行中 🚧
1. **背面内容替换**: 需要用 NodeCardEditor 和 NodeCardContent 替换背面渲染逻辑
2. **操作按钮替换**: 需要用 NodeCardActions 替换现有的按钮组件
3. **调整手柄替换**: 需要用 NodeCardResizeHandles 替换现有的resize区域

### 待完成 ⏳
1. **完整集成**: 完成所有子组件的集成
2. **测试验证**: 确保拆分后功能完整性
3. **性能优化**: 检查拆分后的性能影响
4. **类型完善**: 完善所有组件的TypeScript类型定义

## 拆分优势

### 1. 可维护性 📈
- 每个子组件职责单一，易于理解和修改
- 文件大小合理（原来3461行 → 多个200-400行的文件）
- 逻辑分离，减少相互影响

### 2. 可复用性 🔄
- 编辑器组件可以在其他地方复用
- 操作按钮组件可以标准化
- 内容渲染组件可以独立使用

### 3. 测试友好 🧪
- 每个组件可以单独测试
- 模拟props更加简单
- 更容易编写单元测试

### 4. 团队协作 👥
- 不同开发者可以并行开发不同组件
- 减少代码冲突的可能性
- 更清晰的代码审查

## 下一步工作

1. **完成背面内容替换**
   ```typescript
   // 替换背面编辑和展示逻辑
   {node.isFlipped && (
     node.editing ? (
       <NodeCardEditor isBack={true} ... />
     ) : (
       <NodeCardContent isBack={true} ... />
     )
   )}
   ```

2. **集成操作按钮组件**
   ```typescript
   <NodeCardActions
     node={node}
     showActionMenu={showActionMenu}
     onToggleActionMenu={() => setShowActionMenu(!showActionMenu)}
     // ... 其他props
   />
   ```

3. **集成调整手柄组件**
   ```typescript
   {/* 正面resize区域 */}
   {!node.isFlipped && (
     <NodeCardResizeHandles 
       node={node} 
       onResizeMouseDown={handleResizeMouseDown}
     />
   )}
   
   {/* 背面resize区域 */}
   {node.isFlipped && (
     <NodeCardResizeHandles 
       node={node} 
       isBack={true}
       backEditMode={backEditMode}
       onResizeMouseDown={handleResizeMouseDown}
     />
   )}
   ```

4. **最终验证**
   - 确保所有功能正常工作
   - 验证性能没有明显下降
   - 检查类型错误和linter警告

## 预期效果

拆分完成后，NodeCard.tsx 的主要结构将变成：

```typescript
const NodeCard = forwardRef<any, Props>(({ node, readOnly = false }, ref) => {
  // 状态管理和事件处理逻辑
  
  return (
    <div className="flip-card">
      <div className="flip-card-inner">
        {/* 正面 */}
        <div className="flip-card-front">
          {!node.isFlipped && (
            node.editing ? (
              <NodeCardEditor isBack={false} ... />
            ) : (
              <NodeCardContent isBack={false} ... />
            )
          )}
        </div>
        
        {/* 背面 */}
        <div className="flip-card-back">
          {node.isFlipped && (
            node.editing ? (
              <NodeCardEditor isBack={true} ... />
            ) : (
              <NodeCardContent isBack={true} ... />
            )
          )}
        </div>
      </div>
      
      {/* 操作按钮 */}
      <NodeCardActions ... />
      
      {/* 调整手柄 */}
      <NodeCardResizeHandles ... />
      
      {/* 连接锚点 */}
      <NodeConnection ... />
      
      {/* 弹窗 */}
      {showColorPicker && <CardColorPicker ... />}
      {showDeleteModal && <DeleteConfirmModal ... />}
    </div>
  );
});
```

这样的结构更加清晰、易于维护，每个子组件都有明确的职责边界。 