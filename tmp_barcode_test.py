"""Test BarcodeDetector API on user's photo in real browser"""
import base64, io, json, sys
from PIL import Image
from playwright.sync_api import sync_playwright

img = Image.open(r"D:\Program Files\Tencent\xwechat_files\sbm263696893_34b9\temp\RWTemp\2026-07\88df94ef9d6efa54a52811fd3f5c14ba.jpg")
w, h = img.size
scale = min(1.0, 1200 / max(w, h))
bw, bh = int(w * scale), int(h * scale)
small = img.resize((bw, bh), Image.LANCZOS)
buf = io.BytesIO()
small.save(buf, format='JPEG', quality=92)
buf.seek(0)
dataUrl = "data:image/jpeg;base64," + base64.b64encode(buf.read()).decode()

print(f"Photo: {bw}x{bh}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on('console', lambda msg: print(f'[BROWSER] {msg.text}') if msg.type != 'log' else None)
    page.on('pageerror', lambda err: print(f'[PAGE ERROR] {err}'))

    html = f"""<!DOCTYPE html>
<html><body style="margin:20px;font-family:monospace">
<canvas id="c" style="display:none"></canvas>
<div id="out"></div>
<script>
const out = document.getElementById('out');
function log(s) {{ out.textContent += s + '\\n'; console.log(s); }}

// Test BarcodeDetector
log('BarcodeDetector: ' + (typeof BarcodeDetector !== 'undefined' ? 'YES' : 'NO'));

const img = new Image();
img.onload = async () => {{
  log(`img loaded: ${{img.width}}x${{img.height}}`);
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  if (typeof BarcodeDetector !== 'undefined') {{
    try {{
      const detector = new BarcodeDetector({{ formats: ['qr_code'] }});
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const bmp = await createImageBitmap(blob);
      const results = await detector.detect(bmp);
      log(`BarcodeDetector results: ${{results.length}}`);
      results.forEach(r => log(`  ${{r.format}}: ${{r.rawValue}}`));
    }} catch(e) {{
      log(`BarcodeDetector ERROR: ${{e.message}}`);
    }}
  }}

  // Also test zbar-wasm inline
  try {{
    const zbarModule = await import('/node_modules/@undecaf/zbar-wasm/dist/index.js');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const symbols = await zbarModule.scanImageData(imageData);
    log(`zbar-wasm results: ${{symbols.length}}`);
    symbols.forEach(s => log(`  ${{s.typeName}}: ${{s.decode()}}`));
  }} catch(e) {{
    log(`zbar-wasm ERROR: ${{e.message}}`);
  }}

  log('=== ALL DONE ===');
}};
img.onerror = (e) => log('IMG LOAD ERROR');
img.src = '{dataUrl}';
</script>
</body></html>"""

    page.set_content(html)
    try:
        page.wait_for_function("document.getElementById('out').textContent.includes('ALL DONE')", timeout=30000)
    except Exception as e:
        print(f"Timeout: {e}")
        result = page.evaluate("document.getElementById('out').textContent")
        print(result)
        browser.close()
        sys.exit(0)

    result = page.evaluate("document.getElementById('out').textContent")
    print(result)
    browser.close()