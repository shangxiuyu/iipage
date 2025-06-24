# 🔧 阿里云OSS删除功能CORS配置说明

## 📋 问题描述

删除图片/视频时出现CORS错误：
```
Access to XMLHttpRequest at 'https://my-whiteboard-images.oss-cn-beijing.aliyuncs.com/images/xxx.jpg' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🔍 问题原因

阿里云OSS的跨域资源共享(CORS)配置不允许从本地开发环境执行DELETE操作。虽然可以上传文件(PUT)，但删除文件(DELETE)被CORS策略阻止。

## ⚙️ 解决方案：配置OSS CORS规则

### 步骤1：登录阿里云OSS控制台

1. 访问 [https://oss.console.aliyun.com](https://oss.console.aliyun.com)
2. 选择您的存储桶 `my-whiteboard-images`

### 步骤2：进入跨域设置

1. 在左侧菜单中找到 **"权限管理"** → **"跨域设置"**
2. 点击 **"设置"** 或 **"创建规则"**

### 步骤3：添加CORS规则

配置以下CORS规则：

**规则1：开发环境规则**
```
来源(Origin): http://localhost:*
允许 Methods: GET, POST, PUT, DELETE, HEAD
允许 Headers: *
暴露 Headers: ETag, x-oss-request-id
缓存时间(秒): 600
```

**规则2：生产环境规则**（根据实际域名修改）
```
来源(Origin): https://yourdomain.com
允许 Methods: GET, POST, PUT, DELETE, HEAD  
允许 Headers: *
暴露 Headers: ETag, x-oss-request-id
缓存时间(秒): 600
```

### 步骤4：具体配置界面操作

1. **来源(Origin)**：
   - 开发环境：`http://localhost:*`
   - 生产环境：`https://yourdomain.com`
   - 临时测试：`*`（不推荐生产使用）

2. **允许 Methods**：
   - ✅ GET
   - ✅ POST  
   - ✅ PUT
   - ✅ DELETE （重要！删除功能必需）
   - ✅ HEAD

3. **允许 Headers**：
   - 填入：`*`（允许所有请求头）

4. **暴露 Headers**：
   - 填入：`ETag, x-oss-request-id`

5. **缓存时间**：
   - 填入：`600`（10分钟）

## 📖 详细配置说明

### CORS配置项说明

| 配置项 | 说明 | 推荐值 |
|--------|------|--------|
| **Origin（来源）** | 允许访问的域名 | `http://localhost:*` (开发)<br/>`https://yourdomain.com` (生产) |
| **Methods（方法）** | 允许的HTTP方法 | `GET, POST, PUT, DELETE, HEAD` |
| **Headers（请求头）** | 允许的请求头 | `*` |
| **Expose Headers（暴露头）** | 暴露给客户端的响应头 | `ETag, x-oss-request-id` |
| **Max Age（缓存时间）** | 预检请求的缓存时间 | `600` |

### 重要说明

1. **DELETE方法是关键**
   - 必须明确添加DELETE方法到允许列表
   - 否则删除操作会被CORS阻止

2. **Origin配置**
   - 开发环境：`http://localhost:*` 支持所有本地端口
   - 生产环境：使用确切的域名，提高安全性
   - 避免在生产环境使用 `*` 通配符

3. **安全考虑**
   - 生产环境应使用具体域名，不要使用 `*`
   - 定期检查和更新CORS配置
   - 监控异常访问

## 🧪 配置验证

### 方法1：浏览器控制台验证
配置后重试删除操作，检查是否还有CORS错误。

### 方法2：手动CORS测试
在控制台执行以下代码测试：
```javascript
fetch('https://my-whiteboard-images.oss-cn-beijing.aliyuncs.com/', {
  method: 'OPTIONS',
  headers: {
    'Origin': 'http://localhost:5176',
    'Access-Control-Request-Method': 'DELETE',
    'Access-Control-Request-Headers': 'Content-Type'
  }
}).then(response => {
  console.log('CORS配置状态:', response.status);
  console.log('响应头:', [...response.headers.entries()]);
}).catch(error => {
  console.error('CORS测试失败:', error);
});
```

## 🔄 配置生效时间

- CORS规则配置后立即生效
- 如果仍有问题，等待1-2分钟再测试
- 清除浏览器缓存或使用无痕模式测试

## 🚀 配置完成后的测试

1. **删除图片测试**：
   - 在白板中插入云端图片
   - 删除图片
   - 检查控制台应该显示：`✅ 云端文件删除成功`

2. **验证云端文件**：
   - 使用验证工具检查文件是否真的被删除
   - 或直接在OSS控制台查看文件列表

## ⚠️ 常见问题

### Q1：配置后仍然有CORS错误
**A1：** 
- 检查Origin配置是否包含当前访问的域名和端口
- 确认DELETE方法已添加到允许列表
- 清除浏览器缓存重试

### Q2：生产环境如何配置？
**A2：**
- 将Origin改为实际的生产域名
- 移除 `*` 通配符，使用具体域名
- 考虑添加多个规则支持不同环境

### Q3：是否影响其他功能？
**A3：**
- 正确的CORS配置不会影响现有功能
- 只是增加了DELETE操作的支持
- 所有上传、查看功能保持不变

---

## 📞 技术支持

如果配置后仍有问题，请提供：
1. 具体的CORS配置截图
2. 浏览器控制台的完整错误信息
3. 当前访问的域名和端口

**配置完成后，您的白板应用将拥有完整的云端文件生命周期管理能力！** 🎉 