# 🚀 国内部署方案对比

## 1. 腾讯云静态网站托管（推荐）⭐⭐⭐⭐⭐
**最简单，几乎免费，速度最快**
- �� 费用：免费（5GB流量/月）
- 🚄 速度：国内CDN，极快
- 🛠️ 操作：运行 `./deploy-to-tencent.sh` 即可
- 🔗 控制台：https://console.cloud.tencent.com/tcb

## 2. 阿里云OSS + CDN ⭐⭐⭐⭐⭐
**稳定可靠，价格便宜**
- 💰 费用：~5元/月
- 🚄 速度：全国CDN节点
- 🛠️ 操作：上传到OSS，开启CDN
- 🔗 控制台：https://oss.console.aliyun.com

## 3. Gitee Pages（免费）⭐⭐⭐⭐
**完全免费，但需要审核**
- 💰 费用：完全免费
- 🚄 速度：国内访问良好
- 🛠️ 操作：推送到Gitee仓库
- 🔗 网址：https://gitee.com

## 4. 腾讯云轻量服务器 ⭐⭐⭐⭐
**完全自由，可安装其他服务**
- 💰 费用：24元/月起
- 🚄 速度：很快
- 🛠️ 操作：一键安装宝塔面板
- 🔗 控制台：https://console.cloud.tencent.com/lighthouse

## 5. 华为云函数计算 ⭐⭐⭐
**Serverless，按使用付费**
- 💰 费用：基本免费
- 🚄 速度：国内不错
- 🛠️ 操作：稍复杂
- 🔗 控制台：https://console.huaweicloud.com

## 6. 百度智能云 ⭐⭐⭐
**BAE应用引擎**
- 💰 费用：有免费额度
- 🚄 速度：国内访问好
- 🛠️ 操作：中等复杂度
- �� 控制台：https://console.bce.baidu.com

## 🎯 推荐部署流程

### 超快速（5分钟）：
1. 运行 `./deploy-to-tencent.sh`
2. 按提示操作即可

### 稍专业（10分钟）：
1. 注册阿里云账号
2. 开通OSS服务
3. 上传dist文件夹
4. 开启CDN加速

### 完全免费（15分钟）：
1. 注册Gitee账号
2. 创建仓库并推送代码
3. 开启Gitee Pages
4. 等待审核通过
