import React, { useState, useRef, useEffect } from 'react';
import { 
  Stethoscope, 
  BookOpen, 
  Pill, 
  Droplet, 
  Calculator, 
  Calendar, 
  User, 
  ShieldCheck, 
  Heart, 
  MapPin, 
  PhoneCall, 
  Sparkles,
  FileSpreadsheet,
  ChevronDown,
  ArrowLeft,
  Check,
  Activity,
  QrCode
} from 'lucide-react';
import { Disease, HospitalInfo, Doctor, Appointment, PatientSymptomLog, PrescriptionRecord, User as UserType } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { SymptomChecker } from './SymptomChecker';
import { PatientJournal } from './PatientJournal';
import { DoctorPrescriptions } from './DoctorPrescriptions';
import { DailyWellnessTracker } from './DailyWellnessTracker';
import { CostEstimator } from './CostEstimator';
import { AppointmentBooking } from './AppointmentBooking';
import { HospitalCoverSlider } from '../common/HospitalCoverSlider';

interface PatientDashboardProps {
  diseases: Disease[];
  hospitals: HospitalInfo[];
  doctors: Doctor[];
  appointments: Appointment[];
  patientLogs: PatientSymptomLog[];
  prescriptions: PrescriptionRecord[];
  currentUser: UserType | null;
  onOpenProfile: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogAdded: (log: PatientSymptomLog) => void;
  onPrescriptionSaved: (rx: PrescriptionRecord) => void;
  onPrescriptionDeleted?: (id: string) => void;
  onAppointmentCreated: (appt: Appointment) => void;
  onAppointmentCancelled?: (id: string) => void;
  onOpenEmergency: () => void;
  onOpenQrCode?: () => void;
}

type TabType = 'suc-khoe' | 'tra-cuu' | 'nhat-ky' | 'don-thuoc' | 'chi-phi' | 'dat-lich';

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  diseases,
  hospitals,
  doctors,
  appointments,
  patientLogs,
  prescriptions,
  currentUser,
  onOpenProfile,
  onOpenAuth,
  onLogAdded,
  onPrescriptionSaved,
  onPrescriptionDeleted,
  onAppointmentCreated,
  onAppointmentCancelled,
  onOpenEmergency,
  onOpenQrCode
}) => {
  // Giao diện chính là 'suc-khoe' (Sức Khỏe Hàng Ngày)
  const [activeTab, setActiveTab] = useState<TabType>('suc-khoe');
  const [selectedHospitalForCost, setSelectedHospitalForCost] = useState<string | undefined>(undefined);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const patientProfile = {
    id: currentUser?.id || 'pat-guest',
    name: currentUser?.fullName || (currentUser ? 'Người Bệnh' : 'Khách vãng lai'),
    age: currentUser?.birthYear ? (new Date().getFullYear() - Number(currentUser.birthYear)) : null,
    gender: currentUser?.gender || null,
    phone: currentUser?.phone || null,
    address: currentUser?.address 
      ? `${currentUser.address}${currentUser.district ? `, ${currentUser.district}` : ''}`
      : (currentUser?.district || null),
    bhytNumber: currentUser?.bhytNumber || null,
    bloodType: currentUser?.bloodType || null,
    allergies: currentUser?.allergies || null,
    isVerified: currentUser?.isVerified ?? false
  };

  // Filter prescriptions strictly for current logged-in patient so that no undeclared or default prescriptions appear
  const currentPatientId = currentUser?.id || 'pat-guest';
  const patientPrescriptions = prescriptions.filter(rx => 
    rx.patientId === currentPatientId || 
    (currentUser && (rx.patientId === currentUser.id || (currentUser.fullName && rx.patientName?.toLowerCase() === currentUser.fullName?.toLowerCase())))
  );

  // Filter logs strictly for current patient so that undeclared vitals remain empty until updated
  const currentPatientLogs = patientLogs.filter(l => 
    l.patientId === currentPatientId || 
    (currentUser && (l.patientId === currentUser.id || (currentUser.fullName && l.patientName?.toLowerCase() === currentUser.fullName?.toLowerCase())))
  );

  // Danh mục đầy đủ 6 chức năng được tích hợp trong Dropdown bên trái
  const dropdownItems = [
    { 
      id: 'suc-khoe' as TabType, 
      label: 'Sức Khỏe Hàng Ngày (Màn Hình Chính)', 
      desc: 'Theo dõi nước uống, cảm xúc tinh thần, chỉ số sinh hiệu & lịch uống thuốc theo đơn',
      icon: Droplet, 
      tag: 'Chính' 
    },
    { 
      id: 'tra-cuu' as TabType, 
      label: '1. Tra Cứu Triệu Chứng & AI', 
      desc: 'Chẩn đoán sơ bộ, mức nguy hiểm, tính lây nhiễm (>100.000 bệnh)',
      icon: Stethoscope, 
      tag: 'Chẩn đoán AI' 
    },
    { 
      id: 'nhat-ky' as TabType, 
      label: '2. Sổ Nhật Ký Bệnh Từng Giờ', 
      desc: 'Theo dõi chi tiết thân nhiệt, huyết áp, mức độ đau từng giờ',
      icon: BookOpen, 
      tag: 'Lâm sàng' 
    },
    { 
      id: 'don-thuoc' as TabType, 
      label: '3. Đơn Thuốc Bác Sĩ & Hướng Dẫn', 
      desc: 'Tiếp nhận trực tiếp từ chẩn đoán của bác sĩ điều trị, liều dùng chi tiết & an toàn',
      icon: Pill, 
      tag: 'Bác sĩ kê' 
    },
    { 
      id: 'chi-phi' as TabType, 
      label: '4. AI Dự Toán Viện Phí & BHYT', 
      desc: 'Bảng giá xét nghiệm, khám bệnh các BV tại Quảng Ngãi',
      icon: Calculator, 
      tag: 'Bảng giá QN' 
    },
    { 
      id: 'dat-lich' as TabType, 
      label: '5. Đặt Lịch Khám & Nhận STT', 
      desc: 'Đăng ký phòng khám, bác sĩ chuyên khoa & nhận số thứ tự',
      icon: Calendar, 
      tag: 'Lấy số khám' 
    }
  ];

  const currentActiveItem = dropdownItems.find(item => item.id === activeTab);

  const handleSelectHospitalAndGoToCost = (hospId?: string) => {
    setSelectedHospitalForCost(hospId);
    setActiveTab('chi-phi');
  };

  const handleGoToBooking = (hospId: string) => {
    setSelectedHospitalForCost(hospId);
    setActiveTab('dat-lich');
  };

  return (
    <div className="space-y-6">
      
      {/* 🏥 Trang Bìa Slider Toàn Cảnh Các Bệnh Viện Tỉnh Quảng Ngãi (Hospital Cover Slider) */}
      <HospitalCoverSlider onOpenEmergency={onOpenEmergency} />

      {/* Patient Profile Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-emerald-600/20 shrink-0">
            {patientProfile.name ? patientProfile.name.charAt(0).toUpperCase() : 'P'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">{patientProfile.name}</h2>
              {patientProfile.bhytNumber ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  BHYT: {patientProfile.bhytNumber}
                </span>
              ) : currentUser ? (
                <button
                  type="button"
                  onClick={onOpenProfile}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-dashed border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                  title="Nhấn để tự khai báo số thẻ BHYT của bạn"
                >
                  + Khai báo mã BHYT
                </button>
              ) : null}
              {patientProfile.isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Email Đã Xác Thực
                </span>
              ) : (
                <button
                  onClick={() => onOpenAuth('login')}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 cursor-pointer"
                >
                  Chưa Xác Thực Email
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-1">
              <span>{patientProfile.gender ? patientProfile.gender : 'Giới tính: Chưa khai báo'}{patientProfile.age ? `, ${patientProfile.age} tuổi` : ''}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" /> 
                {patientProfile.address || 'Địa chỉ: Chưa khai báo'}
              </span>
              <span>•</span>
              <span className={patientProfile.bloodType ? "text-rose-600 dark:text-rose-400 font-medium" : "text-slate-400 dark:text-slate-500 italic"}>
                {patientProfile.bloodType ? `Nhóm máu: ${patientProfile.bloodType}` : 'Nhóm máu: Chưa xác định'}
              </span>
              <span>•</span>
              <span className={patientProfile.allergies ? "text-amber-600 dark:text-amber-400 font-medium" : "text-slate-400 dark:text-slate-500 italic"}>
                {patientProfile.allergies ? `Dị ứng: ${patientProfile.allergies}` : 'Tiền sử: Chưa khai báo'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons: Edit Profile, QR Code & Emergency */}
        <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
          {onOpenQrCode && (
            <button
              onClick={onOpenQrCode}
              className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Quét mã QR để mở app trên điện thoại hoặc chia sẻ"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Mã QR Giới Thiệu</span>
            </button>
          )}

          {currentUser ? (
            <button
              onClick={onOpenProfile}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-white" />
              <span>✏️ Khai Báo / Sửa Hồ Sơ Y Tế</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenAuth('login')}
              className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Đăng Nhập / Đăng Ký</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Bar: Dropdown Chức Năng Đặt Bên Trái + Sức Khỏe Hàng Ngày (Chính) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors duration-200">
        
        {/* Left Side: Dropdown Menu Chọn Chức Năng Y Tế (Đặt Bên Trái) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Dropdown Button on the LEFT */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full sm:w-auto flex items-center justify-between gap-2.5 px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                activeTab !== 'suc-khoe'
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/25 ring-2 ring-indigo-500/20'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${activeTab !== 'suc-khoe' ? 'text-amber-300' : 'text-indigo-600 dark:text-indigo-400'}`} />
                <span className="font-extrabold">
                  {currentActiveItem
                    ? `▾ Menu Chức Năng (Bên Trái): ${currentActiveItem.label}`
                    : '▾ Menu Chức Năng Y Tế (Bên Trái)'}
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''} ${activeTab !== 'suc-khoe' ? 'text-white' : 'text-indigo-700 dark:text-indigo-300'}`} />
            </button>

            {/* Dropdown Popover - Opens Left-Aligned */}
            {isDropdownOpen && (
              <div className="absolute left-0 mt-2 w-full sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/60 rounded-xl mb-1">
                  <span className="text-[11px] font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Danh Mục 5 Chức Năng Y Tế
                  </span>
                  <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                    Quảng Ngãi Med
                  </span>
                </div>

                <div className="space-y-1">
                  {dropdownItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const IconComp = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 cursor-pointer ${
                          isActive 
                            ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 shadow-xs'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs font-bold ${isActive ? 'text-indigo-900 dark:text-indigo-200 font-extrabold' : 'text-slate-900 dark:text-slate-100'}`}>
                              {item.label}
                            </p>
                            {isActive && (
                              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                                <Check className="w-3 h-3" /> Đang mở
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Reset back to Daily Wellness inside dropdown */}
                {activeTab !== 'suc-khoe' && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                    <button
                      onClick={() => {
                        setActiveTab('suc-khoe');
                        setIsDropdownOpen(false);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/70 hover:bg-teal-100 dark:hover:bg-teal-900/70 text-teal-800 dark:text-teal-300 text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Droplet className="w-3.5 h-3.5 fill-teal-600 text-teal-600 dark:text-teal-400" />
                      <span>Quay về Sức Khỏe Hàng Ngày (Giao Diện Chính)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sức Khỏe Hàng Ngày (Giao Diện Chính) Button */}
          <button
            onClick={() => setActiveTab('suc-khoe')}
            className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === 'suc-khoe'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-600/25 ring-2 ring-teal-500/20'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Droplet className={`w-4 h-4 ${activeTab === 'suc-khoe' ? 'fill-white text-white' : 'text-teal-600 dark:text-teal-400'}`} />
            <span>Sức Khỏe Hàng Ngày (Giao Diện Chính)</span>
            {activeTab === 'suc-khoe' && (
              <span className="hidden md:inline-block w-2 h-2 rounded-full bg-emerald-200 animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Right Side: Back to main if in sub-function OR indicator */}
        <div className="flex items-center justify-end">
          {activeTab !== 'suc-khoe' ? (
            <button
              onClick={() => setActiveTab('suc-khoe')}
              className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/70 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <span>← Về Sức Khỏe Chính</span>
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Đang ở màn hình theo dõi chính</span>
            </div>
          )}
        </div>

      </div>

      {/* Sub-header banner when viewing one of the dropdown features */}
      {activeTab !== 'suc-khoe' && currentActiveItem && (
        <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 rounded-2xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('suc-khoe')}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
              title="Quay lại giao diện chính"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Về Sức Khỏe Chính</span>
            </button>
            <div className="text-xs">
              <span className="text-slate-500 dark:text-slate-400">Đang thao tác chức năng mở rộng:</span>{' '}
              <strong className="text-indigo-900 dark:text-indigo-300 font-extrabold">{currentActiveItem.label}</strong>
            </div>
          </div>

          <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
            (Có thể dùng Menu Dropdown bên phải trên thanh điều hướng để đổi chức năng bất cứ lúc nào)
          </span>
        </div>
      )}

      {/* Main View Area with Lively Transitions */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 15, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.995 }}
          transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
          className="transition-all"
        >
          {/* 1. GIAO DIỆN CHÍNH: SỨC KHỎE HÀNG NGÀY */}
          {activeTab === 'suc-khoe' && (
            <DailyWellnessTracker
              prescriptions={patientPrescriptions}
              currentUser={currentUser}
              patientLogs={currentPatientLogs}
              patientId={patientProfile.id}
              patientName={patientProfile.name}
              onLogAdded={onLogAdded}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenEmergency={onOpenEmergency}
            />
          )}

          {/* 2. CHỨC NĂNG TỪ DROPDOWN: TRA CỨU TRIỆU CHỨNG */}
          {activeTab === 'tra-cuu' && (
            <SymptomChecker
              diseases={diseases}
              onSelectHospitalForEstimate={handleSelectHospitalAndGoToCost}
            />
          )}

          {/* 3. CHỨC NĂNG TỪ DROPDOWN: SỔ NHẬT KÝ BỆNH TỪNG GIỜ */}
          {activeTab === 'nhat-ky' && (
            <PatientJournal
              logs={currentPatientLogs}
              onLogAdded={onLogAdded}
              patientId={patientProfile.id}
              patientName={patientProfile.name}
            />
          )}

          {/* 4. CHỨC NĂNG TỪ DROPDOWN: ĐƠN THUỐC BÁC SĨ KÊ & HƯỚNG DẪN DÙNG THUỐC */}
          {activeTab === 'don-thuoc' && (
            <DoctorPrescriptions
              prescriptions={patientPrescriptions}
              onPrescriptionSaved={onPrescriptionSaved}
              onPrescriptionDeleted={onPrescriptionDeleted}
              patientId={patientProfile.id}
              patientName={patientProfile.name}
              currentUser={currentUser}
              onOpenEmergency={onOpenEmergency}
            />
          )}

          {/* 5. CHỨC NĂNG TỪ DROPDOWN: DỰ TOÁN CHI PHÍ KHÁM QUẢNG NGÃI */}
          {activeTab === 'chi-phi' && (
            <CostEstimator
              hospitals={hospitals}
              onGoToBooking={handleGoToBooking}
            />
          )}

          {/* 6. CHỨC NĂNG TỪ DROPDOWN: ĐẶT LỊCH & LẤY SỐ THỨ TỰ */}
          {activeTab === 'dat-lich' && (
            <AppointmentBooking
              hospitals={hospitals}
              doctors={doctors}
              appointments={appointments}
              onAppointmentCreated={onAppointmentCreated}
              onAppointmentCancelled={onAppointmentCancelled}
              patientId={patientProfile.id}
              currentUser={currentUser}
              defaultHospitalId={selectedHospitalForCost}
            />
          )}
        </motion.div>
      </AnimatePresence>

    </div>
  );
};
