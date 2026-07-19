import client from './client';

/**
 * 逆地理编码（方案 A：后端调高德）
 * 前端把经纬度发给后端，后端用高德 Key 解析为具体地址，避免 Key 暴露在前端
 */

/**
 * 经纬度 → 具体地址
 * @param latitude 纬度
 * @param longitude 经度
 * @returns 具体地址字符串；失败时返回 "经度,纬度" 兜底
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  try {
    // 走登录网关（与 tasks.ts 一致）：路径命中 BYPASS_GATEWAY，
    // 拦截器会自动补 _token 并保留 action 字段，后端 switch 能正确识别
    const resp = await client.post('/api/Account/UniGetToken', {
      action: 'ReverseGeocode',
      longitude,
      latitude,
    });
    const data = (resp.data as { code?: number; msg?: string; data?: { address?: string } }).data;
    if (data?.address) {
      return data.address;
    }
    // 失败兜底
    return `${longitude.toFixed(4)}, ${latitude.toFixed(4)}`;
  } catch (e) {
    console.warn('逆地理编码失败:', e);
    return `${longitude.toFixed(4)}, ${latitude.toFixed(4)}`;
  }
}
