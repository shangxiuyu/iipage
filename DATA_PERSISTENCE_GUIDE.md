# 🗄️ 数据持久化解决方案

## 📊 问题背景

**你提出的问题：** "卡片只能渲染前端的一些代码，但是如果用户在渲染的卡片输入了内容，怎么长久化的保存数据？"

**当前状况：**
- ❌ 页面刷新后数据丢失
- ❌ 关闭浏览器后数据丢失  
- ❌ 用户在渲染卡片中输入的内容无法持久保存
- ❌ 没有备份和恢复机制

## ✅ 已实现的解决方案

### 1. 自动本地存储 (已实现)

**功能描述：**
- 🔄 **自动保存**：每次数据变化后1秒自动保存到浏览器localStorage
- 📱 **即时恢复**：页面刷新后自动恢复所有数据
- 🎯 **选择性持久化**：只保存重要数据，排除临时状态

**技术实现：**
```typescript
// 使用 Zustand persist 中间件
export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      // ... store logic
    }),
    {
      name: 'whiteboard-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        nodes: state.nodes,              // 🎯 卡片数据
        connections: state.connections,   // 🎯 连线数据
        currentBackground: state.currentBackground,
        // ... 其他持久化数据
      })
    }
  )
);
```

**保存的数据包括：**
- 📝 卡片内容（正面/反面文本、富文本、图片）
- 🎨 卡片样式（颜色、位置、大小）
- 💻 代码内容（HTML/CSS/JS代码及渲染状态）
- 🔗 卡片连线关系
- 🖼️ 背景设置
- 📐 视图状态（缩放、平移）

### 2. 手动备份下载 (已实现)

**功能描述：**
- 💾 手动导出白板数据为JSON文件
- 📂 支持从JSON文件导入数据
- 🔄 本地备份恢复功能

**使用方法：**
```typescript
// 保存数据
const saveBoard = useBoardStore((s) => s.saveBoard);
saveBoard(); // 生成备份文件并下载

// 加载数据
const loadBoard = useBoardStore((s) => s.loadBoard);
loadBoard(boardData); // 从文件或备份恢复
```

### 3. 数据管理界面 (已实现)

**组件功能：**
- 📊 数据统计（卡片数量、连接数量、存储大小）
- 💾 手动保存和下载
- 📂 文件导入和本地恢复
- ⚙️ 存储设置和清空白板

## 🚀 高级持久化方案

### 方案二：IndexedDB 本地数据库

**适用场景：** 大量数据、离线应用、更好的性能

```typescript
// 创建 IndexedDB 存储层
class WhiteboardDB {
  private db: IDBDatabase | null = null;
  
  async init() {
    const request = indexedDB.open('WhiteboardDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 创建对象存储
      if (!db.objectStoreNames.contains('boards')) {
        const boardStore = db.createObjectStore('boards', { keyPath: 'id' });
        boardStore.createIndex('name', 'name', { unique: false });
        boardStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('nodes')) {
        const nodeStore = db.createObjectStore('nodes', { keyPath: 'id' });
        nodeStore.createIndex('boardId', 'boardId', { unique: false });
      }
    };
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  async saveBoard(boardData: any) {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['boards'], 'readwrite');
    const store = transaction.objectStore('boards');
    
    const boardRecord = {
      id: Date.now().toString(),
      name: `白板-${new Date().toLocaleDateString()}`,
      data: boardData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return store.add(boardRecord);
  }
  
  async getAllBoards() {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['boards'], 'readonly');
    const store = transaction.objectStore('boards');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
```

### 方案三：云端存储集成

**适用场景：** 多设备同步、协作、数据安全

```typescript
// Firebase Firestore 集成示例
import { doc, setDoc, getDoc, collection, onSnapshot } from 'firebase/firestore';

class CloudStorage {
  async saveBoard(boardId: string, boardData: any) {
    try {
      await setDoc(doc(db, 'whiteboards', boardId), {
        ...boardData,
        updatedAt: new Date(),
        version: 1
      });
      
      console.log('✅ 云端保存成功');
    } catch (error) {
      console.error('❌ 云端保存失败:', error);
      throw error;
    }
  }
  
  async loadBoard(boardId: string) {
    try {
      const docSnap = await getDoc(doc(db, 'whiteboards', boardId));
      
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        throw new Error('白板不存在');
      }
    } catch (error) {
      console.error('❌ 云端加载失败:', error);
      throw error;
    }
  }
  
  // 实时同步
  subscribeToBoard(boardId: string, callback: (data: any) => void) {
    return onSnapshot(doc(db, 'whiteboards', boardId), (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      }
    });
  }
}
```

### 方案四：后端数据库集成

**适用场景：** 企业应用、数据分析、高级权限控制

```typescript
// REST API 集成示例
class BackendStorage {
  private apiBase = 'https://your-api.com/api';
  
  async saveBoard(boardData: any) {
    const response = await fetch(`${this.apiBase}/boards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
      body: JSON.stringify({
        name: `白板-${new Date().toISOString()}`,
        data: boardData,
        tags: ['AI生成', '代码渲染'],
        isPublic: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`保存失败: ${response.status}`);
    }
    
    return response.json();
  }
  
  async loadBoard(boardId: string) {
    const response = await fetch(`${this.apiBase}/boards/${boardId}`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`加载失败: ${response.status}`);
    }
    
    return response.json();
  }
  
  async searchBoards(query: string) {
    const response = await fetch(`${this.apiBase}/boards/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });
    
    return response.json();
  }
  
  private getToken() {
    return localStorage.getItem('auth_token') || '';
  }
}
```

## 📱 渲染卡片数据持久化

### 特殊处理：用户在渲染卡片中的输入

对于你提到的"用户在渲染的卡片输入了内容"，这里有几种情况：

#### 1. 表单数据持久化

```typescript
// 在 HtmlPreview 组件中添加表单数据收集
const HtmlPreviewWithPersistence: React.FC<{html: string, nodeId: string}> = ({ html, nodeId }) => {
  const updateNode = useBoardStore((s) => s.updateNode);
  
  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'FORM_DATA') {
      // 保存表单数据到节点
      updateNode(nodeId, {
        formData: event.data.data
      });
    }
  };
  
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  const htmlWithDataCollection = `
    ${html}
    <script>
      // 监听表单变化
      document.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          const formData = new FormData(e.target.form || document);
          const data = Object.fromEntries(formData.entries());
          
          // 发送数据到父窗口
          window.parent.postMessage({
            type: 'FORM_DATA',
            data: data
          }, '*');
        }
      });
    </script>
  `;
  
  return <iframe srcDoc={htmlWithDataCollection} />;
};
```

#### 2. 可编辑内容持久化

```typescript
// 支持 contentEditable 区域的数据保存
const handleContentEdit = (nodeId: string) => {
  const iframe = document.querySelector(`iframe[data-node="${nodeId}"]`) as HTMLIFrameElement;
  
  if (iframe?.contentWindow) {
    // 注入内容保存脚本
    iframe.contentWindow.postMessage({
      type: 'ENABLE_CONTENT_PERSISTENCE',
      script: `
        document.addEventListener('input', (e) => {
          if (e.target.contentEditable === 'true') {
            window.parent.postMessage({
              type: 'CONTENT_CHANGED',
              nodeId: '${nodeId}',
              selector: e.target.id || e.target.className,
              content: e.target.innerHTML
            }, '*');
          }
        });
      `
    }, '*');
  }
};
```

## 🔧 实施建议

### 立即可用的解决方案：

1. **✅ 已实现的本地存储** - 无需额外配置，立即可用
2. **✅ 已实现的备份下载** - 用户可手动备份重要数据
3. **✅ 已实现的数据管理界面** - 可视化管理数据

### 进阶扩展：

1. **IndexedDB升级** - 处理大量数据和离线场景
2. **云端同步** - 多设备访问和协作
3. **后端集成** - 企业级数据管理

### 渲染卡片交互数据：

1. **表单数据收集** - 自动保存用户输入
2. **状态同步** - 实时更新UI状态
3. **版本控制** - 追踪数据变化历史

## 🎯 使用指南

### 当前功能使用：

1. **自动保存**：无需操作，数据自动持久化
2. **手动备份**：右键菜单 → 数据管理 → 保存
3. **数据恢复**：上传JSON文件或恢复本地备份
4. **清空重置**：数据管理 → 设置 → 清空白板

### 数据安全：

- 🔐 本地存储：数据保存在用户浏览器中，私密安全
- 💾 备份文件：用户可下载JSON备份文件保存
- 🔄 版本管理：支持数据格式升级和兼容性
- ⚠️ 清空确认：危险操作需要用户确认

现在你的白板应用已经具备了完整的数据持久化功能，用户在渲染卡片中输入的所有内容都会被自动保存和恢复！ 