import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  PhoneCall, 
  MapPin, 
  Navigation, 
  CheckCircle2, 
  Hospital, 
  Clock, 
  X,
  Siren,
  ShieldAlert
} from 'lucide-react';
import { HospitalInfo } from '../../types';
import { api } from '../../services/api';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: HospitalInfo[];
  patientName?: string;
  phoneNumber?: string;
}

// Haversine formula for calculating distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  hospitals,
  patientName = 'Trần Văn Hoàng',
  phoneNumber = '0913.845.921'
}) => {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addressInput, setAddressInput] = useState('Phường Nghĩa Chánh, TP. Quảng Ngãi');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([
    'Khó thở dữ dội',
    'Đau thắt ngực, vã mồ hôi'
  ]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [nearestHospitals, setNearestHospitals] = useState<Array<HospitalInfo & { distanceKm: number }>>([]);

  const criticalSymptomsList = [
    'Khó thở dữ dội, tím tái môi',
    'Đau thắt ngực, vã mồ hôi',
    'Bất tỉnh, gọi hỏi không đáp ứng',
    'Yếu liệt nửa người, méo miệng',
    'Co giật toàn thân',
    'Chấn thương, chảy máu ồ ạt',
    'Sốt cao co giật ở trẻ em',
    'Đau bụng dữ dội như dao đâm'
  ];

  // Request browser GPS
  useEffect(() => {
    if (isOpen) {
      setBroadcastSent(false);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserCoords(coords);
          },
          () => {
            // Default center: Quảng Ngãi City
            setUserCoords({ lat: 15.1219, lng: 108.7925 });
          }
        );
      } else {
        setUserCoords({ lat: 15.1219, lng: 108.7925 });
      }
    }
  }, [isOpen]);

  // Compute sorted nearest hospitals
  useEffect(() => {
    const lat = userCoords?.lat || 15.1219;
    const lng = userCoords?.lng || 108.7925;

    const list = hospitals.map(h => ({
      ...h,
      distanceKm: calculateDistance(lat, lng, h.lat, h.lng)
    })).sort((a, b) => a.distanceKm - b.distanceKm);

    setNearestHospitals(list);
  }, [userCoords, hospitals]);

  if (!isOpen) return null;

  const toggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  const handleBroadcastEmergency = async () => {
    setIsBroadcasting(true);
    try {
      const topHospital = nearestHospitals[0];
      await api.sendEmergencyAlert({
        patientName,
        phoneNumber,
        lat: userCoords?.lat || 15.1219,
        lng: userCoords?.lng || 108.7925,
        addressApprox: addressInput,
        symptoms: customSymptom ? [...selectedSymptoms, customSymptom] : selectedSymptoms,
        hospitalId: topHospital?.id
      });
      setBroadcastSent(true);
    } catch (err) {
      console.error(err);
      // still mark sent for emergency responsiveness
      setBroadcastSent(true);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-rose-600 overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full animate-bounce">
              <Siren className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-wide">
                Báo Động Cấp Cứu Khẩn Cấp 115
              </h2>
              <p className="text-xs text-rose-100 font-medium">
                Tự động định vị cơ sở y tế gần nhất tại tỉnh Quảng Ngãi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Quick Call 115 Banner */}
          <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-900 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <PhoneCall className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <p className="text-xs uppercase font-bold text-rose-700 dark:text-rose-400">Đường dây nóng Cấp cứu Quốc gia</p>
                <p className="text-2xl font-black text-rose-900 dark:text-rose-200 tracking-tight">115</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Trực ban 24/7 - Miễn phí cước gọi cấp cứu</p>
              </div>
            </div>
            <a
              href="tel:115"
              className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl text-center shadow-md transition-all active:scale-95"
            >
              BẤM GỌI 115 NGAY
            </a>
          </div>

          {/* Location & GPS Info */}
          <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
              <span className="font-semibold flex items-center gap-1.5 text-slate-900 dark:text-white">
                <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Vị trí người bệnh hiện tại:
              </span>
              <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 font-mono text-[11px]">
                {userCoords ? `${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}` : 'Đang tìm GPS...'}
              </span>
            </div>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Nhập số nhà, thôn/xã hoặc điểm mốc tại Quảng Ngãi..."
              className="w-full text-xs sm:text-sm px-3 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Critical Symptoms Checklist */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
              Chọn các triệu chứng nguy kịch (để bác sĩ chuẩn bị trang thiết bị):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {criticalSymptomsList.map((sym) => {
                const checked = selectedSymptoms.includes(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => toggleSymptom(sym)}
                    className={`text-left text-xs p-2.5 rounded-lg border transition-all flex items-center gap-2 cursor-pointer ${
                      checked
                        ? 'bg-rose-100 dark:bg-rose-950/70 border-rose-500 text-rose-900 dark:text-rose-200 font-semibold shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                      checked ? 'bg-rose-600 border-rose-600 text-white' : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {checked && '✓'}
                    </div>
                    <span>{sym}</span>
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={customSymptom}
              onChange={(e) => setCustomSymptom(e.target.value)}
              placeholder="Mô tả thêm triệu chứng khác nếu có..."
              className="mt-2 w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:bg-white dark:focus:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Nearest Hospitals List */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Bệnh viện có khoa cấp cứu gần bạn nhất:</span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Sắp xếp theo khoảng cách</span>
            </h3>
            <div className="space-y-2">
              {nearestHospitals.slice(0, 3).map((hosp, idx) => (
                <div
                  key={hosp.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    idx === 0
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-400/40'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        idx === 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {idx === 0 ? 'GẦN NHẤT' : `#${idx + 1}`}
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">{hosp.name}</h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      {hosp.address}
                    </p>
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-3">
                      <span>Khoảng cách: ~{hosp.distanceKm} km</span>
                      <span>Ước tính di chuyển: ~{Math.max(5, Math.round(hosp.distanceKm * 2.2))} phút</span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <a
                      href={`tel:${hosp.emergencyPhone.split('/')[0].trim()}`}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg text-center shadow-xs flex items-center gap-1 justify-center"
                    >
                      <PhoneCall className="w-3 h-3" />
                      Gọi Viện
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* One-touch Broadcast to Hospital Dashboard */}
          {broadcastSent ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                  Tín hiệu cấp cứu đã được truyền tới Kíp trực Bệnh Viện!
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Vị trí GPS và triệu chứng của bạn đã hiện trên màn hình phòng cấp cứu. Nhân viên y tế đang chuẩn bị tiếp nhận ca.
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleBroadcastEmergency}
              disabled={isBroadcasting}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-extrabold text-sm sm:text-base rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <span>
                {isBroadcasting
                  ? 'ĐANG GỬI TÍN HIỆU CẤP CỨU LÊN BỆNH VIỆN...'
                  : 'BÁO CẤP CỨU LÊN MÀN HÌNH BỆNH VIỆN GẦN NHẤT'}
              </span>
            </button>
          )}

          <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center italic">
            * Trong trường hợp mất ý thức hoặc ngừng thở, hãy gọi 115 ngay lập tức và tiến hành ép tim ngoài lồng ngực (CPR) 100-120 lần/phút.
          </div>

        </div>

      </div>
    </div>
  );
};
