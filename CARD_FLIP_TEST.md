# 卡片反转功能测试步骤

## 测试场景1：新卡片创建和编辑

### 步骤：
1. **创建新卡片**
   - 在白板上双击创建新卡片
   - 观察：新卡片应该处于编辑状态，显示正面（F标识）

2. **编辑正面内容**
   - 输入文字："这是正面内容"
   - 点击卡片外部退出编辑
   - 观察：内容应该保存，显示正面内容

3. **检查数据状态**
   - 打开浏览器开发者工具，控制台输入：
   ```javascript
   // 获取最新创建的卡片
   const nodes = window.useBoardStore.getState().nodes;
   const latestNode = nodes[nodes.length - 1];
   console.log('正面内容:', latestNode.frontContent);
   console.log('反面内容:', latestNode.backContent);
   console.log('传统内容:', latestNode.content);
   console.log('当前显示面:', latestNode.isFlipped ? '反面' : '正面');
   ```

4. **翻转到反面**
   - 选中卡片，点击更多操作按钮（三个点）
   - 点击翻转按钮
   - 观察：卡片应该显示动画，然后显示反面（B标识）

5. **编辑反面内容**
   - 双击卡片进入编辑状态
   - 输入文字："这是反面内容"
   - 点击卡片外部退出编辑
   - 观察：反面内容应该保存

6. **再次检查数据状态**
   ```javascript
   const nodes = window.useBoardStore.getState().nodes;
   const latestNode = nodes[nodes.length - 1];
   console.log('正面内容:', latestNode.frontContent);
   console.log('反面内容:', latestNode.backContent);
   console.log('传统内容:', latestNode.content);
   console.log('当前显示面:', latestNode.isFlipped ? '反面' : '正面');
   ```

7. **翻转回正面**
   - 选中卡片，点击翻转按钮
   - 观察：应该显示之前输入的正面内容

## 预期结果

- ✅ 正面内容：应该保存在 `frontContent` 和 `content` 字段
- ✅ 反面内容：应该只保存在 `backContent` 字段
- ✅ `content` 字段：应该始终与正面内容一致，不受反面编辑影响
- ✅ 翻转显示：正反面应该显示对应的内容

## 如果测试失败

### 检查点1：内容保存位置
- 如果反面编辑影响了 `content` 字段，说明 `handleEditorChange` 逻辑有问题
- 如果 `frontContent` 为空，说明初始创建逻辑有问题

### 检查点2：显示逻辑
- 如果翻转后显示错误内容，说明 `displayContent` 逻辑有问题
- 如果编辑器初始化错误，说明 `editorValue` 初始化有问题

### 检查点3：状态同步
- 如果翻转动画正常但内容不变，说明状态更新有延迟
- 如果完全无反应，说明 `flipCard` 方法有问题 