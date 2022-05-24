# 文件上传DEMO

本DEMO实现了分片上传，并限制了并发数。

使用Web-Worker计算文件hash值来实现秒传。

实现了服务端的断点续传。

## 使用
```shell
cd ./front/
yarn serve

cd ./back/
node ./app.js
```

**注：分片默认为100byte，请合理控制文件大小。**