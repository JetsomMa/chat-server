// pnpm build
// docker build  --platform=linux/x86_64 -f .node/Dockerfile -t 10.8.0.1:5000/chat-server:0.0.1 .
// docker push 10.8.0.1:5000/chat-server:0.0.1

const { execSync } = require('child_process')
const colors = require('colors-console')
const packageJsonConfig = require('./package.json')

let status = true

console.error(colors('blue',`----------准备生成chat-server镜像${packageJsonConfig.version}----------`))
console.error(colors('blue',`----------开始编译----------`))
runCmd("pnpm build")
console.error(colors('blue',`----------开始打包chat-server镜像----------`))
runCmd(`docker build --platform=linux/x86_64 -f .node/Dockerfile -t 10.8.0.1:5000/chat-server:${packageJsonConfig.version} .`)
console.error(colors('blue',`----------开始上传chat-server镜像----------`))
// runCmd(`docker push 10.8.0.1:5000/chat-server:${packageJsonConfig.version}`)
console.error(colors('blue',`----------chat-server镜像上传完成【10.8.0.1:5000/chat-server:${packageJsonConfig.version}】----------`))

function runCmd(cmd){
    execSync(cmd, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error){
            status = false
            console.error(colors('red', `执行命令[${cmd}]发生异常`))
        } else {
            console.error(colors('yellow',`${stderr}`))
            console.error(colors('blue',`${stdout}`))
        }
    })
}