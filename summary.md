1. 给form设置 enctype="multipart/form-data" 会显示二进制文件。不加则发过去的content-type为 application/x-www-form-urlencoded 没有文件，只有文件名
2. input 的 onChange 事件的target.files[0]能拿到File类型文件，target也就是input的dom节点，可以通过ref拿到
3. FormData能完美模拟HTML的表单数据，新建一个实例，append方法往表单添加数据
4. 如果强行使用 application/x-www-form-urlencoded 不会跨域，但是收到的还是 multipart/form-data
5. urlencoded的extended为true：使用qs，false：使用querystring。区别是前者可以显示嵌套对象，后者处理嵌套对象将使用数组表示a[b][c][d]=j