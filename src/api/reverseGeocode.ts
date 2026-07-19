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
    const resp = await client.post('/api/Account/UniGetToken', {
      action: 'ReverseGeocode',
      latitude,
      longitude,
    });
    const data = (resp.data as { code?: number; data?: { address?: string } }).data;
    if (data && data.address) {
      return data.address;
    }
    return `${longitude.toFixed(4)}, ${latitude.toFixed(4)}`;
  } catch {
    return `${longitude.toFixed(4)}, ${latitude.toFixed(4)}`;
  }
}
