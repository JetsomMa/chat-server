-- # 创建新用户并设置密码
alter USER 'dataset'@'%' IDENTIFIED BY 'dataset2023' PASSWORD EXPIRE NEVER;
alter USER 'dataset'@'%' IDENTIFIED WITH mysql_native_password BY 'dataset2023';
flush privileges; 

-- # 创建数据库
-- CREATE DATABASE dataset;
-- /*给予查询权限*/
-- grant select on dataset.* to 'dataset'@'%';  
-- /*添加插入权限*/
-- grant insert on dataset.* to 'dataset'@'%'; 
-- /*添加删除权限*/
-- grant delete on dataset.* to 'dataset'@'%'; 
-- /*添加权限*/
-- grant update on dataset.* to 'dataset'@'%'; 
-- /*刷新权限*/
-- flush privileges; 

CREATE TABLE `dataset`.`conversation`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `prompt` varchar(2000),
  `conversation` varchar(4000),
  `datetime` varchar(25),
  `conversationid` varchar(50),
  `usage` varchar(200),
  `finish_reason` varchar(20),
  `username` varchar(30),
  PRIMARY KEY (`id`) USING BTREE
);