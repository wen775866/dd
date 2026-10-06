import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-2 left-2 z-50 flex items-center gap-2 rounded-full bg-slate-900/90 border border-amber-500/50 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-amber-300 shadow-xl animate-in slide-in-from-bottom-2">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
      <span>离线单机模式 (PWA 本地畅玩)</span>
    </div>
  );
};
