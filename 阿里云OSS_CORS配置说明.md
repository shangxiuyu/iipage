# 🌐 阿里云OSS CORS配置说明

## 问题描述

在使用白板应用的取消分享功能时，可能会遇到以下错误：

```
Access to XMLHttpRequest at 'https://my-whiteboard-images.oss-cn-beijing.aliyuncs.com/whiteboards/current.json' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

这是因为浏览器的跨域资源共享（CORS）策略阻止了DELETE请求。

## 解决方案

需要在阿里云OSS控制台配置跨域规则，允许浏览器进行DELETE等操作。

### 步骤1：登录阿里云控制台

1. 访问 [阿里云控制台](https://oss.console.aliyun.com/)
2. 登录您的阿里云账号
3. 进入对象存储OSS服务

### 步骤2：选择存储桶

1. 在左侧导航栏选择"Bucket列表"
2. 找到并点击您的存储桶（如：`my-whiteboard-images`）

### 步骤3：配置跨域规则

1. 在存储桶管理页面，点击左侧导航栏的"数据管理" → "跨域设置"
2. 点击"设置"按钮
3. 点击"创建规则"按钮
4. 配置以下参数：

#### 🔧 推荐配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **来源** | `*` 或 `http://localhost:5173` | 允许的域名，* 表示所有域名 |
| **方法** | `GET, POST, PUT, DELETE, HEAD` | 允许的HTTP方法 |
| **允许Headers** | `*` | 允许的请求头，* 表示所有 |
| **暴露Headers** | `ETag, x-oss-request-id` | 暴露给浏览器的响应头 |
| **缓存时间** | `600` | 预检请求的缓存时间（秒） |

#### 📝 详细配置步骤

**来源（Origin）配置：**
```
*
```
或者更安全的配置：
```
http://localhost:5173
https://yourdomain.com
```

**允许方法（Methods）配置：**
- ✅ GET
- ✅ POST  
- ✅ PUT
- ✅ DELETE （重要：取消分享功能需要此权限）
- ✅ HEAD

**允许Headers配置：**
```
*
```
或具体指定：
```
authorization
content-type
date
host
x-oss-date
x-oss-user-agent
```

**暴露Headers配置：**
```
ETag
x-oss-request-id
x-oss-version-id
```

### 步骤4：保存配置

1. 点击"确定"保存规则
2. 等待配置生效（通常1-2分钟）

## 验证配置

### 方法1：使用调试工具
访问 `http://localhost:5173/debug-cancel-share-test.html` 进行测试：

1. 点击"测试OSS连接"
2. 点击"检查CORS配置"  
3. 运行"完整流程测试"

### 方法2：浏览器测试
在浏览器控制台执行：

```javascript
fetch('https://my-whiteboard-images.oss-cn-beijing.aliyuncs.com/test', {
  method: 'DELETE',
  mode: 'cors'
}).then(response => {
  console.log('CORS配置正常');
}).catch(error => {
  console.log('CORS配置有问题:', error);
});
```

## 常见问题

### Q1：配置后仍然报CORS错误
**解决方案：**
1. 等待2-3分钟让配置生效
2. 清除浏览器缓存
3. 检查来源配置是否包含当前域名
4. 确保DELETE方法已添加到允许方法中

### Q2：生产环境如何配置
**建议配置：**
- 来源：设置为具体的生产域名，如 `https://yourdomain.com`
- 方法：保持相同配置
- Headers：可以更具体地指定需要的头部

### Q3：安全性考虑
**最佳实践：**
1. **来源限制**：避免使用 `*`，指定具体域名
2. **方法限制**：只允许必需的HTTP方法
3. **定期审查**：定期检查和更新CORS规则
4. **使用STS**：考虑使用STS临时凭证替代长期密钥

## 示例配置文件

### 开发环境配置
```json
{
  "CORSRule": [
    {
      "AllowedOrigin": ["http://localhost:5173", "http://localhost:3000"],
      "AllowedMethod": ["GET", "POST", "PUT", "DELETE", "HEAD"],
      "AllowedHeader": ["*"],
      "ExposeHeader": ["ETag", "x-oss-request-id"],
      "MaxAgeSeconds": 600
    }
  ]
}
```

### 生产环境配置
```json
{
  "CORSRule": [
    {
      "AllowedOrigin": ["https://yourdomain.com"],
      "AllowedMethod": ["GET", "POST", "PUT", "DELETE", "HEAD"],
      "AllowedHeader": ["authorization", "content-type", "x-oss-date"],
      "ExposeHeader": ["ETag", "x-oss-request-id"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

## 故障排除

### 检查列表
- [ ] CORS规则已创建并保存
- [ ] 等待配置生效（2-3分钟）
- [ ] 来源包含当前访问域名
- [ ] 允许方法包含DELETE
- [ ] 浏览器缓存已清除
- [ ] 网络连接正常

### 调试命令
```bash
# 检查预检请求
curl -X OPTIONS \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: DELETE" \
  https://my-whiteboard-images.oss-cn-beijing.aliyuncs.com/test

# 检查实际DELETE请求
curl -X DELETE \
  -H "Origin: http://localhost:5173" \
  https://my-whiteboard-images.oss-cn-beijing.aliyuncs.com/test
```

## 联系支持

如果按照以上步骤配置后仍然遇到问题，请：

1. 检查阿里云OSS服务状态
2. 联系阿里云技术支持
3. 查看OSS访问日志分析具体错误

配置完成后，白板应用的取消分享功能就能正常工作了！🚀 