const { scanImageData } = require('@undecaf/zbar-wasm');
const fs = require('fs');

// Read the base64 photo
const b64 = fs.readFileSync('tmp_photo_b64_full.txt', 'utf8');
const base64Data = b64.split(',')[1];
const buffer = Buffer.from(base64Data, 'base64');

// We need to decode the JPEG to RGBA pixels
// Since we can't use canvas, let's use jpeg-js
const jpeg = require('jpeg-js');
const rawImageData = jpeg.decode(buffer);
console.log('decoded:', rawImageData.width, 'x', rawImageData.height);

// Create ImageData-like object
const imageData = {
  data: rawImageData.data,  // RGBA
  width: rawImageData.width,
  height: rawImageData.height,
};

(async () => {
  try {
    const symbols = await scanImageData(imageData);
    console.log('symbols:', symbols.length);
    symbols.forEach(s => console.log(s.typeName, s.decode()));
  } catch(e) {
    console.error(e);
  }
})();