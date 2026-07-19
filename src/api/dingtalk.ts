import client from './client';
import dd from 'dingtalk-jsapi';

/**
 * 钉钉 JSAPI 工具
 * 支撑盘点位置「经纬度 → 具体地址」逆地理编码（方案 B）
 */

let configReady = false;

/** 获取后端下发的 dd.config 签名参数（由后端用 jsapi_ticket 计算） */
export async function getJsapiConfig(pageUrl: string) {
  const resp = await client.post('/api/Account/UniGetToken', {
    action: 'GetJsapiConfig',
    url: pageUrl,
  });
  return (resp.data as { data: JsapiConfig }).data;
}

export interface JsapiConfig {
  corpId: string;
  agentId: string;
  timeStamp: string;
  nonceStr: string;
  signature: string;
  jsApiList: string[];
}

/**
 * 执行 dd.config 鉴权（调用地图 JSAPI 的前置条件）
 * 成功后缓存，避免重复 config
 */
export async function ensureDingtalkConfig(jsApiList?: string[]) {
  if (configReady) return;
  const pageUrl = window.location.href.split('#')[0];
  const cfg = await getJsapiConfig(pageUrl);
  await new Promise<void>((resolve, reject) => {
    dd.config({
      agentId: String(cfg.agentId),
      corpId: cfg.corpId,
      timeStamp: cfg.timeStamp,
      nonceStr: cfg.nonceStr,
      signature: cfg.signature,
      jsApiList: cfg.jsApiList || jsApiList || ['biz.map.reverseGeocode', 'biz.map.locate'],
      onSuccess: () => {
        configReady = true;
        resolve();
      },
      onFail: (err: unknown) => {
        console.warn('dd.config 失败', err);
        reject(err);
      },
    });
  });
}

/**
 * 逆地理编码：经纬度 → 具体地址
 * @returns 成功返回地址字符串；鉴权或调用失败则回退为 "经度,纬度"
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  try {
    await ensureDingtalkConfig(['biz.map.reverseGeocode', 'biz.map.locate']);
  } catch {
    return `${longitude.toFixed(4)}, ${latitude.toFixed(4)}`;
  }
  return new Promise<string>((resolve) => {
    dd.biz.map.reverseGeocode({
      latitude,
      longitude,
      onSuccess: (res: { address?: string }) => {
        resolve(res.address || `${longitude.toFixed(4)}, ${latitude.toFixed(4)}`);
      },
      onFail: () => {
        resolve(`${longitude.toFixed(4)}, ${latitude.toFixed(4)}`);
      },
    });
  });
}
