const {FolderSize} = require('get-folder')

const sta = Date.now()
FolderSize.getSize('D:\\BeiQiProjects\\BJJL\\bj-jljc-admin\\node_modules').then(result => {
  console.log(result.size.toString());
  console.log(result);
  console.log((Date.now() - sta) / 1000);
});