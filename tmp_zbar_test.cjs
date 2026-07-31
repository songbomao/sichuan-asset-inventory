const { scanImageData } = require('@undecaf/zbar-wasm');
const { createCanvas, loadImage } = require('canvas');

(async () => {
  try {
    const path = 'D:/Program Files/Tencent/xwechat_files/sbm263696893_34b9/temp/RWTemp/2026-07/88df94ef9d6efa54a52811fd3f5c14ba.jpg';
    const img = await loadImage(path);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const symbols = await scanImageData(imageData);
    console.log('symbols:', symbols.length);
    symbols.forEach(s => console.log(s.typeName, s.decode()));
  } catch(e) {
    console.error(e);
  }
})();