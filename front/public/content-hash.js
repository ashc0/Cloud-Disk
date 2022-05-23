importScripts('/spark-md5.min.js');

self.onmessage = e => {
  let file = e.data.file
  let fileReader = new FileReader()
  fileReader.readAsArrayBuffer(file)

  fileReader.onload = e => {
    let hash = SparkMD5.ArrayBuffer.hash(e.target.result)
    self.postMessage({ contentHash: hash })
  }
}