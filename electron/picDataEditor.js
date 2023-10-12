const { ipcMain, BrowserWindow } = require("electron");

// 图片裁剪
var Jimp = require("jimp");
const Crypto = require("crypto");
const os = require("os");
const fs = require("fs-extra");
const path = require("path");

const imgEditorHandle = async (width, height, picData, callBack) => {
  // console.info('图片：', picData)
  let hashname =
    Crypto.createHash("md5").update("angular-cir-img").digest("hex") + ".bmp";
  // temp 图片的原始路径
  let originFilePath = path.join(os.tmpdir(), hashname);
  let dataBuffer = Buffer.from(
    picData.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );
  fs.writeFileSync(originFilePath, dataBuffer);
  // console.info('文件生成在哪里？', originFilePath)
  let filePath = path.join(
    os.tmpdir(),
    Crypto.createHash("md5").update("angular-cir-img-zoom").digest("hex") +
      ".bmp"
  );
  // console.info('裁剪后的文件路径：', filePath)
  // console.info('裁剪：', width, height)
  const temp = await Jimp.read(originFilePath, async (err, lenna) => {
    if (err) throw err;
    lenna
      .resize(width, height) // resize
      .quality(60) // set JPEG quality
      .greyscale() // set greyscale
      .write(filePath); // save
    // FIXME: 处理图片延时
    setTimeout(async () => {
      const readable = fs.readFileSync(filePath, "binary");
      const base64 = Buffer.from(readable, "binary").toString("base64");
      // base64 = `data:image/png;base64,${base64}`
      callBack(base64);
      // console.info(base64)
    }, 500);
  });
  console.info('temp', temp)
};

ipcMain.handle("pic-data-editor", (event, width, height, picData) => {
  
});
