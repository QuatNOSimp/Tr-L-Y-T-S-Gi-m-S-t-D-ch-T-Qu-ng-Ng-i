import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  CreditCard, 
  Heart, 
  AlertTriangle, 
  Save, 
  LogOut, 
  CheckCircle2, 
  Building2,
  Calendar,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { User as UserType } from '../../types';
import { api } from '../../services/api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType | null;
  onUpdateUser: (updatedUser: UserType) => void;
  onLogout: () => void;
  onOpenInbox: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onLogout,
  onOpenInbox
}) => {
  if (!isOpen || !currentUser) return null;

  const [fullName, setFullName] = useState(currentUser.fullName || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [birthYear, setBirthYear] = useState(currentUser.birthYear || '');
  const [gender, setGender] = useState(currentUser.gender || '');
  const [bhytNumber, setBhytNumber] = useState(currentUser.bhytNumber || '');
  const [bloodType, setBloodType] = useState(currentUser.bloodType || '');
  const [allergies, setAllergies] = useState(currentUser.allergies || '');
  const [district, setDistrict] = useState(currentUser.district || '');
  const [address, setAddress] = useState(currentUser.address || '');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state whenever currentUser or modal opens
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setPhone(currentUser.phone || '');
      setBirthYear(currentUser.birthYear || '');
      setGender(currentUser.gender || '');
      setBhytNumber(currentUser.bhytNumber || '');
      setBloodType(currentUser.bloodType || '');
      setAllergies(currentUser.allergies || '');
      setDistrict(currentUser.district || '');
      setAddress(currentUser.address || '');
    }
  }, [currentUser, isOpen]);

  // Reset all fields so the user can self-declare from scratch
  const handleResetToBlank = () => {
    setPhone('');
    setBirthYear('');
    setGender('');
    setDistrict('');
    setAddress('');
    setBhytNumber('');
    setBloodType('');
    setAllergies('');
    setSuccessMsg('Đã xóa trắng thông tin y tế để bạn tự khai báo mới!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await api.updateProfile({
        email: currentUser.email,
        fullName,
        phone,
        birthYear,
        gender,
        bhytNumber,
        bloodType,
        allergies,
        district,
        address
      });

      onUpdateUser(res.user);
      setSuccessMsg('Hồ sơ sức khỏe cá nhân đã được lưu thành công!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi cập nhật hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] transition-colors duration-200">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-extrabold text-xl border border-white/30 shadow-xs">
              {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white">{currentUser.fullName || 'Người Bệnh'}</h3>
                {currentUser.isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-100 border border-emerald-300/40">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    Đã Xác Thực Email
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-100 border border-amber-300/40">
                    Chưa Xác Thực Email
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                {currentUser.role === 'admin'
                  ? `Quản Trị Viên & Lập Trình Viên - Trường THPT Chuyên Lê Khiết`
                  : currentUser.role === 'doctor' 
                  ? `Bác sĩ chuyên khoa: ${currentUser.specialty || 'Đa khoa'} - ${currentUser.hospitalName || 'BVĐK Tỉnh'}`
                  : `Hồ sơ sức khỏe cá nhân - Người bệnh tự khai báo`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs sm:text-sm rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email Info Bar with Self-Declaration Reset Button */}
          <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Email đăng nhập</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{currentUser.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetToBlank}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                title="Xóa trắng để bệnh nhân tự nhập lại từ đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại trống (Tự khai báo)</span>
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={onOpenInbox}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Hộp thư OTP</span>
              </button>
            </div>
          </div>

          {/* Full Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Họ và tên người bệnh
              </label>
              <input
                type="text"
                required
                placeholder="Nhập họ và tên..."
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Số điện thoại liên hệ
              </label>
              <input
                type="tel"
                placeholder="VD: 0912.345.678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
              />
            </div>
          </div>

          {/* Birth Year & Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Năm sinh
              </label>
              <input
                type="number"
                min="1920"
                max={new Date().getFullYear()}
                placeholder="VD: 1995"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Giới tính
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
              >
                <option value="">-- Chọn giới tính --</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
          </div>

          {/* District & Address in Quang Ngai */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quận / Huyện cư trú (Quảng Ngãi)
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
              >
                <option value="">-- Chọn Quận/Huyện tại Quảng Ngãi --</option>
                <option value="TP. Quảng Ngãi">TP. Quảng Ngãi</option>
                <option value="Bình Sơn">Huyện Bình Sơn</option>
                <option value="Sơn Tịnh">Huyện Sơn Tịnh</option>
                <option value="Tư Nghĩa">Huyện Tư Nghĩa</option>
                <option value="Mộ Đức">Huyện Mộ Đức</option>
                <option value="Đức Phổ">Thị xã Đức Phổ</option>
                <option value="Nghĩa Hành">Huyện Nghĩa Hành</option>
                <option value="Trà Bồng">Huyện Trà Bồng</option>
                <option value="Lý Sơn">Huyện đảo Lý Sơn</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Địa chỉ chi tiết (Thôn/Tổ/Đường)
              </label>
              <input
                type="text"
                placeholder="VD: 124 Hùng Vương, Phường Lê Hồng Phong"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
              />
            </div>
          </div>

          {/* BHYT & Blood Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Mã số thẻ BHYT (nếu có)
              </label>
              <input
                type="text"
                placeholder="VD: GD45100091823"
                value={bhytNumber}
                onChange={(e) => setBhytNumber(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl uppercase focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nhóm máu
              </label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
              >
                <option value="">-- Chưa xác định / Chưa xét nghiệm --</option>
                <option value="O+">O+ (Phổ biến)</option>
                <option value="O-">O- (Hiếm)</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          {/* Allergies / Medical history */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tiền sử dị ứng & bệnh mạn tính
            </label>
            <textarea
              rows={2}
              placeholder="VD: Dị ứng Penicillin, dị ứng hải sản, có tiền sử tăng huyết áp..."
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng Xuất</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu Hồ Sơ Khai Báo'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
