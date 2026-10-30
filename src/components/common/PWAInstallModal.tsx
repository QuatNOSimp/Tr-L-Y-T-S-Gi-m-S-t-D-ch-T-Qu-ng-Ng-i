import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Smartphone, 
  Download, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  WifiOff, 
  ArrowRight,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-emerald-100 dark:border-emerald-950 overflow-hidden my-auto transition-colors duration-200"
        >
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 sm:p-6 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-white p-1.5 shadow-lg border border-white/40 flex items-center justify-center shrink-0">
                <img 
                  src="/pwa-192x192.png" 
                  alt="App Icon" 
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase tracking-wide text-emerald-100">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Cài Đặt App Trực Tiếp
                </div>
                <h3 className="text-lg sm:text-xl font-black mt-0.5 leading-tight">
                  Cài Đặt MedAssist Lên Điện Thoại
                </h3>
                <p className="text-xs text-emerald-100/90 font-medium">
                  Trải nghiệm chuẩn Native App • Không tốn dung lượng
                </p>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            
            {/* Native App Benefits Highlights */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60">
                <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">Mở Tức Thì</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">1 Chạm từ màn hình</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/60">
                <Smartphone className="w-5 h-5 text-teal-600 dark:text-teal-400 mx-auto mb-1" />
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">Toàn Màn Hình</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Không thanh URL</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900/60">
                <WifiOff className="w-5 h-5 text-cyan-600 dark:text-cyan-400 mx-auto mb-1" />
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">Xem Offline</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Tra cứu không cần mạng</span>
              </div>
            </div>

            {/* CASE 1: App is already installed */}
            {isInstalled ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h4 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-200">
                  Ứng dụng đã được cài đặt trên máy của bạn!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Bạn có thể mở ứng dụng bất cứ lúc nào trực tiếp từ màn hình chính điện thoại hoặc máy tính.
                </p>
              </div>
            ) : isInstallable ? (
              /* CASE 2: Android / Chrome / Edge 1-Click Install Button */
              <div className="space-y-3 pt-1">
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <Download className="w-5 h-5 animate-bounce" />
                  <span>Cài Đặt Ngay Vào Thiết Bị (1 Chạm)</span>
                </button>

                <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                  * Ứng dụng sẽ tự động tải icon ra màn hình chính điện thoại như App tải từ CH Play.
                </p>
              </div>
            ) : null}

            {/* Instruction Guides */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Hướng dẫn cài đặt chi tiết từng loại điện thoại:</span>
              </h4>

              {/* iPhone / iPad Guide */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center">
                    
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Dành cho iPhone / iPad (Safari):</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pl-6">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">1.</span>
                    <span>Mở trang web bằng trình duyệt <strong>Safari</strong> trên iPhone.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">2.</span>
                    <span>
                      Bấm nút <strong className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px]"><Share className="w-3 h-3" /> Chia sẻ</strong> ở thanh công cụ dưới cùng.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">3.</span>
                    <span>
                      Kéo xuống và chọn <strong className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px]"><PlusSquare className="w-3 h-3" /> Thêm vào MH chính</strong> (Add to Home Screen).
                    </span>
                  </div>
                </div>
              </div>

              {/* Android / Samsung / Xiaomi / Oppo Guide */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">
                    🤖
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Dành cho Android (Chrome / Cốc Cốc):</span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 pl-6">
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">1.</span>
                    <span>Bấm dấu <strong>3 chấm (⋮)</strong> ở góc trên bên phải trình duyệt Chrome.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">2.</span>
                    <span>
                      Chọn <strong className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px]"><Download className="w-3 h-3" /> Cài đặt ứng dụng</strong> hoặc "Thêm vào màn hình chính".
                    </span>
                  </div>
                </div>
              </div>

              {/* Zalo / In-app Browser note */}
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <span>💡 Nếu bạn đang mở link từ Zalo hoặc Facebook:</span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Hãy bấm dấu <strong>(⋯)</strong> ở góc trên và chọn <strong>"Mở bằng trình duyệt ngoài"</strong> (Chrome hoặc Safari) để cài đặt biểu tượng ra màn hình chính nhé!
                </p>
              </div>

            </div>

          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Công nghệ Progressive Web App (PWA)
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold transition-colors cursor-pointer"
            >
              Đã hiểu & Đóng
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
