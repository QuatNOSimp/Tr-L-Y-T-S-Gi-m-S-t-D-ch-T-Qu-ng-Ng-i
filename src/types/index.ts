export type SeverityLevel = 'Thấp' | 'Trung bình' | 'Nguy hiểm' | 'Khẩn cấp';

export interface Disease {
  id: string;
  name: string; // Tên tiếng Anh (disease_name-eng)
  vietnameseName: string; // Tên tiếng Việt (disease_name_vi)
  diseaseGroup?: string; // Nhóm bệnh (disease_group)
  icdCode?: string;
  symptoms: string[];
  severity: SeverityLevel;
  isContagious: boolean;
  transmissionMode?: string; // Hô hấp, Muỗi vằn đốt, Tiêu hóa, Tiếp xúc máu/dịch...
  careInstructions: string;
  prevention: string;
  recommendedDepartment: string;
  quangNgaiPrevalence?: 'Cao' | 'Trung bình' | 'Thấp';
  emergencyWarningSigns?: string[];
  estimatedCostRange?: {
    min: number;
    max: number;
  };
}

export interface PatientSymptomLog {
  id: string;
  patientId: string;
  patientName: string;
  recordedAt: string; // ISO string with date & hour
  symptoms: string[];
  notes: string;
  bodyTemperature?: number;
  bloodPressure?: string;
  heartRate?: number;
  painLevel?: number; // 1 - 10
  mentalState?: 'Rất tốt' | 'Bình thường' | 'Căng thẳng' | 'Mệt mỏi' | 'Lo âu' | 'Đau đớn';
  assignedHospital?: string;
}

export interface PrescriptionMedicine {
  name: string; // Tên biệt dược & hàm lượng (ví dụ: Paracetamol 500mg, Oresol 245...)
  activeIngredient?: string; // Hoạt chất chính
  dosage: string; // e.g. "1 viên/lần khi sốt >= 38.5°C"
  instructions: string; // e.g. "Uống sau ăn no với nhiều nước ấm"
  schedule: string[]; // ["08:00", "14:00", "20:00"]
  timesPerDay: number;
  durationDays?: number;
  timingCategory?: 'Sáng' | 'Trưa' | 'Chiều' | 'Tối' | 'Khi cần';
  warnings?: string; // e.g. "Không dùng chung với NSAIDs hoặc Aspirin"
}

export interface PrescriptionRecord {
  id: string;
  patientId: string;
  patientName: string;
  title: string;
  hospitalName: string;
  doctorName?: string;
  doctorTitle?: string; // e.g. "BS.CKII - Trưởng Khoa Nhiệt Đới"
  prescribedDate: string;
  diagnosis: string; // Chẩn đoán của bác sĩ (ví dụ: Sốt xuất huyết Dengue có dấu hiệu cảnh báo)
  icdCode?: string; // Mã ICD-10 (ví dụ: A97.1)
  clinicalNotes?: string; // Tình trạng lâm sàng khi khám
  contraindications?: string; // Chống chỉ định y khoa (ví dụ: Tuyệt đối không dùng Aspirin, Ibuprofen)
  dietaryAdvice?: string; // Lời dặn dinh dưỡng & chế độ nghỉ ngơi
  reExaminationDate?: string; // Ngày hẹn tái khám
  emergencyWarningSigns?: string[]; // Dấu hiệu trở nặng cần cấp cứu ngay
  medicines: PrescriptionMedicine[];
  notes?: string;
  status?: 'Đang dùng' | 'Đã hoàn thành' | 'Đã đổi đơn';
  aiAssisted?: boolean; // Được AI gợi ý theo phác đồ Bộ Y Tế
}

export interface HospitalInfo {
  id: string;
  name: string;
  type: 'Công lập' | 'Tư nhân' | 'Khu vực' | 'Trung tâm Y tế Huyện';
  address: string;
  district: string;
  lat: number;
  lng: number;
  hotline: string;
  emergencyPhone: string;
  workingHours: string;
  website?: string;
  services: {
    serviceName: string;
    category: 'Khám' | 'Xét nghiệm' | 'Chẩn đoán hình ảnh' | 'Nội soi' | 'Thủ thuật';
    priceVnd: number;
    bhytDiscountPercent: number; // e.g. 80, 100
  }[];
}

export interface Doctor {
  id: string;
  name: string;
  hospitalId: string;
  hospitalName: string;
  specialty: string; // Chuyên khoa: Nội khoa, Ngoại khoa, Nhi khoa, Truyền nhiễm...
  position: string; // Trưởng khoa, Phó khoa, Bác sĩ điều trị, Thạc sĩ - Bác sĩ
  avatarUrl?: string;
  experienceYears: number;
  dutySchedule: {
    dayOfWeek: string; // Thứ 2, Thứ 3...
    shift: 'Sáng (07:00 - 11:30)' | 'Chiều (13:30 - 17:00)' | 'Đêm (17:00 - 07:00)';
    room: string;
  }[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  phoneNumber: string;
  hospitalId: string;
  hospitalName: string;
  department: string;
  doctorId?: string;
  doctorName?: string;
  appointmentDate: string;
  appointmentTime: string;
  queueNumber: number; // Số thứ tự khám (STT)
  symptoms: string;
  status: 'Chờ khám' | 'Đang khám' | 'Đã hoàn thành' | 'Đã hủy';
  estimatedCost?: number;
  createdAt: string;
}

export interface EpidemiologyCase {
  id: string;
  diseaseName: string;
  reportedAt: string;
  district: string; // TP. Quảng Ngãi, Bình Sơn, Sơn Tịnh...
  ward?: string;
  lat: number;
  lng: number;
  severity: SeverityLevel;
  isContagious: boolean;
  status: 'Nghi ngờ' | 'Xác nhận' | 'Đã kiểm soát' | 'Khoanh vùng đỏ';
  patientId?: string;
}

export interface EmergencyAlert {
  id: string;
  patientName: string;
  phoneNumber: string;
  lat: number;
  lng: number;
  addressApprox: string;
  symptoms: string[];
  reportedAt: string;
  status: 'MỚI - CẦN ĐIỀU PHỐI' | 'Đang xử lý' | 'Đã tiếp nhận viện';
  assignedHospital?: string;
}

export interface DailyWellness {
  date: string;
  waterGlasses: number; // Mục tiêu 8 ly
  waterTarget: number;
  mentalStatus: 'Vui vẻ' | 'Bình thường' | 'Căng thẳng' | 'Mệt mỏi' | 'Lo lắng';
  vitalNotes?: string;
}

export type UserRole = 'patient' | 'doctor' | 'admin' | 'hospital_admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  isVerified: boolean;
  address?: string;
  district?: string;
  birthYear?: string;
  gender?: 'Nam' | 'Nữ' | 'Khác';
  bhytNumber?: string;
  bloodType?: string;
  allergies?: string;
  hospitalName?: string;
  specialty?: string;
  position?: string;
  createdAt: string;
}

export interface SentEmailMessage {
  id: string;
  to: string;
  subject: string;
  otp: string;
  token: string;
  verificationLink: string;
  userName: string;
  sentAt: string;
  htmlContent: string;
  isRead?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}
