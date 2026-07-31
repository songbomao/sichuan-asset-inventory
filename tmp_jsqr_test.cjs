const fs = require('fs');
const jsQR = require('./node_modules/jsqr/dist/jsQR.js');

// Read the pixel data
const raw = fs.readFileSync('./tmp_pixels.raw');
const { width, height } = JSON.parse(fs.readFileSync('./tmp_pixels.json'));

// Only have first 100K pixels of the 2659200 total
// Let's use a narrower slice: 554x180 pixels from top
const sliceH = 180;
const data = new Uint8Array(width * sliceH * 4);
raw.copy(data, 0, 0, width * sliceH * 4);

let result = jsQR(data, width, sliceH);
console.log(`full image (554x1200) top ${sliceH}px:`, result ? result.data : 'null');

// Now try a specific area — let's manually iterate through y offsets
// The QR is at y ~ 2014 in the original 2769px image
// After scale 1200/2769=0.433, QR is at ~ y=872 in 1200px image
// Let's test 200px strips around that area

function testStrip(yStart, h) {
  const stripData = new Uint8Array(width * h * 4);
  raw.copy(stripData, 0, yStart * width * 4, (yStart + h) * width * 4);
  const r = jsQR(stripData, width, h);
  return r ? r.data : null;
}

// Test strips from y=800 to y=1000
for (let y = 800; y <= 1000; y += 50) {
  const r = testStrip(y, 200);
  if (r) console.log(`strip y=${y} h=200: ${r}`);
}

// Test with inversion
for (let y = 850; y <= 950; y += 25) {
  const stripData = new Uint8Array(width * 200 * 4);
  raw.copy(stripData, 0, y * width * 4, (y + 200) * width * 4);
  // invert
  for (let i = 0; i < stripData.length; i += 4) {
    stripData[i] = 255 - stripData[i];
    stripData[i+1] = 255 - stripData[i+1];
    stripData[i+2] = 255 - stripData[i+2];
  }
  const r = jsQR(stripData, width, 200);
  if (r) console.log(`inverted strip y=${y} h=200: ${r}`);
}

console.log('done');
