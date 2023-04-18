# 使用官方MySQL镜像作为基础镜像
FROM mysql:8.0

# 设置环境变量
ENV MYSQL_DATABASE=dataset \
    MYSQL_USER=dataset \
    MYSQL_PASSWORD=dataset2023 \
    MYSQL_ROOT_PASSWORD=pinefieldchat \
    MYSQL_ALLOW_EMPTY_PASSWORD=no

# 将SQL文件复制到容器的/docker-entrypoint-initdb.d/目录
# 在容器启动时，这些SQL文件将被自动执行
COPY .mysql/init.sql /docker-entrypoint-initdb.d/init.sql

# 暴露MySQL服务端口
EXPOSE 3306

# 容器启动时运行的命令
CMD ["mysqld"]
