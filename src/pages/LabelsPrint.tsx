import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import type { ScopeOption, ScopeOptionsResult } from '../api/admin';
import { getScopeOptions } from '../api/admin';
import {
  generateAssetLabels,
  type AssetLabel,
} from '../api/inventory';
import { useAuth } from '../contexts/AuthContext';
import QRCode from 'qrcode';

/** 标签尺寸预设：约 40×30mm（小） / 60×40mm（大） */
const SIZE_PRESETS: Record<'small' | 'large', { w: string; h: string; label: string }> = {
  small: { w: '40mm', h: '30mm', label: '小标签 40×30mm' },
  large: { w: '60mm', h: '40mm', label: '大标签 60×40mm' },
};

/** 单条标签（含二维码 DataURL） */
interface LabelItem {
  label: AssetLabel;
  qr: string;
}

export default function LabelsPrint() {
  const { isAdmin } = useAuth();

  // ── 范围筛选项 ──
  const [scope, setScope] = useState<ScopeOptionsResult | null>(null);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);

  // ── 选择项 ──
  const [orgNames, setOrgNames] = useState<string[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [costCenterNames, setCostCenterNames] = useState<string[]>([]);
  const [assetCodesText, setAssetCodesText] = useState('');
  const [size, setSize] = useState<'small' | 'large'>('large');

  // ── 生成结果 ──
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<LabelItem[]>([]);
  const [batch, setBatch] = useState<string>('');

  /** 加载范围筛选项 */
  const loadScope = useCallback(async () => {
    setScopeLoading(true);
    setScopeError(null);
    try {
      const data = await getScopeOptions();
      setScope(data);
    } catch (err) {
      setScopeError(err instanceof Error ? err.message : '加载范围筛选项失败');
    } finally {
      setScopeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadScope();
    }
  }, [isAdmin, loadScope]);

  /** 解析资产编号文本框：支持逗号 / 换行 / 空格分隔 */
  const parsedAssetCodes = useMemo(() => {
    return assetCodesText
      .split(/[\s,，;；]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [assetCodesText]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateAssetLabels({
        orgNames: orgNames.length ? orgNames : undefined,
        categoryNames: categoryNames.length ? categoryNames : undefined,
        costCenterNames: costCenterNames.length ? costCenterNames : undefined,
        assetCodes: parsedAssetCodes.length ? parsedAssetCodes : undefined,
      });
      // 为每个标签生成二维码 DataURL（内容 = assetCode + "|" + sig）
      const built: LabelItem[] = await Promise.all(
        result.labels.map(async (label) => {
          const qr = await QRCode.toDataURL(label.qrContent || `${label.assetCode}|${label.sig}`, {
            width: 240,
            margin: 1,
            errorCorrectionLevel: 'M',
          });
          return { label, qr };
        }),
      );
      setItems(built);
      setBatch(result.batch);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成标签失败');
      setItems([]);
    } finally {
      setGenerating(false);
    }
  }, [orgNames, categoryNames, costCenterNames, parsedAssetCodes]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // 无权限
  if (!isAdmin) {
    return (
      <Box sx={{ p: 3, maxWidth: 720, mx: 'auto' }}>
        <Alert severity="warning" sx={{ mt: 2 }}>
          当前账号无管理员权限，无法使用批量资产标签打印功能。
        </Alert>
      </Box>
    );
  }

  const preset = SIZE_PRESETS[size];
  const hasFilter =
    orgNames.length > 0 || categoryNames.length > 0 || costCenterNames.length > 0 || parsedAssetCodes.length > 0;

  return (
    <Box sx={{ p: 2, maxWidth: 1100, mx: 'auto' }}>
      {/* 打印样式（隐藏工具栏、避免标签跨页断开） */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #ffffff; }
          .label-sheet { padding: 0 !important; }
          .label-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(var(--label-w, 60mm), 1fr));
            gap: 2mm;
          }
          .asset-label {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 1px solid #999 !important;
            box-sizing: border-box;
          }
          .asset-label img { width: 60% !important; height: auto !important; }
        }
      `}</style>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        批量资产标签打印
      </Typography>

      {/* ── 筛选工具栏（打印时隐藏）── */}
      <Box className="no-print" sx={{ mb: 2, space: 2 }}>
        {scopeError && <Alert severity="error" sx={{ mb: 1 }}>{scopeError}</Alert>}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1.5 }}>
          <Autocomplete
            multiple
            size="small"
            sx={{ minWidth: 220, flex: '1 1 220px' }}
            options={scope?.orgs.map((o: ScopeOption) => o.name) ?? []}
            value={orgNames}
            onChange={(_, v) => setOrgNames(v)}
            loading={scopeLoading}
            renderInput={(params) => <TextField {...params} label="组织（公司）" />}
          />
          <Autocomplete
            multiple
            size="small"
            sx={{ minWidth: 220, flex: '1 1 220px' }}
            options={scope?.categories.map((c: ScopeOption) => c.name) ?? []}
            value={categoryNames}
            onChange={(_, v) => setCategoryNames(v)}
            loading={scopeLoading}
            renderInput={(params) => <TextField {...params} label="资产类别" />}
          />
          <Autocomplete
            multiple
            size="small"
            sx={{ minWidth: 220, flex: '1 1 220px' }}
            options={scope?.costCenters.map((c: ScopeOption) => c.name) ?? []}
            value={costCenterNames}
            onChange={(_, v) => setCostCenterNames(v)}
            loading={scopeLoading}
            renderInput={(params) => <TextField {...params} label="成本中心" />}
          />
          <TextField
            select
            size="small"
            label="标签尺寸"
            value={size}
            onChange={(e) => setSize(e.target.value as 'small' | 'large')}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="small">{SIZE_PRESETS.small.label}</MenuItem>
            <MenuItem value="large">{SIZE_PRESETS.large.label}</MenuItem>
          </TextField>
        </Box>

        <TextField
          label="指定资产编号（可选，多个用逗号/换行分隔）"
          placeholder="留空则按上方筛选条件生成全部；填写后仅生成这些编号"
          value={assetCodesText}
          onChange={(e) => setAssetCodesText(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          size="small"
          sx={{ mb: 1.5 }}
        />

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={generating || scopeLoading || !hasFilter}
          >
            {generating ? <CircularProgress size={16} color="inherit" /> : '生成标签'}
          </Button>
          <Button variant="outlined" onClick={handlePrint} disabled={items.length === 0}>
            打印（{items.length}）
          </Button>
          {!hasFilter && (
            <Typography variant="caption" color="text.secondary">
              请至少选择一项筛选条件或填写资产编号
            </Typography>
          )}
          {batch && (
            <Typography variant="caption" color="text.secondary">
              批次：{batch}
            </Typography>
          )}
        </Box>

        {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      </Box>

      {/* ── 标签打印区 ── */}
      <Box
        className="label-sheet"
        sx={{
          mt: 2,
          p: 2,
          background: '#fff',
          // 通过 CSS 变量驱动 @media print 下的标签尺寸
          ['--label-w' as string]: preset.w,
        }}
      >
        {generating && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {!generating && items.length === 0 && !error && (
          <Alert severity="info">
            尚未生成标签。请在上方设置筛选条件后点击「生成标签」。
          </Alert>
        )}

        {!generating && items.length > 0 && (
          <Box
            className="label-grid"
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${preset.w}, 1fr))`,
              gap: '2mm',
            }}
          >
            {items.map((it, idx) => (
              <Box
                key={`${it.label.assetCode}-${idx}`}
                className="asset-label"
                sx={{
                  border: '1px solid #999',
                  borderRadius: 1,
                  p: 1,
                  width: preset.w,
                  minHeight: preset.h,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <img src={it.qr} alt="qr" style={{ width: '55%', height: 'auto', objectFit: 'contain' }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, wordBreak: 'break-all' }}>
                      {it.label.assetCode}
                    </Typography>
                    <Typography sx={{ fontSize: 10, lineHeight: 1.2, color: '#333', wordBreak: 'break-all' }}>
                      {it.label.assetName}
                    </Typography>
                    <Typography sx={{ fontSize: 9, lineHeight: 1.2, color: '#666', wordBreak: 'break-all' }}>
                      {it.label.standard}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ fontSize: 9, color: '#555', lineHeight: 1.2, wordBreak: 'break-all' }}>
                  <div>{it.label.companyName}</div>
                  <div>{it.label.categoryName} · {it.label.costCenterName}</div>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
