#!/bin/bash

# Stop on error
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== 智能投资助手 (AI InvestPilot) 一键部署脚本 ===${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用 sudo 运行此脚本 (Please run as root)${NC}"
  exit 1
fi

# 1. Environment Setup
echo -e "${YELLOW}Step 1: 检查并安装运行环境 (Node.js & Nginx)...${NC}"

# Update apt
apt-get update -y

# Install Nginx and Git
apt-get install -y nginx git curl

# Install Node.js 20 (LTS) if not present
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "Node.js 已安装: $(node -v)"
fi

# 2. Project Configuration
echo -e "${YELLOW}Step 2: 配置项目参数...${NC}"

APP_DIR="/var/www/invest-pilot"
CURRENT_DIR=$(pwd)

# Prompt for Domain or IP
read -p "请输入服务器 IP 或域名 (例如: 1.2.3.4 或 example.com): " DOMAIN_NAME
if [ -z "$DOMAIN_NAME" ]; then
    echo -e "${RED}错误: 必须输入 IP 或域名${NC}"
    exit 1
fi

# Prompt for Google Gemini API Key
read -p "请输入 Google Gemini API Key: " USER_API_KEY
if [ -z "$USER_API_KEY" ]; then
    echo -e "${RED}错误: 必须输入 API Key${NC}"
    exit 1
fi

# 3. Build Project
echo -e "${YELLOW}Step 3: 构建项目...${NC}"

# Ensure we are in the project directory (assuming script is run from project root)
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 未找到 package.json。请确保你在项目根目录下运行此脚本。${NC}"
    exit 1
fi

# Install dependencies
echo "安装依赖..."
npm install

# Create .env file for build
echo "API_KEY=$USER_API_KEY" > .env

# Build
echo "开始编译打包..."
npm run build

# 4. Deploy Files
echo -e "${YELLOW}Step 4: 部署文件...${NC}"

# Create target directory
mkdir -p $APP_DIR

# Clean old files
rm -rf $APP_DIR/*

# Copy dist files
cp -r dist/* $APP_DIR/

# Set permissions
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

# 5. Configure Nginx
echo -e "${YELLOW}Step 5: 配置 Nginx...${NC}"

NGINX_CONF="/etc/nginx/sites-available/invest-pilot"

cat > $NGINX_CONF <<EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    root $APP_DIR;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Optional: Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

# Enable site
ln -sf $NGINX_CONF /etc/nginx/sites-enabled/

# Remove default nginx config if exists to avoid conflicts
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Test and Reload Nginx
nginx -t
systemctl reload nginx

echo -e "${GREEN}=== 部署完成! ===${NC}"
echo -e "请访问: http://$DOMAIN_NAME"
echo -e "注意: 如果在大陆服务器访问 Gemini API 遇到网络问题，可能需要配置服务器代理。"
