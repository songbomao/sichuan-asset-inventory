import dd from 'dingtalk-jsapi';
import client from '../api/client';

let configPromise: Promise<boolean> | null = null;
let configReady = false;

/**
 * 确保钉钉 JSAPI 已执行 dd.config（biz.contact.complexPicker / device.geolocation.get 等需要）
 * 重复调用会复用同一个 Promise。
 */
export async function ensureDingtalkConfig(): Promise<boolean> {
  if (configReady) return true;
  if (configPromise) return configPromise;

  configPromise = (async () => {
    try {
      if (typeof dd?.config !== 'function') {
        // 非钉钉环境或 JSAPI 未加载，无法配置
        return false;
      }

      const pageUrl = window.location.href.split('#')[0];
      const { data } = await client.post<{ code: number; data: Record<string, string>; msg?: string; message?: string }>(
        '/api/Account/UniGetToken',
        { action: 'GetJsapiConfig', url: pageUrl },
      );
      if (data.code !== 0 && data.code !== 200) {
        console.warn('获取 JSAPI 配置失败:', data.msg || data.message);
        return false;
      }

      const cfg = data.data;
      dd.config({
        agentId: cfg.agentId,
        corpId: cfg.corpId,
        timeStamp: cfg.timeStamp,
        nonceStr: cfg.nonceStr,
        signature: cfg.signature,
        jsApiList: (cfg.jsApiList as string ?? 'biz.contact.complexPicker,device.geolocation.get').split(','),
      });

      await new Promise<void>((resolve, reject) => {
        dd.ready(() => resolve());
        dd.error((err: unknown) => reject(err));
      });
      configReady = true;
      return true;
    } catch (e) {
      console.warn('dd.config 初始化失败:', e);
      return false;
    }
  })();

  return configPromise;
}
