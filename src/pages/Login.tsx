import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { dingtalkLogin } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';

/** 钉钉应用 CorpId */
const DINGTALK_CORP_ID = 'ding23d81d2ac92ee8c135c2f4657eb6378f';

declare global {
  interface Window {
    dd?: {
      ready: (cb: () => void) => void;
      error: (cb: (err: { message: string }) => void) => void;
      runtime?: {
        permission?: {
          requestAuthCode: (params: {
            corpId: string;
            onSuccess: (result: { code: string }) => void;
            onFail: (err: { errorMessage: string }) => void;
          }) => void;
        };
      };
    };
  }
}

type LoginState = 'loading' | 'non-dingtalk' | 'error';

/**
 * 钉钉免登页面
 * 打开即自动获取 authCode → 后端换 JWT → 进入任务列表
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  const [state, setState] = useState<LoginState>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const performLogin = useCallback(
    async (authCode: string) => {
      try {
        const result = await dingtalkLogin(authCode);
        auth.login(result.access_token, result.user);
        navigate('/tasks', { replace: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '免登失败，请重试';
        setErrorMsg(msg);
        setState('error');
      }
    },
    [auth, navigate],
  );

  const startDingtalkAuth = useCallback(() => {
    const dd = window.dd;
    if (!dd) {
      setState('non-dingtalk');
      return;
    }

    dd.ready(() => {
      dd.runtime?.permission?.requestAuthCode({
        corpId: DINGTALK_CORP_ID,
        onSuccess: (result) => {
          performLogin(result.code);
        },
        onFail: (err) => {
          setErrorMsg(err.errorMessage || '获取钉钉授权失败');
          setState('error');
        },
      });
    });

    dd.error((err) => {
      setErrorMsg(err.message || '钉钉 JSAPI 初始化失败');
      setState('error');
    });
  }, [performLogin]);

  useEffect(() => {
    startDingtalkAuth();
  }, [startDingtalkAuth]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary via-primary-dark to-[#4a148c]">
      <div className="mb-10 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 overflow-hidden">
          <img src="/app-icon.png?v=202607151517" alt="四川固定资产盘点系统" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-wide">四川固定资产盘点系统</h1>
        <p className="text-white/60 text-sm mt-1">钉钉免登 · 安全高效</p>
      </div>

      <div className="w-full max-w-sm bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl text-center">
        {state === 'loading' && (
          <div className="py-8">
            <CircularProgress size={48} sx={{ color: '#1a237e' }} />
            <p className="mt-4 text-gray-600 text-sm">正在登录...</p>
            <p className="text-gray-400 text-xs mt-1">通过钉钉身份自动验证</p>
          </div>
        )}

        {state === 'non-dingtalk' && (
          <div className="py-4">
            <div className="text-4xl mb-3">📱</div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">请在钉钉中打开</h2>
            <p className="text-sm text-gray-500 mb-4">
              本应用仅支持在钉钉工作台中访问，请在钉钉客户端中打开此页面。
            </p>
            <Button
              variant="outlined"
              fullWidth
              onClick={startDingtalkAuth}
              sx={{ borderRadius: '12px' }}
            >
              重新检测
            </Button>
          </div>
        )}

        {state === 'error' && (
          <div className="py-4">
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left', fontSize: '0.85rem' }}>
              {errorMsg}
            </Alert>
            <Button
              variant="contained"
              fullWidth
              onClick={startDingtalkAuth}
              sx={{ py: 1.2, borderRadius: '12px' }}
            >
              重试登录
            </Button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-white/40 mt-6">
        四川省固定资产盘点管理平台
      </p>
    </div>
  );
}
