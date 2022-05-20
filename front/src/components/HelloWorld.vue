<template>
  <div class="hello">
    <input type="file" @change="changeFile" ref="input" v-show="false" />
    <button @click="submit">
      <span v-if="fileStatus === 'loading'">正在上传</span>
      <span v-else-if="fileStatus === 'success'">上传成功</span>
      <span v-else-if="fileStatus === 'error'">上传失败</span>
      <span v-else-if="fileStatus === 'ready'">点击上传</span>
    </button>
    <div style="margin-top: 10vh">
      <input
        type="file"
        @change="changeChunkFile"
        ref="chunkFile"
        v-show="false"
      />
      <button @click="submit">
        <span v-if="fileStatus === 'loading'">正在上传</span>
        <span v-else-if="fileStatus === 'success'">分片成功</span>
        <span v-else-if="fileStatus === 'error'">上传失败</span>
        <span v-else-if="fileStatus === 'ready'">分片上传</span>
      </button>

      <button @click="postMerge">合并分片</button>
    </div>

    <div class="file-list">
      <slot />
    </div>
  </div>
</template>

<script>
import axios from "axios";
export default {
  name: "HelloWorld",
  props: {
    msg: String,
  },
  data() {
    return {
      inputFile: null,
      fileStatus: "ready",
    };
  },
  methods: {
    async changeFile(e) {
      try {
        const target = e.target;
        const files = target.files;
        if (files) {
          if (files[0] >= 1024 * 1024 * 2) return alert("文件大小不能大于2M");
          this.fileStatus = "loading";
          const uploadedFile = files[0];
          // this.inputFile = files[0]
          const formData = new FormData();
          formData.append("file", uploadedFile, uploadedFile.name);
          let data = await this.uploadFile(formData);
          this.fileStatus = "success";
          alert("上传成功");
          console.log(data);
        }
      } catch {
        this.fileStatus === "error";
      }
    },
    submit() {
      // let input = this.$refs.input;
      let input = this.$refs.chunkFile;
      input.click();
      // console.log(this.$refs.input.files[0])
    },
    async uploadFile(formData, path = "/upload") {
      let { data } = await axios.post(
        "http://localhost:3000" + path,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return data;
    },
    async changeChunkFile(e) {
      const target = e.target;
      const file = target.files[0];

      const fileChunkList = this.createFileChunk(file);
      const formChunkList = fileChunkList.map((chunk, index) => {
        const formData = new FormData();
        formData.append("chunk", chunk.file);
        formData.append("hash", `${index}-${chunk.hash}`);
        return formData;
      });
      console.log(formChunkList[0]);
      await this.QPSLimit(formChunkList);
      alert("分片上传成功");
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
    QPSLimit(chunkPool, limit = 2) {
      return new Promise((resolve) => {
        let pool = [];
        const add = () => {
          if (pool.length < limit && chunkPool.length) {
            pool.push(this.uploadFile(chunkPool.shift(), "/chunk"));
          }
        };

        while (pool.length < limit && chunkPool.length) {
          add();
        }

        function run() {
          if (!pool.length) return resolve();
          Promise.race(pool).then((finished) => {
            pool.splice(pool.indexOf(finished), 1);
            add();
            run();
          });
        }
        run();
      });
    },

    // postMerge
    async postMerge() {
      await axios.post('http://localhost:3000/merge')
    }
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
