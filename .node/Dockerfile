# 使用官方Node.js镜像作为基础镜像
FROM node:18

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json到工作目录
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制应用程序源代码到工作目录
COPY . /app

# 暴露Node.js应用程序所需端口
EXPOSE 3000

# 启动Node.js应用程序
CMD ["npm", "run", "dev"]
