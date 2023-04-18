const fs = require('fs')
const path = require('path')

function readFolderJs(folderPath, filePath) {
  try {
    let fileContents = { default: '' }
    // 读取文件夹下所有文件名
    const files = fs.readdirSync(folderPath)
    // 遍历所有文件
    files.forEach((file) => {
      // 判断是否为js文件
      if (path.extname(file) === '.txt') {
        // 读取文件内容
        const data = fs.readFileSync(path.join(folderPath, file), 'utf8')
        fileContents[file.replace('.txt', '')] = data
      }
    })

    fs.writeFileSync(filePath, 'export const systemContexts = ' + JSON.stringify(fileContents))
    console.log('systemContexts文件生成成功！')
  } catch (error) {
    console.error('systemContexts文件生成失败！', error)
  }
}

function initHtml(sourcePath, targetPath, fileName = 'index.html') {
  try {
    // 创建目标文件夹
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true })
    }
    // 读取源文件内容
    const data = fs.readFileSync(sourcePath)
    fs.writeFileSync(targetPath + '/' + fileName, data)
    console.log('index.html文件拷贝成功！')
  } catch (error) {
    console.error('index.html文件拷贝失败！', error)
  }
}

readFolderJs('./src/system', './src/common/system-contexts.ts')
initHtml('index.html', 'dist')
