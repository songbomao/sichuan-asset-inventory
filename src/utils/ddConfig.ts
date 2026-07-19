import dd from 'dingtalk-jsapi';
import client from '../api/client';

let configPromise: Promise<DingtalkConfigResult> | null = null;
let configReady = false;
let lastConfig: DingtalkJsapiConfig | null = null;

export interface DingtalkJsapiConfig {
  corpId: string;
  agentId: string;
  timeStamp: string;
  nonceStr: string;
  signature: string;
  jsApiList: string[];
}

export interface DingtalkConfigResult {
  ok: boolean;
  config?: DingtalkJsapiConfig;
  error?: string;
}

/**
 * 确保钉钉 JSAPI 已执行 dd.config（biz.contact.complexPicker / device.geolocation.get 等需要）
 * 重复调用会复用同一个 Promise。
 */
export async function ensureDingtalkConfig(): Promise<DingtalkConfigResult> {
  if (configReady && lastConfig) return { ok: true, config: lastConfig };
  if (configPromise) return configPromise;

  configPromise = (async (): Promise<DingtalkConfigResult> => {
    try {
      if (typeof dd?.config !== 'function') {
        return { ok: false, error: '当前不在钉钉环境或 JSAPI 未加载' };
      }

      const pageUrl = window.location.href.split('#')[0];
      const { data } = await client.post<{ code: number; data: Record<string, string>; msg?: string; message?: string }>(
        '/api/Account/UniGetToken',
        { action: 'GetJsapiConfig', url: pageUrl },
      );
      if (data.code !== 0 && data.code !== 200) {
        const err = data.msg || data.message || '获取 JSAPI 配置失败';
        console.warn('获取 JSAPI 配置失败:', err);
        return { ok: false, error: err };
      }

      const cfg = data.data;
      const jsApiConfig: DingtalkJsapiConfig = {
        corpId: cfg.corpId ?? '',
        agentId: cfg.agentId ?? '',
        timeStamp: cfg.timeStamp ?? cfg.timestamp ?? '',
        nonceStr: cfg.nonceStr ?? cfg.noncestr ?? '',
        signature: cfg.signature ?? '',
        jsApiList: (cfg.jsApiList as string ?? 'biz.contact.complexPicker,device.geolocation.get').split(','),
      };

      dd.config({
        agentId: jsApiConfig.agentId,
        corpId: jsApiConfig.corpId,
        timeStamp: jsApiConfig.timeStamp,
        nonceStr: jsApiConfig.nonceStr,
        signature: jsApiConfig.signature,
        jsApiList: jsApiConfig.jsApiList,
      });

      await new Promise<void>((resolve, reject) => {
        dd.ready(() => resolve());
        dd.error((err: unknown) => reject(err));
      });

      configReady = true;
      lastConfig = jsApiConfig;
      return { ok: true, config: jsApiConfig };
    } catch (e) {
      const detail = e instanceof Error ? e.message : JSON.stringify(e);
      console.warn('dd.config 初始化失败:', e);
      return { ok: false, error: detail };
    }
  })();

  return configPromise;
}
