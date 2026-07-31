"""Test jsQR on user's photo in real browser using Playwright — inline jsQR"""
import base64, io, json, sys
from PIL import Image
from playwright.sync_api import sync_playwright

# Load photo, simulate CameraCapture pipeline
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

# Read jsQR source
jsqr_path = r"D:\work\workspace\workBuddy\sichuan-asset-inventory\sai-inventory-h5\sichuan-asset-inventory\node_modules\jsqr\dist\jsQR.js"
with open(jsqr_path, 'r') as f:
    jsqr_code = f.read()
print(f"jsQR code: {len(jsqr_code)} bytes")

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
{jsqr_code}
const out = document.getElementById('out');
function log(s) {{ out.textContent += s + '\\n'; console.log(s); }}

log('jsQR loaded inline');

const img = new Image();
img.onload = () => {{
  log(`img loaded: ${{img.width}}x${{img.height}}`);
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  function test(label, fn) {{
    try {{
      const r = fn();
      log(`${{label}}: ${{r ? r : 'null'}}`);
      return r;
    }} catch(e) {{
      log(`${{label}}: ERROR ${{e.message}}`);
      return null;
    }}
  }}

  // 1: full image
  test('full', () => {{
    canvas.width = img.width; canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const raw = ctx.getImageData(0, 0, img.width, img.height);
    const r = jsQR(raw.data, raw.width, raw.height);
    return r ? r.data : null;
  }});

  // 2: grayscale enhanced
  test('gray enhance', () => {{
    canvas.width = img.width; canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const raw = ctx.getImageData(0, 0, img.width, img.height);
    const px = raw.data;
    let minGray = 255, maxGray = 0;
    const gray = new Uint8Array(img.width * img.height);
    for (let i = 0, j = 0; i < px.length; i += 4, j++) {{
      const g = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
      gray[j] = g;
      if (g < minGray) minGray = g;
      if (g > maxGray) maxGray = g;
    }}
    const lo = Math.max(minGray, Math.round(minGray + (maxGray - minGray) * 0.02));
    const hi = Math.min(maxGray, Math.round(maxGray - (maxGray - minGray) * 0.02));
    const range = hi > lo ? 255 / (hi - lo) : 1;
    for (let i = 0, j = 0; i < px.length; i += 4, j++) {{
      const v = Math.round(Math.max(0, Math.min(255, (gray[j] - lo) * range)));
      px[i] = v; px[i + 1] = v; px[i + 2] = v;
    }}
    ctx.putImageData(raw, 0, 0);
    const r = jsQR(raw.data, raw.width, raw.height);
    return r ? r.data : null;
  }});

  // 3: crop bottom half
  test('crop bottom 50%', () => {{
    const y = Math.round(img.height * 0.5);
    const h2 = Math.round(img.height * 0.5);
    canvas.width = img.width; canvas.height = h2;
    ctx.drawImage(img, 0, y, img.width, h2, 0, 0, img.width, h2);
    const raw = ctx.getImageData(0, 0, img.width, h2);
    const r = jsQR(raw.data, raw.width, raw.height);
    return r ? r.data : null;
  }});

  // 4: crop bottom 30%
  test('crop bottom 30%', () => {{
    const y = Math.round(img.height * 0.7);
    const h2 = Math.round(img.height * 0.3);
    canvas.width = img.width; canvas.height = h2;
    ctx.drawImage(img, 0, y, img.width, h2, 0, 0, img.width, h2);
    const raw = ctx.getImageData(0, 0, img.width, h2);
    const r = jsQR(raw.data, raw.width, raw.height);
    return r ? r.data : null;
  }});

  // 5: scales
  for (const s of [0.8, 0.65, 0.5, 0.35, 0.25]) {{
    test(`scale ${{s}}`, () => {{
      canvas.width = Math.round(img.width * s);
      canvas.height = Math.round(img.height * s);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const raw = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const r = jsQR(raw.data, raw.width, raw.height);
      return r ? r.data : null;
    }});
  }}

  // 6: inverted
  test('inverted', () => {{
    canvas.width = img.width; canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const raw = ctx.getImageData(0, 0, img.width, img.height);
    for (let i = 0; i < raw.data.length; i += 4) {{
      raw.data[i] = 255 - raw.data[i];
      raw.data[i+1] = 255 - raw.data[i+1];
      raw.data[i+2] = 255 - raw.data[i+2];
    }}
    const r = jsQR(raw.data, raw.width, raw.height);
    return r ? r.data : null;
  }});

  // 7: binary threshold
  test('binary threshold', () => {{
    canvas.width = img.width; canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const raw = ctx.getImageData(0, 0, img.width, img.height);
    let sum = 0;
    for (let i = 0; i < raw.data.length; i += 4) {{
      sum += raw.data[i] * 0.299 + raw.data[i+1] * 0.587 + raw.data[i+2] * 0.114;
    }}
    const avg = sum / (img.width * img.height);
    for (let i = 0; i < raw.data.length; i += 4) {{
      const g = raw.data[i] * 0.299 + raw.data[i+1] * 0.587 + raw.data[i+2] * 0.114;
      const v = g < avg * 0.7 ? 0 : 255;
      raw.data[i] = v; raw.data[i+1] = v; raw.data[i+2] = v;
    }}
    const r = jsQR(raw.data, raw.width, raw.height);
    return r ? r.data : null;
  }});

  log('=== ALL DONE ===');
}};
img.onerror = (e) => log('IMG LOAD ERROR: ' + e);
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