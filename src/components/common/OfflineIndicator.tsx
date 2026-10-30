import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 z-50 flex items-center gap-2 rounded-2xl bg-amber-600/95 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-white shadow-xl animate-in slide-in-from-bottom-3 duration-300">
      <span className="h-2.5 w-2.5 rounded-full bg-white animate-ping" />
      <WifiOff className="w-4 h-4 shrink-0 text-amber-200" />
      <span>Chế độ Ngoại tuyến (Offline) — Đang dùng dữ liệu đã lưu trong máy.</span>
    </div>
  );
};
