import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  Download, 
  Share2, 
  Smartphone, 
  ExternalLink, 
  HeartPulse, 
  ShieldCheck, 
  Sparkles,
  Info
} from 'lucide-react';
import QRCode from 'qrcode';

interface AppQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppQrModal: React.FC<AppQrModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [selectedTarget, setSelectedTarget] = useState<'home' | 'patient' | 'emergency'>('home');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Determine current live URL with smart fallback
  const currentOrigin = typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
    ? window.location.origin
    : 'https://ais-pre-jrshauuvv5rv6mkeinuml6-648220269205.asia-southeast1.run.app';

  const getTargetUrl = () => {
    switch (selectedTarget) {
      case 'patient':
        return `${currentOrigin}?view=patient`;
      case 'emergency':
        return `${currentOrigin}?sos=115`;
      case 'home':
      default:
        return currentOrigin;
    }
  };

  const currentUrl = getTargetUrl();

  // Generate crisp QR code on mount or URL change
  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(currentUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#064e3b', // Deep emerald green
        light: '#ffffff'
      },
      errorCorrectionLevel: 'H' // High error correction to allow center emblem
    })
      .then(url => {
        setQrDataUrl(url);
      })
      .catch(err => {
        console.error('Failed to generate QR Code:', err);
      });
  }, [isOpen, currentUrl, selectedTarget]);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = currentUrl;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `MedAssist_QuangNgai_QR_${selectedTarget}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'MedAssist Quảng Ngãi - Trợ Lý Y Tế Số & Dịch Tễ',
          text: 'Trải nghiệm ứng dụng y tế số, đặt lịch khám và tra cứu dịch tễ BVĐK Tỉnh Quảng Ngãi:',
          url: currentUrl,
        });
      } catch (e) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-emerald-100 dark:border-emerald-950 overflow-hidden my-auto transition-colors duration-200"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-6 py-5 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wide uppercase text-emerald-100">
                  <Sparkles className="w-3 h-3" />
                  Mã QR Truy Cập Nhanh
                </div>
                <h3 className="text-lg font-black tracking-tight leading-tight mt-0.5">
                  Giới Thiệu Ứng Dụng
                </h3>
                <p className="text-xs text-emerald-100/90 font-medium">
                  MedAssist • BVĐK Tỉnh Quảng Ngãi
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Quick Mode Switcher */}
            <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300">
              <button
                onClick={() => setSelectedTarget('home')}
                className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
                  selectedTarget === 'home'
                    ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Trang Chủ App
              </button>
              <button
                onClick={() => setSelectedTarget('patient')}
                className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
                  selectedTarget === 'patient'
                    ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Cổng Người Bệnh
              </button>
              <button
                onClick={() => setSelectedTarget('emergency')}
                className={`flex-1 py-1.5 rounded-xl transition-all cursor-pointer ${
                  selectedTarget === 'emergency'
                    ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-400 shadow-xs'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Cấp Cứu 115
              </button>
            </div>

            {/* QR Card Container */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative p-4 bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-850 rounded-3xl border-2 border-emerald-200/80 dark:border-emerald-800/60 shadow-md">
                {qrDataUrl ? (
                  <div className="relative bg-white p-2 rounded-2xl">
                    <img 
                      src={qrDataUrl} 
                      alt="Mã QR MedAssist Quảng Ngãi"
                      className="w-56 h-56 rounded-xl object-contain block mx-auto"
                    />
                    {/* Centered Medical Logo Badge */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-11 h-11 bg-white rounded-xl shadow-lg border-2 border-emerald-500 flex items-center justify-center">
                        <HeartPulse className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-medium">Đang tạo mã QR...</span>
                  </div>
                )}

                <div className="mt-2 text-center">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 tracking-wide uppercase bg-emerald-100/70 dark:bg-emerald-900/50 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-emerald-700 dark:text-emerald-400" /> Quét bằng Camera / Zalo
                  </span>
                </div>
              </div>
            </div>

            {/* URL Display & Copy Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Liên kết truy cập trực tiếp:</span>
                {copied && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px] animate-in fade-in">
                    <Check className="w-3.5 h-3.5" /> Đã sao chép vào bộ nhớ tạm!
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 font-mono truncate focus:outline-hidden select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    copied 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }`}
                  title="Sao chép liên kết"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleDownloadQR}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                title="Tải ảnh mã QR về máy để in hoặc chia sẻ"
              >
                <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span>Tải Ảnh QR (PNG)</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                title="Gửi link qua Zalo, Facebook hoặc tin nhắn"
              >
                <Share2 className="w-4 h-4 text-white" />
                <span>Chia Sẻ Ứng Dụng</span>
              </button>
            </div>

            {/* Scan Guidelines */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-3 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Hướng dẫn quét mã cho người dân:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 pl-1">
                <li>Mở Camera điện thoại hoặc tính năng Quét mã QR trên Zalo.</li>
                <li>Hướng camera vào mã QR ở trên để mở ngay ứng dụng.</li>
                <li>Không cần cài đặt từ App Store / CH Play, dữ liệu tức thì.</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
