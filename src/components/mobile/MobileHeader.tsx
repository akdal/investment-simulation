import { LogOut } from 'lucide-react';

interface MobileHeaderProps {
  isAuthenticated: boolean;
  isViewOnly: boolean;
  onLogout: () => void;
}

export function MobileHeader({ isAuthenticated, isViewOnly, onLogout }: MobileHeaderProps) {
  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 flex items-center justify-between flex-shrink-0">
      <h1 className="text-lg font-bold text-white">
        투자 시뮬레이터
        <span className="text-xs font-normal text-slate-400 ml-1">by Huey</span>
      </h1>

      {isAuthenticated && !isViewOnly && (
        <button
          onClick={onLogout}
          className="p-2 text-emerald-400 hover:bg-slate-700/50 rounded-lg transition-colors"
          aria-label="로그아웃"
        >
          <LogOut className="h-5 w-5" />
        </button>
      )}
    </header>
  );
}
