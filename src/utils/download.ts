function isMobile(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod|android|dingtalk/.test(ua);
}

function textToDataUrl(text: string, mimeType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([text], { type: mimeType });
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件转码失败'));
    reader.readAsDataURL(blob);
  });
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

export async function exportAndDownloadCsv(
  fetchCsv: () => Promise<{ csvContent: string; filename: string }>,
): Promise<void> {
  const mobile = isMobile();
  let newTab: Window | null = null;
  if (mobile) {
    newTab = window.open('about:blank', '_blank');
  }
  try {
    const { csvContent, filename } = await fetchCsv();
    const text = '\uFEFF' + csvContent;
    const finalName = filename || 'assets_local.csv';
    if (mobile) {
      const dataUrl = await textToDataUrl(text, 'text/csv;charset=utf-8');
      if (newTab) {
        newTab.location.href = dataUrl;
      } else {
        window.location.href = dataUrl;
      }
    } else {
      downloadByAnchor(new Blob([text], { type: 'text/csv;charset=utf-8' }), finalName);
    }
  } catch (err) {
    if (newTab) {
      try { newTab.close(); } catch { /* ignore */ }
    }
    throw err;
  }
}
