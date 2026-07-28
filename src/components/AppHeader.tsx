import { ExitAppButton } from './ExitControls';

/**
 * 工作台顶栏（由 Layout 统一渲染）。
 * 显示当前页签标题，右侧提供「退出应用」入口。
 * 深层页面不使用本组件，而是直接在其自身顶栏注入 HeaderActions，
 * 以保持各页面返回逻辑独立、互不干扰。
 */
export default function AppHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 bg-gradient-to-r from-primary to-[#4a148c] text-white px-4 py-2.5 flex items-center gap-2 shadow-lg shrink-0">
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold truncate">{title}</h2>
      </div>
      <ExitAppButton />
    </header>
  );
}
