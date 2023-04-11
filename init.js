const fs = require('fs')
const path = require('path')

function readFolderJs(folderPath, filePath) {
  let fileContents = {}
  // 读取文件夹下所有文件名
  const files = fs.readdirSync(folderPath);
  // 遍历所有文件
  files.forEach(file => {
      // 判断是否为js文件
      if (path.extname(file) === '.txt') {
          // 读取文件内容
          const data = fs.readFileSync(path.join(folderPath, file), 'utf8');
          fileContents[file.replace('.txt', '')] = data
      }
  });

  fs.writeFileSync(filePath, 'export const systemContexts = ' + JSON.stringify(fileContents))
}

function initHtml(sourcePath, targetPath){
  // 读取源文件内容
  fs.readFile(sourcePath, function (err, data) {
    if (err) {
      console.error(err);
    } else {
      // 写入目标文件
      fs.writeFile(targetPath, data, function (err) {
        if (err) {
          console.error(err);
        } else {
          console.log('File copied successfully.');
        }
      });
    }
  });
}

readFolderJs('./src/system', './src/common/system-contexts.ts')
initHtml('index.html', 'dist/index.html')