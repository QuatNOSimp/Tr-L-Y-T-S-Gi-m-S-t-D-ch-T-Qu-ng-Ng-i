import React, { useState, useEffect } from 'react';
import { 
  Droplet, 
  Smile, 
  Frown, 
  Meh, 
  AlertCircle, 
  Heart, 
  Check, 
  Bell, 
  Pill, 
  Clock, 
  Sparkles,
  Plus,
  Minus,
  Stethoscope,
  BookOpen,
  Camera,
  Calculator,
  Calendar,
  PhoneCall,
  Activity,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ZoomIn,
  X,
  Image as ImageIcon,
  MapPin,
  Thermometer,
  HeartPulse,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PrescriptionRecord, PatientSymptomLog, User as UserType } from '../../types';
import { api } from '../../services/api';

// Status evaluation helpers
function getTempStatus(tempStr: string): { label: string; color: string } {
  const val = parseFloat(tempStr);
  if (isNaN(val)) return { label: 'Chưa đo', color: 'text-teal-200' };
  if (val < 36.0) return { label: 'Hạ nhiệt', color: 'text-cyan-300' };
  if (val <= 37.5) return { label: 'Bình thường', color: 'text-emerald-300' };
  if (val <= 38.4) return { label: 'Sốt nhẹ', color: 'text-amber-300' };
  return { label: 'Sốt cao', color: 'text-rose-300' };
}

function getBPStatus(bpStr: string): { label: string; color: string } {
  if (!bpStr) return { label: 'Chưa đo', color: 'text-teal-200' };
  const parts = bpStr.split(/[\/\-]/).map(p => parseInt(p.trim(), 10));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const sys = parts[0];
    const dia = parts[1];
    if (sys >= 140 || dia >= 90) return { label: 'Huyết áp cao', color: 'text-rose-300' };
    if (sys <= 90 || dia <= 60) return { label: 'Huyết áp thấp', color: 'text-amber-300' };
    return { label: 'Ổn định', color: 'text-emerald-300' };
  }
  return { label: 'Ổn định', color: 'text-emerald-300' };
}

function getHRStatus(hrStr: string): { label: string; color: string } {
  const val = parseInt(hrStr, 10);
  if (isNaN(val)) return { label: 'Chưa đo', color: 'text-teal-200' };
  if (val < 60) return { label: 'Nhịp chậm', color: 'text-amber-300' };
  if (val <= 100) return { label: 'Đều đặn', color: 'text-emerald-300' };
  return { label: 'Nhịp nhanh', color: 'text-rose-300' };
}

interface DailyWellnessTrackerProps {
  prescriptions: PrescriptionRecord[];
  currentUser?: UserType | null;
  patientLogs?: PatientSymptomLog[];
  patientId?: string;
  patientName?: string;
  onLogAdded?: (newLog: PatientSymptomLog) => void;
  onNavigateTab?: (tab: 'tra-cuu' | 'nhat-ky' | 'don-thuoc' | 'chi-phi' | 'dat-lich') => void;
  onOpenEmergency?: () => void;
}

export const DailyWellnessTracker: React.FC<DailyWellnessTrackerProps> = ({ 
  prescriptions,
  currentUser,
  patientLogs = [],
  patientId,
  patientName,
  onLogAdded,
  onNavigateTab,
  onOpenEmergency
}) => {
  const patientKey = patientId || currentUser?.id || 'guest';
  const storageKey = `medassist_vitals_${patientKey}`;

  const [waterGlasses, setWaterGlasses] = useState(5);
  const targetGlasses = 8;
  const [mentalMood, setMentalMood] = useState<'Vui vẻ' | 'Bình thường' | 'Căng thẳng' | 'Mệt mỏi' | 'Lo âu'>('Bình thường');

  // Initialize vitals: ONLY from saved storage or patient logs, NO hardcoded fake defaults
  const [vitalTemp, setVitalTemp] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.temp !== undefined) return parsed.temp;
      }
    } catch {}
    const latest = patientLogs.find(l => l.bodyTemperature);
    return latest?.bodyTemperature ? String(latest.bodyTemperature) : '';
  });

  const [vitalBP, setVitalBP] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.bp !== undefined) return parsed.bp;
      }
    } catch {}
    const latest = patientLogs.find(l => l.bloodPressure);
    return latest?.bloodPressure || '';
  });

  const [vitalHeartRate, setVitalHeartRate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.hr !== undefined) return parsed.hr;
      }
    } catch {}
    const latest = patientLogs.find(l => l.heartRate);
    return latest?.heartRate ? String(latest.heartRate) : '';
  });

  // Modal and form states
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
  const [inputTemp, setInputTemp] = useState(vitalTemp);
  const [inputBP, setInputBP] = useState(vitalBP);
  const [inputHR, setInputHR] = useState(vitalHeartRate);
  const [vitalsSaving, setVitalsSaving] = useState(false);
  const [vitalsSaveSuccess, setVitalsSaveSuccess] = useState(false);

  // Sync state if storageKey or patientLogs changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setVitalTemp(parsed.temp || '');
        setVitalBP(parsed.bp || '');
        setVitalHeartRate(parsed.hr || '');
        return;
      }
    } catch {}

    const latestTemp = patientLogs.find(l => l.bodyTemperature)?.bodyTemperature;
    const latestBP = patientLogs.find(l => l.bloodPressure)?.bloodPressure;
    const latestHR = patientLogs.find(l => l.heartRate)?.heartRate;

    setVitalTemp(latestTemp ? String(latestTemp) : '');
    setVitalBP(latestBP || '');
    setVitalHeartRate(latestHR ? String(latestHR) : '');
  }, [storageKey, patientLogs]);

  // Open modal handler
  const handleOpenVitalsModal = () => {
    setInputTemp(vitalTemp);
    setInputBP(vitalBP);
    setInputHR(vitalHeartRate);
    setIsVitalsModalOpen(true);
  };

  // Submit vitals update
  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTemp.trim() && !inputBP.trim() && !inputHR.trim()) {
      alert('Vui lòng nhập ít nhất một chỉ số sinh hiệu (thân nhiệt, huyết áp hoặc nhịp tim).');
      return;
    }

    setVitalsSaving(true);
    try {
      const trimmedTemp = inputTemp.trim();
      const trimmedBP = inputBP.trim();
      const trimmedHR = inputHR.trim();

      setVitalTemp(trimmedTemp);
      setVitalBP(trimmedBP);
      setVitalHeartRate(trimmedHR);

      localStorage.setItem(storageKey, JSON.stringify({
        temp: trimmedTemp,
        bp: trimmedBP,
        hr: trimmedHR,
        updatedAt: new Date().toISOString()
      }));

      // Call API to persist log in database
      const parsedTemp = trimmedTemp ? parseFloat(trimmedTemp) : undefined;
      const parsedHR = trimmedHR ? parseInt(trimmedHR, 10) : undefined;

      const newLog = await api.addPatientLog(patientId || currentUser?.id || 'guest', {
        patientName: patientName || currentUser?.fullName || 'Người Bệnh',
        symptoms: ['Cập nhật chỉ số sinh hiệu định kỳ'],
        notes: `Thân nhiệt: ${trimmedTemp || 'Chưa đo'}°C, Huyết áp: ${trimmedBP || 'Chưa đo'}, Nhịp tim: ${trimmedHR || 'Chưa đo'} bpm`,
        bodyTemperature: parsedTemp,
        bloodPressure: trimmedBP || undefined,
        heartRate: parsedHR,
        mentalState: (mentalMood === 'Vui vẻ' ? 'Rất tốt' : mentalMood) as PatientSymptomLog['mentalState'],
        assignedHospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi'
      });

      if (onLogAdded) {
        onLogAdded(newLog);
      }

      setVitalsSaveSuccess(true);
      setTimeout(() => {
        setVitalsSaveSuccess(false);
        setIsVitalsModalOpen(false);
      }, 700);
    } catch (err) {
      console.error('Failed to save vitals log:', err);
      // Still close modal since local state is saved
      setIsVitalsModalOpen(false);
    } finally {
      setVitalsSaving(false);
    }
  };

  // Reset vitals back to undeclared
  const handleResetVitals = () => {
    if (confirm('Bạn có chắc muốn đặt lại trạng thái Chưa Khai Báo chỉ số sinh hiệu?')) {
      localStorage.removeItem(storageKey);
      setVitalTemp('');
      setVitalBP('');
      setVitalHeartRate('');
      setIsVitalsModalOpen(false);
    }
  };

  const hasDeclaredVitals = Boolean(
    (vitalTemp && vitalTemp.trim() !== '') || 
    (vitalBP && vitalBP.trim() !== '') || 
    (vitalHeartRate && vitalHeartRate.trim() !== '')
  );

  const [quickSymptomNote, setQuickSymptomNote] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [takenPills, setTakenPills] = useState<Record<string, boolean>>({});

  const moods = [
    { label: 'Vui vẻ', icon: Smile, color: 'text-emerald-600 bg-emerald-50 border-emerald-300' },
    { label: 'Bình thường', icon: Meh, color: 'text-blue-600 bg-blue-50 border-blue-300' },
    { label: 'Mệt mỏi', icon: Frown, color: 'text-amber-600 bg-amber-50 border-amber-300' },
    { label: 'Căng thẳng', icon: AlertCircle, color: 'text-orange-600 bg-orange-50 border-orange-300' },
    { label: 'Lo âu', icon: Heart, color: 'text-rose-600 bg-rose-50 border-rose-300' }
  ];

  const handleTogglePill = (key: string) => {
    setTakenPills(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveQuickNote = () => {
    if (!quickSymptomNote.trim()) return;
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 3000);
  };

  // Extract all daily medicines from active prescriptions
  const allDailyMedicines = prescriptions.flatMap((rx, rxIdx) => 
    rx.medicines.map((m, mIdx) => ({
      rxId: rx.id,
      hospital: rx.hospitalName,
      medicineName: m.name,
      dosage: m.dosage,
      instructions: m.instructions,
      schedule: m.schedule,
      key: `${rxIdx}-${mIdx}`
    }))
  );

  const displayName = currentUser?.fullName || 'Người Bệnh';

  return (
    <div className="space-y-6">
      
      {/* Top Banner: Greeting & Quick Vitals */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-600 to-cyan-700 rounded-3xl p-6 sm:p-7 text-white shadow-xl shadow-teal-900/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-white/20 uppercase tracking-wider backdrop-blur-xs flex items-center gap-1.5">
              <Droplet className="w-3.5 h-3.5 text-cyan-200 fill-cyan-200" />
              Giao Diện Chính: Sức Khỏe Hàng Ngày
            </span>
            <span className="text-xs text-teal-100 font-medium">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">
            Xin chào, {displayName}!
          </h2>
          <p className="text-xs sm:text-sm text-teal-50 mt-1 leading-relaxed">
            Đây là không gian quản lý sức khỏe cốt lõi mỗi ngày. Hãy theo dõi mức nước uống, cảm xúc tinh thần và lịch uống thuốc chuẩn từ đơn bệnh viện.
          </p>

          {/* Quick link tags to other advanced tools */}
          {onNavigateTab && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="text-teal-200 text-[11px] self-center">Truy cập nhanh:</span>
              <button
                onClick={() => onNavigateTab('tra-cuu')}
                className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Stethoscope className="w-3.5 h-3.5 text-teal-200" />
                <span>Tra cứu AI</span>
              </button>
              <button
                onClick={() => onNavigateTab('nhat-ky')}
                className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-teal-200" />
                <span>Nhật ký từng giờ</span>
              </button>
              <button
                onClick={() => onNavigateTab('don-thuoc')}
                className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-teal-200" />
                <span>Scan đơn thuốc</span>
              </button>
              <button
                onClick={() => onNavigateTab('chi-phi')}
                className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-teal-200" />
                <span>Dự toán viện phí</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Vitals: Prompt to update if not yet declared, otherwise show actual vitals */}
        {!hasDeclaredVitals ? (
          <div className="relative z-10 flex flex-col items-center sm:items-end justify-center p-4 rounded-2xl bg-amber-500/25 border border-amber-300/40 backdrop-blur-md w-full lg:w-auto text-center sm:text-right shadow-lg">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1.5 rounded-full bg-amber-400 text-amber-950 animate-pulse">
                <AlertCircle className="w-4 h-4" />
              </span>
              <p className="text-xs sm:text-sm font-black text-amber-100 tracking-wide">
                Chưa khai báo chỉ số sinh hiệu hôm nay
              </p>
            </div>
            <p className="text-[11px] text-teal-100/90 max-w-xs leading-relaxed mb-3">
              Thân nhiệt, huyết áp và nhịp tim chưa được ghi nhận. Vui lòng cập nhật ngay để bác sĩ theo dõi sức khỏe kịp thời!
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleOpenVitalsModal}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>Cập nhật chỉ số ngay</span>
            </motion.button>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col gap-2 bg-white/15 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/20 w-full lg:w-auto shadow-lg">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="text-center px-2 cursor-default"
              >
                <p className="text-[11px] text-teal-100 font-medium">Thân nhiệt</p>
                <p className="text-base sm:text-xl font-black">{vitalTemp ? `${vitalTemp}°C` : '--'}</p>
                <span className={`text-[10px] font-semibold ${getTempStatus(vitalTemp).color}`}>
                  {getTempStatus(vitalTemp).label}
                </span>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="text-center px-2 border-x border-white/20 cursor-default"
              >
                <p className="text-[11px] text-teal-100 font-medium">Huyết áp</p>
                <p className="text-base sm:text-xl font-black">{vitalBP || '--'}</p>
                <span className={`text-[10px] font-semibold ${getBPStatus(vitalBP).color}`}>
                  {getBPStatus(vitalBP).label}
                </span>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="text-center px-2 cursor-default flex flex-col items-center justify-center"
              >
                <p className="text-[11px] text-teal-100 font-medium flex items-center gap-1 justify-center">
                  <span>Nhịp tim</span>
                  <motion.span 
                    animate={{ scale: [1, 1.35, 1, 1.25, 1] }}
                    transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut", type: "tween" }}
                    className="inline-block text-rose-300"
                  >
                    ❤️
                  </motion.span>
                </p>
                <p className="text-base sm:text-xl font-black">{vitalHeartRate ? `${vitalHeartRate} bpm` : '--'}</p>
                <span className={`text-[10px] font-semibold ${getHRStatus(vitalHeartRate).color}`}>
                  {getHRStatus(vitalHeartRate).label}
                </span>
              </motion.div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-white/15 text-[11px]">
              <span className="text-teal-200 text-[10px] font-medium flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-300" /> Đã cập nhật
              </span>
              <button 
                onClick={handleOpenVitalsModal}
                className="px-2.5 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>Cập nhật lại</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🏥 Bức Ảnh & Thông Tin Bệnh Viện Đa Khoa Quảng Ngãi */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left w-full md:w-auto">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => setPreviewImage('/bvdk_quang_ngai.png')}
            className="relative w-full sm:w-44 h-28 rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-700 group cursor-pointer shrink-0"
          >
            <img 
              src="/bvdk_quang_ngai.png" 
              alt="Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi"
              className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
              onError={(e) => { e.currentTarget.src = '/anhdep/24.png'; }}
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <span className="px-2.5 py-1 rounded-xl bg-black/60 text-white text-[11px] font-bold backdrop-blur-xs flex items-center gap-1 opacity-90 group-hover:opacity-100">
                <ZoomIn className="w-3.5 h-3.5" /> Xem phóng to
              </span>
            </div>
          </motion.div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Cơ sở khám chữa bệnh &amp; cấp cứu hàng đầu tỉnh
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Hệ thống theo dõi sức khỏe và lịch uống thuốc được kết nối trực tiếp với bác sĩ BVĐK Quảng Ngãi (Số 184 Hùng Vương, TP. Quảng Ngãi).
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Cấp cứu 24/24: 0255.3827.899
              </span>
              <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400 font-semibold">
                <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Bảo Hiểm Y Tế
              </span>
              <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400 font-semibold">
                <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Đặt Số Khám Online
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setPreviewImage('/bvdk_quang_ngai.png')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>Phóng to ảnh</span>
          </motion.button>
        </div>
      </div>

      {/* Main Trackers Grid: Water & Mental State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tracker 1: Water Intake (Số Ly Nước Uống Trong Ngày) */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                  <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', type: 'tween' }}>
                    <Droplet className="w-6 h-6 fill-cyan-500 dark:fill-cyan-400" />
                  </motion.div>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">Số Ly Nước Uống Trong Ngày</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Mục tiêu y tế: {targetGlasses} ly (~2.000 ml nước lọc ấm)</p>
                </div>
              </div>
              <div className="text-right">
                <motion.span 
                  key={waterGlasses}
                  initial={{ scale: 1.4, color: '#0891b2' }}
                  animate={{ scale: 1, color: '#0891b2' }}
                  className="text-2xl font-black font-mono inline-block text-cyan-600 dark:text-cyan-400"
                >
                  {waterGlasses}
                </motion.span>
                <span className="text-sm font-bold text-slate-400 dark:text-slate-500">/{targetGlasses}</span>
              </div>
            </div>

            {/* Visual Glass Tracker with Lively physics */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 my-5">
              {Array.from({ length: targetGlasses }).map((_, i) => {
                const filled = i < waterGlasses;
                return (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.1, y: -4 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setWaterGlasses(i + 1)}
                    className={`h-16 rounded-2xl border flex flex-col items-center justify-center transition-colors cursor-pointer ${
                      filled
                        ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 border-cyan-600 text-white shadow-md shadow-cyan-500/30 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50/50 dark:hover:bg-slate-750'
                    }`}
                    title={`Chọn ly thứ ${i + 1}`}
                  >
                    <Droplet className={`w-5 h-5 ${filled ? 'fill-white text-white animate-bounce' : 'text-slate-300 dark:text-slate-600'}`} />
                    <span className="text-[10px] mt-1">Ly {i + 1}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Progress bar with smooth animated width */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (waterGlasses / targetGlasses) * 100)}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="bg-gradient-to-r from-cyan-500 to-teal-500 h-full rounded-full"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-5 mt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {waterGlasses >= targetGlasses
                ? '🎉 Xuất sắc! Bạn đã nạp đủ 100% lượng nước cần thiết hôm nay.'
                : `Còn thiếu ${targetGlasses - waterGlasses} ly nữa để cơ thể thải độc tốt nhất.`}
            </span>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setWaterGlasses(Math.max(0, waterGlasses - 1))}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                title="Bớt 1 ly nước"
              >
                <Minus className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setWaterGlasses(waterGlasses + 1)}
                className="w-9 h-9 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white flex items-center justify-center font-bold shadow-md shadow-cyan-600/20 transition-all cursor-pointer"
                title="Thêm 1 ly nước"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Tracker 2: Mental Mood & Stress Level (Tình Trạng Tinh Thần) */}
        <motion.div 
          whileHover={{ y: -3 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
        >
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Smile className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">Tình Trạng Tinh Thần & Tâm Lý</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Giúp kíp bác sĩ theo dõi ảnh hưởng của tinh thần đến bệnh lý</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 my-5">
              {moods.map((m) => {
                const active = mentalMood === m.label;
                const IconComponent = m.icon;
                return (
                  <motion.button
                    key={m.label}
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setMentalMood(m.label as any)}
                    className={`p-3 rounded-2xl border text-center transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      active
                        ? `${m.color} ring-2 ring-emerald-500 font-extrabold shadow-md scale-102`
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <IconComponent className="w-6 h-6" />
                    <span className="text-xs">{m.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Đánh giá tâm lý hôm nay: {mentalMood}</p>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                {mentalMood === 'Vui vẻ' && 'Tuyệt vời! Tinh thần tích cực giúp tăng sinh tế bào miễn dịch tự nhiên.'}
                {mentalMood === 'Bình thường' && 'Trạng thái ổn định. Duy trì ngủ đủ 7-8 tiếng và vận động nhẹ.'}
                {mentalMood === 'Mệt mỏi' && 'Cơ thể đang cần nghỉ ngơi. Hạn chế làm việc căng thẳng và uống nhiều nước ấm.'}
                {mentalMood === 'Căng thẳng' && 'Thực hành bài tập thở 4-7-8, ngâm chân nước ấm trước khi đi ngủ.'}
                {mentalMood === 'Lo âu' && 'Hãy trò chuyện cùng người thân hoặc đặt lịch tư vấn cùng bác sĩ chuyên khoa.'}
              </p>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Medication Reminder Schedule (Lịch Nhắc Uống Thuốc từ Đơn Thuốc Bác Sĩ Kê) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">Lịch Uống Thuốc Theo Đơn Bác Sĩ Kê</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Chuyển tiếp trực tiếp từ chẩn đoán và phác đồ điều trị của Bác sĩ</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold px-3 py-1 bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 rounded-xl border border-teal-200 dark:border-teal-800">
              {allDailyMedicines.length} loại thuốc cần dùng
            </span>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('don-thuoc')}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <Pill className="w-3.5 h-3.5" />
                <span>Xem đơn bác sĩ</span>
              </button>
            )}
          </div>
        </div>

        {allDailyMedicines.length === 0 ? (
          <div className="py-10 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
              <Pill className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Chưa có đơn thuốc nào được khai báo hoặc kê đơn</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Lịch uống thuốc này sẽ chỉ hiển thị khi bạn tự khai báo đơn thuốc đang dùng hoặc khi Bác sĩ tại các Bệnh viện Quảng Ngãi chỉ định đơn điều trị cho bạn.
            </p>
            {onNavigateTab && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => onNavigateTab('don-thuoc')}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Pill className="w-4 h-4" />
                  <span>Khai Báo Hoặc Quản Lý Đơn Thuốc</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {allDailyMedicines.map((med) => {
              const isTaken = !!takenPills[med.key];
              return (
                <div key={med.key} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">{med.medicineName}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 font-mono font-bold border border-purple-200 dark:border-purple-800">
                        {med.dosage}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-2">
                      <span>{med.instructions}</span>
                      <span>•</span>
                      <span className="text-purple-700 dark:text-purple-400 font-bold">{med.hospital}</span>
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Giờ uống:</span>
                      {med.schedule.map((time, tIdx) => (
                        <span key={tIdx} className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md">
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleTogglePill(med.key)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
                      isTaken
                        ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-700'
                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20'
                    }`}
                  >
                    <Check className={`w-4 h-4 ${isTaken ? 'text-emerald-700 dark:text-emerald-300 stroke-[3]' : 'text-white'}`} />
                    <span>{isTaken ? 'Đã Uống Thuốc' : 'Đánh Dấu Đã Uống'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Action Grid to Advanced Features */}
      {onNavigateTab && (
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 transition-colors duration-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Tiện Ích & Dịch Vụ Y Tế Chuyên Sâu</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Các chức năng bổ sung được tích hợp sẵn qua Menu Dropdown bên cạnh</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              5 Chức năng nâng cao
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <button
              onClick={() => onNavigateTab('tra-cuu')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-500 hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300">Tra Cứu Triệu Chứng</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Đối chiếu &amp; chẩn đoán dịch tễ &gt;100.000 bệnh</p>
            </button>

            <button
              onClick={() => onNavigateTab('nhat-ky')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300">Sổ Nhật Ký Từng Giờ</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Ghi chi tiết thân nhiệt, huyết áp, điểm đau</p>
            </button>

            <button
              onClick={() => onNavigateTab('don-thuoc')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300">Scan Đơn Thuốc OCR</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">AI nhận diện đơn cũ & phân bổ lịch uống</p>
            </button>

            <button
              onClick={() => onNavigateTab('chi-phi')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500 hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <Calculator className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-300">Dự Toán Chi Phí Khám</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Bảng giá thực tế các bệnh viện Quảng Ngãi</p>
            </button>

            <button
              onClick={() => onNavigateTab('dat-lich')}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-md transition-all text-left group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Đặt Lịch & Lấy STT</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Chọn khoa, bác sĩ & nhận phiếu số thứ tự</p>
            </button>
          </div>
        </div>
      )}

      {/* Modal Cập Nhật Chỉ Số Sinh Hiệu */}
      {isVitalsModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsVitalsModalOpen(false)}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-700 to-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-xs">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Cập Nhật Chỉ Số Sinh Hiệu</h3>
                  <p className="text-xs text-teal-100">Ghi nhận thân nhiệt, huyết áp &amp; nhịp tim hôm nay</p>
                </div>
              </div>
              <button 
                onClick={() => setIsVitalsModalOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-teal-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveVitals} className="p-5 sm:p-6 space-y-4">
              {/* Thân nhiệt */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-amber-500" />
                  <span>Thân nhiệt (°C)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="34"
                    max="43"
                    value={inputTemp}
                    onChange={(e) => setInputTemp(e.target.value)}
                    placeholder="Ví dụ: 36.8"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden font-medium"
                  />
                  <span className="text-sm font-bold text-slate-400">°C</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 self-center">Chọn nhanh:</span>
                  {['36.5', '36.8', '37.0', '37.5', '38.0', '38.5'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setInputTemp(t)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                        inputTemp === t 
                          ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-300' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {t}°C
                    </button>
                  ))}
                </div>
              </div>

              {/* Huyết áp */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span>Huyết áp (mmHg - Tâm thu / Tâm trương)</span>
                </label>
                <input
                  type="text"
                  value={inputBP}
                  onChange={(e) => setInputBP(e.target.value)}
                  placeholder="Ví dụ: 120/80"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden font-medium"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 self-center">Chọn nhanh:</span>
                  {['110/70', '120/80', '130/85', '140/90'].map((bp) => (
                    <button
                      key={bp}
                      type="button"
                      onClick={() => setInputBP(bp)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                        inputBP === bp 
                          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {bp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nhịp tim */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <span>Nhịp tim (lần / phút - bpm)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1"
                    min="40"
                    max="200"
                    value={inputHR}
                    onChange={(e) => setInputHR(e.target.value)}
                    placeholder="Ví dụ: 75"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:ring-2 focus:ring-teal-500 outline-hidden font-medium"
                  />
                  <span className="text-sm font-bold text-slate-400">bpm</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 self-center">Chọn nhanh:</span>
                  {['68', '72', '75', '80', '88'].map((hr) => (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => setInputHR(hr)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                        inputHR === hr 
                          ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {hr} bpm
                    </button>
                  ))}
                </div>
              </div>

              {/* Ghi chú thông báo */}
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-800 dark:text-teal-300 flex items-start gap-2">
                <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>Chỉ số sinh hiệu sẽ tự động lưu vào Nhật ký theo dõi sức khỏe của bạn và giúp bác sĩ BVĐK Quảng Ngãi theo dõi khi tái khám.</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-3">
                {hasDeclaredVitals ? (
                  <button
                    type="button"
                    onClick={handleResetVitals}
                    className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại chưa khai báo</span>
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsVitalsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={vitalsSaving}
                    className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {vitalsSaving ? (
                      <span>Đang lưu...</span>
                    ) : vitalsSaveSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Đã lưu thành công!</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4" />
                        <span>Lưu chỉ số sinh hiệu</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Lightbox Modal for Hospital Photo */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold">Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi (Số 184 Hùng Vương)</span>
              </div>
              <button 
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 sm:p-4 bg-black flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img 
                src={previewImage} 
                alt="Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi"
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>
            <div className="p-3 bg-slate-950/90 text-center border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between px-4">
              <span>Cấp cứu trực 24/7: 0255.3827.899 - Tổng đài 115</span>
              <button
                onClick={() => setPreviewImage(previewImage === '/bvdk_quang_ngai.png' ? '/anhdep/24.png' : '/bvdk_quang_ngai.png')}
                className="text-xs text-emerald-400 hover:underline cursor-pointer"
              >
                Đổi ảnh khuôn viên / toàn cảnh
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
