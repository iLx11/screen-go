// checkPackage.js
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const config = require('../../package.json');

const SPLIT_LENGTH = 1; // 路径中的文件夹路径切割符长度 '/' 的长度
checkPackage();
function checkPackage() {
  let platform = ['mac', 'win', 'linux'];
  let asarUnpackList = platform.map(name => {
    return config.build[name].asarUnpack;
  }).reduce((old, val) => {
    return old.concat(val);
  }, []);
  asarUnpackList = Array.from(new Set(asarUnpackList));
  let packageArr = asarUnpackList.map(item => {
    let start = item.indexOf('node_modules') + 'node_modules'.length + SPLIT_LENGTH;
    let tmpStr = item.substr(start);
    let packageName = tmpStr.substr(0, tmpStr.indexOf('/'));
    return packageName;
  });
  packageArr.forEach(item => {
    console.log(`检查 ${item}`);
    if (!fs.existsSync(`./node_modules/${item}/node_modules`)) {
      console.log(`安装${item} 的依赖`);
      // 在当前目录下的scripts文件夹里执行安装命令命令
      exec('cnpm install', { cwd: path.join(process.cwd(), `node_modules/${item}`) }, (err, stdout, stderr) => {
        if (err) {
          console.log(err);
          return;
        }
        console.log('执行了cnpm install', path.join(process.cwd(), `node_modules/${item}`));
        console.log(`stdout: ${stdout}`);
      });
    }
  });
}