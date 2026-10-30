import React, { useState } from 'react';
import { 
  Pill, 
  Clock, 
  Stethoscope, 
  Hospital, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Info, 
  PhoneCall, 
  AlertCircle,
  ChevronRight,
  BookOpen,
  Coffee,
  HeartPulse,
  PlusCircle,
  RefreshCw,
  Check,
  Trash2,
  Plus,
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PrescriptionRecord, PrescriptionMedicine, User as UserType } from '../../types';
import { api } from '../../services/api';

interface DoctorPrescriptionsProps {
  prescriptions: PrescriptionRecord[];
  onPrescriptionSaved: (newRx: PrescriptionRecord) => void;
  onPrescriptionDeleted?: (id: string) => void;
  patientId: string;
  patientName?: string;
  currentUser?: UserType | null;
  onOpenEmergency?: () => void;
}

export const DoctorPrescriptions: React.FC<DoctorPrescriptionsProps> = ({
  prescriptions,
  onPrescriptionSaved,
  onPrescriptionDeleted,
  patientId,
  patientName,
  currentUser,
  onOpenEmergency
}) => {
  const effectivePatientName = currentUser?.fullName || patientName || 'Người Bệnh';
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'completed'>('all');
  
  // AI Generator Modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState('Sốt xuất huyết Dengue có dấu hiệu cảnh báo');
  const [aiIcdCode, setAiIcdCode] = useState('A97.1');
  const [aiSymptoms, setAiSymptoms] = useState('Sốt cao liên tục ngày thứ 4, đau tức hạ sườn phải, nôn nao, tiểu cầu 78.000');
  const [aiAllergies, setAiAllergies] = useState(currentUser?.allergies || 'Không ghi nhận');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<any | null>(null);

  // Manual Self-Declaration Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualDiagnosis, setManualDiagnosis] = useState('');
  const [manualHospital, setManualHospital] = useState('Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi');
  const [manualDoctor, setManualDoctor] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualDiet, setManualDiet] = useState('');
  const [manualMedicines, setManualMedicines] = useState<{
    name: string;
    dosage: string;
    instructions: string;
    schedule: string[];
  }[]>([
    { name: '', dosage: '1 viên/lần', instructions: 'Uống sau ăn no', schedule: ['08:00', '20:00'] }
  ]);

  const [successToast, setSuccessToast] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Daily medication tracker inside this view
  const [takenStatus, setTakenStatus] = useState<Record<string, boolean>>({});

  const toggleMedicineTaken = (key: string) => {
    setTakenStatus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const filteredPrescriptions = prescriptions.filter(rx => {
    if (selectedFilter === 'active') return rx.status !== 'Đã hoàn thành';
    if (selectedFilter === 'completed') return rx.status === 'Đã hoàn thành';
    return true;
  });

  // Sample disease templates for 1-click AI generation
  const DISEASE_TEMPLATES = [
    {
      label: 'Sốt xuất huyết Dengue cảnh báo (ICD-10: A97.1)',
      diagnosis: 'Sốt xuất huyết Dengue có dấu hiệu cảnh báo - Ngày thứ 4',
      icd: 'A97.1',
      symptoms: 'Sốt cao ngày 4, đau tức hạ sườn phải, tiểu cầu 78.000/mm³, nôn nao, xuất huyết dưới da',
      allergies: 'Dị ứng thuốc nhóm NSAIDs'
    },
    {
      label: 'Viêm phế quản cấp bội nhiễm (ICD-10: J20.9)',
      diagnosis: 'Viêm phế quản cấp bội nhiễm vi khuẩn đường hô hấp dưới',
      icd: 'J20.9',
      symptoms: 'Ho cơn rũ rượi, khạc đờm vàng đục, đau rát họng, sốt nhẹ 38.2°C, khó thở nhẹ',
      allergies: 'Dị ứng Penicillin'
    },
    {
      label: 'Tăng huyết áp độ 2 nguy cơ cao (ICD-10: I10)',
      diagnosis: 'Tăng huyết áp nguyên phát độ 2 kèm Rối loạn lipid máu',
      icd: 'I10',
      symptoms: 'Huyết áp 155/95 mmHg, hoa mắt chóng mặt khi thay đổi tư thế, đau căng tức sau gáy',
      allergies: 'Không ghi nhận tiền sử dị ứng'
    },
    {
      label: 'Viêm dạ dày tá tràng Hp (+) (ICD-10: K29.5)',
      diagnosis: 'Viêm loét dạ dày tá tràng mạn tính giai đoạn bùng phát có Hp (+)',
      icd: 'K29.5',
      symptoms: 'Đau tức thượng vị dữ dội lúc đói hoặc sau ăn 2 giờ, ợ chua, buồn nôn, sụt cân nhẹ',
      allergies: 'Dị ứng Clarithromycin'
    }
  ];

  const handleSelectTemplate = (template: typeof DISEASE_TEMPLATES[0]) => {
    setAiDiagnosis(template.diagnosis);
    setAiIcdCode(template.icd);
    setAiSymptoms(template.symptoms);
    setAiAllergies(template.allergies);
    setGeneratedPreview(null);
  };

  const handleTriggerAIGenerator = async () => {
    if (!aiDiagnosis.trim()) {
      setErrorMsg('Vui lòng nhập chẩn đoán bệnh lâm sàng.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');
    try {
      const res = await api.generatePrescriptionFromDiagnosis({
        diagnosis: aiDiagnosis,
        icdCode: aiIcdCode,
        patientName: effectivePatientName,
        patientAge: currentUser?.birthYear ? (new Date().getFullYear() - Number(currentUser.birthYear)) : 30,
        gender: currentUser?.gender || 'Chưa khai báo',
        symptoms: [aiSymptoms],
        allergies: aiAllergies,
        hospitalName: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi',
        doctorName: 'BS.CKII Nguyễn Văn Dũng',
        doctorTitle: 'Trưởng Khoa Bệnh Nhiệt Đới & Truyền Nhiễm',
        clinicalNotes: aiSymptoms
      });

      setGeneratedPreview(res);
      setSuccessToast('AI Gemini đã lập thành công đơn thuốc chuẩn theo phác đồ Bộ Y Tế!');
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err: any) {
      setErrorMsg('Không thể tạo đơn thuốc bằng AI: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePreviewToPatient = async () => {
    if (!generatedPreview) return;

    try {
      const newRx = await api.savePrescription(patientId, {
        patientName: effectivePatientName,
        title: generatedPreview.title || `Đơn thuốc điều trị: ${generatedPreview.diagnosis}`,
        hospitalName: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi',
        doctorName: 'BS.CKII Nguyễn Văn Dũng',
        doctorTitle: 'Trưởng Khoa Bệnh Nhiệt Đới & Truyền Nhiễm',
        prescribedDate: new Date().toISOString().split('T')[0],
        diagnosis: generatedPreview.diagnosis,
        icdCode: generatedPreview.icdCode,
        clinicalNotes: generatedPreview.clinicalNotes,
        contraindications: generatedPreview.contraindications,
        dietaryAdvice: generatedPreview.dietaryAdvice,
        reExaminationDate: new Date(Date.now() + (generatedPreview.reExaminationDays || 3) * 24 * 3600 * 1000).toISOString().split('T')[0],
        emergencyWarningSigns: generatedPreview.emergencyWarningSigns,
        notes: generatedPreview.notes,
        medicines: generatedPreview.medicines || [],
        status: 'Đang dùng',
        aiAssisted: true
      });

      onPrescriptionSaved(newRx);
      setShowAiModal(false);
      setGeneratedPreview(null);
      setSuccessToast('Đã thêm đơn thuốc thành công vào sổ điều trị của bạn!');
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err: any) {
      setErrorMsg('Lỗi khi lưu đơn thuốc: ' + err.message);
    }
  };

  // Self-Declare Manual Prescription
  const handleAddMedicineRow = () => {
    setManualMedicines(prev => [
      ...prev,
      { name: '', dosage: '1 viên/lần', instructions: 'Uống sau ăn no', schedule: ['08:00', '20:00'] }
    ]);
  };

  const handleRemoveMedicineRow = (index: number) => {
    if (manualMedicines.length <= 1) return;
    setManualMedicines(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateMedicineRow = (index: number, field: string, val: any) => {
    setManualMedicines(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item));
  };

  const handleSaveManualPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDiagnosis.trim()) {
      setErrorMsg('Vui lòng nhập tên bệnh hoặc chẩn đoán của bác sĩ.');
      return;
    }
    const validMeds = manualMedicines.filter(m => m.name.trim().length > 0);
    if (validMeds.length === 0) {
      setErrorMsg('Vui lòng nhập ít nhất 1 loại thuốc cần uống.');
      return;
    }

    try {
      const formattedMeds: PrescriptionMedicine[] = validMeds.map(m => ({
        name: m.name.trim(),
        dosage: m.dosage || '1 viên/lần',
        instructions: m.instructions || 'Uống theo chỉ định',
        schedule: m.schedule && m.schedule.length > 0 ? m.schedule : ['08:00'],
        timesPerDay: m.schedule ? m.schedule.length : 1,
        durationDays: 7
      }));

      const newRx = await api.savePrescription(patientId, {
        patientName: effectivePatientName,
        title: `Đơn thuốc tự khai báo: ${manualDiagnosis}`,
        hospitalName: manualHospital || 'Cơ sở Y tế tại Quảng Ngãi',
        doctorName: manualDoctor || 'Bác sĩ điều trị',
        prescribedDate: new Date().toISOString().split('T')[0],
        diagnosis: manualDiagnosis,
        dietaryAdvice: manualDiet,
        notes: manualNotes,
        medicines: formattedMeds,
        status: 'Đang dùng',
        aiAssisted: false
      });

      onPrescriptionSaved(newRx);
      setShowManualModal(false);
      setManualDiagnosis('');
      setManualNotes('');
      setManualDiet('');
      setManualMedicines([{ name: '', dosage: '1 viên/lần', instructions: 'Uống sau ăn no', schedule: ['08:00', '20:00'] }]);
      setSuccessToast('Đã lưu thành công đơn thuốc tự khai báo của bạn!');
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err: any) {
      setErrorMsg('Lỗi lưu đơn thuốc: ' + err.message);
    }
  };

  const handleDeletePrescription = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa đơn thuốc này khỏi danh sách?')) return;
    try {
      await api.deletePrescription(patientId, id);
      if (onPrescriptionDeleted) {
        onPrescriptionDeleted(id);
      }
      setSuccessToast('Đã xóa đơn thuốc thành công!');
      setTimeout(() => setSuccessToast(''), 3000);
    } catch (err: any) {
      setErrorMsg('Không thể xóa đơn thuốc: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-white/15 backdrop-blur-md text-teal-100 border border-white/20">
              <Stethoscope className="w-3.5 h-3.5 text-teal-200" />
              <span>Đơn Thuốc &amp; Lịch Nhắc Uống Thuốc Tự Khai Báo / Bác Sĩ</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
              Đơn Thuốc Bác Sĩ Điều Trị &amp; Hướng Dẫn Dùng Thuốc
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
              Bạn có thể tự khai báo đơn thuốc bác sĩ đã kê cho mình hoặc bấm nút xem ví dụ đơn mẫu chuẩn do AI lập theo phác đồ Bộ Y Tế. Lịch uống thuốc sẽ đồng bộ ra màn hình chính để nhắc nhở bạn.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setShowManualModal(true)}
              className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-white" />
              <span>➕ Tự Khai Báo Đơn Thuốc</span>
            </button>
            <button
              onClick={() => setShowAiModal(true)}
              className="px-4 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Xem Ví Dụ Đơn Thuốc Chuẩn AI</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Badges */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 pt-6 mt-6 border-t border-white/10 text-xs">
          <span className="font-semibold text-teal-200/90 mr-1">Bộ lọc trạng thái:</span>
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-white text-teal-900 shadow-md font-extrabold'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            Tất cả đơn ({prescriptions.length})
          </button>
          <button
            onClick={() => setSelectedFilter('active')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              selectedFilter === 'active'
                ? 'bg-white text-teal-900 shadow-md font-extrabold'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            Đang điều trị ({prescriptions.filter(p => p.status !== 'Đã hoàn thành').length})
          </button>
          <button
            onClick={() => setSelectedFilter('completed')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              selectedFilter === 'completed'
                ? 'bg-white text-teal-900 shadow-md font-extrabold'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            Đã hoàn thành ({prescriptions.filter(p => p.status === 'Đã hoàn thành').length})
          </button>
        </div>
      </div>

      {/* Notifications Toast */}
      {successToast && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 rounded-2xl text-rose-900 dark:text-rose-200 text-xs sm:text-sm font-bold flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Prescriptions List */}
      <div className="space-y-6">
        {filteredPrescriptions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
              <Pill className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Chưa có đơn thuốc nào được khai báo hoặc kê đơn
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Bạn chưa có đơn thuốc nào trong sổ điều trị. Bạn có thể tự khai báo đơn thuốc bác sĩ đã kê cho bạn hoặc bấm xem ví dụ đơn mẫu chuẩn AI.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowManualModal(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>➕ Tự Khai Báo Đơn Thuốc Của Bạn</span>
              </button>
              <button
                onClick={() => setShowAiModal(true)}
                className="px-5 py-2.5 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Xem Ví Dụ Đơn Thuốc Chuẩn AI</span>
              </button>
            </div>
          </div>
        ) : (
          filteredPrescriptions.map((rx) => {
            const isCompleted = rx.status === 'Đã hoàn thành';
            return (
              <motion.div
                key={rx.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white dark:bg-slate-900 rounded-3xl border shadow-sm overflow-hidden transition-all duration-200 ${
                  isCompleted 
                    ? 'border-slate-200 dark:border-slate-800 opacity-90' 
                    : 'border-teal-200/90 dark:border-teal-900/60 ring-1 ring-teal-500/10'
                }`}
              >
                {/* Header card info */}
                <div className={`p-5 sm:p-6 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  isCompleted 
                    ? 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800' 
                    : 'bg-teal-50/50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/40'
                }`}>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          : 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800'
                      }`}>
                        {rx.status || 'Đang điều trị'}
                      </span>
                      {rx.icdCode && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          Mã ICD-10: {rx.icdCode}
                        </span>
                      )}
                      {rx.aiAssisted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          Chuẩn Phác Đồ Bộ Y Tế
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          Người bệnh tự khai báo
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      {rx.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                        <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        {rx.doctorName || 'Bác sĩ điều trị'} {rx.doctorTitle ? `(${rx.doctorTitle})` : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Hospital className="w-3.5 h-3.5 text-slate-400" />
                        {rx.hospitalName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Ngày kê: <strong>{rx.prescribedDate}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions & Re-examination Date */}
                  <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
                    {rx.reExaminationDate && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <div className="text-[11px]">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Tái khám</span>
                          <strong className="text-slate-900 dark:text-white font-mono">{rx.reExaminationDate}</strong>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDeletePrescription(rx.id, e)}
                      className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                      title="Xóa đơn thuốc này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-6">
                  
                  {/* Diagnosis & Clinical Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                      <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px] block">
                        Chẩn Đoán Lâm Sàng:
                      </span>
                      <p className="font-extrabold text-sm text-teal-800 dark:text-teal-300">
                        {rx.diagnosis}
                      </p>
                      {rx.clinicalNotes && (
                        <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                          {rx.clinicalNotes}
                        </p>
                      )}
                    </div>

                    {rx.contraindications && (
                      <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-xs space-y-1">
                        <span className="font-black text-rose-900 dark:text-rose-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          Chống Chỉ Định Y Khoa &amp; Tương Tác Cần Tránh:
                        </span>
                        <p className="font-bold text-xs leading-relaxed text-rose-950 dark:text-rose-100">
                          {rx.contraindications}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Medicines List Section */}
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                      <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                        <Pill className="w-4 h-4 text-teal-600" />
                        <span>Danh Sách {rx.medicines.length} Loại Thuốc Chỉ Định Cần Dùng:</span>
                      </h4>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Bấm vào thuốc để đánh dấu đã uống
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                      {rx.medicines.map((med, mIdx) => {
                        const trackingKey = `${rx.id}-${mIdx}`;
                        const isTaken = takenStatus[trackingKey];

                        return (
                          <div
                            key={mIdx}
                            onClick={() => toggleMedicineTaken(trackingKey)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                              isTaken
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 hover:border-teal-300 hover:bg-white dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 text-[11px] font-black flex items-center justify-center shrink-0">
                                    {mIdx + 1}
                                  </span>
                                  <h5 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                    {med.name}
                                  </h5>
                                </div>

                                {med.activeIngredient && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                    Hoạt chất: {med.activeIngredient}
                                  </p>
                                )}

                                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 space-y-0.5 mt-2">
                                  <p className="font-bold text-teal-800 dark:text-teal-300">
                                    Liều dùng: {med.dosage}
                                  </p>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                                    Hướng dẫn: {med.instructions}
                                  </p>
                                </div>

                                {/* Schedule time badges */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                                  <span className="text-[11px] text-slate-400 font-semibold mr-1">Giờ uống:</span>
                                  {med.schedule.map((time, tIdx) => (
                                    <span 
                                      key={tIdx}
                                      className="px-2 py-0.5 rounded-lg bg-teal-100/70 dark:bg-teal-950 text-teal-900 dark:text-teal-200 text-[11px] font-mono font-bold border border-teal-200 dark:border-teal-800"
                                    >
                                      {time}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <button
                                type="button"
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                  isTaken
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-teal-600 hover:border-teal-300'
                                }`}
                                title={isTaken ? 'Đã uống thuốc này' : 'Bấm để đánh dấu đã uống'}
                              >
                                <Check className={`w-4 h-4 ${isTaken ? 'stroke-[3]' : ''}`} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dietary & Lifestyle Advice from Doctor */}
                  {rx.dietaryAdvice && (
                    <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-xs space-y-1.5">
                      <span className="font-black text-blue-900 dark:text-blue-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Coffee className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Lời Dặn Dò Dinh Dưỡng, Chế Độ Bù Dịch &amp; Nghỉ Ngơi
                      </span>
                      <p className="text-blue-950 dark:text-blue-100 leading-relaxed font-medium">
                        {rx.dietaryAdvice}
                      </p>
                    </div>
                  )}

                  {/* Emergency Warning Signs */}
                  {rx.emergencyWarningSigns && rx.emergencyWarningSigns.length > 0 && (
                    <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-900/60 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-amber-950 dark:text-amber-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <HeartPulse className="w-4 h-4 text-amber-600 animate-pulse" />
                          Dấu Hiệu Trở Nặng Cần Đến Viện Cấp Cứu 115 Ngay
                        </span>
                        {onOpenEmergency && (
                          <button
                            onClick={onOpenEmergency}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <PhoneCall className="w-3 h-3" />
                            <span>Gọi Cấp Cứu 115</span>
                          </button>
                        )}
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-amber-900 dark:text-amber-200 font-semibold pl-1">
                        {rx.emergencyWarningSigns.map((sign, sIdx) => (
                          <li key={sIdx}>{sign}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Doctor's Signature Footer */}
                  {rx.notes && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 italic border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                      <span>&ldquo;{rx.notes}&rdquo;</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        BS: {rx.doctorName || 'Bác sĩ điều trị'}
                      </span>
                    </div>
                  )}

                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Bệnh Nhân Tự Khai Báo Đơn Thuốc Đang Dùng */}
      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg">
                      Tự Khai Báo Đơn Thuốc Đang Uống
                    </h3>
                    <p className="text-xs text-emerald-100">
                      Nhập đơn thuốc bác sĩ đã kê để hệ thống tự động lập lịch nhắc uống mỗi ngày
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveManualPrescription} className="p-6 space-y-4 overflow-y-auto text-xs">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tên bệnh / Chẩn đoán của bác sĩ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Cảm cúm sốt siêu vi, Viêm phế quản, Đau dạ dày..."
                    value={manualDiagnosis}
                    onChange={(e) => setManualDiagnosis(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-emerald-600 outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nơi khám / Bệnh viện đã kê
                    </label>
                    <select
                      value={manualHospital}
                      onChange={(e) => setManualHospital(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-emerald-600 outline-hidden"
                    >
                      <option value="Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi">Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi</option>
                      <option value="Bệnh Viện Sản - Nhi Tỉnh Quảng Ngãi">Bệnh Viện Sản - Nhi Tỉnh Quảng Ngãi</option>
                      <option value="Bệnh Viện Đa Khoa Tư Nhân Phúc Hưng">Bệnh Viện Đa Khoa Tư Nhân Phúc Hưng</option>
                      <option value="Bệnh Viện Đa Khoa Khu Vực Đặng Thùy Trâm">Bệnh Viện Đa Khoa KV Đặng Thùy Trâm</option>
                      <option value="Trung Tâm Y Tế TP. Quảng Ngãi">Trung Tâm Y Tế TP. Quảng Ngãi</option>
                      <option value="Phòng Khám Đa Khoa Tư Nhân">Phòng Khám Đa Khoa Tư Nhân</option>
                      <option value="Khác">Cơ sở Y tế Khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bác sĩ kê đơn (nếu có)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: BS. Nguyễn Văn Dũng"
                      value={manualDoctor}
                      onChange={(e) => setManualDoctor(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-600 outline-hidden"
                    />
                  </div>
                </div>

                {/* Medicines List */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Danh sách thuốc cần uống <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAddMedicineRow}
                      className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm loại thuốc</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {manualMedicines.map((med, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Thuốc {idx + 1}</span>
                          {manualMedicines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMedicineRow(idx)}
                              className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                            >
                              Xóa
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Tên thuốc & hàm lượng (VD: Paracetamol 500mg)"
                            value={med.name}
                            onChange={(e) => handleUpdateMedicineRow(idx, 'name', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Liều dùng (VD: 1 viên/lần khi sốt)"
                            value={med.dosage}
                            onChange={(e) => handleUpdateMedicineRow(idx, 'dosage', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Cách uống (VD: Uống sau ăn no)"
                            value={med.instructions}
                            onChange={(e) => handleUpdateMedicineRow(idx, 'instructions', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Khung giờ (VD: 08:00, 14:00, 20:00)"
                            value={med.schedule.join(', ')}
                            onChange={(e) => handleUpdateMedicineRow(idx, 'schedule', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lời dặn dò dinh dưỡng & chế độ kiêng cữ (nếu có)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="VD: Uống nhiều nước ấm, kiêng đồ chua cay, nghỉ ngơi tại giường..."
                    value={manualDiet}
                    onChange={(e) => setManualDiet(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    Lưu Đơn Thuốc Khai Báo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: AI Clinical Prescription Generator & Example Viewer */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-teal-700 to-emerald-800 px-6 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg">
                      Hệ Thống AI Gemini: Lập Đơn Thuốc Mẫu Theo Chẩn Đoán Bác Sĩ
                    </h3>
                    <p className="text-xs text-teal-100">
                      Gợi ý liều lượng, hoạt chất, cách dùng và cảnh báo theo Hướng dẫn Điều trị Bộ Y Tế
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[78vh] overflow-y-auto text-xs">
                
                {/* 1-Click Preset Template Selector */}
                <div className="space-y-2">
                  <span className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider block">
                    1. Chọn Nhanh Bệnh Điển Hình Để AI Lập Đơn Mẫu:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DISEASE_TEMPLATES.map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectTemplate(tmpl)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          aiDiagnosis === tmpl.diagnosis
                            ? 'bg-teal-50 dark:bg-teal-950/70 border-teal-500 text-teal-900 dark:text-teal-200 font-bold shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{tmpl.label}</span>
                          {aiDiagnosis === tmpl.diagnosis && (
                            <Check className="w-3.5 h-3.5 text-teal-600" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          Triệu chứng: {tmpl.symptoms}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diagnosis Inputs Form */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <span className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider block">
                    2. Tùy Chỉnh Chẩn Đoán Của Bác Sĩ:
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Chẩn đoán bệnh của Bác sĩ:
                      </label>
                      <input
                        type="text"
                        value={aiDiagnosis}
                        onChange={(e) => setAiDiagnosis(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                        placeholder="Ví dụ: Sốt xuất huyết Dengue ngày thứ 4 cảnh báo..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Mã ICD-10 (nếu có):
                      </label>
                      <input
                        type="text"
                        value={aiIcdCode}
                        onChange={(e) => setAiIcdCode(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                        placeholder="A97.1, J20.9..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Triệu chứng &amp; Cận lâm sàng ghi nhận:
                      </label>
                      <input
                        type="text"
                        value={aiSymptoms}
                        onChange={(e) => setAiSymptoms(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                        placeholder="Sốt cao, đau bụng, tiểu cầu giảm..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Tiền sử dị ứng &amp; bệnh kèm:
                      </label>
                      <input
                        type="text"
                        value={aiAllergies}
                        onChange={(e) => setAiAllergies(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                        placeholder="Dị ứng Penicillin, có đau dạ dày..."
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={handleTriggerAIGenerator}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{isGenerating ? 'AI Gemini đang phân tích phác đồ...' : 'Yêu Cầu AI Lập Đơn Thuốc Mẫu'}</span>
                    </button>
                  </div>
                </div>

                {/* AI Result Preview Box */}
                {generatedPreview && (
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-5 rounded-2xl border border-emerald-300 dark:border-emerald-800 space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-200 dark:border-emerald-800">
                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider">
                          Đơn thuốc mẫu AI gợi ý theo Phác Đồ Bộ Y Tế:
                        </span>
                        <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                          {generatedPreview.title || generatedPreview.diagnosis}
                        </h4>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
                        {generatedPreview.medicines?.length || 0} Loại thuốc
                      </span>
                    </div>

                    {generatedPreview.contraindications && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200">
                        <strong className="block text-rose-800 dark:text-rose-300 uppercase text-[10px]">Cảnh báo chống chỉ định:</strong>
                        <span>{generatedPreview.contraindications}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <strong className="block text-slate-700 dark:text-slate-300 text-xs">Các thuốc chỉ định:</strong>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {generatedPreview.medicines?.map((med: any, idx: number) => (
                          <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                            <span className="font-extrabold text-slate-900 dark:text-white block">{med.name}</span>
                            <p className="text-teal-700 dark:text-teal-300 font-bold">{med.dosage}</p>
                            <p className="text-slate-500 text-[11px]">{med.instructions}</p>
                            <div className="flex items-center gap-1 pt-1">
                              <span className="text-[10px] text-slate-400">Giờ uống:</span>
                              {med.schedule?.map((t: string, ti: number) => (
                                <span key={ti} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {generatedPreview.dietaryAdvice && (
                      <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl">
                        <strong>Lời dặn dinh dưỡng:</strong> {generatedPreview.dietaryAdvice}
                      </p>
                    )}

                    <div className="pt-3 border-t border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Bạn có muốn lưu đơn mẫu này vào danh sách điều trị của mình không?
                      </span>
                      <button
                        type="button"
                        onClick={handleSavePreviewToPatient}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Lưu Đơn Này Vào Sổ Điều Trị</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
