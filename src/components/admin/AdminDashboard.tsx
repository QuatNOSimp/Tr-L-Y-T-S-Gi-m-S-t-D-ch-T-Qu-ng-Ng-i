import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileSpreadsheet, 
  Users, 
  Building2, 
  Stethoscope, 
  AlertTriangle, 
  Search, 
  Download, 
  Plus, 
  CheckCircle2, 
  RefreshCw, 
  Database, 
  Activity, 
  PhoneCall, 
  MapPin, 
  Edit3, 
  Trash2, 
  UserCheck, 
  Filter,
  Check,
  Eye,
  SlidersHorizontal,
  Server
} from 'lucide-react';
import { Disease, HospitalInfo, Doctor, User as UserType, EmergencyAlert, EpidemiologyCase } from '../../types';

interface AdminDashboardProps {
  diseases: Disease[];
  hospitals: HospitalInfo[];
  doctors: Doctor[];
  emergencyAlerts: EmergencyAlert[];
  epidemiologyCases: EpidemiologyCase[];
  currentUser: UserType | null;
  onOpenExcelImport: () => void;
  onOpenAuthModal?: (mode: 'login' | 'register', role?: 'patient' | 'doctor' | 'admin') => void;
  onQuickSwitchRole?: (role: 'patient' | 'doctor' | 'admin') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  diseases,
  hospitals,
  doctors,
  emergencyAlerts,
  epidemiologyCases,
  currentUser,
  onOpenExcelImport,
  onOpenAuthModal,
  onQuickSwitchRole
}) => {
  // RBAC Access Control Gate
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'hospital_admin')) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-purple-200 dark:border-purple-900/60 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 mx-auto flex items-center justify-center mb-4 border border-purple-200 dark:border-purple-800">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 mb-3">
          Bảo Mật Quyền Quản Trị Hệ Thống
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
          Khu Vực Quản Trị Hệ Thống Được Bảo Mật
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed max-w-lg mx-auto">
          Cổng Quản Trị Hệ Thống chứa các công cụ nhạy cảm: Nạp và sửa đổi Cơ sở dữ liệu bệnh từ Excel, phân quyền người dùng, và giám sát kíp trực toàn tỉnh. Bạn cần đăng nhập với tài khoản Quản trị viên (Admin) để có quyền truy cập.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onOpenAuthModal ? onOpenAuthModal('login', 'admin') : null}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Đăng Nhập Tài Khoản Admin</span>
          </button>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'excel-data' | 'users' | 'hospitals' | 'emergencies'>('excel-data');
  const [searchDisease, setSearchDisease] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterContagious, setFilterContagious] = useState<string>('all');
  const [userSearch, setUserSearch] = useState('');

  // Sample managed users in admin view
  const [managedUsers, setManagedUsers] = useState<UserType[]>([
    {
      id: 'admin-1',
      fullName: 'Lê Vũ Nguyên Hiền',
      email: 'admin.hien@chuyenlekhiet.edu.vn',
      phone: '0913.845.921',
      role: 'admin',
      isVerified: true,
      hospitalName: 'Trường THPT Chuyên Lê Khiết',
      specialty: 'Lập trình viên & Admin trang web',
      position: 'Quản Trị Viên Hệ Thống',
      address: 'Trường THPT Chuyên Lê Khiết, TP. Quảng Ngãi',
      district: 'TP. Quảng Ngãi',
      createdAt: '2026-01-10T08:00:00Z'
    },
    {
      id: 'doc-1',
      fullName: 'ThS.BS Nguyễn Văn An',
      email: 'bacsi.an@bvdkquangngai.vn',
      phone: '0905.888.999',
      role: 'doctor',
      isVerified: true,
      hospitalName: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi',
      specialty: 'Nội Tim Mạch & Hồi Sức',
      position: 'Trưởng Khoa Cấp Cứu',
      address: '184 Hùng Vương',
      district: 'TP. Quảng Ngãi',
      createdAt: '2026-02-15T09:30:00Z'
    },
    {
      id: 'pat-1',
      fullName: 'Trần Văn Hoàng (Người Bệnh)',
      email: 'benhnhan@gmail.com',
      phone: '0913.845.921',
      role: 'patient',
      isVerified: true,
      address: 'Phường Nghĩa Chánh',
      district: 'TP. Quảng Ngãi',
      bhytNumber: 'GD45100091823',
      bloodType: 'O+',
      createdAt: '2026-03-01T14:20:00Z'
    },
    {
      id: 'pat-2',
      fullName: 'Lê Thị Thu Hằng',
      email: 'thuhang.qn@gmail.com',
      phone: '0988.112.334',
      role: 'patient',
      isVerified: false,
      address: 'TT. Châu Ổ',
      district: 'Huyện Bình Sơn',
      bhytNumber: 'GD45100088921',
      bloodType: 'A+',
      createdAt: '2026-03-20T10:15:00Z'
    }
  ]);

  // Statistics
  const totalDiseases = diseases.length;
  const contagiousDiseases = diseases.filter(d => d.isContagious).length;
  const criticalDiseases = diseases.filter(d => d.severity === 'Khẩn cấp' || d.severity === 'Nguy hiểm').length;
  const activeEmergencies = emergencyAlerts.filter(e => e.status !== 'Đã tiếp nhận viện').length;

  const [displayLimit, setDisplayLimit] = useState(100);

  // Filtered diseases for admin table - 100% null-safe
  const filteredDiseases = diseases.filter(d => {
    if (!d) return false;
    const query = searchDisease.toLowerCase().trim();
    const nameStr = String(d.name || '').toLowerCase();
    const viNameStr = String(d.vietnameseName || '').toLowerCase();
    const icdStr = String(d.icdCode || '').toLowerCase();
    const groupStr = String(d.diseaseGroup || '').toLowerCase();
    const symptomsArr = Array.isArray(d.symptoms) ? d.symptoms : [];

    const matchSearch = query === '' || 
      nameStr.includes(query) ||
      viNameStr.includes(query) ||
      icdStr.includes(query) ||
      groupStr.includes(query) ||
      symptomsArr.some(s => String(s || '').toLowerCase().includes(query));

    const matchSeverity = filterSeverity === 'all' || d.severity === filterSeverity;
    const matchContagious = filterContagious === 'all' || 
      (filterContagious === 'yes' && d.isContagious) ||
      (filterContagious === 'no' && !d.isContagious);

    return matchSearch && matchSeverity && matchContagious;
  });

  // Handle export JSON
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(diseases, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `medassist_quangngai_diseases_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleToggleUserVerify = (userId: string) => {
    setManagedUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, isVerified: !u.isVerified };
      }
      return u;
    }));
  };

  const handleChangeUserRole = (userId: string, newRole: 'patient' | 'doctor' | 'admin') => {
    setManagedUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, role: newRole };
      }
      return u;
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* Admin Portal Header Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-7 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-md flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                CỔNG QUẢN TRỊ VIÊN HỆ THỐNG (ADMIN)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-indigo-200 border border-white/10">
                Toàn Quyền Dữ Liệu & Phân Quyền
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Trung Tâm Quản Trị Y Tế & Dữ Liệu Số Tỉnh Quảng Ngãi
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Khu vực chuyên trách của Quản Trị Viên: Chỉ duy nhất Admin có quyền nạp và cập nhật file Excel bệnh tật (<strong className="text-amber-300">my_data (1).xlsx</strong>), quản lý phân quyền Bác sĩ / Bệnh nhân, và điều phối toàn bộ cơ sở y tế trong tỉnh.
            </p>
            <div className="pt-2 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-400">Phát triển & Quản trị:</span>
              <span className="font-mono text-emerald-300 font-bold bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                Lê Vũ Nguyên Hiền_Lập trình viên_Admin trang web_Trường THPT Chuyên Lê Khiết
              </span>
            </div>
          </div>

          {/* Quick Primary Trigger: Excel Import (Exclusive to Admin) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full md:w-auto">
            <button
              onClick={onOpenExcelImport}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-900/40 transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-100" />
              <span>Nạp File Excel Bệnh Tật Ngay</span>
            </button>
            
            <button
              onClick={handleExportData}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-200" />
              <span>Sao Lưu JSON</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between text-indigo-200 text-xs">
              <span>Kho Bệnh Excel</span>
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
              {totalDiseases.toLocaleString('vi-VN')}
            </p>
            <span className="text-[10px] text-emerald-300 font-semibold">Đã chuẩn hóa ICD-10</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between text-indigo-200 text-xs">
              <span>Bệnh Truyền Nhiễm</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black font-mono text-amber-300 mt-1">
              {contagiousDiseases.toLocaleString('vi-VN')}
            </p>
            <span className="text-[10px] text-amber-200 font-semibold">Theo dõi dịch tễ tỉnh</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between text-indigo-200 text-xs">
              <span>Bệnh Viện & Cơ Sở</span>
              <Building2 className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
              {hospitals.length}
            </p>
            <span className="text-[10px] text-cyan-200 font-semibold">{doctors.length} Bác sĩ trực</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center justify-between text-indigo-200 text-xs">
              <span>Cấp Cứu Đang Xử Lý</span>
              <PhoneCall className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-xl sm:text-2xl font-black font-mono text-rose-300 mt-1">
              {activeEmergencies}
            </p>
            <span className="text-[10px] text-rose-200 font-semibold">Đường dây nóng 115</span>
          </div>
        </div>
      </div>

      {/* Admin Tab Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2 overflow-x-auto transition-colors duration-200">
        <div className="flex items-center gap-1.5 min-w-max">
          <button
            onClick={() => setActiveTab('excel-data')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'excel-data'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>1. Quản Trị & Nạp File Excel ({totalDiseases.toLocaleString('vi-VN')} Bệnh)</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Phân Quyền Người Dùng & Bác Sĩ ({managedUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('hospitals')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'hospitals'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>3. Quản Lý Cơ Sở Y Tế Quảng Ngãi ({hospitals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('emergencies')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'emergencies'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>4. Giám Sát Cấp Cứu 115 ({emergencyAlerts.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Quản Trị & Nạp File Excel */}
      {activeTab === 'excel-data' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Excel Source Status Card */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-cyan-950/40 border border-emerald-200/90 dark:border-emerald-800/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  Cơ Sở Dữ Liệu Bệnh Học Độc Quyền Cho Admin
                </h3>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Đã tách khỏi Người Bệnh & Bác Sĩ
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
                Người bệnh và bác sĩ chỉ được xem và tra cứu dữ liệu. Toàn quyền nhập file Excel, chỉnh sửa cơ sở dữ liệu mẫu <strong className="text-emerald-800 dark:text-emerald-300">my_data (1).xlsx</strong> và bổ sung danh mục được bảo vệ chặt chẽ tại đây.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={onOpenExcelImport}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Nạp Lại / Cập Nhật Excel Mới</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors duration-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchDisease}
                onChange={(e) => setSearchDisease(e.target.value)}
                placeholder="Tìm tên bệnh, mã ICD-10, triệu chứng..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:bg-white dark:focus:bg-slate-800 cursor-pointer"
              >
                <option value="all">Mức nguy hiểm: Tất cả</option>
                <option value="Khẩn cấp">Khẩn cấp (115)</option>
                <option value="Nguy hiểm">Nguy hiểm</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Thấp">Thấp</option>
              </select>

              <select
                value={filterContagious}
                onChange={(e) => setFilterContagious(e.target.value)}
                className="text-xs py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:bg-white dark:focus:bg-slate-800 cursor-pointer"
              >
                <option value="all">Tính lây nhiễm: Tất cả</option>
                <option value="yes">Lây nhiễm</option>
                <option value="no">Không lây nhiễm</option>
              </select>

              <span className="text-xs text-slate-400 dark:text-slate-500 pl-1 font-medium">
                Tìm thấy {filteredDiseases.length.toLocaleString('vi-VN')} bệnh
              </span>
            </div>
          </div>

          {/* Disease Table for Admin */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-extrabold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Tên Bệnh (Tiếng Việt & Anh)</th>
                    <th className="py-3 px-3">Mã ICD-10</th>
                    <th className="py-3 px-3">Mức Độ</th>
                    <th className="py-3 px-3">Lây Nhiễm</th>
                    <th className="py-3 px-4">Triệu Chứng Tiêu Biểu</th>
                    <th className="py-3 px-3">Khoa Khám</th>
                    <th className="py-3 px-3 text-right">Chi Phí Ước Tính</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDiseases.slice(0, displayLimit).map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
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
                      <td className="py-3 px-3 font-mono font-bold text-indigo-700 dark:text-indigo-400">
                        {d.icdCode || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.severity === 'Khẩn cấp' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800' :
                          d.severity === 'Nguy hiểm' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800' :
                          d.severity === 'Trung bình' ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800' :
                          'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {d.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {d.isContagious ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px]">Có lây nhiễm</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px]">Không</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300" title={(Array.isArray(d.symptoms) ? d.symptoms : []).join(', ')}>
                        {(Array.isArray(d.symptoms) ? d.symptoms : []).slice(0, 3).join(', ')}
                        {Array.isArray(d.symptoms) && d.symptoms.length > 3 && ` +${d.symptoms.length - 3}`}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {d.recommendedDepartment}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                        {d.estimatedCostRange 
                          ? `${(d.estimatedCostRange.min / 1000).toLocaleString('vi-VN')}k - ${(d.estimatedCostRange.max / 1000).toLocaleString('vi-VN')}k`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredDiseases.length > displayLimit && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800">
                <span>
                  Đang hiển thị <strong>{displayLimit}</strong> / <strong>{filteredDiseases.length.toLocaleString('vi-VN')}</strong> bệnh
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDisplayLimit(prev => prev + 100)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    Xem thêm 100 bệnh
                  </button>
                  <button
                    onClick={() => setDisplayLimit(filteredDiseases.length)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    Xem tất cả ({filteredDiseases.length.toLocaleString('vi-VN')} bệnh)
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: Quản Trị Người Dùng & Phân Quyền */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors duration-200">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Quản Lý Phân Quyền Tài Khoản</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phân bổ quyền truy cập: Người Bệnh, Bác Sĩ / Kíp Trực, hoặc Quản Trị Viên (Admin)
              </p>
            </div>
            
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Tìm người dùng, email, SĐT..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-800"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-extrabold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Họ & Tên</th>
                    <th className="py-3 px-4">Email & Số Điện Thoại</th>
                    <th className="py-3 px-3">Địa Chỉ / Đơn Vị</th>
                    <th className="py-3 px-3">Vai Trò Hiện Tại</th>
                    <th className="py-3 px-3">Xác Thực</th>
                    <th className="py-3 px-4 text-center">Đổi Quyền Hạn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {managedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {u.fullName}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 dark:text-slate-200">{u.email}</div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{u.phone}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {u.hospitalName ? u.hospitalName : `${u.address || ''}, ${u.district || ''}`}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'admin' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800' :
                          u.role === 'doctor' ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800' :
                          'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {u.role === 'admin' ? 'Quản Trị Viên' :
                           u.role === 'doctor' ? 'Bác Sĩ' : 'Người Bệnh'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleToggleUserVerify(u.id)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                            u.isVerified 
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800' 
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {u.isVerified ? '✓ Đã xác thực' : '! Chưa xác thực'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleChangeUserRole(u.id, 'patient')}
                            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              u.role === 'patient' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            Người Bệnh
                          </button>
                          <button
                            onClick={() => handleChangeUserRole(u.id, 'doctor')}
                            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              u.role === 'doctor' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            Bác Sĩ
                          </button>
                          <button
                            onClick={() => handleChangeUserRole(u.id, 'admin')}
                            className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              u.role === 'admin' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            Admin
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

      {/* TAB 3: Quản Lý Cơ Sở Y Tế Quảng Ngãi */}
      {activeTab === 'hospitals' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between transition-colors duration-200">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Mạng Lưới Bệnh Viện & Trung Tâm Y Tế</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Danh mục cơ sở y tế phục vụ khám chữa bệnh và cấp cứu tỉnh Quảng Ngãi</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hospitals.map((hosp) => (
              <div key={hosp.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-colors space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {hosp.type}
                    </span>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-base mt-1">{hosp.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{hosp.address}, {hosp.district}</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Hotline đặt lịch</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-mono">{hosp.hotline}</strong>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
                    <span className="text-[10px] text-rose-500 dark:text-rose-400 block">Cấp cứu khẩn</span>
                    <strong className="text-rose-700 dark:text-rose-300 font-mono">{hosp.emergencyPhone}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span>Dịch vụ khám: <strong className="text-slate-700 dark:text-slate-300">{hosp.services.length} danh mục</strong></span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Giờ khám: {hosp.workingHours}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Giám Sát Cấp Cứu 115 */}
      {activeTab === 'emergencies' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Tổng Đài Điều Phối Cấp Cứu 115 Quảng Ngãi</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Giám sát các cuộc gọi SOS khẩn cấp gửi từ ứng dụng của người bệnh</p>
          </div>

          <div className="space-y-3">
            {emergencyAlerts.map((emg) => (
              <div 
                key={emg.id} 
                className={`p-4 rounded-2xl border transition-all ${
                  emg.status === 'Đang xử lý' 
                    ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80 shadow-xs' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white">
                        {emg.status}
                      </span>
                      <strong className="text-slate-900 dark:text-white text-sm">{emg.patientName}</strong>
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-300 font-bold">SĐT: {emg.phoneNumber}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{emg.addressApprox}</span>
                    </p>
                    <p className="text-xs text-rose-700 dark:text-rose-400 font-semibold mt-0.5">
                      Triệu chứng: {emg.symptoms.join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                      BV phân công: <strong className="text-slate-700 dark:text-slate-200">{emg.assignedHospital || 'Chờ phân công'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
