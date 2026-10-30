import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Stethoscope, 
  Sparkles, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  CheckCircle2,
  Info, 
  MapPin, 
  FileSpreadsheet, 
  HeartHandshake, 
  Hospital, 
  Clock, 
  Flame, 
  RefreshCw,
  Share2
} from 'lucide-react';
import { Disease, SeverityLevel } from '../../types';
import { api } from '../../services/api';

interface SymptomCheckerProps {
  diseases: Disease[];
  onSelectHospitalForEstimate: (hospitalId?: string) => void;
}

export const SymptomChecker: React.FC<SymptomCheckerProps> = ({
  diseases,
  onSelectHospitalForEstimate
}) => {
  const [symptomInput, setSymptomInput] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; district: string } | null>(null);
  const [patientNotes, setPatientNotes] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [diseaseSearchQuery, setDiseaseSearchQuery] = useState('');
  const [contagiousFilter, setContagiousFilter] = useState(false);

  // Common quick symptom buttons
  const quickSymptoms = [
    'Sốt cao 39-40 độ',
    'Đau nhức hốc mắt',
    'Phát ban đỏ dưới da',
    'Chảy máu chân răng / cam',
    'Đau âm ỉ hố chậu phải',
    'Loét miệng họng, chảy dãi',
    'Nổi bọng nước lòng bàn tay chân',
    'Ợ chua, nóng rát thượng vị',
    'Ho khan, rát họng, nghẹt mũi',
    'Khó thở, tức ngực',
    'Tiêu chảy nhiều lần',
    'Huyết áp tăng cao, đau đầu sau gáy'
  ];

  // Request location silently for epidemiology surveillance
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            district: 'TP. Quảng Ngãi'
          });
        },
        () => {
          setUserLocation({
            lat: 15.1219,
            lng: 108.7925,
            district: 'TP. Quảng Ngãi'
          });
        }
      );
    }
  }, []);

  const handleToggleSymptom = (sym: string) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  const handleAddCustomSymptom = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && symptomInput.trim()) {
      e.preventDefault();
      const val = symptomInput.trim();
      if (!selectedSymptoms.includes(val)) {
        setSelectedSymptoms([...selectedSymptoms, val]);
      }
      setSymptomInput('');
    }
  };

  const handleRunAnalysis = async () => {
    let symptomsToAnalyze = [...selectedSymptoms];
    const pendingText = symptomInput.trim();
    if (pendingText && !symptomsToAnalyze.includes(pendingText)) {
      symptomsToAnalyze.push(pendingText);
      setSelectedSymptoms(symptomsToAnalyze);
      setSymptomInput('');
    }

    if (symptomsToAnalyze.length === 0) return;
    setIsAnalyzing(true);
    try {
      const res = await api.analyzeSymptoms(
        symptomsToAnalyze,
        patientNotes,
        userLocation || undefined
      );
      setAiAnalysisResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Filter diseases from internal catalog - 100% null-safe
  const [catalogLimit, setCatalogLimit] = useState(60);

  const filteredCatalog = diseases.filter(d => {
    if (!d) return false;
    const q = diseaseSearchQuery.toLowerCase().trim();
    const vi = String(d.vietnameseName || '').toLowerCase();
    const eng = String(d.name || '').toLowerCase();
    const icd = String(d.icdCode || '').toLowerCase();
    const grp = String(d.diseaseGroup || '').toLowerCase();
    const syms = Array.isArray(d.symptoms) ? d.symptoms : [];

    const matchesQuery = q === '' ||
      vi.includes(q) ||
      eng.includes(q) ||
      icd.includes(q) ||
      grp.includes(q) ||
      syms.some(s => String(s || '').toLowerCase().includes(q));

    const matchesContagious = contagiousFilter ? d.isContagious : true;
    return matchesQuery && matchesContagious;
  });

  return (
    <div className="space-y-6">
      
      {/* Search Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
              Chẩn Đoán Triệu Chứng Bằng AI
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Chức năng 1 & Chức năng 3 (Giám sát dịch tễ)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
            Tra Cứu Triệu Chứng & Cảnh Báo Nguy Cơ Bệnh Tật
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl mt-0.5">
            Nhập các biểu hiện bạn đang gặp phải. Hệ thống đối chiếu với kho hơn <strong className="text-emerald-700 dark:text-emerald-400">{diseases.length.toLocaleString('vi-VN')} bệnh</strong> (đã được Quản trị viên y tế chuẩn hóa), tự động khoanh vùng dịch tễ lây nhiễm và hướng dẫn chăm sóc y tế chuẩn.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full md:w-auto">
          <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center gap-1.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Kho Dữ Liệu Đã Chuẩn Hóa ({diseases.length.toLocaleString('vi-VN')} bệnh)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Symptom input and triggers */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Nhập & Chọn Triệu Chứng Của Bạn</span>
            </h3>
            <div className="flex items-center gap-2">
              {selectedSymptoms.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSymptoms([]);
                    setAiAnalysisResult(null);
                  }}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline cursor-pointer transition-colors"
                >
                  Xóa tất cả ({selectedSymptoms.length})
                </button>
              )}
              {userLocation && (
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Vị trí: {userLocation.district}
                </span>
              )}
            </div>
          </div>

          {/* Tag input */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all">
            {selectedSymptoms.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedSymptoms.map((sym) => (
                  <span
                    key={sym}
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>{sym}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSymptom(sym)}
                      className="hover:text-emerald-200 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={symptomInput}
              onChange={(e) => setSymptomInput(e.target.value)}
              onKeyDown={handleAddCustomSymptom}
              placeholder={selectedSymptoms.length === 0 ? "Nhập triệu chứng (VD: đau răng, ho sốt, đau dạ dày...) rồi bấm Enter hoặc bấm nút Phân Tích..." : "Gõ thêm triệu chứng khác rồi bấm Enter..."}
              className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 py-1"
            />
          </div>

          {/* Quick Click Chips */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Chọn nhanh các triệu chứng thường gặp:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickSymptoms.map((chip) => {
                const isSelected = selectedSymptoms.includes(chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleToggleSymptom(chip)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {chip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Ghi chú thêm về thời gian xuất hiện hoặc diễn biến:
            </label>
            <textarea
              rows={2}
              value={patientNotes}
              onChange={(e) => setPatientNotes(e.target.value)}
              placeholder="Ví dụ: Bị sốt liên tục 2 ngày nay, uống Paracetamol chỉ hạ được 2 tiếng lại sốt lại..."
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
            />
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={(selectedSymptoms.length === 0 && !symptomInput.trim()) || isAnalyzing}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI Đang Phân Tích & Đối Chiếu Dữ Liệu Bệnh...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>PHÂN TÍCH TRIỆU CHỨNG & NGUY CƠ BỆNH TẬT</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic text-center">
            * Hệ thống tự động kích hoạt giám sát dịch tễ Quảng Ngãi nếu phát hiện bệnh lây nhiễm.
          </p>
        </div>

        {/* Right Column: AI Analysis Results */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Kết Quả Đánh Giá Y Khoa & Khuyến Nghị</span>
            </h3>
            {aiAnalysisResult && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                aiAnalysisResult.urgencyLevel === 'Khẩn cấp' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 animate-pulse' :
                aiAnalysisResult.urgencyLevel === 'Nguy hiểm' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
              }`}>
                Mức độ: {aiAnalysisResult.urgencyLevel}
              </span>
            )}
          </div>

          {!aiAnalysisResult ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-3">
              <Stethoscope className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Sẵn sàng phân tích</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                Chọn triệu chứng ở cột bên trái và bấm &quot;Phân Tích Triệu Chứng&quot; để nhận hướng dẫn chăm sóc và chẩn đoán liên quan.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300 text-xs sm:text-sm">
              
              {/* Contagion Epidemic Alert Banner */}
              {aiAnalysisResult.isContagiousAlert && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 rounded-xl text-rose-900 dark:text-rose-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                    <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>CẢNH BÁO BỆNH CÓ TÍNH LÂY NHIỄM CAO!</span>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-300">
                    Nghi ngờ: <strong>{aiAnalysisResult.contagiousDiseaseName || 'Bệnh truyền nhiễm'}</strong>. 
                    Tọa độ của bạn đã được ghi nhận tự động vào Hệ thống Giám sát Dịch tễ tỉnh Quảng Ngãi để hỗ trợ khoanh vùng kiểm soát.
                  </p>
                </div>
              )}

              {/* Medical Summary */}
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-950 dark:text-emerald-200 text-xs">
                <span className="font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider block mb-1">Nhận định sơ bộ:</span>
                <p className="leading-relaxed">{aiAnalysisResult.summary}</p>
              </div>

              {/* Matched Diseases with Care and Prevention */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Các bệnh có triệu chứng tương đồng cao nhất:
                </h4>
                {aiAnalysisResult.matchedDiseases?.map((dis: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{dis.name || dis.vietnameseName}</span>
                        {dis.icdCode && (
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            ICD: {dis.icdCode}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        dis.severity === 'Khẩn cấp' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300' :
                        dis.severity === 'Nguy hiểm' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300' : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                      }`}>
                        {dis.severity || 'Nguy hiểm'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <p className="text-slate-800 dark:text-slate-200">
                        <strong className="text-emerald-700 dark:text-emerald-400">Cách chăm sóc tại nhà:</strong> {dis.careInstructions}
                      </p>
                      <p className="text-slate-800 dark:text-slate-200">
                        <strong className="text-blue-700 dark:text-blue-400">Cách phòng tránh lây lan:</strong> {dis.prevention}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Emergency Red Flags */}
              {aiAnalysisResult.emergencySigns && aiAnalysisResult.emergencySigns.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-1 text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Dấu hiệu cảnh báo đỏ phải gọi 115 hoặc đi viện ngay:
                  </span>
                  <ul className="list-disc pl-5 space-y-0.5 text-amber-950 dark:text-amber-100 font-medium">
                    {aiAnalysisResult.emergencySigns.map((sign: string, i: number) => (
                      <li key={i}>{sign}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Department & Hospital Recommendation */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="text-blue-900 dark:text-blue-200 font-bold">Gợi ý nơi khám tại Quảng Ngãi:</p>
                  <p className="text-blue-800 dark:text-blue-300 font-semibold">{aiAnalysisResult.recommendedHospitalQuangNgai}</p>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px]">{aiAnalysisResult.recommendedDepartment}</p>
                </div>
                <button
                  onClick={() => onSelectHospitalForEstimate('bv-tinh-qn')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                >
                  Xem Bảng Giá Khám
                </button>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Database Explorer: Browse preloaded or imported Excel diseases */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Danh Mục Cơ Sở Dữ Liệu Bệnh ({diseases.length.toLocaleString('vi-VN')} Bệnh)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dữ liệu y tế và mã ICD-10 được cập nhật và kiểm duyệt tập trung bởi Quản trị viên hệ thống
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={diseaseSearchQuery}
                onChange={(e) => setDiseaseSearchQuery(e.target.value)}
                placeholder="Tìm tên bệnh, triệu chứng..."
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-700 w-48 sm:w-64"
              />
            </div>
            <button
              onClick={() => setContagiousFilter(!contagiousFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                contagiousFilter
                  ? 'bg-rose-100 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {contagiousFilter ? '✓ Bệnh lây' : 'Lọc lây nhiễm'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[32rem] overflow-y-auto pr-1">
          {filteredCatalog.slice(0, catalogLimit).map((d) => (
            <div key={d.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all space-y-2 text-xs">
              <div className="flex items-start justify-between gap-1">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{d.vietnameseName}</h4>
                    {d.diseaseGroup && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {d.diseaseGroup}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {d.icdCode && (
                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 text-[10px] bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-150 dark:border-indigo-800">
                        {d.icdCode}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 italic">{d.name}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  d.severity === 'Khẩn cấp' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300' :
                  d.severity === 'Nguy hiểm' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300' : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                }`}>
                  {d.severity}
                </span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 font-medium">Triệu chứng:</span>
                <p className="text-slate-800 dark:text-slate-200 font-medium line-clamp-2">{(Array.isArray(d.symptoms) ? d.symptoms : []).join(', ')}</p>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
                <span className={d.isContagious ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400'}>
                  {d.isContagious ? '⚠️ Có lây nhiễm' : 'Không lây'}
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{d.recommendedDepartment}</span>
              </div>
            </div>
          ))}
        </div>

        {filteredCatalog.length > catalogLimit && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span>
              Đang hiển thị <strong>{catalogLimit}</strong> / <strong>{filteredCatalog.length.toLocaleString('vi-VN')}</strong> bệnh
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCatalogLimit(prev => prev + 60)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Xem thêm 60 bệnh
              </button>
              <button
                onClick={() => setCatalogLimit(filteredCatalog.length)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Xem tất cả ({filteredCatalog.length.toLocaleString('vi-VN')} bệnh)
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
