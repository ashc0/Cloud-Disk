const path = require('path')
const fs = require('fs')

// console.log(fs.readdirSync(path.join(__dirname, '/upload')))

fs.rmSync(path.join(__dirname, '/upload'), {recursive: true})

// fs.exists