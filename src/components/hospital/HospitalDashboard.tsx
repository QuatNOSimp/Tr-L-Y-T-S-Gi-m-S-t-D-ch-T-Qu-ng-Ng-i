import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Clock, 
  Ticket, 
  ShieldAlert, 
  MapPin, 
  Activity, 
  Stethoscope, 
  FileText, 
  PhoneCall, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  Calendar, 
  UserCheck, 
  Eye, 
  ArrowRight,
  Siren,
  Plus,
  Pill,
  Sparkles,
  RefreshCw,
  Check
} from 'lucide-react';
import { 
  Appointment, 
  Doctor, 
  EpidemiologyCase, 
  EmergencyAlert, 
  PatientSymptomLog, 
  PrescriptionRecord, 
  PrescriptionMedicine,
  Disease,
  HospitalInfo,
  User as UserType
} from '../../types';
import { api } from '../../services/api';
import { HospitalCoverSlider } from '../common/HospitalCoverSlider';
import { EpidemiologyMap } from './EpidemiologyMap';

interface HospitalDashboardProps {
  appointments: Appointment[];
  doctors: Doctor[];
  epidemiologyCases: EpidemiologyCase[];
  emergencyAlerts: EmergencyAlert[];
  patientLogs: PatientSymptomLog[];
  prescriptions: PrescriptionRecord[];
  diseases: Disease[];
  hospitals: HospitalInfo[];
  currentUser?: UserType | null;
  onOpenAuthModal?: (mode: 'login' | 'register', role?: 'patient' | 'doctor' | 'admin') => void;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => void;
  onUpdateEmergency: (id: string, status: string) => void;
  onAddEpidemiologyCase?: (newCase: Omit<EpidemiologyCase, 'id'>) => void;
  onUpdateEpidemiologyCase?: (caseId: string, status: EpidemiologyCase['status']) => void;
  onPrescriptionSaved?: (rx: PrescriptionRecord) => void;
}

export const HospitalDashboard: React.FC<HospitalDashboardProps> = ({
  appointments,
  doctors,
  epidemiologyCases,
  emergencyAlerts,
  patientLogs,
  prescriptions,
  diseases,
  hospitals,
  currentUser,
  onOpenAuthModal,
  onUpdateAppointment,
  onUpdateEmergency,
  onAddEpidemiologyCase,
  onUpdateEpidemiologyCase,
  onPrescriptionSaved
}) => {
  // RBAC Access Control Gate
  if (!currentUser || (currentUser.role !== 'doctor' && currentUser.role !== 'admin' && currentUser.role !== 'hospital_admin')) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-blue-200 dark:border-blue-900/60 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 mx-auto flex items-center justify-center mb-4 border border-blue-200 dark:border-blue-800">
          <Stethoscope className="w-8 h-8" />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mb-3">
          Cổng Nghiệp Vụ Y Tế & Kíp Trực
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
          Cổng Bác Sĩ & Điều Phối Kíp Trực Được Bảo Mật
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed max-w-lg mx-auto">
          Khu vực nghiệp vụ dành cho Bác sĩ, Nhân viên y tế và Ban điều phối các Bệnh viện tỉnh Quảng Ngãi. Dữ liệu bao gồm lịch khám bệnh nhân, ca cấp cứu 115 và điều phối dịch tễ.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onOpenAuthModal ? onOpenAuthModal('login', 'doctor') : null}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Stethoscope className="w-4 h-4" />
            <span>Đăng Nhập Tài Khoản Bác Sĩ</span>
          </button>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'hang-doi' | 'dich-te' | 'bac-si' | 'kho-benh'>('dich-te');
  const [selectedPatientForModal, setSelectedPatientForModal] = useState<Appointment | null>(null);
  const [filterHospital, setFilterHospital] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');

  // Doctor Clinical Prescription Workflow States
  const [docDiagnosis, setDocDiagnosis] = useState('');
  const [docIcd, setDocIcd] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docContraindications, setDocContraindications] = useState('');
  const [docDietaryAdvice, setDocDietaryAdvice] = useState('');
  const [docMedicines, setDocMedicines] = useState<PrescriptionMedicine[]>([]);
  const [docReExamDays, setDocReExamDays] = useState(3);
  const [isAiPrescribing, setIsAiPrescribing] = useState(false);
  const [prescriptionSuccessToast, setPrescriptionSuccessToast] = useState('');
  const [prescriptionError, setPrescriptionError] = useState('');

  const handleOpenPatientModal = (appt: Appointment) => {
    setSelectedPatientForModal(appt);
    const symLower = (appt.symptoms || '').toLowerCase();
    let initialDiag = 'Khám & Theo dõi lâm sàng ngoại trú';
    let initialIcd = '';
    if (symLower.includes('sốt') || symLower.includes('dengue')) {
      initialDiag = 'Sốt xuất huyết Dengue có dấu hiệu cảnh báo';
      initialIcd = 'A97.1';
    } else if (symLower.includes('ho') || symLower.includes('phổi') || symLower.includes('thở')) {
      initialDiag = 'Viêm phế quản cấp bội nhiễm';
      initialIcd = 'J20.9';
    } else if (symLower.includes('áp') || symLower.includes('tim')) {
      initialDiag = 'Tăng huyết áp nguyên phát độ 2';
      initialIcd = 'I10';
    }
    setDocDiagnosis(initialDiag);
    setDocIcd(initialIcd);
    setDocNotes(`Khám tại Khoa ${appt.department}. Triệu chứng khai báo: ${appt.symptoms || 'Chưa rõ'}`);
    setDocMedicines([]);
    setDocContraindications('');
    setDocDietaryAdvice('');
    setPrescriptionSuccessToast('');
    setPrescriptionError('');
  };

  const handleAiPrescribeForPatient = async () => {
    if (!docDiagnosis.trim()) {
      setPrescriptionError('Vui lòng nhập chẩn đoán lâm sàng của bác sĩ.');
      return;
    }
    setIsAiPrescribing(true);
    setPrescriptionError('');
    try {
      const res = await api.generatePrescriptionFromDiagnosis({
        diagnosis: docDiagnosis,
        icdCode: docIcd,
        patientName: selectedPatientForModal?.patientName || 'Bệnh nhân',
        symptoms: selectedPatientForModal?.symptoms ? [selectedPatientForModal.symptoms] : [],
        hospitalName: selectedPatientForModal?.hospitalName || 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi',
        doctorName: currentUser?.fullName || 'BS.CKII Nguyễn Văn Dũng',
        doctorTitle: currentUser?.position || 'Bác sĩ điều trị',
        clinicalNotes: docNotes
      });

      if (res.medicines && Array.isArray(res.medicines)) {
        setDocMedicines(res.medicines);
      }
      if (res.contraindications) setDocContraindications(res.contraindications);
      if (res.dietaryAdvice) setDocDietaryAdvice(res.dietaryAdvice);
      if (res.reExaminationDays) setDocReExamDays(res.reExaminationDays);
      setPrescriptionSuccessToast('AI Gemini đã đối chiếu phác đồ Bộ Y Tế & gợi ý danh mục thuốc thành công!');
      setTimeout(() => setPrescriptionSuccessToast(''), 3500);
    } catch (err: any) {
      setPrescriptionError('Lỗi AI hỗ trợ: ' + (err.message || 'Không thể tạo gợi ý'));
    } finally {
      setIsAiPrescribing(false);
    }
  };

  const handleSignAndSendPrescription = async () => {
    if (!selectedPatientForModal) return;
    if (!docDiagnosis.trim() || docMedicines.length === 0) {
      setPrescriptionError('Vui lòng nhập chẩn đoán và có ít nhất 1 loại thuốc trước khi ký gửi.');
      return;
    }

    try {
      const newRx = await api.savePrescription(selectedPatientForModal.patientId, {
        title: `Đơn thuốc điều trị: ${docDiagnosis}`,
        hospitalName: selectedPatientForModal.hospitalName,
        doctorName: currentUser?.fullName || 'BS.CKII Nguyễn Văn Dũng',
        doctorTitle: currentUser?.position || 'Bác sĩ điều trị',
        prescribedDate: new Date().toISOString().split('T')[0],
        diagnosis: docDiagnosis,
        icdCode: docIcd,
        clinicalNotes: docNotes,
        contraindications: docContraindications,
        dietaryAdvice: docDietaryAdvice,
        reExaminationDate: new Date(Date.now() + docReExamDays * 24 * 3600 * 1000).toISOString().split('T')[0],
        medicines: docMedicines,
        status: 'Đang dùng',
        aiAssisted: true,
        notes: `Kíp bác sĩ ${currentUser?.fullName || 'điều trị'} đã ký duyệt và chuyển đến người bệnh.`
      });

      if (onPrescriptionSaved) {
        onPrescriptionSaved(newRx);
      }

      onUpdateAppointment(selectedPatientForModal.id, { status: 'Đã hoàn thành' });
      setPrescriptionSuccessToast(`Đã ký đơn thuốc thành công và chuyển thẳng sang Hồ sơ Bệnh nhân #${selectedPatientForModal.queueNumber}!`);
      setTimeout(() => {
        setPrescriptionSuccessToast('');
      }, 4000);
    } catch (err: any) {
      setPrescriptionError('Lỗi lưu đơn thuốc: ' + err.message);
    }
  };

  // Active emergencies
  const activeEmergencies = emergencyAlerts.filter(e => e.status !== 'Đã tiếp nhận viện');

  // Filter appointments
  const filteredAppointments = appointments.filter(a => {
    const matchHosp = filterHospital === 'all' || a.hospitalId === filterHospital;
    const matchDept = filterDepartment === 'all' || a.department === filterDepartment;
    return matchHosp && matchDept;
  });

  // Current queue numbers
  const currentServing = filteredAppointments.find(a => a.status === 'Đang khám') || filteredAppointments[0];
  const nextInLine = filteredAppointments.find(a => a.status === 'Chờ khám');

  // Districts stats in Quảng Ngãi
  const districts = [
    { name: 'TP. Quảng Ngãi', status: 'Vùng Đỏ', cases: 28, alert: 'Ổ dịch sốt xuất huyết bùng phát P. Nghĩa Chánh, Quảng Phú' },
    { name: 'Huyện Bình Sơn', status: 'Vùng Cam', cases: 14, alert: 'Ghi nhận cụm ca Tay chân miệng tại TT. Châu Ổ' },
    { name: 'Huyện Sơn Tịnh', status: 'Vùng Vàng', cases: 8, alert: 'Cúm mùa và sốt phát ban rải rác Tịnh Hà' },
    { name: 'Huyện Tư Nghĩa', status: 'Vùng Xanh', cases: 4, alert: 'Tình hình ổn định, tiếp tục giám sát muỗi vằn' },
    { name: 'Thị xã Đức Phổ', status: 'Vùng Đỏ', cases: 19, alert: 'Gia tăng ca sốt Dengue tại Phổ Thạnh' },
    { name: 'Huyện Mộ Đức', status: 'Vùng Xanh', cases: 3, alert: 'Kiểm soát tốt' },
    { name: 'Huyện Nghĩa Hành', status: 'Vùng Vàng', cases: 5, alert: 'Theo dõi ca sốt nghi nhiễm' },
    { name: 'Huyện Trà Bồng', status: 'Vùng Xanh', cases: 2, alert: 'An toàn' },
    { name: 'Huyện Ba Tơ', status: 'Vùng Xanh', cases: 1, alert: 'An toàn' },
    { name: 'Huyện Lý Sơn', status: 'Vùng Xanh', cases: 0, alert: 'Không có ca lây nhiễm' }
  ];

  const handleAdvanceStatus = async (appt: Appointment) => {
    let nextStatus: Appointment['status'] = 'Đang khám';
    if (appt.status === 'Chờ khám') nextStatus = 'Đang khám';
    else if (appt.status === 'Đang khám') nextStatus = 'Đã hoàn thành';

    onUpdateAppointment(appt.id, { status: nextStatus });
  };

  return (
    <div className="space-y-6">
      
      {/* Emergency Alert Banner (Red Alert for Hospital Operators) */}
      {activeEmergencies.length > 0 && (
        <div className="bg-rose-600 text-white rounded-2xl p-4 sm:p-5 shadow-xl animate-pulse space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl animate-bounce">
                <Siren className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                  BÁO ĐỘNG ĐỎ CẤP CỨU 115 TRỰC TIẾP
                </span>
                <h3 className="text-base sm:text-lg font-black mt-0.5">
                  Có {activeEmergencies.length} Ca Cấp Cứu Mới Phát Tín Hiệu Từ Người Bệnh!
                </h3>
              </div>
            </div>
            <span className="text-xs bg-white text-rose-700 font-extrabold px-3 py-1.5 rounded-xl shadow-xs">
              Kíp trực Cấp Cứu cần điều phối xe ngay
            </span>
          </div>

          <div className="divide-y divide-white/20 bg-rose-700/60 rounded-xl p-3">
            {activeEmergencies.map((emg) => (
              <div key={emg.id} className="py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-bold text-sm">
                    {emg.patientName} - SĐT: {emg.phoneNumber}
                  </p>
                  <p className="text-rose-100 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{emg.addressApprox} (Tọa độ: {emg.lat.toFixed(4)}, {emg.lng.toFixed(4)})</span>
                  </p>
                  <p className="text-white font-medium mt-0.5">
                    Triệu chứng nguy kịch: <strong>{emg.symptoms.join(', ')}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${emg.phoneNumber}`}
                    className="px-3 py-1.5 bg-white text-rose-700 hover:bg-rose-50 font-bold rounded-lg shadow-xs"
                  >
                    Gọi Người Bệnh
                  </a>
                  <button
                    onClick={() => onUpdateEmergency(emg.id, 'Đã tiếp nhận viện')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                  >
                    Xác Nhận Đã Tiếp Nhận
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🏥 Trang Bìa Slider Toàn Cảnh Các Bệnh Viện Tỉnh Quảng Ngãi (Hospital Cover Slider) */}
      <HospitalCoverSlider onOpenEmergency={() => {}} />

      {/* Hospital Portal Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Trung Tâm Quản Trị Y Tế & Dịch Tễ
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Dành cho Bệnh viện & Bác sĩ</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            Bảng Điều Phối Khám Bệnh & Giám Sát Dịch Tễ Tỉnh Quảng Ngãi
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mt-0.5">
            Quản lý số thứ tự (STT) khám, xem chi tiết sổ nhật ký triệu chứng từng ngày giờ của người bệnh, xem ảnh đơn thuốc cũ scan và theo dõi khoanh vùng dịch bệnh tại Quảng Ngãi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Dữ liệu lâm sàng ({diseases.length.toLocaleString('vi-VN')} bệnh)</span>
          </span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex overflow-x-auto gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('hang-doi')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'hang-doi'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>1. Hàng Đợi Bệnh Nhân & STT Khám ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('dich-te')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'dich-te'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>2. Trung Tâm Giám Sát Dịch Tễ Quảng Ngãi</span>
        </button>

        <button
          onClick={() => setActiveTab('bac-si')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'bac-si'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>3. Đội Ngũ Bác Sĩ & Lịch Trực ({doctors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('kho-benh')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === 'kho-benh'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>4. Tra Cứu Kho Bệnh Học ({diseases.length.toLocaleString('vi-VN')} Bệnh)</span>
        </button>
      </div>

      {/* TAB 1: Queue & Patients STT */}
      {activeTab === 'hang-doi' && (
        <div className="space-y-6">
          
          {/* Live Queue Display Board */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-lg shadow-emerald-700/10">
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-200 block">
                ĐANG KHÁM HIỆN TẠI
              </span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-4xl font-black font-mono">
                  {currentServing ? `#${currentServing.queueNumber}` : 'Trống'}
                </span>
                <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-semibold">
                  {currentServing ? currentServing.department : 'Sẵn sàng'}
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-2 font-medium">
                {currentServing ? `Bệnh nhân: ${currentServing.patientName}` : 'Chưa có lượt khám'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-cyan-700 text-white p-5 rounded-2xl shadow-lg shadow-blue-700/10">
              <span className="text-xs uppercase font-extrabold tracking-wider text-cyan-200 block">
                SỐ THỨ TỰ TIẾP THEO
              </span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-4xl font-black font-mono">
                  {nextInLine ? `#${nextInLine.queueNumber}` : 'Hết lượt'}
                </span>
                <span className="px-2.5 py-1 bg-white/20 rounded-lg text-xs font-semibold">
                  Mời chuẩn bị
                </span>
              </div>
              <p className="text-xs text-cyan-100 mt-2 font-medium">
                {nextInLine ? `Bệnh nhân: ${nextInLine.patientName}` : 'Không còn ai chờ'}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex flex-col justify-between transition-colors duration-200">
              <div>
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Tổng lượt đăng ký hôm nay
                </span>
                <p className="text-3xl font-black text-slate-900 dark:text-white font-mono mt-1">
                  {filteredAppointments.length} bệnh nhân
                </p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bao gồm lịch hẹn đặt qua web & tiếp đón tại sảnh
              </p>
            </div>
          </div>

          {/* Appointments Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Danh Sách Bệnh Nhân Chờ Khám & Chỉ Định Khoa
              </h3>

              <div className="flex flex-wrap gap-2 text-xs">
                <select
                  value={filterHospital}
                  onChange={(e) => setFilterHospital(e.target.value)}
                  className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">Tất cả bệnh viện</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">STT</th>
                    <th className="px-4 py-3 text-left">Người bệnh & SĐT</th>
                    <th className="px-4 py-3 text-left">Khoa chỉ định & Bác sĩ</th>
                    <th className="px-4 py-3 text-left">Triệu chứng khai báo</th>
                    <th className="px-4 py-3 text-left">Giờ hẹn</th>
                    <th className="px-4 py-3 text-left">Trạng thái</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredAppointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-black text-sm text-blue-700 dark:text-blue-400">
                        #{appt.queueNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 dark:text-white">{appt.patientName}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">{appt.phoneNumber}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{appt.department}</p>
                        <p className="text-emerald-700 dark:text-emerald-400 text-[11px]">{appt.doctorName || 'Bác sĩ trực ban'}</p>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-600 dark:text-slate-400">
                        {appt.symptoms || 'Chưa cung cấp'}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                        {appt.appointmentTime} ({appt.appointmentDate})
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          appt.status === 'Đang khám' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 animate-pulse' :
                          appt.status === 'Chờ khám' ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {appt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenPatientModal(appt)}
                            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/80 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
                            title="Mở hồ sơ lâm sàng, chẩn đoán và kê đơn thuốc cho người bệnh"
                          >
                            <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                            <span>Khám &amp; Kê Đơn</span>
                          </button>

                          <button
                            onClick={() => handleAdvanceStatus(appt)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                          >
                            {appt.status === 'Chờ khám' ? 'Vào Khám' : appt.status === 'Đang khám' ? 'Hoàn Thành' : 'Đã xong'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Epidemiology Monitoring (Quảng Ngãi Government & Health Center) */}
      {activeTab === 'dich-te' && (
        <div className="space-y-6">
          {/* Real Interactive Leaflet GIS Map with Auto Clustering and Zone Outlines */}
          <EpidemiologyMap
            epidemiologyCases={epidemiologyCases}
            hospitals={hospitals}
            onAddCase={onAddEpidemiologyCase}
            onUpdateCaseStatus={onUpdateEpidemiologyCase}
          />

          {/* District Epidemiological Situation Matrix */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>Tổng Hợp Tình Hình Dịch Bệnh Toàn Tỉnh Theo Đơn Vị Hành Chính (10 Huyện / Thị Xã / TP)</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Dữ liệu đồng bộ trực tiếp từ các Trung tâm Y tế huyện và Bệnh viện Đa khoa tuyến cơ sở
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg font-bold">
                  2 Ổ Dịch Đỏ
                </span>
                <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg font-bold">
                  2 Vùng Nguy Cơ
                </span>
              </div>
            </div>

            {/* Geographic Heatmap Summary Grid of Quảng Ngãi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {districts.map((dist) => (
                <div
                  key={dist.name}
                  className={`p-3.5 rounded-xl border transition-all space-y-1.5 text-xs ${
                    dist.status === 'Vùng Đỏ'
                      ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 ring-2 ring-rose-500/20'
                      : dist.status === 'Vùng Cam'
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                      : dist.status === 'Vùng Vàng'
                      ? 'bg-yellow-50/60 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-800'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      {dist.name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      dist.status === 'Vùng Đỏ' ? 'bg-rose-600 text-white' :
                      dist.status === 'Vùng Cam' ? 'bg-amber-600 text-white' :
                      dist.status === 'Vùng Vàng' ? 'bg-yellow-600 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      {dist.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 pt-1">
                    <span>Số ca ghi nhận:</span>
                    <strong className="text-slate-900 dark:text-white font-mono text-sm">{dist.cases} ca</strong>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    {dist.alert}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Doctors Directory & Roster */}
      {activeTab === 'bac-si' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                  <span>Danh Sách Bác Sĩ, Chuyên Khoa, Chức Vụ & Lịch Trực Ban</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Công khai lịch trực ca sáng (07:00 - 11:30), chiều (13:30 - 17:00) và đêm (17:00 - 07:00)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((doc) => (
                <div key={doc.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-3 text-xs transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                        BS
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{doc.name}</h4>
                        <p className="text-blue-700 dark:text-blue-400 font-semibold">{doc.position}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">{doc.specialty} • {doc.experienceYears} năm kinh nghiệm</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="font-bold text-slate-700 dark:text-slate-200 text-[11px] uppercase tracking-wider block">
                      Lịch trực ban trong tuần:
                    </span>
                    {doc.dutySchedule.map((sched, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{sched.dayOfWeek}</span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono">
                          {sched.shift}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">{sched.room}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                    Công tác tại: <strong className="text-slate-700 dark:text-slate-300">{doc.hospitalName}</strong>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Disease Database Explorer & Excel Management */}
      {activeTab === 'kho-benh' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>Kho Dữ Liệu Bệnh Học Chuẩn Hóa (&gt;100.000 Bệnh)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cơ sở dữ liệu bệnh học dùng để đối chiếu triệu chứng cho người bệnh và AI
                </p>
              </div>

              <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Quyền nạp file Excel &amp; cập nhật danh mục thuộc Admin</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Tổng số bệnh trong hệ thống</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-0.5">
                  {diseases.length.toLocaleString('vi-VN')}
                </p>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/40 text-center">
                <span className="text-[11px] text-rose-700 dark:text-rose-400">Bệnh có tính lây nhiễm</span>
                <p className="text-2xl font-black text-rose-800 dark:text-rose-300 font-mono mt-0.5">
                  {diseases.filter(d => d.isContagious).length.toLocaleString('vi-VN')}
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/40 text-center">
                <span className="text-[11px] text-blue-700 dark:text-blue-400">Trạng thái đồng bộ</span>
                <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mt-1">
                  Sẵn sàng nhận my_data (1).xlsx
                </p>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Tên bệnh</th>
                    <th className="px-3 py-2 text-left">Mã ICD</th>
                    <th className="px-3 py-2 text-left">Triệu chứng chính</th>
                    <th className="px-3 py-2 text-left">Mức độ</th>
                    <th className="px-3 py-2 text-left">Lây truyền</th>
                    <th className="px-3 py-2 text-left">Khoa phụ trách</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {diseases.slice(0, 100).map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/60">
                      <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{d.vietnameseName}</span>
                          {d.diseaseGroup && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {d.diseaseGroup}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal italic">{d.name}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{d.icdCode || 'N/A'}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300 max-w-xs truncate">{(Array.isArray(d.symptoms) ? d.symptoms : []).join(', ')}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.severity === 'Khẩn cấp' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800' :
                          d.severity === 'Nguy hiểm' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800' : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                        }`}>
                          {d.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {d.isContagious ? (
                          <span className="text-rose-600 dark:text-rose-400">Có lây</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Không</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{d.recommendedDepartment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {diseases.length > 100 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-right">
                Đang hiển thị 100 / {diseases.length.toLocaleString('vi-VN')} bệnh trong hệ thống
              </p>
            )}
          </div>
        </div>
      )}

      {/* Patient Clinical Records Modal for Hospital Staff */}
      {selectedPatientForModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                  HỒ SƠ LÂM SÀNG BỆNH NHÂN - SỐ THỨ TỰ #{selectedPatientForModal.queueNumber}
                </span>
                <h3 className="text-lg font-black">{selectedPatientForModal.patientName}</h3>
                <p className="text-xs text-blue-100">
                  SĐT: {selectedPatientForModal.phoneNumber} • Khoa: {selectedPatientForModal.department}
                </p>
              </div>
              <button
                onClick={() => setSelectedPatientForModal(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
              
              {/* Doctor Status Banner & Notifications */}
              {prescriptionSuccessToast && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{prescriptionSuccessToast}</span>
                </div>
              )}

              {prescriptionError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-900 dark:text-rose-200 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{prescriptionError}</span>
                </div>
              )}

              {/* SECTION: Clinical Examination & Prescription Generator (Chẩn đoán -> Đơn thuốc) */}
              <div className="p-5 bg-gradient-to-br from-blue-50/70 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-blue-200/60 dark:border-blue-900/60 gap-2">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                      <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                      Quy Trình Khám Lâm Sàng: Chẩn Đoán &amp; Kê Đơn Thuốc
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                      Lập Đơn Thuốc Cho Bệnh Nhân {selectedPatientForModal.patientName}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleAiPrescribeForPatient}
                    disabled={isAiPrescribing}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isAiPrescribing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>AI Đang Lập Phác Đồ...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                        <span>✨ AI Gợi Ý Đơn Thuốc Chuẩn Bộ Y Tế</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Diagnosis Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Chẩn đoán bệnh của Bác sĩ:
                    </label>
                    <input
                      type="text"
                      value={docDiagnosis}
                      onChange={(e) => setDocDiagnosis(e.target.value)}
                      placeholder="Nhập chẩn đoán lâm sàng..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Mã ICD-10:
                    </label>
                    <input
                      type="text"
                      value={docIcd}
                      onChange={(e) => setDocIcd(e.target.value)}
                      placeholder="A97.1, J20.9..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Ghi chú lâm sàng &amp; Cận lâm sàng:
                  </label>
                  <input
                    type="text"
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                    placeholder="Thể trạng, huyết áp, tiểu cầu, dấu hiệu thực thể..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>

                {/* Contraindications Warning (Important for Dengue etc.) */}
                {docContraindications && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs">
                    <strong className="block text-rose-700 dark:text-rose-300 font-bold">
                      ⚠️ Chống chỉ định y khoa đặc biệt:
                    </strong>
                    <p>{docContraindications}</p>
                  </div>
                )}

                {/* Prescribed Medicines Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-blue-600" />
                      Danh Sách Thuốc Kê Đơn ({docMedicines.length} loại thuốc):
                    </span>
                    {docMedicines.length === 0 && (
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 italic">
                        Bấm nút &quot;AI Gợi Ý Đơn Thuốc Chuẩn Bộ Y Tế&quot; ở trên để tự động nạp danh mục thuốc
                      </span>
                    )}
                  </div>

                  {docMedicines.length > 0 ? (
                    <div className="space-y-2">
                      {docMedicines.map((med, mIdx) => (
                        <div key={mIdx} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 dark:text-white text-xs">
                              {mIdx + 1}. {med.name}
                            </strong>
                            <div className="flex items-center gap-1">
                              {med.schedule?.map((time, tIdx) => (
                                <span key={tIdx} className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 font-mono text-[10px] font-bold">
                                  {time}
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300">
                            <strong>Liều:</strong> {med.dosage} • <strong>Cách dùng:</strong> {med.instructions}
                          </p>
                          {med.warnings && (
                            <p className="text-[10px] text-amber-700 dark:text-amber-400">
                              Lưu ý: {med.warnings}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-400 text-xs">
                      Chưa có thuốc trong đơn. Bác sĩ hãy nhấn &quot;✨ AI Gợi Ý Đơn Thuốc Chuẩn Bộ Y Tế&quot; để tạo phác đồ tức thì.
                    </div>
                  )}
                </div>

                {/* Sign & Send Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-blue-200/60 dark:border-blue-900/60">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Bác sĩ chỉ định: <strong>{currentUser?.fullName || 'BS.CKII Nguyễn Văn Dũng'}</strong></span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleSignAndSendPrescription}
                      disabled={docMedicines.length === 0}
                      className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Ký Đơn Thuốc &amp; Gửi Sang Hồ Sơ Người Bệnh</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Patient Hourly Symptom Logs */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Sổ Nhật Ký Triệu Chứng Từng Ngày, Từng Giờ Do Bệnh Nhân Ghi:</span>
                </h4>

                <div className="space-y-2.5">
                  {patientLogs.map(log => (
                    <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {log.recordedAt.replace('T', ' ')}
                        </span>
                        <div className="flex gap-2">
                          {log.bodyTemperature && (
                            <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 font-bold font-mono">
                              {log.bodyTemperature}°C
                            </span>
                          )}
                          {log.bloodPressure && (
                            <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 font-bold font-mono">
                              HA: {log.bloodPressure}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        Triệu chứng: <strong>{log.symptoms.join(', ')}</strong>
                      </p>
                      {log.notes && (
                        <p className="text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800 italic">
                          &quot;{log.notes}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Patient's Prescriptions History */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Hồ Sơ Đơn Thuốc &amp; Lịch Sử Điều Trị Của Bệnh Nhân:</span>
                </h4>

                {prescriptions.map(rx => (
                  <div key={rx.id} className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">{rx.title}</span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{rx.prescribedDate}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">Cơ sở kê: <strong>{rx.hospitalName}</strong> {rx.doctorName ? `• BS: ${rx.doctorName}` : ''}</p>
                    <p className="text-slate-700 dark:text-slate-300">Chẩn đoán: <strong>{rx.diagnosis}</strong> {rx.icdCode ? `(ICD-10: ${rx.icdCode})` : ''}</p>
                    {rx.contraindications && (
                      <p className="text-rose-700 dark:text-rose-400 text-[11px] font-semibold">
                        Cảnh báo: {rx.contraindications}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {rx.medicines.map((m, mIdx) => (
                        <span key={mIdx} className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded font-mono text-[11px]">
                          {m.name} ({m.dosage})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
