const { ipcMain } = require("electron");

// 图片裁剪
var Jimp = require("jimp");
const Crypto = require("crypto");
const os = require("os");
const fs = require("fs-extra");
const path = require("path");
const utils = require("./ImageToHexArray");

let resultPicData = "";

const imgEditorHandle = async (width, height, picData, colorMode) => {
  // console.info('图片：', picData)
  let hashname =
    Crypto.createHash("md5").update("angular-cir-img").digest("hex") + ".bmp";
  // temp 图片的原始路径
  let originFilePath = path.join(os.tmpdir(), hashname);
  // base64 转 buffer
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
  Jimp.read(originFilePath, async (err, lenna) => {
    if (err) throw err;
    lenna.resize(width, height) // resize
    lenna.quality(60)  // set greyscale
    if(colorMode) 
      lenna.greyscale()  // set JPEG qualityS
    lenna.write(filePath) // save 
    // FIXME: 处理图片延时
    setTimeout(async () => {
      const readable = fs.readFileSync(filePath, "binary");
      const base64 = Buffer.from(readable, "binary").toString("base64");
      // base64 = `data:image/png;base64,${base64}`
      resultPicData = base64;
    }, 500);
  });
};

// 缩放图片 
ipcMain.handle("pic-data-editor", async (event, width, height, picData, colorMode) => {
  imgEditorHandle(width, height, picData, colorMode);
  await new Promise((resolve) => setTimeout(resolve, 700));
  return resultPicData;
});

// 生成结果数组
ipcMain.handle("pic-data-parse", async (event, data, ...configArray) => {
  // console.info('configArray------------->', configArray)
  const result = await utils.ImageToHexArray.generate(data, configArray)
  return result
});
