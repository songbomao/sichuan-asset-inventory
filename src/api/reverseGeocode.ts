import dd from 'dingtalk-jsapi';
import { ensureDingtalkConfig } from '../utils/ddConfig';

type AmapJsonpResponse = {
  status?: string;
  regeocode?: { formatted_address?: string };
};

// 从环境变量读取高德 Key，未配置则使用兜底 Key
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '4402653f676ff37956a61d17113b388a';

const GEO_COORD_RE = /^\d+\.\d+,\s*\d+\.\d+$/;

function formatFallback(latitude: number, longitude: number): string {
  return `${longitude.toFixed(4)}, ${latitude.toFixed(4)}`;
}

/**
 * 方案一：钉钉 JSAPI 自带逆地理编码（最可靠，在钉钉容器内无需公网白名单）
 */
async function dingtalkReverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const ok = await ensureDingtalkConfig();
    if (!ok) return null;

    if (!dd.device || !(dd.device as { geolocation?: { get?: unknown } }).geolocation?.get) {
      return null;
    }
    const result = await (dd.device as { geolocation: { get: (p: unknown) => Promise<{ longitude?: number; latitude?: number; address?: string }> } }).geolocation.get({
      targetAccuracy: 200,
      coordinate: 1, // 高德坐标
      withReGeocode: true, // 关键：返回逆地理编码地址
      useCache: false,
    });
    if (result?.address && typeof result.address === 'string') {
      return result.address;
    }
  } catch (e) {
    console.warn('钉钉定位获取地址失败:', e);
  }
  return null;
}

/**
 * 方案二：前端 JSONP 调用高德逆地理编码（备用）
 */
async function amapJsonpReverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  return new Promise((resolve) => {
    const cleanup = (script: HTMLScriptElement, cbName: string) => {
      try {
        delete (window as unknown as Record<string, unknown>)[cbName];
      } catch {
        /* noop */
      }
      if (script.parentNode) script.parentNode.removeChild(script);
    };

    const cbName = `__amap_rev_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const script = document.createElement('script');
    let done = false;

    (window as unknown as Record<string, unknown>)[cbName] = (resp: AmapJsonpResponse) => {
      if (done) return;
      done = true;
      cleanup(script, cbName);
      const addr = resp?.regeocode?.formatted_address;
      resolve(addr && resp.status === '1' ? addr : null);
    };

    script.onerror = () => {
      if (done) return;
      done = true;
      cleanup(script, cbName);
      resolve(null);
    };

    script.src =
      `https://restapi.amap.com/v3/geocode/reverse?location=${longitude},${latitude}` +
      `&key=${AMAP_KEY}&radius=1000&extensions=base&callback=${cbName}`;
    document.head.appendChild(script);

    setTimeout(() => {
      if (done) return;
      done = true;
      cleanup(script, cbName);
      resolve(null);
    }, 5000);
  });
}

/**
 * 经纬度 → 具体地址
 * 优先走钉钉 JSAPI 逆地理编码，失败再尝试高德 JSONP，最后返回经纬度兜底
 * @returns 具体地址字符串；失败时返回 "经度,纬度"
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  const fallback = formatFallback(latitude, longitude);

  // 1. 优先钉钉自带逆地理编码
  const dtAddr = await dingtalkReverseGeocode(latitude, longitude);
  if (dtAddr && !GEO_COORD_RE.test(dtAddr)) return dtAddr;

  // 2. 备用 JSONP 高德
  const amapAddr = await amapJsonpReverseGeocode(latitude, longitude);
  if (amapAddr && !GEO_COORD_RE.test(amapAddr)) return amapAddr;

  return fallback;
}

/**
 * 获取当前经纬度 + 地址（综合入口）
 * 返回经度、纬度、地址；地址获取失败时返回经纬度字符串
 */
export async function getCurrentLocation(): Promise<{
  longitude: number;
  latitude: number;
  address: string;
}> {
  // 1. 先尝试钉钉定位（带地址）
  try {
    const ok = await ensureDingtalkConfig();
    if (ok && dd.device && (dd.device as { geolocation?: { get?: unknown } }).geolocation?.get) {
      const result = await (dd.device as { geolocation: { get: (p: unknown) => Promise<{ longitude?: number; latitude?: number; address?: string }> } }).geolocation.get({
        targetAccuracy: 200,
        coordinate: 1,
        withReGeocode: true,
        useCache: false,
      });
      if (typeof result.longitude === 'number' && typeof result.latitude === 'number') {
        return {
          longitude: result.longitude,
          latitude: result.latitude,
          address: result.address || formatFallback(result.latitude, result.longitude),
        };
      }
    }
  } catch (e) {
    console.warn('钉钉定位失败，降级到浏览器定位:', e);
  }

  // 2. 降级到浏览器 H5 定位
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ longitude: 0, latitude: 0, address: '设备不支持定位' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const addr = await reverseGeocode(latitude, longitude);
        resolve({ longitude, latitude, address: addr });
      },
      () => {
        resolve({ longitude: 0, latitude: 0, address: '定位失败' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  });
}
