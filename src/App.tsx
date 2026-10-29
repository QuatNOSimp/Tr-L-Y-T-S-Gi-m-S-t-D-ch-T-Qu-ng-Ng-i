import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { motion, AnimatePresence } from 'motion/react';
import { PatientDashboard } from './components/patient/PatientDashboard';
import { HospitalDashboard } from './components/hospital/HospitalDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { EmergencyModal } from './components/common/EmergencyModal';
import { ExcelImportModal } from './components/common/ExcelImportModal';
import { AuthModal } from './components/auth/AuthModal';
import { UserProfileModal } from './components/auth/UserProfileModal';
import { EmailInboxSimulatorModal } from './components/auth/EmailInboxSimulatorModal';
import { AppQrModal } from './components/common/AppQrModal';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { PWAInstallModal } from './components/common/PWAInstallModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { api } from './services/api';
import { 
  Disease, 
  HospitalInfo, 
  Doctor, 
  Appointment, 
  EpidemiologyCase, 
  EmergencyAlert, 
  PatientSymptomLog, 
  PrescriptionRecord,
  User as UserType 
} from './types';
import { 
  INITIAL_DISEASES, 
  QUANG_NGAI_HOSPITALS, 
  INITIAL_DOCTORS, 
  INITIAL_APPOINTMENTS, 
  INITIAL_EPIDEMIOLOGY_CASES, 
  INITIAL_PATIENT_LOGS, 
  INITIAL_PRESCRIPTIONS 
} from './data/initialData';
import { HeartPulse, PhoneCall, ShieldCheck, MapPin, Building2, CheckCircle2, UserCheck, Stethoscope, ArrowRight, Code, GraduationCap, Sparkles, Globe, Share2, QrCode, FileSpreadsheet, Smartphone, X } from 'lucide-react';
import { ThemeToggleButton } from './components/common/ThemeToggleButton';

export default function App() {
  const [isGuestBannerDismissed, setIsGuestBannerDismissed] = useState(() => {
    return sessionStorage.getItem('medassist_guest_banner_dismissed') === 'true';
  });
  // Current Authenticated User - null by default (secure Guest state, requiring authentication)
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Role-enforced view: Patient sees Patient interface; Doctor sees Hospital interface; Admin sees Admin portal
  const [currentView, setCurrentView] = useState<'patient' | 'hospital' | 'admin'>('patient');

  // Verify stored session token on application startup
  useEffect(() => {
    async function verifyInitialSession() {
      try {
        const sessionRes = await api.getCurrentUser();
        if (sessionRes?.authenticated && sessionRes.user) {
          setCurrentUser(sessionRes.user);
          if (sessionRes.user.role === 'admin' || sessionRes.user.role === 'hospital_admin') {
            setCurrentView('admin');
          } else if (sessionRes.user.role === 'doctor') {
            setCurrentView('hospital');
          } else {
            setCurrentView('patient');
          }
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        console.warn('Initial session validation error:', err);
        setCurrentUser(null);
      } finally {
        setIsAuthChecking(false);
      }
    }
    verifyInitialSession();
  }, []);

  // Enforce interface strictly based on user role whenever user changes
  useEffect(() => {
    if (currentUser?.role === 'admin' || currentUser?.role === 'hospital_admin') {
      setCurrentView('admin');
    } else if (currentUser?.role === 'doctor') {
      setCurrentView('hospital');
    } else if (currentUser?.role === 'patient') {
      setCurrentView('patient');
    }
  }, [currentUser?.role]);

  // Core application states initialized with rich datasets and persisted custom imports
  const [diseases, setDiseases] = useState<Disease[]>(() => {
    try {
      const saved = localStorage.getItem('medassist_custom_diseases');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading saved diseases from localStorage:', e);
    }
    return INITIAL_DISEASES;
  });
  const [hospitals, setHospitals] = useState<HospitalInfo[]>(QUANG_NGAI_HOSPITALS);
  const [doctors, setDoctors] = useState<Doctor[]>(INITIAL_DOCTORS);
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [epidemiologyCases, setEpidemiologyCases] = useState<EpidemiologyCase[]>(INITIAL_EPIDEMIOLOGY_CASES);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([
    {
      id: 'emg-1',
      patientName: 'Võ Minh Tuấn (Gia đình báo)',
      phoneNumber: '0905.123.456',
      lat: 15.1250,
      lng: 108.7990,
      addressApprox: 'Gần Chợ Cửa Lỗ, P. Lê Hồng Phong, TP. Quảng Ngãi',
      symptoms: ['Khó thở dữ dội', 'Đau thắt ngực lan ra vai trái', 'Vã mồ hôi hột'],
      reportedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      status: 'Đang xử lý',
      assignedHospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi'
    }
  ]);
  const [patientLogs, setPatientLogs] = useState<PatientSymptomLog[]>(INITIAL_PATIENT_LOGS);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>(INITIAL_PRESCRIPTIONS);

  // Modals
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authInitialRole, setAuthInitialRole] = useState<'patient' | 'doctor' | 'admin'>('patient');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync from backend if available
  useEffect(() => {
    async function loadBackendData() {
      try {
        const [disRes, hospRes, docRes, apptRes, epiRes, emgRes, logRes, rxRes] = await Promise.allSettled([
          api.getDiseases(),
          api.getHospitals(),
          api.getDoctors(),
          api.getAppointments(),
          api.getEpidemiology(),
          api.getEmergencyAlerts(),
          api.getPatientLogs('all'),
          api.getPrescriptions('all')
        ]);

        if (disRes.status === 'fulfilled' && disRes.value.data?.length > 0) {
          const backendData = disRes.value.data;
          setDiseases(prev => {
            // Chỉ cập nhật nếu backend có nhiều dữ liệu hơn state hiện tại
            if (prev.length >= backendData.length) {
              return prev;
            }
            return backendData;
          });
        }
        if (hospRes.status === 'fulfilled' && hospRes.value.length > 0) {
          setHospitals(hospRes.value);
        }
        if (docRes.status === 'fulfilled' && docRes.value.length > 0) {
          setDoctors(docRes.value);
        }
        if (apptRes.status === 'fulfilled' && apptRes.value.length > 0) {
          setAppointments(apptRes.value);
        }
        if (epiRes.status === 'fulfilled' && epiRes.value.cases?.length > 0) {
          setEpidemiologyCases(epiRes.value.cases);
        }
        if (emgRes.status === 'fulfilled' && emgRes.value.length > 0) {
          setEmergencyAlerts(emgRes.value);
        }
        if (logRes.status === 'fulfilled' && logRes.value.length > 0) {
          setPatientLogs(logRes.value);
        }
        if (rxRes.status === 'fulfilled' && rxRes.value.length > 0) {
          setPrescriptions(rxRes.value);
        }
      } catch (e) {
        console.warn('Backend sync fallback to initial data:', e);
      }
    }
    loadBackendData();
  }, []);

  const handleLogAdded = (newLog: PatientSymptomLog) => {
    setPatientLogs(prev => [newLog, ...prev]);
  };

  const handlePrescriptionSaved = (newRx: PrescriptionRecord) => {
    setPrescriptions(prev => [newRx, ...prev]);
  };

  const handlePrescriptionDeleted = (id: string) => {
    setPrescriptions(prev => prev.filter(p => p.id !== id));
  };

  const handleAppointmentCreated = (newAppt: Appointment) => {
    setAppointments(prev => [newAppt, ...prev]);
  };

  const handleAppointmentCancelled = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
    showToast('Đã hủy lịch khám thành công. Bạn có thể đặt lại lịch khám mới.');
  };

  const handleUpdateAppointment = (id: string, updates: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    api.updateAppointment(id, updates).catch(console.error);
  };

  const handleUpdateEmergency = (id: string, status: string) => {
    setEmergencyAlerts(prev => prev.map(e => e.id === id ? { ...e, status: status as any } : e));
    api.updateEmergencyAlert(id, status).catch(console.error);
  };

  const handleImportExcelSuccess = (count: number, newTotal: number, newDiseasesList?: Disease[], isReplace = false) => {
    if (newDiseasesList && newDiseasesList.length > 0) {
      let updated: Disease[] = [];
      if (isReplace) {
        updated = newDiseasesList;
      } else {
        setDiseases(prev => {
          const existingKeys = new Set(prev.map(d => String(d.icdCode || d.name || d.vietnameseName).toLowerCase()));
          const deduped = newDiseasesList.filter(d => !existingKeys.has(String(d.icdCode || d.name || d.vietnameseName).toLowerCase()));
          updated = [...deduped, ...prev];
          return updated;
        });
      }

      if (updated.length > 0) {
        try {
          localStorage.setItem('medassist_custom_diseases', JSON.stringify(updated));
        } catch (e) {
          console.warn('LocalStorage quota:', e);
        }
      }
    }
    showToast(`Đã nạp thành công ${count.toLocaleString('vi-VN')} bệnh vào hệ thống (Tổng: ${newTotal.toLocaleString('vi-VN')} bệnh)!`);
  };

  // Auth Handlers - Enforce strict role-based separation
  const handleAuthSuccess = (user: UserType) => {
    setCurrentUser(user);
    if (user.role === 'admin' || user.role === 'hospital_admin') {
      setCurrentView('admin');
      showToast(`Chào mừng Quản trị viên ${user.fullName} đến với Cổng Quản Trị Hệ Thống!`);
    } else if (user.role === 'doctor') {
      setCurrentView('hospital');
      showToast(`Chào mừng Bác sĩ ${user.fullName} đến với Cổng Bệnh Viện & Kíp Trực!`);
    } else {
      setCurrentView('patient');
      showToast(`Chào mừng ${user.fullName}! Đã mở Cổng Quản Lý Sức Khỏe Bệnh Nhân.`);
    }
  };

  // Prompt user to authenticate properly with credentials for target role
  const handleRequestRoleLogin = (targetRole: 'patient' | 'doctor' | 'admin') => {
    setAuthMode('login');
    setAuthInitialRole(targetRole);
    setIsAuthOpen(true);
  };

  // Secure Role View Navigation Check
  const handleViewChange = (view: 'patient' | 'hospital' | 'admin') => {
    if (view === 'admin') {
      if (currentUser?.role !== 'admin' && currentUser?.role !== 'hospital_admin') {
        showToast('Khu vực Quản trị yêu cầu đăng nhập tài khoản Quản Trị Viên!');
        setAuthMode('login');
        setAuthInitialRole('admin');
        setIsAuthOpen(true);
        return;
      }
    } else if (view === 'hospital') {
      if (currentUser?.role !== 'doctor' && currentUser?.role !== 'admin') {
        showToast('Cổng Bệnh viện yêu cầu đăng nhập tài khoản Bác sĩ!');
        setAuthMode('login');
        setAuthInitialRole('doctor');
        setIsAuthOpen(true);
        return;
      }
    }
    setCurrentView(view);
  };

  // Secure logout: Invalidate server session, clear client tokens, reset to safe guest state
  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout server error:', e);
    }
    setCurrentUser(null);
    setCurrentView('patient');
    setIsProfileOpen(false);
    showToast('Đã đăng xuất tài khoản an toàn. Toàn bộ phiên làm việc bảo mật đã được thu hồi.');
  };

  const handleAddEpidemiologyCase = (newCaseData: Omit<EpidemiologyCase, 'id'>) => {
    const newCase: EpidemiologyCase = {
      ...newCaseData,
      id: `epi-${Date.now()}`
    };
    setEpidemiologyCases(prev => [newCase, ...prev]);
    showToast(`Đã ghi nhận ca bệnh mới tại ${newCase.ward ? newCase.ward + ', ' : ''}${newCase.district}. Bản đồ Leaflet đã tự động cập nhật khoanh vùng!`);
  };

  const handleUpdateEpidemiologyCase = (caseId: string, newStatus: EpidemiologyCase['status']) => {
    setEpidemiologyCases(prev => prev.map(c => c.id === caseId ? { ...c, status: newStatus } : c));
    showToast('Đã cập nhật trạng thái hồ sơ ca bệnh dịch tễ!');
  };

  const activeEmergencyCount = emergencyAlerts.filter(e => e.status !== 'Đã tiếp nhận viện').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 dark:bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm border border-slate-700 dark:border-slate-600 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onViewChange={handleViewChange}
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        onOpenExcelImport={currentUser?.role === 'admin' ? () => setIsExcelImportOpen(true) : undefined}
        onOpenQrCode={() => setIsQrModalOpen(true)}
        emergencyCount={activeEmergencyCount}
        totalDiseases={diseases.length}
        currentUser={currentUser}
        onOpenAuth={(mode = 'login', role = 'patient') => {
          setAuthMode(mode);
          setAuthInitialRole(role as any);
          setIsAuthOpen(true);
        }}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenInbox={() => setIsInboxOpen(true)}
        onQuickSwitchRole={handleRequestRoleLogin}
        onLogout={handleLogout}
      />

      {/* Unauthenticated Guest Banner (Sleek, Compact & Dismissible) */}
      {!currentUser && !isGuestBannerDismissed && (
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 text-white px-3 sm:px-4 py-1.5 text-xs border-b border-emerald-800/40 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              <span className="truncate text-xs text-emerald-100">
                Chế độ khách: Hãy <strong>Đăng nhập</strong> theo đúng vai trò để mở các tính năng chuyên biệt.
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-xs">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthInitialRole('patient');
                  setIsAuthOpen(true);
                }}
                className="px-2.5 py-0.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-lg font-bold text-[11px] cursor-pointer transition-colors shadow-2xs"
              >
                Người Bệnh
              </button>
              <button
                onClick={() => {
                  setAuthMode('login');
                  setAuthInitialRole('doctor');
                  setIsAuthOpen(true);
                }}
                className="px-2.5 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-[11px] border border-white/25 cursor-pointer transition-colors hidden sm:inline-block"
              >
                Bác Sĩ
              </button>
              <button
                onClick={() => handleRequestRoleLogin('admin')}
                className="px-2.5 py-0.5 bg-purple-900/60 hover:bg-purple-900 text-purple-200 hover:text-white rounded-lg font-bold text-[11px] border border-purple-400/30 cursor-pointer transition-colors hidden md:inline-block"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsGuestBannerDismissed(true);
                  sessionStorage.setItem('medassist_guest_banner_dismissed', 'true');
                }}
                className="ml-1 text-white/70 hover:text-white hover:bg-white/15 rounded-md p-0.5 cursor-pointer transition-colors"
                title="Thu gọn / Đóng thanh này"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area: Strictly isolated based on currentView with Lively Transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: [0.25, 1, 0.5, 1] }}
          >
            {currentView === 'admin' ? (
              <AdminDashboard
                diseases={diseases}
                hospitals={hospitals}
                doctors={doctors}
                emergencyAlerts={emergencyAlerts}
                epidemiologyCases={epidemiologyCases}
                currentUser={currentUser}
                onOpenExcelImport={() => setIsExcelImportOpen(true)}
                onOpenAuthModal={(mode, role) => {
                  setAuthMode(mode);
                  setAuthInitialRole(role || 'admin');
                  setIsAuthOpen(true);
                }}
              />
            ) : currentView === 'patient' ? (
              <PatientDashboard
                diseases={diseases}
                hospitals={hospitals}
                doctors={doctors}
                appointments={appointments}
                patientLogs={patientLogs}
                prescriptions={prescriptions}
                currentUser={currentUser}
                onOpenProfile={() => setIsProfileOpen(true)}
                onOpenAuth={(mode = 'login') => {
                  setAuthMode(mode);
                  setAuthInitialRole('patient');
                  setIsAuthOpen(true);
                }}
                onLogAdded={handleLogAdded}
                onPrescriptionSaved={handlePrescriptionSaved}
                onPrescriptionDeleted={handlePrescriptionDeleted}
                onAppointmentCreated={handleAppointmentCreated}
                onAppointmentCancelled={handleAppointmentCancelled}
                onOpenEmergency={() => setIsEmergencyOpen(true)}
                onOpenQrCode={() => setIsQrModalOpen(true)}
              />
            ) : (
              <HospitalDashboard
                appointments={appointments}
                doctors={doctors}
                epidemiologyCases={epidemiologyCases}
                emergencyAlerts={emergencyAlerts}
                patientLogs={patientLogs}
                prescriptions={prescriptions}
                diseases={diseases}
                hospitals={hospitals}
                currentUser={currentUser}
                onOpenAuthModal={(mode, role) => {
                  setAuthMode(mode);
                  setAuthInitialRole(role || 'doctor');
                  setIsAuthOpen(true);
                }}
                onUpdateAppointment={handleUpdateAppointment}
                onUpdateEmergency={handleUpdateEmergency}
                onAddEpidemiologyCase={handleAddEpidemiologyCase}
                onUpdateEpidemiologyCase={handleUpdateEpidemiologyCase}
                onPrescriptionSaved={handlePrescriptionSaved}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer & Thông Tin Tác Giả / Quản Trị Viên */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-12 py-8 text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">MedAssist Quảng Ngãi</span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="text-slate-600 dark:text-slate-400">Nền tảng Y tế Số & Cảnh báo Dịch tễ</span>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3 text-slate-500 dark:text-slate-400 flex-wrap justify-center sm:justify-end">
              <ThemeToggleButton showLabel={true} />
              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="Cài đặt MedAssist thành ứng dụng trên điện thoại"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-100" />
                <span>Cài Đặt App Điện Thoại</span>
              </button>
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                title="Mã QR giới thiệu và chia sẻ ứng dụng"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Mã QR Giới Thiệu App</span>
              </button>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setIsExcelImportOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/70 hover:bg-teal-100 dark:hover:bg-teal-900/70 text-teal-800 dark:text-teal-300 text-xs font-bold border border-teal-200 dark:border-teal-800 transition-colors cursor-pointer"
                  title="Quản trị viên nạp dữ liệu danh mục bệnh từ file Excel (.xlsx, .xls, .csv)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Nạp Dữ Liệu Excel</span>
                </button>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> TP. Quảng Ngãi
              </span>
              <span>•</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                Cấp cứu: 115
              </span>
            </div>
          </div>

          {/* Khối Thông Tin Tác Giả & Quản Trị Trang Web Theo Yêu Cầu */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-slate-50 via-emerald-50/30 to-teal-50/30 dark:from-slate-800/60 dark:via-emerald-950/20 dark:to-teal-950/20 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-600/20">
                LH
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-slate-900 dark:text-white text-sm sm:text-base">Lê Vũ Nguyên Hiền</span>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                    <Code className="w-3 h-3" /> Lập trình viên
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[11px] font-bold border border-teal-200 dark:border-teal-800">
                    <ShieldCheck className="w-3 h-3" /> Admin trang web
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-xs mt-1 flex items-center gap-1.5 font-medium">
                  <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-indigo-950 dark:text-indigo-300 font-bold">Trường THPT Chuyên Lê Khiết</span>
                  <span className="text-slate-400 dark:text-slate-500">• Tỉnh Quảng Ngãi</span>
                </div>
              </div>
            </div>

            {/* Dòng chữ chuẩn xác theo yêu cầu: Lê Vũ Nguyên Hiền_Lập trình viên_Admin trang web_Trường THPT Chuyên Lê Khiết */}
            <div className="text-center md:text-right shrink-0">
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 shadow-xs text-slate-800 dark:text-slate-200 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-mono text-emerald-950 dark:text-emerald-300 font-bold select-all">
                  Lê Vũ Nguyên Hiền_Lập trình viên_Admin trang web_Trường THPT Chuyên Lê Khiết
                </span>
              </div>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-400 dark:text-slate-500">
            © 2026 MedAssist Quảng Ngãi. Bản quyền thuộc về tác giả & nhà phát triển dự án Lê Vũ Nguyên Hiền - THPT Chuyên Lê Khiết.
          </div>
        </div>
      </footer>

      {/* Shared Modals */}
      <EmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        hospitals={hospitals}
        patientName={currentUser?.fullName || 'Người bệnh tại Quảng Ngãi'}
        phoneNumber={currentUser?.phone || '0913.845.921'}
      />

      {currentUser?.role === 'admin' && (
        <ExcelImportModal
          isOpen={isExcelImportOpen}
          onClose={() => setIsExcelImportOpen(false)}
          onImportSuccess={handleImportExcelSuccess}
          currentTotalDiseases={diseases.length}
        />
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authMode}
        initialRole={authInitialRole}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onUpdateUser={(updatedUser: UserType) => {
          setCurrentUser(updatedUser);
          showToast('Đã lưu thành công hồ sơ cá nhân!');
        }}
        onLogout={handleLogout}
        onOpenInbox={() => setIsInboxOpen(true)}
      />

      <EmailInboxSimulatorModal
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
        onApplyOtp={(otp: string) => {
          showToast(`Đã sao chép mã xác thực: ${otp}`);
          setIsInboxOpen(false);
          setIsAuthOpen(true);
        }}
      />

      <AppQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* PWA Mobile App Install Guided Modal */}
      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Offline Connectivity Notification Banner */}
      <OfflineIndicator />

      {/* Mobile Smartphone Bottom Navigation Bar (Hiển thị cố định đáy màn hình trên điện thoại) */}
      <MobileBottomNav
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        onOpenQrCode={() => setIsQrModalOpen(true)}
        currentUser={currentUser}
      />

    </div>
  );
}
