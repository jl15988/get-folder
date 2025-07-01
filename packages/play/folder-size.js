const {FolderSize, FileSystemUtils} = require('get-folder')
const {getFolderSize} = require('./get-folder-size');

async function folderSize() {
  const sta = Date.now()
  await FolderSize.getSize('D:\\developers\\GitProjects\\get-folder\\packages').then(result => {
    console.log(result.size.toString());
    console.log(FileSystemUtils.formatFileSize(result.size));
    console.log(result);
    console.log((Date.now() - sta) / 1000);
  });

  // const sta2 = Date.now()
  // await getFolderSize('D:\\BeiQiProjects\\BJJL\\bj-jljc-admin\\node_modules').then(result => {
  //   console.log(result);
  //   console.log((Date.now() - sta2) / 1000);
  // })
}

folderSize()
