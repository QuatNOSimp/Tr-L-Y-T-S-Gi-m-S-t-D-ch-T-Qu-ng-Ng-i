import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Building2, 
  User, 
  Phone, 
  CheckCircle2, 
  Ticket, 
  AlertCircle, 
  Stethoscope, 
  FileText,
  AlertTriangle,
  Trash2,
  Printer,
  ShieldCheck,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { HospitalInfo, Doctor, Appointment, User as UserType } from '../../types';
import { api } from '../../services/api';

interface AppointmentBookingProps {
  hospitals: HospitalInfo[];
  doctors: Doctor[];
  appointments: Appointment[];
  onAppointmentCreated: (appt: Appointment) => void;
  onAppointmentCancelled?: (id: string) => void;
  patientId: string;
  currentUser?: UserType | null;
  defaultHospitalId?: string;
}

export const AppointmentBooking: React.FC<AppointmentBookingProps> = ({
  hospitals,
  doctors,
  appointments,
  onAppointmentCreated,
  onAppointmentCancelled,
  patientId,
  currentUser,
  defaultHospitalId
}) => {
  const [patientName, setPatientName] = useState(currentUser?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone || '');
  const [hospitalId, setHospitalId] = useState(defaultHospitalId || hospitals[0]?.id || 'bv-tinh-qn');
  const [department, setDepartment] = useState('Khoa Khám Bệnh Đa Khoa');
  const [doctorId, setDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
  );
  const [appointmentTime, setAppointmentTime] = useState('08:30');
  const [symptoms, setSymptoms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync when currentUser changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.fullName) setPatientName(currentUser.fullName);
      if (currentUser.phone) setPhoneNumber(currentUser.phone);
    }
  }, [currentUser]);

  // Sync default hospital from other screens (e.g. CostEstimator)
  useEffect(() => {
    if (defaultHospitalId) {
      setHospitalId(defaultHospitalId);
    }
  }, [defaultHospitalId]);

  const departmentsList = [
    'Khoa Bệnh Nhiệt Đới & Truyền Nhiễm',
    'Khoa Khám Bệnh Đa Khoa',
    'Khoa Nội Tiêu Hóa - Gan Mật',
    'Khoa Hồi Sức Tích Cực & Cấp Cứu',
    'Khoa Nhi Tổng Hợp',
    'Khoa Ngoại Tổng Hợp & Phẫu Thuật',
    'Khoa Tim Mạch Can Thiệp',
    'Khoa Hô Hấp - Phổi',
    'Khoa Tai Mũi Họng'
  ];

  // Filter doctors by selected hospital
  const availableDoctors = doctors.filter(d => d.hospitalId === hospitalId);

  // Match all appointments of this patient (by ID or Phone number)
  const cleanPhone = (phoneNumber || currentUser?.phone || '').trim();
  const patientAppointments = appointments.filter(a => 
    a.patientId === patientId ||
    (currentUser?.id && a.patientId === currentUser.id) ||
    (cleanPhone && a.phoneNumber && a.phoneNumber.trim() === cleanPhone)
  );

  // An active appointment that is in waiting / in-progress status
  const activeAppointment = patientAppointments.find(
    a => a.status === 'Chờ khám' || a.status === 'Đang khám'
  );

  const pastAppointments = patientAppointments.filter(
    a => a.id !== activeAppointment?.id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeAppointment) {
      setErrorMsg('Bạn đã có 1 lịch khám đang chờ phục vụ. Mỗi bệnh nhân chỉ được đặt tối đa 1 lịch khám.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const newAppt = await api.bookAppointment({
        patientId,
        patientName,
        phoneNumber,
        hospitalId,
        department,
        doctorId: doctorId || undefined,
        appointmentDate,
        appointmentTime,
        symptoms
      });

      onAppointmentCreated(newAppt);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể đặt lịch khám');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    setIsCancelling(true);
    setErrorMsg('');
    try {
      await api.cancelAppointment(apptId);
      onAppointmentCancelled?.(apptId);
      setShowCancelConfirm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể hủy lịch khám');
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePrintTicket = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Intro Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
              Hệ Thống Đặt Lịch Khám Trực Tuyến
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Giới hạn 1 lịch khám / Bệnh nhân</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            Đặt Lịch Khám Bệnh & Cấp Số Thứ Tự (STT) Trực Tuyến
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl mt-0.5">
            Nhận ngay Số Thứ Tự (STT) khám bệnh ưu tiên tại các bệnh viện tỉnh Quảng Ngãi. Khi đến viện chỉ cần quét mã tại quầy tiếp đón BHYT để vào khám đúng hẹn không phải chờ đợi.
          </p>
        </div>

        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs shrink-0">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Quy định: Tối đa 1 lịch hẹn đang chờ</span>
        </div>
      </div>

      {/* CASE 1: PATIENT ALREADY HAS 1 ACTIVE APPOINTMENT (LOCKED TO 1 BOOKING) */}
      {activeAppointment ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Restriction Notice Banner */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h4 className="font-bold text-amber-900 dark:text-amber-200">
                  Bạn Đang Có 1 Lịch Khám Đang Chờ Phục Vụ
                </h4>
                <p className="text-amber-800 dark:text-amber-300 text-xs mt-0.5">
                  Để đảm bảo công bằng lượt cấp số thứ tự và tránh giữ chỗ ảo, hệ thống <strong>chỉ cho phép mỗi bệnh nhân đặt 1 lịch khám tại một thời điểm</strong>. Nếu muốn đổi ngày hoặc bệnh viện khác, bạn có thể hủy lịch hiện tại dưới đây để đặt lại.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 rounded-xl font-bold text-xs shrink-0 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hủy Lịch Khám Này</span>
            </button>
          </div>

          {/* Electronic Medical Appointment Ticket Card */}
          <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            {/* Decorative pattern */}
            <div className="absolute right-0 top-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/20">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                  <Ticket className="w-8 h-8 text-white" />
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-widest text-emerald-200 font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                    PHIẾU KHÁM BỆNH ĐIỆN TỬ HỢP LỆ
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black mt-0.5">
                    Lịch Hẹn Của {activeAppointment.patientName}
                  </h3>
                </div>
              </div>

              {/* Big Queue Number */}
              <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-6 py-3 rounded-2xl text-center shadow-lg min-w-[140px]">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                  SỐ THỨ TỰ (STT)
                </span>
                <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
                  #{activeAppointment.queueNumber}
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">Ưu tiên qua mạng</span>
              </div>
            </div>

            {/* Ticket Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-6 border-b border-white/15 text-xs">
              <div className="space-y-1">
                <span className="text-emerald-200 font-semibold uppercase text-[10px] tracking-wider block">Bệnh viện tiếp nhận:</span>
                <p className="font-bold text-sm text-white">{activeAppointment.hospitalName}</p>
              </div>

              <div className="space-y-1">
                <span className="text-emerald-200 font-semibold uppercase text-[10px] tracking-wider block">Chuyên khoa khám:</span>
                <p className="font-bold text-sm text-white">{activeAppointment.department}</p>
              </div>

              <div className="space-y-1">
                <span className="text-emerald-200 font-semibold uppercase text-[10px] tracking-wider block">Thời gian hẹn khám:</span>
                <p className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{activeAppointment.appointmentTime} - {activeAppointment.appointmentDate}</span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-emerald-200 font-semibold uppercase text-[10px] tracking-wider block">Bác sĩ phụ trách:</span>
                <p className="font-bold text-sm text-white">{activeAppointment.doctorName || 'Bác sĩ phân công tại phòng khám'}</p>
              </div>
            </div>

            {/* Details Footer */}
            <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <p className="text-emerald-100">
                  <strong>Số điện thoại:</strong> {activeAppointment.phoneNumber} • <strong>Mã phiếu:</strong> <span className="font-mono text-emerald-200">{activeAppointment.id}</span>
                </p>
                {activeAppointment.symptoms && (
                  <p className="text-emerald-100 text-[11px]">
                    <strong>Triệu chứng khai báo:</strong> {activeAppointment.symptoms}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handlePrintTicket}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In / Lưu Phiếu</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-4 py-2 bg-rose-500/80 hover:bg-rose-600 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hủy Lịch Này</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cancellation Confirmation Modal */}
          {showCancelConfirm && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Xác Nhận Hủy Lịch Khám?
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Lịch hẹn tại <strong>{activeAppointment.hospitalName}</strong> với <strong>STT #{activeAppointment.queueNumber}</strong> sẽ bị hủy. Số thứ tự này sẽ được giải phóng cho bệnh nhân khác.
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                    ✓ Sau khi hủy, bạn sẽ có thể đặt lại 1 lịch khám mới ngay lập tức.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => setShowCancelConfirm(false)}
                    className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                  >
                    Giữ Lại Lịch
                  </button>
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => handleCancelAppointment(activeAppointment.id)}
                    className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20"
                  >
                    {isCancelling ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang hủy...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Đồng Ý Hủy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Past Appointments if any */}
          {pastAppointments.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>Lịch Sử Các Lần Khám Trước Đó ({pastAppointments.length})</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pastAppointments.map(appt => (
                  <div key={appt.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">STT #{appt.queueNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {appt.status}
                      </span>
                    </div>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{appt.hospitalName} - {appt.department}</p>
                    <p className="text-[11px] text-slate-500">{appt.appointmentTime} ngày {appt.appointmentDate}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : (
        /* CASE 2: PATIENT DOES NOT HAVE AN APPOINTMENT -> SHOW BOOKING FORM (1 APPOINTMENT ALLOWED) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
          
          {/* Booking Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Thông Tin Đăng Ký Khám Bệnh</span>
              </h3>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                Lấy 1 Số Thứ Tự (STT)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Họ và tên người khám:</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập họ và tên người khám..."
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Số điện thoại liên hệ:</label>
                <input
                  type="tel"
                  required
                  placeholder="Nhập số điện thoại nhận thông báo STT..."
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Chọn bệnh viện tại Quảng Ngãi:</label>
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {hospitals.map(h => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.district})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Chuyên khoa khám:</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {departmentsList.map(dep => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Bác sĩ khám (Tùy chọn):</label>
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Bác sĩ trực ban tự động phân công</option>
                  {availableDoctors.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} - {doc.position}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Ngày mong muốn khám:</label>
                <input
                  type="date"
                  required
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Khung giờ hẹn:</label>
                <select
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="07:30">07:30 - Ca Sáng</option>
                  <option value="08:30">08:30 - Ca Sáng</option>
                  <option value="09:30">09:30 - Ca Sáng</option>
                  <option value="10:30">10:30 - Ca Sáng</option>
                  <option value="13:30">13:30 - Ca Chiều</option>
                  <option value="14:30">14:30 - Ca Chiều</option>
                  <option value="15:30">15:30 - Ca Chiều</option>
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Mô tả triệu chứng / Lý do đi khám:</label>
              <textarea
                rows={3}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Ghi rõ triệu chứng, số ngày bị sốt hoặc đau để bác sĩ chuẩn bị trước..."
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang kết nối bệnh viện & cấp số...</span>
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4" />
                  <span>Xác Nhận Đặt Lịch & Nhận Số Thứ Tự (STT)</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center italic">
              * Hệ thống chỉ giữ 1 lịch hẹn duy nhất. Khi hoàn tất, bạn sẽ nhận được Phiếu khám điện tử chính thức.
            </p>
          </form>

          {/* Right: Hospital Guidance & Instructions */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors duration-200">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Quy Định & Hướng Dẫn Tiếp Đón Bệnh Nhân</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white block font-semibold">1. Giới hạn 1 lượt khám / bệnh nhân:</strong>
                <p>Mỗi người bệnh chỉ được đăng ký tối đa 1 lịch khám tại một thời điểm để bảo đảm lượt cấp số thứ tự minh bạch cho toàn bộ người dân tỉnh Quảng Ngãi.</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white block font-semibold">2. Quyền lợi nhận STT ưu tiên:</strong>
                <p>Số thứ tự được đồng bộ trực tiếp với hệ thống gọi số tự động tại cửa phòng khám chuyên khoa của bệnh viện.</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <strong className="text-slate-900 dark:text-white block font-semibold">3. Giấy tờ cần chuẩn bị:</strong>
                <p>Mang theo CCCD gắn chip (hoặc ứng dụng VNeID / VssID) để được hưởng chính sách BHYT 80% - 100%.</p>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1">
                <strong className="block font-semibold">4. Cần thay đổi lịch hẹn?</strong>
                <p>Nếu bạn đã đặt lịch nhưng bận đột xuất, bạn có thể bấm <em>&quot;Hủy lịch khám này&quot;</em> trên phiếu điện tử để giải phóng STT và đặt lại giờ khác bất kỳ lúc nào.</p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
