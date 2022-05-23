<template>
  <div class="hello">
    <div style="margin-top: 10vh">
      <input
        type="file"
        @change="changeChunkFile"
        ref="chunkFile"
        v-show="false"
      />
      <button @click="submit">
        <span>分片上传</span>
      </button>
      <button @click="postMerge">
        <span>合并分片</span>
      </button>
    </div>
  </div>
</template>

<script>
import axios from "axios";
export default {
  name: "HelloWorld",
  data() {
    return {
      inputFile: null,
      fileStatus: "ready",
    };
  },
  methods: {
    uploadFile(formData, path = "/upload", contentHash) {
      console.log(`http://localhost:3000${path}/${contentHash}`);
      return axios.post(
        `http://localhost:3000${path}/${contentHash}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    },
    async changeChunkFile(e) {
      const target = e.target;
      const file = target.files[0];
      const contentHash = await this.getContentHash(file);
      const validateRes = await this.validateContentHash(contentHash);
      if(validateRes.state == 1) return alert('秒传成功！')
      if(validateRes.state == 2) alert(`开始续传，已有${validateRes.chunksIndexList.length}个分片`)
      if(validateRes.state == 0) alert('开始上传')
      const fileChunkList = this.createFileChunk(file);
      const formChunkList = [];
      fileChunkList.forEach((chunk, index) => {
        if (
          validateRes.state == 0 ||
          (validateRes.state == 2 &&
            validateRes.chunksIndexList.indexOf(String(index)) < 0)
        ) {
          const formData = new FormData();
          formData.append("chunk", chunk.file);
          formData.append("hash", `${index}-${chunk.hash}`);
          formChunkList.push(formData);
        }
      });
      await this.QPSLimit(formChunkList, 2, contentHash);
      await this.postMerge(contentHash);
      alert("分片上传成功");
    },
    // 获取文件md5
    getContentHash(file) {
      return new Promise((resolve) => {
        const worker = new Worker("/content-hash.js");
        worker.postMessage({ file });
        worker.onmessage = (e) => {
          const { contentHash } = e.data;
          if (contentHash) resolve(contentHash);
        };
      });
    },
    // 验证hash
    async validateContentHash(contentHash) {
      let { data } = await axios.post("http://localhost:3000/hash", {
        contentHash,
      });
      return data;
    },
    // 创建切片
    createFileChunk(file, size = 100) {
      const fileChunkList = [];
      let cur = 0;
      while (cur < file.size) {
        fileChunkList.push({
          file: file.slice(cur, cur + size),
          hash: file.name,
        });
        cur += size;
      }
      return fileChunkList;
    },

    //并发控制
    QPSLimit(chunkPool, limit = 2, contentHash) {
      return new Promise((resolve) => {
        let pool = [];
        const add = () => {
          if (pool.length < limit && chunkPool.length) {
            let p = this.uploadFile(
              chunkPool.shift(),
              "/chunk",
              contentHash
            ).then(() => {
              pool.splice(pool.indexOf(p), 1);
              if (pool.length === 0) return resolve();
              add();
            });
            pool.push(p);
          }
        };
        while (pool.length < limit && chunkPool.length) {
          add();
        }
      });
    },
    // postMerge
    async postMerge(contentHash) {
      console.log("merge");
      await axios.post(`http://localhost:3000/merge/${contentHash}`);
    },
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.hello {
  margin: 0 auto;
}

.hello button {
  width: 80px;
  height: 40px;
  background-color: rgb(176, 255, 250);
  border: none;
  text-align: center;
  border-radius: 3px;
  cursor: pointer;
}
</style>
