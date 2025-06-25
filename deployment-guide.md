# 阿里云ECS + 宝塔面板部署指南

## 1. 购买阿里云ECS
- 选择轻量应用服务器（最便宜的2核2G即可）
- 选择Ubuntu 20.04系统
- 开通公网IP

## 2. 安装宝塔面板
sudo wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh

## 3. 配置环境
- 在宝塔面板安装 Nginx
- 安装 Node.js 管理器
- 安装 PM2 管理器

## 4. 部署项目
- 上传代码到 /www/wwwroot/your-site
- npm install && npm run build
- 配置 Nginx 指向 dist 目录

## 5. 域名解析
- 购买域名并备案
- 解析到ECS公网IP
