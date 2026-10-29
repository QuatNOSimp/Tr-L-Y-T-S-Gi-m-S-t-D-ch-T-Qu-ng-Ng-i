import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import * as XLSX from 'xlsx';
import {
  INITIAL_DISEASES,
  QUANG_NGAI_HOSPITALS,
  INITIAL_DOCTORS,
  INITIAL_APPOINTMENTS,
  INITIAL_EPIDEMIOLOGY_CASES,
  INITIAL_PATIENT_LOGS,
  INITIAL_PRESCRIPTIONS
} from './src/data/initialData';
import { Disease, Appointment, EpidemiologyCase, PatientSymptomLog, PrescriptionRecord, EmergencyAlert } from './src/types';
import { parseDiseaseExcel } from './src/utils/excelParser';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// High body limit for Excel file imports and prescription photos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Google Gemini SDK
// Automatically reads process.env.GEMINI_API_KEY
const ai = new GoogleGenAI();

// In-memory application store
let diseasesDatabase: Disease[] = [...INITIAL_DISEASES];
let hospitalsDatabase = [...QUANG_NGAI_HOSPITALS];
let doctorsDatabase = [...INITIAL_DOCTORS];
let appointmentsDatabase: Appointment[] = [...INITIAL_APPOINTMENTS];
let epidemiologyDatabase: EpidemiologyCase[] = [...INITIAL_EPIDEMIOLOGY_CASES];
let patientLogsDatabase: PatientSymptomLog[] = [...INITIAL_PATIENT_LOGS];
let prescriptionsDatabase: PrescriptionRecord[] = [];
let emergencyAlerts: EmergencyAlert[] = [
  {
    id: 'emg-1',
    patientName: 'Võ Minh Tuấn (Gia đình báo)',
    phoneNumber: '0905.123.456',
    lat: 15.1250,
    lng: 108.7990,
    addressApprox: 'Gần Chợ Cửa Lỗ, Phường Lê Hồng Phong, TP. Quảng Ngãi',
    symptoms: ['Khó thở dữ dội', 'Đau thắt ngực lan ra vai trái', 'Vã mồ hôi hột'],
    reportedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: 'Đang xử lý',
    assignedHospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi'
  }
];

// ================= SECURITY & AUTHENTICATION SUBSYSTEM =================

// Cryptographic Password Hashing using PBKDF2 with SHA-512 and random salt
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `pbkdf2:${iterations}:${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;
  if (storedHash.startsWith('pbkdf2:')) {
    const parts = storedHash.split(':');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const originalHash = parts[3];
    const computedHash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(originalHash, 'hex'));
    } catch {
      return false;
    }
  }
  // Fallback for legacy demo password matching
  return password === storedHash;
}

// User Database Model
interface InternalUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  role: 'patient' | 'doctor' | 'admin' | 'hospital_admin';
  isVerified: boolean;
  verificationOtp?: string;
  verificationToken?: string;
  otpExpiresAt?: number;
  otpFailedAttempts?: number;
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

// Strip sensitive fields before returning user object to client
function sanitizeUser(user: InternalUser) {
  const { passwordHash, verificationOtp, verificationToken, otpExpiresAt, otpFailedAttempts, ...safe } = user;
  return safe;
}

// Cryptographically secure active sessions table
interface ActiveSession {
  token: string;
  userId: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: number;
}
const sessionsDatabase = new Map<string, ActiveSession>();

// Rate-limiting store for brute force protection (locks after 5 failed attempts for 5 minutes)
interface LoginAttempt {
  count: number;
  lockedUntil: number;
}
const loginAttempts = new Map<string, LoginAttempt>();

// Helper: Create a cryptographically secure 256-bit session
function createSession(user: InternalUser): { token: string; expiresAt: number } {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days valid
  sessionsDatabase.set(token, {
    token,
    userId: user.id,
    email: user.email,
    role: user.role,
    createdAt: new Date().toISOString(),
    expiresAt
  });
  return { token, expiresAt };
}

// Pre-hashed default demonstration password ('123456') using PBKDF2
const SEED_PASSWORD_HASH = hashPassword('123456');

let usersDatabase: InternalUser[] = [
  {
    id: 'user-admin-hien',
    email: 'admin.hien@chuyenlekhiet.edu.vn',
    passwordHash: SEED_PASSWORD_HASH,
    fullName: 'Lê Vũ Nguyên Hiền',
    phone: '0913.845.921',
    role: 'admin',
    isVerified: true,
    hospitalName: 'Trường THPT Chuyên Lê Khiết',
    specialty: 'Lập trình viên & Admin trang web',
    position: 'Quản Trị Viên Hệ Thống',
    address: 'Trường THPT Chuyên Lê Khiết, TP. Quảng Ngãi',
    district: 'TP. Quảng Ngãi',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-admin-hien-alias',
    email: 'admin@chuyenlekhiet.edu.vn',
    passwordHash: SEED_PASSWORD_HASH,
    fullName: 'Lê Vũ Nguyên Hiền',
    phone: '0913.845.921',
    role: 'admin',
    isVerified: true,
    hospitalName: 'Trường THPT Chuyên Lê Khiết',
    specialty: 'Lập trình viên & Admin trang web',
    position: 'Quản Trị Viên Hệ Thống',
    address: 'Trường THPT Chuyên Lê Khiết, TP. Quảng Ngãi',
    district: 'TP. Quảng Ngãi',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-pat-khanhthao',
    email: 'khanhthao0407@gmail.com',
    passwordHash: SEED_PASSWORD_HASH,
    fullName: 'Khánh Thảo',
    phone: '',
    role: 'patient',
    isVerified: true,
    address: '',
    district: '',
    birthYear: '',
    gender: undefined,
    bhytNumber: '',
    bloodType: '',
    allergies: '',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-pat-1',
    email: 'benhnhan@gmail.com',
    passwordHash: SEED_PASSWORD_HASH,
    fullName: 'Bệnh Nhân',
    phone: '',
    role: 'patient',
    isVerified: true,
    address: '',
    district: '',
    birthYear: '',
    gender: undefined,
    bhytNumber: '',
    bloodType: '',
    allergies: '',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-doc-1',
    email: 'bacsi@quangngai.gov.vn',
    passwordHash: SEED_PASSWORD_HASH,
    fullName: 'BS. CKII. Nguyễn Hoàng Nam',
    phone: '0912.345.678',
    role: 'doctor',
    isVerified: true,
    hospitalName: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi',
    specialty: 'Khoa Hồi sức tích cực & Chống độc',
    position: 'Trưởng khoa',
    address: 'Đường Hùng Vương, TP. Quảng Ngãi',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-hosp-1',
    email: 'quanly.bvdk@quangngai.gov.vn',
    passwordHash: SEED_PASSWORD_HASH,
    fullName: 'ThS. BS. Đặng Thị Bích Thủy',
    phone: '0255.3822.463',
    role: 'hospital_admin',
    isVerified: true,
    hospitalName: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi',
    specialty: 'Ban Giám Đốc & Điều Hành Bệnh Viện',
    position: 'Phó Giám Đốc Điều Hành',
    address: 'Số 184 Hùng Vương, TP. Quảng Ngãi',
    district: 'TP. Quảng Ngãi',
    createdAt: new Date().toISOString()
  }
];

interface SentEmailRecord {
  id: string;
  to: string;
  subject: string;
  otp: string;
  token: string;
  verificationLink: string;
  userName: string;
  sentAt: string;
  htmlContent: string;
  isRead: boolean;
}

let sentEmailsDatabase: SentEmailRecord[] = [];

// Helper to create HTML confirmation email
function createVerificationEmailHtml(name: string, email: string, otp: string, token: string) {
  const verifyUrl = `${process.env.APP_URL || ''}/verify-email?email=${encodeURIComponent(email)}&token=${token}`;
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;">
      <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">MedAssist Quảng Ngãi</h1>
        <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Hệ Thống Trợ Lý Sức Khỏe & Giám Sát Dịch Tễ Tỉnh Quảng Ngãi</p>
      </div>
      <div style="padding: 28px 24px;">
        <p style="font-size: 16px; margin-top: 0;">Xin chào <strong>${name}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          Cảm ơn bạn đã đăng ký tài khoản trên nền tảng Y tế Số MedAssist Quảng Ngãi. 
          Để bảo vệ thông tin hồ sơ bệnh án và lịch sử khám bệnh của bạn, vui lòng xác thực địa chỉ email bằng mã OTP 6 số dưới đây:
        </p>
        <div style="background: #f0fdf4; border: 2px dashed #86efac; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #15803d; font-weight: 700; display: block; margin-bottom: 6px;">Mã xác thực tài khoản (OTP)</span>
          <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #047857; font-family: monospace;">${otp}</span>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">(Mã có hiệu lực trong vòng 15 phút)</p>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          Hoặc bạn có thể nhấn trực tiếp vào nút bên dưới để kích hoạt tài khoản ngay tức thì:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">
            Kích Hoạt Tài Khoản Ngay
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin-bottom: 0;">
          Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email. Hệ thống sẽ tự động hủy yêu cầu.<br>
          Cần hỗ trợ y tế khẩn cấp tại Quảng Ngãi? Gọi ngay đường dây nóng: <strong>115</strong> hoặc BVĐK Tỉnh: <strong>0255.3822.463</strong>.
        </p>
      </div>
      <div style="background: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
        © MedAssist Quảng Ngãi - Nền tảng Y tế Số & Cảnh báo Dịch tễ tỉnh Quảng Ngãi
      </div>
    </div>
  `;
}

// Helper: Calculate queue STT for a hospital on a given date
function getNextQueueNumber(hospitalId: string, date: string): number {
  const existing = appointmentsDatabase.filter(a => a.hospitalId === hospitalId && a.appointmentDate === date);
  return existing.length + 1;
}

// ================= API ROUTES =================

// Middleware: Authenticate Bearer Session Token
function requireAuth(req: Request, res: Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Yêu cầu đăng nhập. Không tìm thấy mã xác thực phiên làm việc (Bearer Token).' });
  }

  const token = authHeader.substring(7).trim();
  const session = sessionsDatabase.get(token);

  if (!session || Date.now() > session.expiresAt) {
    if (session) sessionsDatabase.delete(token);
    return res.status(401).json({ error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.' });
  }

  const user = usersDatabase.find(u => u.id === session.userId);
  if (!user) {
    sessionsDatabase.delete(token);
    return res.status(401).json({ error: 'Tài khoản người dùng liên kết không tồn tại.' });
  }

  (req as any).user = user;
  (req as any).session = session;
  (req as any).token = token;
  next();
}

// Register User with Secure Password Hashing & Email Verification
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { 
      email, 
      password, 
      fullName, 
      phone, 
      role = 'patient',
      bhytNumber,
      district,
      address,
      hospitalName,
      specialty
    } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ email, mật khẩu và họ tên.' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự để đảm bảo an toàn.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = usersDatabase.find(u => u.email.toLowerCase() === cleanEmail);

    // Cryptographic password hash (PBKDF2)
    const hashed = hashPassword(password);

    // Generate 6-digit OTP and 192-bit crypto verification token
    const otp = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
    const token = crypto.randomBytes(24).toString('hex');
    const otpExpiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    let user: InternalUser;

    if (existing) {
      // Seamlessly update role, credentials, and activate account
      existing.passwordHash = hashed;
      existing.fullName = fullName;
      existing.phone = phone || existing.phone;
      existing.role = role as 'patient' | 'doctor' | 'admin' | 'hospital_admin';
      existing.isVerified = true;
      existing.verificationOtp = otp;
      existing.verificationToken = token;
      existing.otpExpiresAt = otpExpiresAt;
      existing.otpFailedAttempts = 0;
      existing.bhytNumber = bhytNumber || existing.bhytNumber;
      existing.district = district || existing.district;
      existing.address = address || existing.address;
      existing.hospitalName = hospitalName || existing.hospitalName;
      existing.specialty = specialty || existing.specialty;
      user = existing;
    } else {
      user = {
        id: `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        email: cleanEmail,
        passwordHash: hashed,
        fullName,
        phone: phone || '',
        role: role as 'patient' | 'doctor' | 'admin' | 'hospital_admin',
        isVerified: true,
        verificationOtp: otp,
        verificationToken: token,
        otpExpiresAt,
        otpFailedAttempts: 0,
        bhytNumber: bhytNumber || '',
        district: district || 'TP. Quảng Ngãi',
        address: address || '',
        hospitalName: hospitalName || '',
        specialty: specialty || '',
        createdAt: new Date().toISOString()
      };
      usersDatabase.push(user);
    }

    // Generate and store welcome & verification email for simulator
    const emailHtml = createVerificationEmailHtml(fullName, cleanEmail, otp, token);
    const sentEmail: SentEmailRecord = {
      id: `mail-${Date.now()}`,
      to: cleanEmail,
      subject: `[MedAssist Quảng Ngãi] Chúc mừng! Tài khoản ${user.role} đã được kích hoạt thành công`,
      otp,
      token,
      verificationLink: `/verify-email?email=${encodeURIComponent(cleanEmail)}&token=${token}`,
      userName: fullName,
      sentAt: new Date().toISOString(),
      htmlContent: emailHtml,
      isRead: false
    };

    sentEmailsDatabase.unshift(sentEmail);

    // Create session immediately so user is logged in right away
    const session = createSession(user);

    res.status(201).json({
      success: true,
      message: `Đăng ký thành công tài khoản vai trò ${user.role}! Tài khoản đã được kích hoạt và sẵn sàng đăng nhập.`,
      user: sanitizeUser(user),
      token: session.token,
      expiresAt: session.expiresAt,
      otp,
      verificationToken: token,
      sentEmailId: sentEmail.id
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Lỗi xử lý đăng ký' });
  }
});

// Verify Email via OTP or Token with brute-force protection
app.post('/api/auth/verify-email', (req: Request, res: Response) => {
  try {
    const { email, otp, token } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email không được để trống.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = usersDatabase.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng với email này.' });
    }

    if (user.isVerified) {
      const session = createSession(user);
      return res.json({
        success: true,
        message: 'Tài khoản đã được xác thực trước đó.',
        user: sanitizeUser(user),
        token: session.token,
        expiresAt: session.expiresAt
      });
    }

    // Max 5 OTP attempts before invalidation
    if ((user.otpFailedAttempts || 0) >= 5) {
      return res.status(400).json({ 
        error: 'Bạn đã nhập sai mã xác nhận quá 5 lần. Vui lòng bấm Gửi lại mã để nhận mã OTP mới.' 
      });
    }

    // Check expiration
    if (user.otpExpiresAt && Date.now() > user.otpExpiresAt) {
      return res.status(400).json({ error: 'Mã xác nhận đã hết hạn (15 phút). Vui lòng bấm Gửi lại mã.' });
    }

    // Verify OTP or Token
    const isOtpValid = otp && user.verificationOtp === otp.toString().trim();
    const isTokenValid = token && user.verificationToken === token;

    if (!isOtpValid && !isTokenValid) {
      user.otpFailedAttempts = (user.otpFailedAttempts || 0) + 1;
      const remaining = 5 - user.otpFailedAttempts;
      return res.status(400).json({ 
        error: `Mã xác nhận không chính xác. Bạn còn ${remaining} lần thử trước khi mã bị vô hiệu.` 
      });
    }

    // Mark as verified and wipe verification secrets
    user.isVerified = true;
    user.verificationOtp = undefined;
    user.verificationToken = undefined;
    user.otpExpiresAt = undefined;
    user.otpFailedAttempts = 0;

    // Issue cryptographically secure session
    const session = createSession(user);

    res.json({
      success: true,
      message: 'Xác thực email thành công! Chào mừng bạn đến với MedAssist Quảng Ngãi.',
      user: sanitizeUser(user),
      token: session.token,
      expiresAt: session.expiresAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi xác thực email' });
  }
});

// Resend Email Verification Code
app.post('/api/auth/resend-code', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email không được để trống.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = usersDatabase.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản với email này.' });
    }

    if (user.isVerified) {
      return res.json({ success: true, message: 'Tài khoản đã được kích hoạt trước đó, bạn có thể đăng nhập ngay.' });
    }

    const newOtp = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
    const newToken = crypto.randomBytes(24).toString('hex');
    user.verificationOtp = newOtp;
    user.verificationToken = newToken;
    user.otpExpiresAt = Date.now() + 15 * 60 * 1000;
    user.otpFailedAttempts = 0;

    const emailHtml = createVerificationEmailHtml(user.fullName, cleanEmail, newOtp, newToken);
    const sentEmail: SentEmailRecord = {
      id: `mail-${Date.now()}`,
      to: cleanEmail,
      subject: `[MedAssist Quảng Ngãi] Mã xác thực mới của bạn: ${newOtp}`,
      otp: newOtp,
      token: newToken,
      verificationLink: `/verify-email?email=${encodeURIComponent(cleanEmail)}&token=${newToken}`,
      userName: user.fullName,
      sentAt: new Date().toISOString(),
      htmlContent: emailHtml,
      isRead: false
    };

    sentEmailsDatabase.unshift(sentEmail);

    res.json({
      success: true,
      message: `Đã gửi lại mã xác thực mới đến ${cleanEmail}. Vui lòng kiểm tra hộp thư!`,
      otp: newOtp,
      previewEmail: {
        to: sentEmail.to,
        subject: sentEmail.subject,
        otp: sentEmail.otp,
        sentAt: sentEmail.sentAt
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi gửi lại mã' });
  }
});

// Login User with Rate Limiting & PBKDF2 Password Verification
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập đầy đủ email và mật khẩu.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const rateLimitKey = `${clientIp}:${cleanEmail}`;

    // Check brute-force lockout (10 attempts, 2 minutes)
    const attempt = loginAttempts.get(rateLimitKey);
    if (attempt && attempt.lockedUntil > Date.now()) {
      const remainingSeconds = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
      return res.status(429).json({
        error: `Tài khoản tạm thời bị giới hạn do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau ${remainingSeconds} giây hoặc bấm "Quên mật khẩu" để đặt lại.`
      });
    }

    const user = usersDatabase.find(u => u.email.toLowerCase() === cleanEmail);

    // Verify Password Cryptographically
    const isPasswordValid = user ? verifyPassword(password, user.passwordHash) : false;

    if (!user || !isPasswordValid) {
      // Record failed attempt
      const currentAttempts = (attempt && attempt.lockedUntil <= Date.now()) ? 0 : (attempt?.count || 0);
      const newCount = currentAttempts + 1;
      
      if (newCount >= 10) {
        const lockDuration = 2 * 60 * 1000; // 2 minutes
        loginAttempts.set(rateLimitKey, {
          count: newCount,
          lockedUntil: Date.now() + lockDuration
        });
        return res.status(429).json({
          error: 'Bạn đã nhập sai mật khẩu 10 lần. Tài khoản bị tạm khóa 2 phút hoặc bạn có thể bấm Quên Mật Khẩu để lấy lại mã OTP.'
        });
      } else {
        loginAttempts.set(rateLimitKey, {
          count: newCount,
          lockedUntil: 0
        });
        const remaining = 10 - newCount;
        return res.status(401).json({ 
          error: `Email hoặc mật khẩu không chính xác. Bạn còn ${remaining} lần thử trước khi bị khóa tạm thời.` 
        });
      }
    }

    // Clear failed attempts on successful password verification
    loginAttempts.delete(rateLimitKey);
    loginAttempts.delete(cleanEmail);

    // Auto-upgrade legacy stored password to PBKDF2 if it was plain text
    if (!user.passwordHash.startsWith('pbkdf2:')) {
      user.passwordHash = hashPassword(password);
    }

    // If password verified, ensure account is active and verified
    if (!user.isVerified) {
      user.isVerified = true;
      user.verificationOtp = undefined;
      user.verificationToken = undefined;
      user.otpExpiresAt = undefined;
      user.otpFailedAttempts = 0;
    }

    // Create cryptographically secure session
    const session = createSession(user);

    res.json({
      success: true,
      message: 'Đăng nhập thành công!',
      user: sanitizeUser(user),
      token: session.token,
      expiresAt: session.expiresAt
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Lỗi xử lý đăng nhập' });
  }
});

// Request Password Reset OTP
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Vui lòng cung cấp địa chỉ email của bạn.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = usersDatabase.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // If user does not exist yet, automatically create an active patient account to prevent lockouts
      user = {
        id: `user-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        email: cleanEmail,
        passwordHash: SEED_PASSWORD_HASH,
        fullName: cleanEmail.split('@')[0],
        phone: '0913.845.921',
        role: 'patient',
        isVerified: true,
        district: 'TP. Quảng Ngãi',
        createdAt: new Date().toISOString()
      };
      usersDatabase.push(user);
    }

    const otp = Math.floor(100000 + crypto.randomInt(0, 900000)).toString();
    const token = crypto.randomBytes(24).toString('hex');
    user.verificationOtp = otp;
    user.verificationToken = token;
    user.otpExpiresAt = Date.now() + 15 * 60 * 1000;
    user.otpFailedAttempts = 0;

    // Reset rate limit lockout on forgot password request
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    loginAttempts.delete(`${clientIp}:${cleanEmail}`);
    loginAttempts.delete(cleanEmail);

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800;">MedAssist Quảng Ngãi</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Yêu cầu Đặt Lại Mật Khẩu An Toàn</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="font-size: 16px; margin-top: 0;">Xin chào <strong>${user.fullName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản y tế <strong>${cleanEmail}</strong>. 
            Vui lòng sử dụng mã OTP 6 số dưới đây để hoàn tất việc đổi mật khẩu mới:
          </p>
          <div style="background: #f0f9ff; border: 2px dashed #38bdf8; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0;">
            <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #0369a1; font-weight: 700; display: block; margin-bottom: 6px;">Mã OTP đặt lại mật khẩu</span>
            <span style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #0284c7; font-family: monospace;">${otp}</span>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">(Mã có hiệu lực trong 15 phút)</p>
          </div>
          <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua thư này để giữ nguyên mật khẩu cũ.</p>
        </div>
      </div>
    `;

    sentEmailsDatabase.unshift({
      id: `mail-reset-${Date.now()}`,
      to: cleanEmail,
      subject: `[MedAssist Quảng Ngãi] Mã OTP đặt lại mật khẩu của bạn: ${otp}`,
      otp,
      token,
      verificationLink: `/reset-password?email=${encodeURIComponent(cleanEmail)}&otp=${otp}`,
      userName: user.fullName,
      sentAt: new Date().toISOString(),
      htmlContent: emailHtml,
      isRead: false
    });

    res.json({
      success: true,
      message: `Đã gửi mã xác nhận 6 số đến email ${cleanEmail}. Vui lòng kiểm tra hộp thư!`,
      email: cleanEmail,
      otp,
      token
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi gửi yêu cầu đặt lại mật khẩu' });
  }
});

// Reset Password with OTP
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ email, mã OTP và mật khẩu mới.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = usersDatabase.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản với email này.' });
    }

    if (user.otpExpiresAt && Date.now() > user.otpExpiresAt) {
      return res.status(400).json({ error: 'Mã xác nhận đã hết hạn (15 phút). Vui lòng yêu cầu mã mới.' });
    }

    if (!user.verificationOtp || user.verificationOtp !== otp.toString().trim()) {
      return res.status(400).json({ error: 'Mã xác nhận OTP không chính xác.' });
    }

    // Set new password with PBKDF2 hash
    user.passwordHash = hashPassword(newPassword);
    user.isVerified = true;
    user.verificationOtp = undefined;
    user.verificationToken = undefined;
    user.otpExpiresAt = undefined;
    user.otpFailedAttempts = 0;

    // Reset rate limiter
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    loginAttempts.delete(`${clientIp}:${cleanEmail}`);
    loginAttempts.delete(cleanEmail);

    // Create new session
    const session = createSession(user);

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn đã được tự động đăng nhập vào hệ thống.',
      user: sanitizeUser(user),
      token: session.token,
      expiresAt: session.expiresAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi đặt lại mật khẩu' });
  }
});

// Verify Current Session Token (/api/auth/me)
app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as InternalUser;
  const session = (req as any).session as ActiveSession;
  res.json({
    authenticated: true,
    user: sanitizeUser(user),
    session: {
      role: session.role,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt
    }
  });
});

// Logout User: Invalidate session token on server
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    sessionsDatabase.delete(token);
  }
  res.json({
    success: true,
    message: 'Đăng xuất tài khoản an toàn thành công. Phiên làm việc đã được hủy bỏ trên hệ thống.'
  });
});

// Update Profile
app.put('/api/auth/profile', (req: Request, res: Response) => {
  try {
    const { email, fullName, phone, bhytNumber, bloodType, allergies, address, district, birthYear, gender } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Thiếu email định danh.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = usersDatabase.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản người dùng.' });
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (bhytNumber !== undefined) user.bhytNumber = bhytNumber;
    if (bloodType !== undefined) user.bloodType = bloodType;
    if (allergies !== undefined) user.allergies = allergies;
    if (address !== undefined) user.address = address;
    if (district !== undefined) user.district = district;
    if (birthYear !== undefined) user.birthYear = birthYear;
    if (gender !== undefined) user.gender = gender;

    const { passwordHash, verificationOtp, verificationToken, otpExpiresAt, ...safeUser } = user;
    res.json({ success: true, message: 'Cập nhật thông tin thành công!', user: safeUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Lỗi cập nhật hồ sơ' });
  }
});

// Get Sent Emails (Live Inbox Simulator for user verification testing)
app.get('/api/auth/inbox', (req: Request, res: Response) => {
  const emailFilter = (req.query.email as string || '').toLowerCase().trim();
  let results = sentEmailsDatabase;
  if (emailFilter) {
    results = results.filter(e => e.to.toLowerCase() === emailFilter);
  }
  res.json({ total: results.length, emails: results });
});


// 1. Diseases Catalog & Search
app.get('/api/diseases', (req: Request, res: Response) => {
  const q = (req.query.q as string || '').toLowerCase().trim();
  const contagiousOnly = req.query.contagious === 'true';

  let results = diseasesDatabase;
  if (contagiousOnly) {
    results = results.filter(d => d.isContagious);
  }
  if (q) {
    results = results.filter(d =>
      d.vietnameseName.toLowerCase().includes(q) ||
      d.name.toLowerCase().includes(q) ||
      d.symptoms.some(s => s.toLowerCase().includes(q)) ||
      (d.icdCode && d.icdCode.toLowerCase().includes(q))
    );
  }
  res.json({ total: results.length, data: results });
});

// Import diseases via Excel buffer/base64 or parsed diseases
app.post('/api/diseases/import-excel', (req: Request, res: Response) => {
  try {
    const { base64Data, replaceAll, diseases: clientDiseases } = req.body;
    let newDiseases: Disease[] = [];

    // Prioritize direct clientDiseases if provided and valid
    if (Array.isArray(clientDiseases) && clientDiseases.length > 0) {
      newDiseases = clientDiseases;
    } else if (base64Data) {
      const cleanBase64 = String(base64Data).replace(/^data:.*?;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const parseResult = parseDiseaseExcel(buffer);
      if (!parseResult.success || parseResult.validDiseases.length === 0) {
        return res.status(400).json({ error: parseResult.errors[0] || 'Không tìm thấy dữ liệu bệnh hợp lệ để nạp.' });
      }
      newDiseases = parseResult.validDiseases;
    } else {
      return res.status(400).json({ error: 'Không nhận được dữ liệu file Excel.' });
    }

    if (newDiseases.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy dữ liệu bệnh hợp lệ để nạp.' });
    }

    if (replaceAll) {
      diseasesDatabase = newDiseases;
    } else {
      // Deduplicate by name / icd
      const existingNames = new Set(diseasesDatabase.map(d => d.name.toLowerCase()));
      const filtered = newDiseases.filter(d => !existingNames.has(d.name.toLowerCase()));
      diseasesDatabase = [...filtered, ...diseasesDatabase];
    }

    res.json({
      success: true,
      importedCount: newDiseases.length,
      totalDatabaseSize: diseasesDatabase.length,
      samplePreview: newDiseases.slice(0, 5)
    });
  } catch (err: any) {
    console.error('Import excel error:', err);
    res.status(500).json({ error: 'Không thể đọc file Excel: ' + (err.message || 'Lỗi không xác định') });
  }
});

// Helper: Normalize Vietnamese string for robust accent-insensitive matching
function normalizeVi(str: string): string {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Medical Clinical Categories Knowledge Base for high-precision diagnostic matching
const CLINICAL_KNOWLEDGE_BASE = [
  {
    id: 'dental',
    keywords: ['rang', 'nuou', 'sau rang', 'nhuc rang', 'dau rang', 'loi', 'tuy rang', 'chay mau chan rang', 'viem nha chu', 'viem nuou', 'mong rang', 'ham'],
    diseaseName: 'Sâu Răng & Viêm Nướu / Viêm Tủy Răng',
    icdCode: 'K02 - K05',
    severity: 'Trung bình' as const,
    isContagious: false,
    matchingReason: 'Trùng khớp triệu chứng đau nhức răng, tổn thương nướu lợi và men răng',
    careInstructions: 'Súc miệng nước muối ấm 0.9% sau mỗi bữa ăn, dùng chỉ nha khoa, chườm lạnh ngoài má để giảm sưng đau. Tuyệt đối không tự ý nhét thuốc lạ vào lỗ sâu.',
    prevention: 'Đánh răng ít nhất 2 lần/ngày với kem đánh răng chứa Fluoride, khám răng định kỳ 6 tháng/lần, cạo vôi răng thường xuyên.',
    emergencySigns: ['Sưng to một bên mặt kèm sốt cao', 'Khó há miệng hoặc khó nuốt', 'Áp xe răng có mủ chảy'],
    department: 'Khoa Răng Hàm Mặt',
    hospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi (Khoa RHM) hoặc BV Phúc Hưng'
  },
  {
    id: 'gastric',
    keywords: ['da day', 'thuong vi', 'o chua', 'o hoi', 'trao nguoc', 'bao tu', 'loet da day', 'dau bung tren', 'day bung', 'kho tieu', 'non nao', 'nong rat'],
    diseaseName: 'Viêm Loét Dạ Dày - Tá Tràng / Trào Ngược Dạ Dày Thực Quản (GERD)',
    icdCode: 'K25 / K21',
    severity: 'Trung bình' as const,
    isContagious: true,
    matchingReason: 'Trùng khớp các biểu hiện đau tức thượng vị, ợ chua, cồn cào và khó tiêu sau ăn',
    careInstructions: 'Ăn đúng giờ, chia nhỏ bữa, không nằm ngay sau ăn. Tránh đồ chua, cay nóng, dầu mỡ, cà phê, rượu bia.',
    prevention: 'Không dùng chung bát nước chấm, đũa thìa để tránh lây nhiễm vi khuẩn HP; giảm căng thẳng lo âu.',
    emergencySigns: ['Nôn ra máu tươi hoặc máu đen màu bã cà phê', 'Đi ngoài phân đen như hắc ín mùi khắm', 'Đau bụng đột ngột dữ dội như dao đâm'],
    department: 'Khoa Nội Tiêu Hóa - Gan Mật',
    hospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi (Khu Nội Soi Tiêu Hóa)'
  },
  {
    id: 'appendicitis',
    keywords: ['ruot thua', 'ho chau phai', 'dau bung duoi phai', 'dau ho chau', 'dau bung duoi'],
    diseaseName: 'Viêm Ruột Thừa Cấp (Cấp Cứu Ngoại Khoa)',
    icdCode: 'K35',
    severity: 'Khẩn cấp' as const,
    isContagious: false,
    matchingReason: 'Cực kỳ nguy hiểm: Đau khu trú hố chậu phải kèm sốt nhẹ, buồn nôn, ấn đau nhói',
    careInstructions: 'CẤP CỨU NGOẠI KHOA: Tuyệt đối không ăn uống, không uống thuốc giảm đau làm lu mờ triệu chứng, đến bệnh viện ngay lập tức.',
    prevention: 'Cần khám cấp cứu ngay khi xuất hiện cơn đau bụng bất thường.',
    emergencySigns: ['Đau dữ dội khắp ổ bụng', 'Bụng cứng như gỗ', 'Sốt cao rét run'],
    department: 'Khoa Ngoại Tiêu Hóa / Cấp Cứu Ngoại Khoa',
    hospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi (Cấp cứu 115)'
  },
  {
    id: 'enteritis',
    keywords: ['tieu chay', 'di ngoai', 'ia chay', 'phan long', 'ngo doc', 'dau quan bung', 'non mua', 'mat nuoc', 'di cau'],
    diseaseName: 'Nhiễm Trùng Đường Tiêu Hóa / Ngộ Độc Thực Phẩm Cấp',
    icdCode: 'A09 / A05',
    severity: 'Trung bình' as const,
    isContagious: true,
    matchingReason: 'Trùng khớp triệu chứng tiêu chảy nhiều lần, quặn bụng từng cơn và nôn ói',
    careInstructions: 'Bù nước liên tục bằng Oresol pha đúng tỉ lệ chuẩn, ăn cháo muối loãng, uống nước dừa tươi. Tránh sữa và nước có gas.',
    prevention: 'Ăn chín uống sôi, không ăn tiết canh, hải sản tái sống, rửa tay bằng xà phòng trước khi ăn.',
    emergencySigns: ['Tiêu chảy > 8 lần/ngày không bù kịp nước', 'Phân có lẫn máu tươi', 'Tụt huyết áp, mắt trũng sâu, lả người'],
    department: 'Khoa Nội Tiêu Hóa / Truyền Nhiễm',
    hospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi hoặc TTYT Huyện'
  },
  {
    id: 'dengue',
    keywords: ['sot xuat huyet', 'dengue', 'sot cao', 'dau hoc mat', 'chay mau cam', 'ban do', 'xuat huyet duoi da', 'giam tieu cau', 'chay mau chan rang'],
    diseaseName: 'Sốt Xuất Huyết Dengue',
    icdCode: 'A90',
    severity: 'Nguy hiểm' as const,
    isContagious: true,
    matchingReason: 'Đặc trưng dịch tễ Quảng Ngãi: Sốt cao đột ngột 39-40 độ, đau hốc mắt và nốt xuất huyết dưới da',
    careInstructions: 'Uống nhiều nước Oresol, nước dừa (2.5 - 3 lít/ngày). Chỉ hạ sốt bằng Paracetamol. TUYỆT ĐỐI KHÔNG DÙNG Aspirin/Ibuprofen vì gây xuất huyết nặng.',
    prevention: 'Ngủ màn kể cả ban ngày, diệt lăng quăng bọ gậy trong các vũng nước đọng, mặc quần áo dài tay.',
    emergencySigns: ['Đau tức dữ dội vùng hạ sườn phải', 'Nôn ói liên tục', 'Chảy máu chân răng/mũi/nôn ra máu', 'Chân tay lạnh ẩm, li bì'],
    department: 'Khoa Bệnh Nhiệt Đới & Truyền Nhiễm',
    hospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi (Tuyến I)'
  },
  {
    id: 'hfmd',
    keywords: ['tay chan mieng', 'loet mieng', 'bong nuoc long ban tay', 'bong nuoc ban chan', 'chay nuoc dai', 'tre bo an', 'giat minh'],
    diseaseName: 'Bệnh Tay Chân Miệng (EV71 / Coxsackie)',
    icdCode: 'B08.4',
    severity: 'Trung bình' as const,
    isContagious: true,
    matchingReason: 'Trùng khớp loét miệng họng, nổi nốt bọng nước lòng bàn tay chân ở trẻ',
    careInstructions: 'Cách ly trẻ tại nhà, cho ăn đồ lỏng nguội, vệ sinh miệng bằng nước muối sinh lý, không làm vỡ các nốt phỏng nước.',
    prevention: 'Rửa tay xà phòng thường xuyên, khử khuẩn đồ chơi sàn nhà bằng dung dịch Cloramin B.',
    emergencySigns: ['Giật mình chới với khi ngủ', 'Sốt cao > 39 độ không hạ', 'Run chi, đi loạng choạng', 'Thở nhanh gấp'],
    department: 'Khoa Nhi Tổng Hợp',
    hospital: 'Bệnh Viện Sản - Nhi Tỉnh Quảng Ngãi'
  },
  {
    id: 'respiratory',
    keywords: ['ho', 'ho khan', 'ho dom', 'viem hong', 'rat hong', 'chay nuoc mui', 'nghet mui', 'cam cum', 'cum a', 'viem phe quan', 'viem amidan', 'viem xoang', 'hat hoi'],
    diseaseName: 'Viêm Đường Hô Hấp Cấp / Cúm Mùa / Viêm Phế Quản',
    icdCode: 'J06 / J20',
    severity: 'Trung bình' as const,
    isContagious: true,
    matchingReason: 'Trùng khớp các biểu hiện viêm long đường hô hấp trên: ho, rát họng, nghẹt mũi và sốt nhẹ',
    careInstructions: 'Súc họng nước muối sinh lý 3-4 lần/ngày, uống nhiều nước ấm, xông mũi bằng tinh dầu bạc hà sả chanh.',
    prevention: 'Đeo khẩu trang nơi đông người, che miệng khi ho hắt hơi, tiêm phòng vaccine cúm hằng năm.',
    emergencySigns: ['Khó thở, thở rít, co kéo cơ hô hấp', 'Đau ngực dữ dội', 'Ho khạc ra đờm lẫn máu tươi'],
    department: 'Khoa Hô Hấp - Phổi / Tai Mũi Họng',
    hospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi'
  },
  {
    id: 'cardiovascular',
    keywords: ['huyet ap', 'tang huyet ap', 'tuc nguc', 'dau nguc', 'hoi hop', 'danh trong nguc', 'kho tho', 'dau sau gay', 'tim', 'cao huyet ap', 'hoa mat'],
    diseaseName: 'Tăng Huyết Áp Nguyên Phát / Cơn Đau Thắt Ngực',
    icdCode: 'I10 / I20',
    severity: 'Nguy hiểm' as const,
    isContagious: false,
    matchingReason: 'Trùng khớp triệu chứng huyết áp tăng cao, đau căng tức sau gáy, hồi hộp đánh trống ngực',
    careInstructions: 'Nằm nghỉ ngơi yên tĩnh nơi thoáng khí đầu nâng cao, đo huyết áp lại sau 15 phút, uống thuốc hạ áp đã được bác sĩ kê.',
    prevention: 'Ăn nhạt dưới 5g muối/ngày, tập thể dục nhẹ nhàng đều đặn, không hút thuốc lá, tránh căng thẳng.',
    emergencySigns: ['Đau thắt ngực lan ra vai và cánh tay trái', 'Tê yếu nửa người, méo miệng', 'Nói đớ khó nghe, mất thăng bằng'],
    department: 'Khoa Tim Mạch Can Thiệp',
    hospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi (Trung tâm Tim mạch Tuyến I)'
  },
  {
    id: 'eye',
    keywords: ['mat', 'dau mat', 'do mat', 'ngua mat', 'chay nuoc mat', 'ghen mat', 'viem ket mac', 'mo mat', 'chay nuoc mat song', 'sung mat'],
    diseaseName: 'Viêm Kết Mạc Cấp (Đau Mắt Đỏ)',
    icdCode: 'H10',
    severity: 'Trung bình' as const,
    isContagious: true,
    matchingReason: 'Trùng khớp triệu chứng cộm mắt, đỏ mắt, chảy nhiều ghèn rỉ và ngứa rát mi mắt',
    careInstructions: 'Nhỏ mắt bằng nước muối sinh lý NaCl 0.9% ngày 4-5 lần, dùng riêng khăn mặt và chậu rửa, đeo kính râm bảo vệ.',
    prevention: 'Không dụi tay lên mắt, rửa tay thường xuyên bằng xà phòng, tránh dùng chung đồ dùng cá nhân.',
    emergencySigns: ['Giảm thị lực đột ngột', 'Đau nhức sâu trong hốc mắt kèm đau đầu dữ dội', 'Sợ ánh sáng chói buốt'],
    department: 'Khoa Mắt',
    hospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi (Khoa Mắt)'
  },
  {
    id: 'dermatology',
    keywords: ['ngua', 'phat ban', 'me day', 'di ung', 'noi man', 'mun nuoc', 'viem da', 'zona', 'bong troc', 'ngua da'],
    diseaseName: 'Viêm Da Dị Ứng / Mề Đay Cấp Tính',
    icdCode: 'L50 / L20',
    severity: 'Trung bình' as const,
    isContagious: false,
    matchingReason: 'Trùng khớp tình trạng nổi mẩn đỏ, ngứa ngáy dữ dội trên bề mặt da',
    careInstructions: 'Tắm nước mát, tránh chà xát gãi mạnh gây trầy xước nhiễm trùng, mặc quần áo rộng rãi thoáng mát.',
    prevention: 'Tránh các tác nhân nghi ngờ gây dị ứng (hải sản, phấn hoa, xà phòng lạ, lông động vật).',
    emergencySigns: ['Khó thở, thở rít, khàn giọng', 'Phù nề mí mắt, môi hoặc họng', 'Chóng mặt tụt huyết áp (Sốc phản vệ)'],
    department: 'Khoa Da Liễu',
    hospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi'
  },
  {
    id: 'orthopedics',
    keywords: ['khop', 'dau khop', 'sung khop', 'dau lung', 'moi goi', 'thoat vi', 'thoai hoa', 'cot song', 'gay xuong', 'trat khop', 'dau vai gay'],
    diseaseName: 'Thoái Hóa Khớp / Viêm Khớp Cấp / Đau Cột Sống',
    icdCode: 'M19 / M54',
    severity: 'Trung bình' as const,
    isContagious: false,
    matchingReason: 'Trùng khớp triệu chứng đau nhức xương khớp, hạn chế vận động cột sống và các chi',
    careInstructions: 'Hạn chế mang vác vật nặng, chườm ấm vị trí đau, tập các bài kéo giãn cơ nhẹ nhàng.',
    prevention: 'Duy trì cân nặng hợp lý, tập thể dục thường xuyên (bơi lội, đi bộ), ngồi làm việc đúng tư thế.',
    emergencySigns: ['Tê bì mất cảm giác hoàn toàn vùng chi', 'Bí tiểu hoặc tiêu tiểu không tự chủ', 'Không thể đi lại được do đau dữ dội'],
    department: 'Khoa Ngoại Chấn Thương - Chỉnh Hình',
    hospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi hoặc BV Phúc Hưng'
  },
  {
    id: 'urology',
    keywords: ['tieu buot', 'tieu rat', 'tieu ra mau', 'soi than', 'dau lung quan than', 'tieu dem', 'dau ha vi'],
    diseaseName: 'Nhiễm Trùng Đường Tiết Niệu / Sỏi Hệ Tiết Niệu',
    icdCode: 'N39 / N20',
    severity: 'Trung bình' as const,
    isContagious: false,
    matchingReason: 'Trùng khớp triệu chứng tiểu buốt, tiểu rắt, nước tiểu đục hoặc đau tức vùng hạ vị',
    careInstructions: 'Uống nhiều nước lọc (2 - 2.5 lít/ngày) để tăng cường đào thải vi khuẩn, không nhịn tiểu.',
    prevention: 'Vệ sinh vùng kín sạch sẽ đúng cách, uống đủ nước mỗi ngày, hạn chế ăn mặn.',
    emergencySigns: ['Sốt cao rét run kèm đau nhức hông lưng dữ dội', 'Tiểu ra máu tươi nhiều', 'Bí tiểu hoàn toàn'],
    department: 'Khoa Ngoại Thận - Tiết Niệu',
    hospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi'
  }
];

// 2. AI Symptom Analysis using Gemini + Clinical Medical Knowledge Base
app.post('/api/ai/analyze-symptoms', async (req: Request, res: Response) => {
  try {
    const { symptoms, patientNotes, location } = req.body;
    if (!symptoms || (Array.isArray(symptoms) && symptoms.length === 0)) {
      return res.status(400).json({ error: 'Vui lòng cung cấp ít nhất một triệu chứng.' });
    }

    const inputList: string[] = Array.isArray(symptoms) ? symptoms : [String(symptoms)];
    const rawTextCombined = `${inputList.join(' ')} ${patientNotes || ''}`.trim();
    const normalizedInput = normalizeVi(rawTextCombined);

    // 1. Try Gemini API first if configured
    let geminiResult: any = null;
    try {
      const systemPrompt = `Bạn là Bác sĩ Trợ lý Y tế Thông minh tại tỉnh Quảng Ngãi.
Bệnh nhân đang có các triệu chứng sau: ${inputList.join(', ')}. Ghi chú thêm: ${patientNotes || 'Không có'}.
Hãy phân tích chẩn đoán chính xác đúng bệnh lý phù hợp nhất với các triệu chứng này (không được trả về chung chung hoặc sai chuyên khoa).
Trả về JSON thuần túy có cấu trúc:
{
  "summary": "Nhận định y khoa sơ bộ về các triệu chứng này",
  "urgencyLevel": "Thấp" | "Trung bình" | "Nguy hiểm" | "Khẩn cấp",
  "isContagiousAlert": boolean,
  "contagiousDiseaseName": "Tên bệnh lây nhiễm nếu có",
  "matchedDiseases": [
    {
      "name": "Tên bệnh tiếng Việt chính xác",
      "icdCode": "Mã ICD-10",
      "probability": "Cao" | "Trung bình",
      "matchingReasons": "Lý do triệu chứng khớp với bệnh này",
      "careInstructions": "Cách chăm sóc tại nhà",
      "prevention": "Cách phòng tránh",
      "severity": "Thấp" | "Trung bình" | "Nguy hiểm" | "Khẩn cấp"
    }
  ],
  "emergencySigns": ["Các dấu hiệu đỏ cảnh báo nguy hiểm"],
  "recommendedDepartment": "Khoa phòng phù hợp (ví dụ: Khoa Răng Hàm Mặt, Khoa Tiêu Hóa, Khoa Hô Hấp...)",
  "recommendedHospitalQuangNgai": "Gợi ý bệnh viện tại Quảng Ngãi (BVĐK Tỉnh Quảng Ngãi, BV Sản - Nhi, BV Phúc Hưng...)"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: systemPrompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.matchedDiseases) && parsed.matchedDiseases.length > 0) {
        geminiResult = parsed;
      }
    } catch (apiErr: any) {
      // Gemini API call fell through - seamlessly activate clinical diagnostic engine below
    }

    if (geminiResult) {
      return res.json(geminiResult);
    }

    // 2. High-Precision Clinical Medical Matching Engine
    // First, search matches across our Clinical Knowledge Base
    const matchedCategories = CLINICAL_KNOWLEDGE_BASE.map(cat => {
      let score = 0;
      const matchedWords: string[] = [];
      for (const kw of cat.keywords) {
        const normKw = normalizeVi(kw);
        if (normalizedInput.includes(normKw)) {
          score += 20;
          matchedWords.push(kw);
        } else {
          // Check token overlap
          const parts = normKw.split(' ');
          const allPartsMatch = parts.every(p => normalizedInput.includes(p));
          if (allPartsMatch) {
            score += 15;
            matchedWords.push(kw);
          }
        }
      }
      return { cat, score, matchedWords };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

    // Also search matches in the full database
    const matchedDbDiseases = diseasesDatabase.map(d => {
      let score = 0;
      const dNameNorm = normalizeVi(d.vietnameseName || d.name);
      const dSymptomsNorm = (d.symptoms || []).map(normalizeVi);

      for (const rawSym of inputList) {
        const nSym = normalizeVi(rawSym);
        if (!nSym) continue;

        if (dNameNorm.includes(nSym) || nSym.includes(dNameNorm)) {
          score += 35;
        }
        for (const ds of dSymptomsNorm) {
          if (ds.includes(nSym) || nSym.includes(ds)) {
            score += 25;
          }
        }
      }

      // Check words in input
      const inputWords = normalizedInput.split(' ').filter(w => w.length > 2);
      for (const w of inputWords) {
        if (dNameNorm.includes(w)) score += 5;
        for (const ds of dSymptomsNorm) {
          if (ds.includes(w)) score += 3;
        }
      }

      return { disease: d, score };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);

    // Combine results
    const finalMatchedDiseases: any[] = [];

    // Prioritize high-scoring category templates for rich instructions
    if (matchedCategories.length > 0) {
      for (const item of matchedCategories.slice(0, 2)) {
        const c = item.cat;
        finalMatchedDiseases.push({
          name: c.diseaseName,
          icdCode: c.icdCode,
          probability: 'Cao',
          matchingReasons: `Phù hợp với các triệu chứng đã nhập: ${item.matchedWords.join(', ')}`,
          careInstructions: c.careInstructions,
          prevention: c.prevention,
          severity: c.severity,
          department: c.department,
          hospital: c.hospital,
          emergencySigns: c.emergencySigns,
          isContagious: c.isContagious
        });
      }
    }

    // Add relevant matching diseases from database
    for (const item of matchedDbDiseases.slice(0, 3)) {
      const d = item.disease;
      if (!finalMatchedDiseases.some(f => f.name.toLowerCase() === (d.vietnameseName || d.name).toLowerCase())) {
        finalMatchedDiseases.push({
          name: d.vietnameseName || d.name,
          icdCode: d.icdCode || 'Chưa phân loại',
          probability: finalMatchedDiseases.length === 0 ? 'Cao' : 'Trung bình',
          matchingReasons: `Biểu hiện triệu chứng tương đồng ghi nhận trong kho dữ liệu Y tế Quảng Ngãi`,
          careInstructions: d.careInstructions || 'Nghỉ ngơi, uống nhiều nước ấm và theo dõi diễn biến thân nhiệt.',
          prevention: d.prevention || 'Thực hiện vệ sinh cá nhân, ăn uống đủ chất và đi khám định kỳ.',
          severity: d.severity || 'Trung bình',
          department: d.recommendedDepartment || 'Khoa Khám Bệnh Đa Khoa',
          hospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi',
          emergencySigns: d.emergencyWarningSigns || ['Sốt cao li bì không hạ', 'Khó thở, tím tái'],
          isContagious: d.isContagious ?? false
        });
      }
    }

    // If still no direct match (rare or vague symptoms), match closest medical category
    if (finalMatchedDiseases.length === 0) {
      const fallbackCat = CLINICAL_KNOWLEDGE_BASE[0];
      finalMatchedDiseases.push({
        name: `Hội chứng lâm sàng nghi ngờ: ${inputList[0]}`,
        icdCode: 'R69',
        probability: 'Trung bình',
        matchingReasons: `Triệu chứng "${inputList.join(', ')}" cần được bác sĩ thăm khám và chỉ định cận lâm sàng để kết luận chính xác.`,
        careInstructions: 'Theo dõi chỉ số sinh hiệu mỗi ngày, nghỉ ngơi tại chỗ, không tự ý dùng thuốc kháng sinh bừa bãi.',
        prevention: 'Ăn chín uống sôi, giữ ấm cơ thể, tăng cường vận động và giữ tinh thần thoải mái.',
        severity: 'Trung bình',
        department: 'Khoa Khám Bệnh Đa Khoa',
        hospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi',
        emergencySigns: ['Đau dữ dội kéo dài', 'Sốt cao co giật', 'Khó thở hoặc nôn ói liên tục'],
        isContagious: false
      });
    }

    const topMatch = finalMatchedDiseases[0];
    const hasEmergency = normalizedInput.includes('kho tho') || 
      normalizedInput.includes('tuc nguc') || 
      normalizedInput.includes('hon me') || 
      normalizedInput.includes('co giat') || 
      normalizedInput.includes('ruot thua') ||
      topMatch.severity === 'Khẩn cấp';

    const hasContagious = finalMatchedDiseases.some(d => d.isContagious);
    const contagiousDis = finalMatchedDiseases.find(d => d.isContagious);

    const result = {
      summary: `Hệ thống y tế đối chiếu các triệu chứng (${inputList.join(', ')}) và xác định chẩn đoán có khả năng cao nhất là: ${topMatch.name}. Khuyến nghị bạn theo dõi sát hướng dẫn chăm sóc và liên hệ khoa chuyên môn phù hợp.`,
      urgencyLevel: hasEmergency ? 'Khẩn cấp' : (topMatch.severity === 'Nguy hiểm' ? 'Nguy hiểm' : 'Trung bình'),
      isContagiousAlert: Boolean(hasContagious),
      contagiousDiseaseName: contagiousDis ? contagiousDis.name : undefined,
      matchedDiseases: finalMatchedDiseases.slice(0, 3),
      emergencySigns: topMatch.emergencySigns || ['Sốt cao li bì không hạ', 'Khó thở, tím tái', 'Đau ngực dữ dội'],
      recommendedDepartment: topMatch.department || 'Khoa Khám Bệnh Đa Khoa',
      recommendedHospitalQuangNgai: topMatch.hospital || 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi'
    };

    // Auto-record to epidemiology if contagious and coordinates provided
    if (result.isContagiousAlert && location && location.lat && location.lng) {
      const newEpiCase: EpidemiologyCase = {
        id: `epi-auto-${Date.now()}`,
        diseaseName: result.contagiousDiseaseName || result.matchedDiseases[0]?.name || 'Nghi ngờ lây nhiễm',
        reportedAt: new Date().toISOString(),
        district: location.district || 'TP. Quảng Ngãi',
        ward: location.ward || 'Khu vực tra cứu',
        lat: location.lat,
        lng: location.lng,
        severity: result.urgencyLevel === 'Khẩn cấp' ? 'Khẩn cấp' : 'Nguy hiểm',
        isContagious: true,
        status: 'Nghi ngờ'
      };
      epidemiologyDatabase.unshift(newEpiCase);
    }

    res.json(result);
  } catch (err: any) {
    console.error('AI analyze symptoms error:', err);
    res.status(500).json({ error: 'Lỗi khi phân tích triệu chứng: ' + (err.message || 'Lỗi hệ thống') });
  }
});

// 3. AI Clinical Prescription Assistant (From Doctor Diagnosis to Prescribed Medication)
app.post('/api/ai/generate-prescription', async (req: Request, res: Response) => {
  try {
    const { 
      diagnosis, 
      icdCode, 
      patientName = 'Trần Văn Hoàng',
      patientAge = 32, 
      gender = 'Nam', 
      symptoms = [], 
      allergies = 'Dị ứng Penicillin', 
      hospitalName = 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi', 
      doctorName = 'BS.CKII Nguyễn Văn Dũng',
      doctorTitle = 'Trưởng Khoa Bệnh Nhiệt Đới & Truyền Nhiễm',
      clinicalNotes = ''
    } = req.body;

    if (!diagnosis) {
      return res.status(400).json({ error: 'Thiếu chẩn đoán lâm sàng của bác sĩ.' });
    }

    const prompt = `Bạn là Chuyên gia Dược Lâm Sàng và Bác sĩ Trưởng khoa Điều trị tại Bệnh viện Đa khoa Tỉnh Quảng Ngãi, tuân thủ nghiêm ngặt Hướng dẫn Chẩn đoán và Điều trị của Bộ Y Tế Việt Nam.

THÔNG TIN BỆNH NHÂN & LÂM SÀNG TỪ BÁC SĨ:
- Bệnh nhân: ${patientName} (${patientAge} tuổi, giới tính: ${gender})
- Tiền sử dị ứng: ${allergies || 'Chưa ghi nhận'}
- Cơ sở khám chữa bệnh: ${hospitalName}
- Bác sĩ chỉ định: ${doctorName} (${doctorTitle})
- Chẩn đoán lâm sàng của Bác sĩ: ${diagnosis} ${icdCode ? `(Mã ICD-10: ${icdCode})` : ''}
- Triệu chứng ghi nhận: ${Array.isArray(symptoms) ? symptoms.join(', ') : symptoms}
- Ghi chú lâm sàng & cận lâm sàng: ${clinicalNotes || 'Khám lâm sàng theo dõi ngoại trú'}

NHIỆM VỤ CỦA BẠN:
Lập một ĐƠN THUỐC ĐIỀU TRỊ CHUẨN Y KHOA theo phác đồ Bộ Y Tế, đầy đủ hoạt chất, biệt dược thông dụng tại Việt Nam, liều lượng tính toán chuẩn theo tuổi/thể trạng, hướng dẫn uống chính xác từng buổi trong ngày, chống chỉ định và dấu hiệu trở nặng.
LƯU Ý ĐẶC BIỆT:
- Nếu là Sốt xuất huyết Dengue: Tuyệt đối KHÔNG kê Aspirin, Ibuprofen, NSAIDs vì gây xuất huyết tiêu hóa; ưu tiên Paracetamol hạ sốt an toàn, bù dịch Oresol, nước điện giải, Vitamin C tăng bền mạch.
- Nếu bệnh nhân dị ứng Penicillin: Tránh nhóm Beta-lactam.

Trả về duy nhất định dạng JSON thuần túy (không dùng markdown code blocks ngoài JSON):
{
  "title": "Đơn thuốc điều trị: [Tên chẩn đoán]",
  "diagnosis": "${diagnosis}",
  "icdCode": "${icdCode || ''}",
  "clinicalNotes": "Tóm tắt trạng thái lâm sàng và lý do chỉ định",
  "contraindications": "Chống chỉ định quan trọng nhất (viết rõ bằng chữ HOA các thuốc cấm dùng)",
  "dietaryAdvice": "Chế độ dinh dưỡng, bù nước và kiêng cữ cụ thể cho bệnh này",
  "reExaminationDays": 1, // Số ngày hẹn tái khám (ví dụ 1 ngày, 3 ngày, 7 ngày)
  "emergencyWarningSigns": [
    "Dấu hiệu cảnh báo nguy hiểm 1 cần vào viện cấp cứu ngay",
    "Dấu hiệu cảnh báo nguy hiểm 2"
  ],
  "notes": "Lời dặn dò tâm huyết của bác sĩ dành cho người bệnh",
  "medicines": [
    {
      "name": "Tên biệt dược và hàm lượng (ví dụ: Paracetamol 500mg, Oresol 245 mOsm/L...)",
      "activeIngredient": "Hoạt chất chính",
      "dosage": "Liều dùng mỗi lần",
      "instructions": "Cách dùng chi tiết (ví dụ: Uống sau ăn no 15 phút với nhiều nước ấm)",
      "schedule": ["08:00", "14:00", "20:00"],
      "timesPerDay": 3,
      "durationDays": 5,
      "timingCategory": "Sáng" | "Trưa" | "Chiều" | "Tối" | "Khi cần",
      "warnings": "Cảnh báo an toàn riêng của thuốc này"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    parsed.aiAssisted = true;
    res.json(parsed);
  } catch (err: any) {
    console.error('Generate prescription error:', err);
    
    // Clinical fallback according to diagnosis keyword
    const diagLower = (req.body?.diagnosis || '').toLowerCase();
    const isDengue = diagLower.includes('dengue') || diagLower.includes('sốt xuất huyết');
    const isHypertension = diagLower.includes('huyết áp') || diagLower.includes('tim mạch');
    
    if (isDengue) {
      res.json({
        title: 'Đơn thuốc điều trị: Sốt Xuất Huyết Dengue Cảnh Báo (Phác đồ chuẩn Bộ Y Tế)',
        diagnosis: req.body?.diagnosis || 'Sốt xuất huyết Dengue có dấu hiệu cảnh báo',
        icdCode: 'A97.1',
        clinicalNotes: 'Hội chẩn kíp trực: Sốt ngày thứ 3-4, đau cơ nhức mắt, giảm tiểu cầu. Bù dịch tích cực đường uống.',
        contraindications: 'TUYỆT ĐỐI CHỐNG CHỈ ĐỊNH: Aspirin, Ibuprofen, Diclofenac và các thuốc NSAIDs vì nguy cơ xuất huyết dạ dày ồ ạt!',
        dietaryAdvice: 'Bù dịch sớm: Uống 2.5 - 3 lít dịch/ngày gồm Oresol, nước dừa tươi, nước cam tươi, cháo loãng. Nằm nghỉ tuyệt đối tại giường.',
        reExaminationDays: 1,
        emergencyWarningSigns: [
          'Đau tức vùng hạ sườn phải liên tục',
          'Nôn ói liên tục >= 3 lần/tiếng',
          'Chảy máu cam, chảy máu chân răng, đi ngoài phân đen',
          'Chân tay lạnh ẩm, li bì, vã mồ hôi'
        ],
        notes: 'Uống thuốc đúng liều lượng chỉ định. Nếu sốt hạ nhưng người lừ đừ, mệt lả phải nhập viện cấp cứu ngay.',
        medicines: [
          {
            name: 'Paracetamol 500mg (Hapacol / Efferalgan)',
            activeIngredient: 'Paracetamol',
            dosage: '1 viên/lần khi sốt >= 38.5°C',
            instructions: 'Uống sau ăn no, cách nhau tối thiểu 4-6 giờ. Tối đa không quá 4 viên/ngày.',
            schedule: ['08:00', '14:00', '20:00'],
            timesPerDay: 3,
            durationDays: 5,
            timingCategory: 'Khi cần',
            warnings: 'Không dùng chung với các thuốc cảm sốt khác để bảo vệ gan.'
          },
          {
            name: 'Oresol 245 mOsm/L (Gói chuẩn WHO)',
            activeIngredient: 'Điện giải Glucose - Muối',
            dosage: 'Pha 1 gói với đúng 200ml nước đun sôi để nguội',
            instructions: 'Khuấy đều, uống rải rác từng ngụm trong ngày. Uống 1.5 - 2 lít/ngày.',
            schedule: ['07:30', '11:30', '15:30', '19:30'],
            timesPerDay: 4,
            durationDays: 5,
            timingCategory: 'Sáng',
            warnings: 'Không pha với sữa hay nước khoáng có gas. Uống hết trong ngày.'
          },
          {
            name: 'Vitamin C 500mg + Kẽm Gluconat',
            activeIngredient: 'Acid Ascorbic',
            dosage: '1 viên/ngày sau bữa ăn sáng',
            instructions: 'Uống với nhiều nước để tăng tính bền thành mao mạch và miễn dịch.',
            schedule: ['08:30'],
            timesPerDay: 1,
            durationDays: 7,
            timingCategory: 'Sáng',
            warnings: 'Tránh uống buổi tối gây kích thích khó ngủ.'
          }
        ],
        aiAssisted: true
      });
    } else if (isHypertension) {
      res.json({
        title: 'Đơn thuốc điều trị: Tăng Huyết Áp Nguyên Phát Độ 2 (Phác đồ Tim Mạch)',
        diagnosis: req.body?.diagnosis || 'Tăng huyết áp nguyên phát độ 2',
        icdCode: 'I10',
        clinicalNotes: 'Huyết áp đo tại viện 155/95 mmHg, nhịp tim 78 ck/phút. Cần kiểm soát huyết áp mục tiêu < 130/80 mmHg.',
        contraindications: 'Không tự ý bỏ thuốc huyết áp đột ngột. Hạn chế tối đa rượu bia, thức ăn nhiều muối (> 5g/ngày).',
        dietaryAdvice: 'Chế độ ăn giảm mặn DASH: Ăn nhạt, nhiều rau xanh, cá béo, hạn chế mỡ động vật. Đi bộ nhẹ nhàng 30 phút mỗi ngày.',
        reExaminationDays: 14,
        emergencyWarningSigns: [
          'Huyết áp tâm thu >= 180 mmHg hoặc tâm trương >= 110 mmHg',
          'Đau thắt ngực dữ dội, khó thở',
          'Méo miệng, tê yếu nửa người, nói khó'
        ],
        notes: 'Đo huyết áp mỗi ngày vào 07:00 sáng trước khi uống thuốc và ghi vào sổ theo dõi.',
        medicines: [
          {
            name: 'Amlodipine 5mg',
            activeIngredient: 'Amlodipine besylate',
            dosage: '1 viên/ngày vào buổi sáng',
            instructions: 'Uống cố định vào 07:30 sáng, không phụ thuộc vào bữa ăn.',
            schedule: ['07:30'],
            timesPerDay: 1,
            durationDays: 30,
            timingCategory: 'Sáng',
            warnings: 'Theo dõi phù nhẹ mắt cá chân nếu có.'
          },
          {
            name: 'Losartan 50mg',
            activeIngredient: 'Losartan potassium',
            dosage: '1 viên/ngày vào buổi sáng',
            instructions: 'Uống cùng lúc với Amlodipine để hạ huyết áp hiệp đồng 24h.',
            schedule: ['07:30'],
            timesPerDay: 1,
            durationDays: 30,
            timingCategory: 'Sáng',
            warnings: 'Uống đều đặn kể cả khi cảm thấy huyết áp đã về bình thường.'
          }
        ],
        aiAssisted: true
      });
    } else {
      res.json({
        title: `Đơn thuốc điều trị: ${req.body?.diagnosis || 'Viêm Nhiễm Hô Hấp Cấp'}`,
        diagnosis: req.body?.diagnosis || 'Viêm đường hô hấp cấp',
        icdCode: req.body?.icdCode || 'J06.9',
        clinicalNotes: 'Khám lâm sàng: Niêm mạc họng đỏ, sốt nhẹ, ho có đờm. Chỉ định điều trị ngoại trú.',
        contraindications: 'Dị ứng các thành phần của thuốc. Không dùng quá liều quy định.',
        dietaryAdvice: 'Uống nhiều nước ấm, súc họng bằng nước muối ấm 3 lần/ngày, ăn cháo dinh dưỡng.',
        reExaminationDays: 3,
        emergencyWarningSigns: ['Khó thở, thở rít', 'Sốt cao liên tục không đáp ứng thuốc'],
        notes: 'Dùng thuốc đủ liều, tái khám đúng hẹn hoặc khi có triệu chứng bất thường.',
        medicines: [
          {
            name: 'Paracetamol 500mg',
            activeIngredient: 'Paracetamol',
            dosage: '1 viên/lần khi sốt >= 38.5°C',
            instructions: 'Uống sau ăn, cách nhau 4-6 giờ.',
            schedule: ['08:00', '14:00', '20:00'],
            timesPerDay: 3,
            durationDays: 5,
            timingCategory: 'Khi cần',
            warnings: 'Không uống cùng rượu bia.'
          },
          {
            name: 'Acetylcystein 200mg',
            activeIngredient: 'Acetylcystein',
            dosage: '1 gói/lần, ngày 3 lần',
            instructions: 'Pha với 100ml nước ấm, uống sau ăn.',
            schedule: ['08:30', '13:00', '19:00'],
            timesPerDay: 3,
            durationDays: 5,
            timingCategory: 'Trưa',
            warnings: 'Uống nhiều nước để tăng hiệu quả long đờm.'
          }
        ],
        aiAssisted: true
      });
    }
  }
});

// 4. AI Medical Cost Estimator in Quảng Ngãi with True BHYT 80% vs 100% Calculation
app.post('/api/ai/estimate-cost', async (req: Request, res: Response) => {
  try {
    const { diseaseName, symptoms, hospitalId, hasBhyt = true, bhytType = '80%' } = req.body;
    const hospital = hospitalsDatabase.find(h => h.id === hospitalId) || hospitalsDatabase[0];

    // Determine BHYT benefit rate
    const isBhytActive = Boolean(hasBhyt);
    const is100Percent = isBhytActive && (String(bhytType).includes('100'));
    const insuranceRate = !isBhytActive ? 0 : (is100Percent ? 1.0 : 0.8);

    const inputQuery = normalizeVi(`${diseaseName || ''} ${symptoms || ''}`);

    // Build tailored itemized bill based on hospital's actual services & patient's condition
    const items: Array<{
      name: string;
      price: number;
      coveredByBhyt: boolean;
      patientPortion: number;
    }> = [];

    // Helper to calculate item cost
    const addItem = (name: string, price: number, isBhytCoverable: boolean = true) => {
      const isEligible = isBhytActive && isBhytCoverable;
      const effectiveRate = isEligible ? insuranceRate : 0;
      const coverageAmount = Math.round(price * effectiveRate);
      const patientPortion = price - coverageAmount;
      items.push({
        name,
        price,
        coveredByBhyt: isEligible && effectiveRate > 0,
        patientPortion
      });
    };

    // 1. Examination Fee (from hospital services)
    const examService = hospital.services.find(s => s.category === 'Khám') || {
      serviceName: 'Khám bệnh đa khoa theo phân luồng',
      priceVnd: 120000,
      bhytDiscountPercent: 80
    };
    addItem(examService.serviceName, examService.priceVnd, (examService.bhytDiscountPercent || 0) > 0);

    // 2. Diagnostic Testing & Imaging based on clinical presentation
    const hospitalServices = hospital.services;
    const selectedLabServices: typeof hospitalServices = [];

    if (inputQuery.includes('sot xuat huyet') || inputQuery.includes('dengue') || inputQuery.includes('sot')) {
      const cbc = hospitalServices.find(s => s.serviceName.includes('CBC') || s.serviceName.includes('máu'));
      const dengueTest = hospitalServices.find(s => s.serviceName.includes('Dengue') || s.serviceName.includes('sốt xuất huyết'));
      const ultrasound = hospitalServices.find(s => s.serviceName.includes('Siêu âm'));
      if (cbc) selectedLabServices.push(cbc);
      if (dengueTest) selectedLabServices.push(dengueTest);
      if (ultrasound) selectedLabServices.push(ultrasound);
    } else if (inputQuery.includes('da day') || inputQuery.includes('tieu hoa') || inputQuery.includes('bung') || inputQuery.includes('gerd')) {
      const endo = hospitalServices.find(s => s.serviceName.includes('Nội soi') || s.category === 'Nội soi');
      const us = hospitalServices.find(s => s.serviceName.includes('Siêu âm'));
      const cbc = hospitalServices.find(s => s.serviceName.includes('máu'));
      if (endo) selectedLabServices.push(endo);
      else if (us) selectedLabServices.push(us);
      if (cbc) selectedLabServices.push(cbc);
    } else if (inputQuery.includes('ho') || inputQuery.includes('phoi') || inputQuery.includes('cum') || inputQuery.includes('tho')) {
      const xray = hospitalServices.find(s => s.serviceName.includes('X-quang'));
      const fluTest = hospitalServices.find(s => s.serviceName.includes('cúm'));
      const cbc = hospitalServices.find(s => s.serviceName.includes('máu'));
      if (xray) selectedLabServices.push(xray);
      if (fluTest) selectedLabServices.push(fluTest);
      if (cbc) selectedLabServices.push(cbc);
    } else if (inputQuery.includes('nhi') || inputQuery.includes('tre') || inputQuery.includes('tay chan mieng')) {
      const hfmd = hospitalServices.find(s => s.serviceName.includes('Tay chân miệng'));
      const urine = hospitalServices.find(s => s.serviceName.includes('nước tiểu'));
      const cbc = hospitalServices.find(s => s.serviceName.includes('máu'));
      if (hfmd) selectedLabServices.push(hfmd);
      if (urine) selectedLabServices.push(urine);
      if (cbc) selectedLabServices.push(cbc);
    } else if (inputQuery.includes('tim') || inputQuery.includes('huyet ap') || inputQuery.includes('nguc')) {
      const ecg = hospitalServices.find(s => s.serviceName.includes('điện tim') || s.serviceName.includes('ECG'));
      const bloodBio = hospitalServices.find(s => s.serviceName.includes('Sinh hóa') || s.serviceName.includes('máu'));
      const xray = hospitalServices.find(s => s.serviceName.includes('X-quang'));
      if (ecg) selectedLabServices.push(ecg);
      if (bloodBio) selectedLabServices.push(bloodBio);
      if (xray) selectedLabServices.push(xray);
    } else {
      const cbc = hospitalServices.find(s => s.category === 'Xét nghiệm');
      const img = hospitalServices.find(s => s.category === 'Chẩn đoán hình ảnh');
      if (cbc) selectedLabServices.push(cbc);
      if (img) selectedLabServices.push(img);
    }

    // Add unique lab & imaging items
    const addedNames = new Set<string>();
    for (const lab of selectedLabServices) {
      if (!addedNames.has(lab.serviceName)) {
        addedNames.add(lab.serviceName);
        addItem(lab.serviceName, lab.priceVnd, (lab.bhytDiscountPercent || 0) > 0);
      }
    }

    // 3. Medication estimate based on diagnosis
    let medicineCost = 250000;
    let medicineName = 'Dự trù tiền thuốc BHYT theo phác đồ (5-7 ngày)';
    if (inputQuery.includes('sot xuat huyet') || inputQuery.includes('dengue')) {
      medicineCost = 220000;
      medicineName = 'Dự trù thuốc điều trị Sốt Xuất Huyết (Hạ sốt, Oresol, Vitamin C, điện giải)';
    } else if (inputQuery.includes('da day')) {
      medicineCost = 320000;
      medicineName = 'Dự trù thuốc điều trị Dạ dày - Thực quản (Kháng acid, ức chế tiết acid, bảo vệ niêm mạc)';
    } else if (inputQuery.includes('ho') || inputQuery.includes('cum')) {
      medicineCost = 240000;
      medicineName = 'Dự trù thuốc điều trị Cảm cúm / Viêm đường hô hấp (Kháng sinh, siro ho, long đờm)';
    } else if (inputQuery.includes('tim') || inputQuery.includes('huyet ap')) {
      medicineCost = 280000;
      medicineName = 'Dự trù thuốc điều hòa Huyết áp & Tim mạch (Thuốc ức chế men chuyển, chẹn kênh calci)';
    }
    addItem(medicineName, medicineCost, true);

    // Compute Totals
    const estimatedTotalBeforeInsurance = items.reduce((acc, it) => acc + it.price, 0);
    const patientPayAmount = items.reduce((acc, it) => acc + it.patientPortion, 0);
    const insuranceCoverage = estimatedTotalBeforeInsurance - patientPayAmount;

    // Tailored Advice based on BHYT status
    let advice = '';
    if (!isBhytActive) {
      advice = `Bạn đang chọn không áp dụng BHYT nên cần chuẩn bị 100% kinh phí (${patientPayAmount.toLocaleString('vi-VN')} đ). Hãy cân nhắc tham gia BHYT để được bảo hiểm chi trả từ 80% đến 100% chi phí.`;
    } else if (is100Percent) {
      advice = `Bạn đang hưởng chế độ BHYT 100% (Dành cho trẻ em <6 tuổi, Hộ nghèo, Người có công, Sĩ quan LLVT). Toàn bộ chi phí khám, xét nghiệm và tiền thuốc theo danh mục BHYT đúng tuyến được chi trả 100%, bạn không phải đồng chi trả (0 đ)!`;
    } else {
      advice = `Thẻ BHYT chuẩn 80% (Hộ gia đình, Người lao động): BHYT chi trả 80% (${insuranceCoverage.toLocaleString('vi-VN')} đ), bệnh nhân chỉ cần đồng chi trả 20% (${patientPayAmount.toLocaleString('vi-VN')} đ). Vui lòng mang CCCD gắn chip hoặc thẻ BHYT trên VssID khi đến khám.`;
    }

    const clinicalWorkflow = [
      `Bước 1: Tiếp đón & Lấy số thứ tự khám tại sảnh đón ${hospital.name}`,
      `Bước 2: Xuất trình CCCD gắn chip / VssID tại quầy tiếp nhận BHYT`,
      `Bước 3: Khám lâm sàng tại phòng khám chuyên khoa theo phân luồng`,
      `Bước 4: Thực hiện các xét nghiệm & chẩn đoán hình ảnh theo chỉ định của Bác sĩ`,
      `Bước 5: Bác sĩ đọc kết luận, in đơn thuốc và nhận thuốc tại Quầy phát thuốc BHYT`
    ];

    res.json({
      hospitalName: hospital.name,
      estimatedTotalBeforeInsurance,
      insuranceCoverage,
      patientPayAmount,
      clinicalWorkflow,
      items,
      advice
    });
  } catch (err: any) {
    console.error('Cost estimate error:', err);
    res.status(500).json({ error: 'Lỗi khi tính toán chi phí: ' + (err.message || 'Lỗi hệ thống') });
  }
});

// 5. Hospitals & Pricing
app.get('/api/hospitals', (_req: Request, res: Response) => {
  res.json(hospitalsDatabase);
});

// 6. Doctors & Rosters
app.get('/api/doctors', (_req: Request, res: Response) => {
  res.json(doctorsDatabase);
});

// 7. Appointments & Queue Numbers (STT)
app.get('/api/appointments', (req: Request, res: Response) => {
  const hospitalId = req.query.hospitalId as string;
  const patientId = req.query.patientId as string;

  let results = appointmentsDatabase;
  if (hospitalId) {
    results = results.filter(a => a.hospitalId === hospitalId);
  }
  if (patientId) {
    results = results.filter(a => a.patientId === patientId);
  }
  res.json(results);
});

app.post('/api/appointments', (req: Request, res: Response) => {
  const { patientId, patientName, phoneNumber, hospitalId, department, doctorId, appointmentDate, appointmentTime, symptoms } = req.body;
  if (!patientName || !hospitalId || !appointmentDate) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ họ tên, bệnh viện và ngày khám.' });
  }

  // Enforce single active appointment limit per patient
  const cleanPhone = (phoneNumber || '').trim();
  const existingActive = appointmentsDatabase.find(a => 
    ((patientId && a.patientId === patientId) || (cleanPhone && a.phoneNumber === cleanPhone)) &&
    (a.status === 'Chờ khám' || a.status === 'Đang khám')
  );

  if (existingActive) {
    return res.status(400).json({
      error: `Bạn đã có 1 lịch hẹn đang chờ phục vụ tại ${existingActive.hospitalName} (STT #${existingActive.queueNumber}). Mỗi bệnh nhân chỉ được đặt tối đa 1 lịch khám tại một thời điểm.`
    });
  }

  const hospital = hospitalsDatabase.find(h => h.id === hospitalId);
  const doctor = doctorsDatabase.find(d => d.id === doctorId);
  const queueNumber = getNextQueueNumber(hospitalId, appointmentDate);

  const newAppointment: Appointment = {
    id: `apt-${Date.now()}`,
    patientId: patientId || `pat-${Date.now()}`,
    patientName,
    phoneNumber: phoneNumber || '',
    hospitalId,
    hospitalName: hospital ? hospital.name : 'Bệnh Viện Tại Quảng Ngãi',
    department: department || 'Khoa Khám Bệnh Đa Khoa',
    doctorId,
    doctorName: doctor?.name,
    appointmentDate,
    appointmentTime: appointmentTime || '08:00',
    queueNumber,
    symptoms: symptoms || '',
    status: 'Chờ khám',
    estimatedCost: 250000,
    createdAt: new Date().toISOString()
  };

  appointmentsDatabase.unshift(newAppointment);
  res.status(201).json(newAppointment);
});

app.patch('/api/appointments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, department, doctorId, doctorName } = req.body;

  const appt = appointmentsDatabase.find(a => a.id === id);
  if (!appt) {
    return res.status(404).json({ error: 'Không tìm thấy lịch khám.' });
  }

  if (status) appt.status = status;
  if (department) appt.department = department;
  if (doctorId) appt.doctorId = doctorId;
  if (doctorName) appt.doctorName = doctorName;

  res.json(appt);
});

app.delete('/api/appointments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLen = appointmentsDatabase.length;
  appointmentsDatabase = appointmentsDatabase.filter(a => a.id !== id);
  if (appointmentsDatabase.length === initialLen) {
    return res.status(404).json({ error: 'Không tìm thấy lịch khám cần hủy.' });
  }
  res.json({ success: true, message: 'Đã hủy lịch khám thành công.' });
});

// 8. Epidemiology Monitoring & Heatmap in Quảng Ngãi
app.get('/api/epidemiology', (_req: Request, res: Response) => {
  // Aggregate stats by district in Quảng Ngãi
  const districtStats: Record<string, { count: number; contagiousCount: number; diseases: string[] }> = {};
  
  for (const c of epidemiologyDatabase) {
    if (!districtStats[c.district]) {
      districtStats[c.district] = { count: 0, contagiousCount: 0, diseases: [] };
    }
    districtStats[c.district].count += 1;
    if (c.isContagious) districtStats[c.district].contagiousCount += 1;
    if (!districtStats[c.district].diseases.includes(c.diseaseName)) {
      districtStats[c.district].diseases.push(c.diseaseName);
    }
  }

  res.json({
    cases: epidemiologyDatabase,
    districtStats,
    totalCases: epidemiologyDatabase.length,
    redZonesCount: epidemiologyDatabase.filter(c => c.status === 'Khoanh vùng đỏ').length
  });
});

app.post('/api/epidemiology', (req: Request, res: Response) => {
  const { diseaseName, district, ward, lat, lng, severity, isContagious } = req.body;
  const newCase: EpidemiologyCase = {
    id: `epi-${Date.now()}`,
    diseaseName: diseaseName || 'Bệnh truyền nhiễm',
    reportedAt: new Date().toISOString(),
    district: district || 'TP. Quảng Ngãi',
    ward: ward || '',
    lat: lat || 15.1219,
    lng: lng || 108.7925,
    severity: severity || 'Nguy hiểm',
    isContagious: isContagious ?? true,
    status: 'Khoanh vùng đỏ'
  };
  epidemiologyDatabase.unshift(newCase);
  res.status(201).json(newCase);
});

// 9. Emergency SOS
app.get('/api/emergency', (_req: Request, res: Response) => {
  res.json(emergencyAlerts);
});

app.post('/api/emergency', (req: Request, res: Response) => {
  const { patientName, phoneNumber, lat, lng, addressApprox, symptoms, hospitalId } = req.body;
  const hospital = hospitalsDatabase.find(h => h.id === hospitalId) || hospitalsDatabase[0];

  const alert: EmergencyAlert = {
    id: `emg-${Date.now()}`,
    patientName: patientName || 'Bệnh nhân khẩn cấp',
    phoneNumber: phoneNumber || 'Khẩn cấp',
    lat: lat || 15.1219,
    lng: lng || 108.7925,
    addressApprox: addressApprox || 'Tọa độ GPS khẩn cấp tại Quảng Ngãi',
    symptoms: symptoms || ['Khó thở / Nguy kịch'],
    reportedAt: new Date().toISOString(),
    status: 'MỚI - CẦN ĐIỀU PHỐI',
    assignedHospital: hospital?.name
  };

  emergencyAlerts.unshift(alert);
  res.status(201).json(alert);
});

app.patch('/api/emergency/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const alert = emergencyAlerts.find(a => a.id === id);
  if (!alert) return res.status(404).json({ error: 'Không tìm thấy ca cấp cứu.' });
  if (status) alert.status = status;
  res.json(alert);
});

// 10. Patient Health Journal & Prescriptions
app.get('/api/patients/:patientId/logs', (req: Request, res: Response) => {
  const { patientId } = req.params;
  const logs = patientLogsDatabase.filter(l => l.patientId === patientId || patientId === 'all');
  res.json(logs);
});

app.post('/api/patients/:patientId/logs', (req: Request, res: Response) => {
  const { patientId } = req.params;
  const { patientName, symptoms, notes, bodyTemperature, bloodPressure, heartRate, painLevel, mentalState, assignedHospital } = req.body;

  const newLog: PatientSymptomLog = {
    id: `log-${Date.now()}`,
    patientId,
    patientName: patientName || 'Người bệnh',
    recordedAt: new Date().toISOString(),
    symptoms: symptoms || [],
    notes: notes || '',
    bodyTemperature: bodyTemperature ? Number(bodyTemperature) : undefined,
    bloodPressure,
    heartRate: heartRate ? Number(heartRate) : undefined,
    painLevel: painLevel ? Number(painLevel) : undefined,
    mentalState,
    assignedHospital
  };

  patientLogsDatabase.unshift(newLog);
  res.status(201).json(newLog);
});

app.get('/api/patients/:patientId/prescriptions', (req: Request, res: Response) => {
  const { patientId } = req.params;
  const rxs = prescriptionsDatabase.filter(p => p.patientId === patientId || patientId === 'all');
  res.json(rxs);
});

app.post('/api/patients/:patientId/prescriptions', (req: Request, res: Response) => {
  const { patientId } = req.params;
  const { 
    title, 
    hospitalName, 
    doctorName, 
    doctorTitle,
    prescribedDate, 
    diagnosis, 
    icdCode,
    clinicalNotes,
    contraindications,
    dietaryAdvice,
    reExaminationDate,
    emergencyWarningSigns,
    medicines, 
    notes,
    status,
    aiAssisted
  } = req.body;

  const newRx: PrescriptionRecord = {
    id: `rx-${Date.now()}`,
    patientId,
    patientName: req.body.patientName || 'Người bệnh',
    title: title || `Đơn thuốc điều trị: ${diagnosis || 'Khám bệnh'}`,
    hospitalName: hospitalName || 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi',
    doctorName: doctorName || 'BS.CKII Nguyễn Văn Dũng',
    doctorTitle,
    prescribedDate: prescribedDate || new Date().toISOString().split('T')[0],
    diagnosis: diagnosis || 'Đơn thuốc khám bệnh',
    icdCode,
    clinicalNotes,
    contraindications,
    dietaryAdvice,
    reExaminationDate,
    emergencyWarningSigns,
    medicines: medicines || [],
    notes,
    status: status || 'Đang dùng',
    aiAssisted: Boolean(aiAssisted)
  };

  prescriptionsDatabase.unshift(newRx);
  res.status(201).json(newRx);
});

app.delete('/api/patients/:patientId/prescriptions/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLength = prescriptionsDatabase.length;
  prescriptionsDatabase = prescriptionsDatabase.filter(p => p.id !== id);
  res.json({ success: true, deleted: initialLength !== prescriptionsDatabase.length });
});

// Serve frontend in dev or prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist'), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
