# 使用官方Node.js镜像作为基础镜像
FROM node:lts-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json到工作目录
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY .env ./
COPY .env.development ./
COPY .env.production ./

# 安装依赖
RUN npm i -g pnpm
RUN pnpm i -P

# 复制应用程序源代码到工作目录
COPY ./dist ./dist

# 暴露Node.js应用程序所需端口
EXPOSE 3000

# 启动Node.js应用程序
CMD [ "pnpm", "start" ]
