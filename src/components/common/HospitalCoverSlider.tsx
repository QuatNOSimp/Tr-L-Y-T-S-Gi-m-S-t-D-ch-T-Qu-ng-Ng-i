import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  PhoneCall, 
  MapPin, 
  ShieldCheck, 
  Building2, 
  Activity, 
  ZoomIn, 
  X, 
  Pause, 
  Play, 
  Clock,
  Sparkles,
  Award,
  Stethoscope
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface HospitalSlide {
  id: string;
  image: string;
  fallbackImage?: string;
  title: string;
  subtitle: string;
  tag: string;
  badgeColor: string;
  details: string;
  address: string;
  hotline: string;
}

const HOSPITAL_SLIDES: HospitalSlide[] = [
  {
    id: 'bv-tinh-quang-ngai',
    image: '/bvdk_quang_ngai.png',
    fallbackImage: '/img_141.jpg',
    title: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi',
    subtitle: 'Bệnh viện Đa khoa hạng I - Cơ sở y tế đầu ngành lớn nhất tại TP. Quảng Ngãi',
    tag: 'Tuyến Tỉnh Hạng I • TP. Quảng Ngãi',
    badgeColor: 'bg-emerald-600',
    details: '1.200 giường bệnh • 42 chuyên khoa lâm sàng & cận lâm sàng • Trực cấp cứu 24/7',
    address: 'Số 184 Hùng Vương, Phường Trần Phú, TP. Quảng Ngãi',
    hotline: '0255.3827.899'
  },
  {
    id: 'bv-san-nhi-quang-ngai',
    image: '/hospitals/kham_nhi_san_nhi.jpg',
    fallbackImage: '/hospitals/benh_vien_hien_dai.jpg',
    title: 'Bệnh Viện Sản - Nhi Tỉnh Quảng Ngãi',
    subtitle: 'Bác sĩ chuyên khoa khám bệnh, chăm sóc sức khỏe Sản khoa & Nhi khoa tại TP. Quảng Ngãi',
    tag: 'Chuyên Khoa Sản - Nhi • TP. Quảng Ngãi',
    badgeColor: 'bg-pink-600',
    details: 'Khám nhi tổng quát, chăm sóc sơ sinh, siêu âm thai & tiêm chủng an toàn • 500 giường bệnh',
    address: 'Đường Hùng Vương, Phường Nghĩa Lộ, TP. Quảng Ngãi',
    hotline: '0255.3713.000'
  },
  {
    id: 'bv-phuc-hung-quang-ngai',
    image: '/img_191.jpg',
    fallbackImage: '/hospitals/benh_vien_hien_dai.jpg',
    title: 'Bệnh Viện Đa Khoa Tư Nhân Phúc Hưng',
    subtitle: 'Bệnh viện đa khoa tư nhân kỹ thuật cao quy mô hiện đại nhất tại TP. Quảng Ngãi',
    tag: 'Đa Khoa Tư Nhân • TP. Quảng Ngãi',
    badgeColor: 'bg-teal-600',
    details: 'Khám chữa bệnh BHYT thông tuyến • Nội soi tiêu hóa tiền mê • Tầm soát tim mạch kỹ thuật cao',
    address: 'Số 06 Cao Bá Quát, Phường Nghĩa Chánh, TP. Quảng Ngãi',
    hotline: '0255.3713.555'
  },
  {
    id: 'ttyt-tp-quang-ngai',
    image: '/hospitals/kham_benh_trung_tam_yte.jpg',
    fallbackImage: '/img_194.jpg',
    title: 'Trung Tâm Y Tế Thành Phố Quảng Ngãi',
    subtitle: 'Bác sĩ trực tiếp thăm khám lâm sàng, điều trị BHYT & chăm sóc sức khỏe ban đầu',
    tag: 'Khám Chữa Bệnh Tuyến Cơ Sở • TP. Quảng Ngãi',
    badgeColor: 'bg-blue-600',
    details: 'Khám nội nhi, tim mạch hô hấp, tai mũi họng & quản lý 23 trạm y tế cơ sở TP. Quảng Ngãi',
    address: 'Đường Nguyễn Du, Phường Nghĩa Chánh, TP. Quảng Ngãi',
    hotline: '0255.3822.115'
  },
  {
    id: 'bv-y-hoc-co-truyen',
    image: '/img_197.jpg',
    fallbackImage: '/hospitals/benh_vien_hien_dai.jpg',
    title: 'Bệnh Viện Y Dược Cổ Truyền Tỉnh Quảng Ngãi',
    subtitle: 'Bệnh viện chuyên khoa kết hợp Y học Cổ truyền và Y học Hiện đại tại TP. Quảng Ngãi',
    tag: 'Y Dược Cổ Truyền & PHCN • TP. Quảng Ngãi',
    badgeColor: 'bg-amber-600',
    details: 'Châm cứu, xoa bóp bấm huyệt, phục hồi chức năng sau tai biến • Kho dược liệu chuẩn GMP',
    address: 'Số 02 Hùng Vương, Phường Lê Hồng Phong, TP. Quảng Ngãi',
    hotline: '0255.3822.569'
  },
  {
    id: 'bv-mat-quang-ngai',
    image: '/hospitals/kham_mat_bv_mat.jpg',
    fallbackImage: '/img_194.jpg',
    title: 'Bệnh Viện Mắt Tỉnh Quảng Ngãi',
    subtitle: 'Bác sĩ nhãn khoa khám đo thị lực, khám đáy mắt & phẫu thuật mắt kỹ thuật cao',
    tag: 'Chuyên Khoa Mắt • TP. Quảng Ngãi',
    badgeColor: 'bg-cyan-700',
    details: 'Phẫu thuật Phaco đục thủy tinh thể, khúc xạ, khám mắt trẻ em & điều trị bệnh lý võng mạc',
    address: 'Khu Đô Thị Mới, Phường Nghĩa Lộ, TP. Quảng Ngãi',
    hotline: '0255.3818.999'
  },
  {
    id: 'cdc-quang-ngai',
    image: '/hospitals/xet_nghiem_cdc.jpg',
    fallbackImage: '/bvdk_quang_ngai.png',
    title: 'Trung Tâm Kiểm Soát Bệnh Tật (CDC Quảng Ngãi)',
    subtitle: 'Cán bộ y tế dự phòng & xét nghiệm sinh học phân tử kiểm soát dịch bệnh TP. Quảng Ngãi',
    tag: 'Y Tế Dự Phòng & Xét Nghiệm • TP. Quảng Ngãi',
    badgeColor: 'bg-purple-700',
    details: 'Xét nghiệm virus PCR, chẩn đoán bệnh truyền nhiễm, tiêm chủng vắc xin & giám sát cộng đồng',
    address: 'Đường Hai Bà Trưng, Phường Lê Hồng Phong, TP. Quảng Ngãi',
    hotline: '0255.3822.846'
  },
  {
    id: 'khoa-cap-cuu-115-bvdk',
    image: '/anhdep/24.png',
    fallbackImage: '/bvdk_quang_ngai.png',
    title: 'Khối Kỹ Thuật Cao & Trung Tâm Đột Quỵ 115 (BVĐK Tỉnh)',
    subtitle: 'Đơn nguyên hồi sức tích cực ICU, can thiệp tim mạch & cấp cứu phản ứng nhanh 115 TP. Quảng Ngãi',
    tag: 'Hồi Sức & Cấp Cứu 115 • TP. Quảng Ngãi',
    badgeColor: 'bg-rose-600',
    details: 'Hệ thống chụp MRI 1.5 Tesla, CT 128 lát cắt • Đội xe cấp cứu 115 điều phối GPS toàn thành phố',
    address: 'Khối Nhà A - Số 184 Hùng Vương, Phường Trần Phú, TP. Quảng Ngãi',
    hotline: '115 / 0255.3827.899'
  }
];

interface HospitalCoverSliderProps {
  onOpenEmergency: () => void;
  className?: string;
}

export const HospitalCoverSlider: React.FC<HospitalCoverSliderProps> = ({
  onOpenEmergency,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [zoomImage, setZoomImage] = useState<HospitalSlide | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSlides = HOSPITAL_SLIDES.length;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Auto-play timer
  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(() => {
        nextSlide();
      }, 5000); // 5 seconds per slide
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, currentIndex]);

  const currentSlide = HOSPITAL_SLIDES[currentIndex];

  return (
    <div 
      className={`relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 group select-none ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slide Image Layer with Smooth Crossfade and Ken Burns Zoom */}
      <div className="relative h-72 sm:h-88 md:h-[420px] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {HOSPITAL_SLIDES.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover object-center brightness-105 contrast-[1.02] transition-transform ease-out ${
                  isActive ? 'scale-105 duration-7000' : 'scale-100 duration-1000'
                }`}
                onError={(e) => {
                  if (slide.fallbackImage) {
                    e.currentTarget.src = slide.fallbackImage;
                  }
                }}
              />
            </div>
          );
        })}

        {/* Subtle Bottom Ambient Fade (Keeps the hospital photo bright, sunny & clear) */}
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />

        {/* Navigation Arrows (Bright Frosted Glass, No Heavy Shadows) */}
        <motion.button
          whileHover={{ scale: 1.08, x: -2 }}
          whileTap={{ scale: 0.92 }}
          onClick={prevSlide}
          aria-label="Hình trước"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/90 hover:bg-white text-slate-800 dark:bg-slate-900/90 dark:hover:bg-slate-900 dark:text-white backdrop-blur-md border border-slate-200/90 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer opacity-90 group-hover:opacity-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08, x: 2 }}
          whileTap={{ scale: 0.92 }}
          onClick={nextSlide}
          aria-label="Hình tiếp theo"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/90 hover:bg-white text-slate-800 dark:bg-slate-900/90 dark:hover:bg-slate-900 dark:text-white backdrop-blur-md border border-slate-200/90 dark:border-slate-700 flex items-center justify-center transition-all cursor-pointer opacity-90 group-hover:opacity-100"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>

        {/* Top Control Bar: Slide Counter & Pause/Play Indicator (Bright & Clean) */}
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsPaused(!isPaused)}
            className="px-2.5 py-1 rounded-xl bg-white/90 hover:bg-white text-slate-800 dark:bg-slate-900/90 dark:text-white backdrop-blur-md text-[11px] font-bold border border-slate-200/90 dark:border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
            title={isPaused ? "Bật tự động trượt" : "Tạm dừng tự động trượt"}
          >
            {isPaused ? (
              <>
                <Play className="w-3 h-3 text-emerald-600 fill-emerald-600 dark:text-emerald-400" />
                <span>Tiếp tục</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>Tự động</span>
              </>
            )}
          </motion.button>

          <span className="px-3 py-1 rounded-xl bg-white/90 text-slate-800 dark:bg-slate-900/90 dark:text-white backdrop-blur-md text-xs font-mono font-bold border border-slate-200/90 dark:border-slate-700">
            {currentIndex + 1} / {totalSlides}
          </span>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setZoomImage(currentSlide)}
            className="p-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-800 dark:bg-slate-900/90 dark:text-cyan-300 backdrop-blur-md border border-slate-200/90 dark:border-slate-700 transition-colors cursor-pointer"
            title="Phóng to ảnh chất lượng cao"
          >
            <ZoomIn className="w-4 h-4 text-teal-600 dark:text-cyan-300" />
          </motion.button>
        </div>

        {/* Top Left: Slide Category Badge */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
          <motion.span 
            key={`badge-${currentSlide.id}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-white flex items-center gap-1.5 ${currentSlide.badgeColor}`}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
            {currentSlide.tag}
          </motion.span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-slate-800 dark:bg-slate-900/90 dark:text-white backdrop-blur-md border border-slate-200/90 dark:border-slate-700">
            <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-cyan-400" />
            Bệnh Viện Khu Vực TP. Quảng Ngãi
          </span>
        </div>

        {/* Bottom Content Area: Bright Frosted Glass Card with Crisp Typography */}
        <div className="absolute bottom-10 sm:bottom-12 left-0 right-0 z-30 px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <AnimatePresence mode="wait">
              <motion.div 
                key={`info-${currentSlide.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="bg-white/92 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/80 dark:border-slate-700/80 max-w-2xl space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {currentSlide.title}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-teal-700 dark:text-teal-300 font-semibold line-clamp-2">
                  {currentSlide.subtitle}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>{currentSlide.address}</span>
                  </span>
                  <span>•</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold hidden sm:inline">
                    {currentSlide.details}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Quick Emergency / Action Button on Cover */}
            <div className="flex items-center gap-2.5 shrink-0 self-start md:self-end">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onOpenEmergency}
                className="px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 cursor-pointer border border-rose-500/40"
              >
                <PhoneCall className="w-4 h-4 text-white animate-bounce" />
                <span>CẤP CỨU 115 ({currentSlide.hotline})</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* ⏱️ Animated Auto-Slide Countdown Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-30 h-1 bg-slate-200/60 dark:bg-slate-800/60">
          {!isPaused && (
            <motion.div
              key={`progress-${currentIndex}`}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 5, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"
            />
          )}
        </div>

        {/* Bottom Navigation Dots & Quick Switcher */}
        <div className="absolute bottom-2.5 left-0 right-0 z-30 flex items-center justify-center gap-2 px-4 pointer-events-auto">
          {HOSPITAL_SLIDES.map((slide, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={slide.id}
                onClick={() => goToSlide(idx)}
                aria-label={`Chuyển tới slide ${idx + 1}`}
                className={`transition-all duration-300 cursor-pointer rounded-full ${
                  isActive 
                    ? 'w-8 sm:w-10 h-2 bg-emerald-600 dark:bg-emerald-400' 
                    : 'w-2 sm:w-2.5 h-2 bg-slate-400/70 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-400'
                }`}
                title={slide.title}
              />
            );
          })}
        </div>

      </div>

      {/* Thumbnail Selector Strip (Bright & Clean, No Dark Mud) */}
      <div className="bg-slate-50/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 px-3 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 px-1 hidden sm:inline">
          Cơ sở BV tại TP. Quảng Ngãi:
        </span>
        {HOSPITAL_SLIDES.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={slide.id}
              onClick={() => goToSlide(idx)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white border border-emerald-500 font-bold'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="w-5 h-5 rounded-md overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                <img
                  src={slide.image}
                  alt={slide.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    if (slide.fallbackImage) e.currentTarget.src = slide.fallbackImage;
                  }}
                />
              </div>
              <span className="text-[11px] font-bold truncate max-w-[130px] sm:max-w-[190px]">
                {idx + 1}. {slide.title.replace('Bệnh Viện ', 'BV ').replace('Trung Tâm Y Tế ', 'TTYT ').replace('Trung Tâm Kiểm Soát Bệnh Tật ', 'CDC ').replace('Tỉnh Quảng Ngãi', 'TP.QN')}
              </span>
            </button>
          );
        })}
      </div>


      {/* Lightbox Zoom Modal for Slide Image */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomImage(null)}
        >
          <div 
            className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase text-white ${zoomImage.badgeColor}`}>
                  {zoomImage.tag}
                </span>
                <span className="text-sm font-bold truncate">{zoomImage.title}</span>
              </div>
              <button 
                onClick={() => setZoomImage(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 sm:p-4 bg-black flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img 
                src={zoomImage.image} 
                alt={zoomImage.title}
                referrerPolicy="no-referrer"
                className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg"
                onError={(e) => {
                  if (zoomImage.fallbackImage) e.currentTarget.src = zoomImage.fallbackImage;
                }}
              />
            </div>

            <div className="p-4 bg-slate-950/90 border-t border-slate-800 text-xs text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="font-semibold text-white">{zoomImage.subtitle}</p>
                <p className="text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{zoomImage.address} • Hotline: {zoomImage.hotline}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const nextIdx = (HOSPITAL_SLIDES.findIndex(s => s.id === zoomImage.id) + 1) % totalSlides;
                    setZoomImage(HOSPITAL_SLIDES[nextIdx]);
                    setCurrentIndex(nextIdx);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>Ảnh tiếp theo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
