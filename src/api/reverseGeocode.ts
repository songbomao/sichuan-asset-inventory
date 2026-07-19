/**
 * 逆地理编码：经纬度 → 具体地址
 *
 * 背景：原方案为后端（97 信创麒麟内网服务器）调高德 Web API，但 97 内网
 * 无公网访问权限，导致高德调用超时/失败、永远返回经纬度兜底，水印一直是经纬度。
 *
 * 现改为前端（手机/钉钉 WebView 具备公网能力）通过 JSONP 直接调用高德逆地理编码，
 * 绕过后端内网限制。JSONP 不受浏览器 CORS 限制。
 *
 * 安全提示：高德 Key 会暴露在前端 JS 中。建议在高德控制台为该 Key 配置
 * 「域名白名单」（仅允许本系统域名调用）。即使泄露，也仅影响逆地理编码额度，无安全风险。
 */

// 从环境变量读取高德 Key，未配置则使用兜底 Key
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '4402653f676ff37956a61d17113b388a';

/**
 * 经纬度 → 具体地址
 * @param latitude 纬度
 * @param longitude 经度
 * @returns 具体地址字符串；失败（超时/网络错误/高德异常）时返回 "经度,纬度" 兜底
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  const fallback = `${longitude.toFixed(4)}, ${latitude.toFixed(4)}`;
  return new Promise((resolve) => {
    const cbName = `__amap_rev_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const script = document.createElement('script');
    let done = false;

    const cleanup = () => {
      try {
        delete (window as unknown as Record<string, unknown>)[cbName];
      } catch {
        /* noop */
      }
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    (window as unknown as Record<string, unknown>)[cbName] = (resp: {
      status?: string;
      regeocode?: { formatted_address?: string };
    }) => {
      if (done) return;
      done = true;
      cleanup();
      const addr = resp?.regeocode?.formatted_address;
      resolve(addr && resp.status === '1' ? addr : fallback);
    };

    script.onerror = () => {
      if (done) return;
      done = true;
      cleanup();
      resolve(fallback);
    };

    // 高德要求 location = 经度,纬度
    script.src =
      `https://restapi.amap.com/v3/geocode/reverse?location=${longitude},${latitude}` +
      `&key=${AMAP_KEY}&radius=1000&extensions=base&callback=${cbName}`;
    document.body.appendChild(script);

    // 8 秒超时兜底，避免一直卡在加载
    setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      resolve(fallback);
    }, 8000);
  });
}
