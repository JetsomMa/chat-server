// 后因胡宇直接提供了mysql数据库的用户名密码，这个脚本未被使用，仅作为技术开发样本存在

// docker build -f .mysql/Dockerfile -t 10.8.0.1:5000/mysql-dataset:0.0.1 .
// docker push 10.8.0.1:5000/mysql-dataset:0.0.1

const { execSync } = require('child_process')
const colors = require('colors-console')
const packageJsonConfig = require('./package.json')

console.error(colors('blue',`----------开始打包[mysql]镜像----------`))
runCmd(`docker build -f .mysql/Dockerfile -t 10.8.0.1:5000/mysql-dataset:${packageJsonConfig.version} .`)
console.error(colors('blue',`----------开始上传[mysql]镜像----------`))
runCmd(`docker push 10.8.0.1:5000/mysql-dataset:${packageJsonConfig.version}`)
console.error(colors('blue',`----------[mysql]镜像上传完成【10.8.0.1:5000/mysql-dataset:${packageJsonConfig.version}】----------`))

function runCmd(cmd){
    execSync(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error){
            console.error(colors('red', `执行命令[${cmd}]发生异常`))
        } else {
            console.error(colors('yellow',`${stderr}`))
            console.error(colors('blue',`${stdout}`))
        }
    })
}