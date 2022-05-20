const express = require('express')
const multiparty = require('multiparty')
const cors = require('cors')
const morgan = require('morgan')
const path = require('path')
const fs = require('fs')
const app = express()

app.use(morgan('dev'))
app.use(cors())
app.use(express.urlencoded({
  extended: false
}))
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

app.post('/chunk', async (req, res, next) => {
  try {
    var form = new multiparty.Form({
      uploadDir: path.join(__dirname, '/chunks'),
      autoFiles: true
    })
    form.parse(req, (err, fileds, files) => {
      let chunk = files.chunk[0]
      fs.rename(chunk.path, path.join(chunkPath, fileds.hash[0]), (err) => { if (err) next(err) })
    });
    return res.status(200).json({
      msg: 'success'
    })
  } catch (err) {
    next(err)
  }
})

app.post('/merge', async (req, res, next) => {
  fs.readdir(chunkPath, (err, chunksList) => {
    chunksList.sort((a, b) => {
      return a.split('-')[0] - b.split('-')[0]
    })

    let filename = chunksList[0].slice(2)

    chunksList.forEach(chunk => {
      fs.appendFileSync(
        uploadPath + '/' + filename,
        fs.readFileSync(chunkPath + '/' + chunk)
      );
      fs.rmSync(chunkPath + '/' + chunk);
    })

    return res.status(200).json({
      msg: 'success'
    })
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