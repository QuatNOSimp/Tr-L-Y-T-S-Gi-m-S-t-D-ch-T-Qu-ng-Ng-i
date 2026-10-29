import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Clock, Copy, ExternalLink, X, RefreshCw, Inbox, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { SentEmailMessage } from '../../types';

interface EmailInboxSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetEmail?: string;
  onApplyOtp?: (otp: string) => void;
}

export const EmailInboxSimulatorModal: React.FC<EmailInboxSimulatorModalProps> = ({
  isOpen,
  onClose,
  targetEmail,
  onApplyOtp
}) => {
  const [emails, setEmails] = useState<SentEmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<SentEmailMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const res = await api.getSentEmails(targetEmail);
      setEmails(res.emails || []);
      if (res.emails?.length > 0 && !selectedEmail) {
        setSelectedEmail(res.emails[0]);
      } else if (res.emails?.length > 0 && selectedEmail) {
        const found = res.emails.find((e: any) => e.id === selectedEmail.id);
        setSelectedEmail(found || res.emails[0]);
      }
    } catch (e) {
      console.error('Error fetching sent emails:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEmails();
      const interval = setInterval(loadEmails, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, targetEmail]);

  if (!isOpen) return null;

  const handleCopyOtp = (otp: string) => {
    navigator.clipboard.writeText(otp);
    setCopiedOtp(otp);
    setTimeout(() => setCopiedOtp(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden transition-colors duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Hộp Thư Đến Mô Phỏng (Email Inbox)</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Thời Gian Thực
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {targetEmail ? `Đang lọc thư gửi đến: ${targetEmail}` : 'Tất cả email xác thực gửi từ hệ thống'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadEmails}
              disabled={loading}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content body split: Email List (Left) and Email Viewer (Right) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* Email list */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 overflow-y-auto max-h-56 md:max-h-full">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Hộp thư ({emails.length} thư)</span>
              {targetEmail && (
                <span className="text-emerald-700 dark:text-emerald-400 font-normal truncate max-w-[140px]">{targetEmail}</span>
              )}
            </div>

            {emails.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Chưa có email nào được gửi.</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Đăng ký hoặc bấm gửi lại mã để nhận thư mới.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {emails.map((msg) => {
                  const isSelected = selectedEmail?.id === msg.id;
                  return (
                    <button
                      key={msg.id}
                      onClick={() => setSelectedEmail(msg)}
                      className={`w-full text-left p-3.5 transition-colors cursor-pointer block ${
                        isSelected 
                          ? 'bg-white dark:bg-slate-800 border-l-4 border-l-emerald-600 shadow-xs' 
                          : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">MedAssist Quảng Ngãi</span>
                        <span className="text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(msg.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate mb-1">{msg.subject}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="truncate max-w-[130px]">Đến: {msg.to}</span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          {msg.otp}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Email content viewer */}
          <div className="flex-1 bg-white dark:bg-slate-900 p-4 sm:p-6 overflow-y-auto">
            {selectedEmail ? (
              <div className="space-y-4">
                {/* Meta details bar */}
                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">{selectedEmail.subject}</h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(selectedEmail.sentAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <div><strong>Từ:</strong> no-reply@medassist-quangngai.vn (Hệ Thống Y Tế MedAssist)</div>
                    <div><strong>Gửi đến:</strong> <span className="font-medium text-emerald-800 dark:text-emerald-300">{selectedEmail.to}</span> ({selectedEmail.userName})</div>
                  </div>

                  {/* Fast Action Quick Copy/Apply Bar */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Mã OTP:</span>
                    <span className="font-mono font-extrabold text-base text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700">
                      {selectedEmail.otp}
                    </span>
                    <button
                      onClick={() => handleCopyOtp(selectedEmail.otp)}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedOtp === selectedEmail.otp ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Đã sao chép!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Sao chép OTP</span>
                        </>
                      )}
                    </button>

                    {onApplyOtp && (
                      <button
                        onClick={() => {
                          onApplyOtp(selectedEmail.otp);
                          onClose();
                        }}
                        className="px-3.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-xs transition-colors ml-auto cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Tự Điền & Xác Thực Ngay</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Rendered HTML email body */}
                <div 
                  className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs bg-white text-slate-900"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.htmlContent }} 
                />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500">
                <Mail className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Chọn một thư bên trái để xem nội dung</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Nội dung thư gửi về sẽ bao gồm mã OTP 6 số và đường link kích hoạt tài khoản.</p>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>* Hệ thống tự động đồng bộ thư xác nhận tức thì.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
