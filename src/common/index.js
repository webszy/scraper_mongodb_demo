const download = require('download')
const fs = require('fs-extra')
const path = require('path')
const url = require('url')
const setting=require('../../package.json').settings
function makeDirSync(dirName) {
  const dirPath = path.join(basePath, dirName)
  if (fs.existsSync(dirPath)) {
    return dirPath
  } else {
    fs.mkdirSync(dirPath, { recursive: true })
    return dirPath
  }
}
function downloadFile(filename, downUrl) {
  const destPath = makeDirSync(path.join(__dirname, '../../', setting.saveLoaction || "images"))

  if (downUrl.startsWith('//')) {
    downUrl = 'https:' + downUrl
  }
  const downURL = new url.URL(downUrl)
  let fileType = downURL.pathname.split('/').slice(-1)[0].split('.')[1]
  if (!fileType || !['jpeg', 'jpg', 'png'].includes(fileType.toLowerCase())) {
    fileType = 'png'
  }

  return new Promise((resolve, reject) => {
    const file = filename + '.' + fileType
    const fileList = fs.readdirSync(destPath)
    if (fileList.includes(file)) {
      console.log('file existed ' + file)
      resolve(false)
    }
    const fullPath = path.join(destPath, file)
    console.log(filename)
    if (downUrl.indexOf(';base64,') >= 0) {
      fs.writeFileSync(fullPath, downUrl.split(';base64,')[1], 'base64', async err => {
        if (err) {
          reject && reject(err)
        }
        console.log(fullPath + '     saved')
        resolve && resolve(true)
      })
      return
    }
    download(downUrl)
      .pipe(fs.createWriteStream(fullPath))
      .on('error', err => {
        reject && reject(err)
        // process.exit(0)
      })
      .on('close', async () => {
        console.log(file + '   saved')
        resolve && resolve(true)
      })
  })
}
module.exports={
  downloadFile
}