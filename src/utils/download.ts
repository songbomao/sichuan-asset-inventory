function isMobile(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod|android|dingtalk/.test(ua);
}

function downloadByAnchor(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 导出 CSV：
 * - 桌面端：请求 JSON 接口拿 csvContent，Blob + <a download> 保存
 * - 移动端（含钉钉 WebView）：直接跳转后端文件流 URL（Content-Disposition: attachment），
 *   由钉钉/系统原生下载器接管。Blob 与 data URL 两种前端触发方式在钉钉 WebView 均被拦截，不可用。
 */
export async function exportAndDownloadCsv(
  fetchCsv: () => Promise<{ csvContent: string; filename: string }>,
  fileStreamUrl?: string,
): Promise<void> {
  if (isMobile() && fileStreamUrl) {
    // 同步跳转，保持在用户手势调用栈内，避免被 WebView 拦截
    window.location.href = fileStreamUrl;
    return;
  }
  const { csvContent, filename } = await fetchCsv();
  const text = '\uFEFF' + csvContent;
  downloadByAnchor(new Blob([text], { type: 'text/csv;charset=utf-8' }), filename || 'assets_local.csv');
}
