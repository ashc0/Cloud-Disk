const express = require('express')
const multiparty = require('multiparty')
const cors = require('cors')
const morgan = require('morgan')
const path = require('path')
const fs = require('fs')
const { rejects } = require('assert')
const app = express()

app.use(morgan('dev'))
app.use(cors())
app.use(express.urlencoded({
  extended: false
}))
app.use(express.json())
// app.use(multipart())

const chunkPath = path.join(process.cwd(), '/chunks')
const uploadPath = path.join(process.cwd(), '/upload')

app.get('/download', express.static(path.join(__dirname, '/upload')))

app.post('/upload', async (req, res, next) => {
  try {

    var form = new multiparty.Form({
      uploadDir: path.join(__dirname, '/upload'),
      autoFiles: true
    })
    form.parse(req, (err, fileds, files) => {
      console.log(files)
    });

    return res.status(200).json({
      msg: 'success'
    })
  } catch (err) {
    next(err)
  }
})

app.post('/hash', (req, res) => {
  const path = uploadPath + '/' + req.body.contentHash
  const isExist = fs.existsSync(path)
  // 0: 新文件 1：已存在 2：已有分片，需要续传
  let state = -1, chunksIndexList = []
  if (isExist) {
    let fileList = fs.readdirSync(path)
    if (fileList[0] === 'chunks') {
      chunksIndexList = fs.readdirSync(path + '/chunks').map(item => item.split('-')[0])
      state = 2
    } else {
      state = 1
    }
  } else {
    state = 0
  }
  res.status(200).json({
    state,
    chunksIndexList
  })
})

app.post('/chunk/:hash', async (req, res, next) => {
  try {
    let hashPath = '/' + req.params.hash
    let uploadDir = path.join(uploadPath, hashPath, '/chunks')
    fs.readdir(uploadDir, (err, fileList) => {
      if (fileList === undefined) fs.mkdirSync(uploadDir, { recursive: true })
      var form = new multiparty.Form({
        uploadDir,
        autoFiles: true
      })
      form.parse(req, (err, fileds, files) => {
        let chunk = files.chunk[0]
        fs.renameSync(chunk.path, path.join(uploadDir, fileds.hash[0]))
        setTimeout(() => {
          res.status(200).json({
            msg: 'success'
          })
        }, 3000 * Math.random())
      });
    })
  } catch (err) {
    next(err)
  }
})

app.post('/merge/:hash', async (req, res, next) => {
  let hashPath = '/' + req.params.hash
  let chunksDir = path.join(uploadPath, hashPath, '/chunks')
  fs.readdir(chunksDir, (err, chunksList) => {
    console.log(chunksList.length)
    let chunksTask = []
    chunksList.sort((a, b) => {
      return a.split('-')[0] - b.split('-')[0]
    })
    let filename = chunksList[0].slice(2)
    let filePath = path.join(uploadPath, hashPath) + '/' + filename
    // 创建新文件并关闭文件描述符
    fs.closeSync(fs.openSync(filePath, 'w'))

    chunksList.forEach((chunk, index) => {
      let p = new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath, {
          flags: 'r+',
          start: index * 100
        })
        const readStream = fs.createReadStream(chunksDir + '/' + chunk);
        readStream.on("end", () => {
          // 可读流触发end时，pipe上的可写流自动end
          resolve();
        });
        readStream.on('error', (err) => {
          // 可读流error时，pipe上的可写流不会关闭，需要手动关闭
          writeStream.close()
          reject(err)
        })
        readStream.pipe(writeStream);
      })
      chunksTask.push(p)
    })
    Promise.all(chunksTask).then(() => {
      fs.rmSync(chunksDir, {recursive: true});
      res.status(200).json({
      })
    }).catch(e => { next(e) })
  })
})

app.use((err, req, res, next) => {
  res.status(500).json({
    msg: err
  })
})

app.listen(3000, () => {
  console.log('listening on port 3000')
})