import React, { useState } from 'react';
import { 
  Calculator, 
  Building2, 
  CreditCard, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ExternalLink, 
  Receipt, 
  FileText, 
  RefreshCw,
  Coins
} from 'lucide-react';
import { HospitalInfo } from '../../types';
import { api } from '../../services/api';

interface CostEstimatorProps {
  hospitals: HospitalInfo[];
  onGoToBooking: (hospitalId: string) => void;
}

export const CostEstimator: React.FC<CostEstimatorProps> = ({ hospitals, onGoToBooking }) => {
  const [selectedHospitalId, setSelectedHospitalId] = useState(hospitals[0]?.id || 'bv-tinh-qn');
  const [diseaseInput, setDiseaseInput] = useState('Sốt xuất huyết Dengue (Sốt cao ngày thứ 3, phát ban)');
  const [hasBhyt, setHasBhyt] = useState(true);
  const [bhytType, setBhytType] = useState('80%');
  const [isLoading, setIsLoading] = useState(false);
  const [estimateResult, setEstimateResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedHospital = hospitals.find(h => h.id === selectedHospitalId) || hospitals[0];

  const handleRunEstimation = async (overrideBhytType?: string, overrideHasBhyt?: boolean, overrideHospId?: string) => {
    const curBhytType = overrideBhytType !== undefined ? overrideBhytType : bhytType;
    const curHasBhyt = overrideHasBhyt !== undefined ? overrideHasBhyt : hasBhyt;
    const curHospId = overrideHospId !== undefined ? overrideHospId : selectedHospitalId;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await api.estimateCost({
        hospitalId: curHospId,
        diseaseName: diseaseInput,
        hasBhyt: curHasBhyt,
        bhytType: curBhytType
      });
      setEstimateResult(res);
    } catch (err: any) {
      setErrorMsg('Không thể tính toán chi phí: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeBhytType = (newType: string) => {
    setBhytType(newType);
    if (estimateResult) {
      handleRunEstimation(newType, hasBhyt);
    }
  };

  const handleToggleHasBhyt = (checked: boolean) => {
    setHasBhyt(checked);
    if (estimateResult) {
      handleRunEstimation(bhytType, checked);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Intro Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300">
              Công cụ AI Chuyên Biệt Quảng Ngãi
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Chức năng 4</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            Dự Toán Chi Phí Khám Bệnh & Tiền Thuốc Tại Các Bệnh Viện Quảng Ngãi
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl mt-0.5">
            Dựa trên bảng giá viện phí thực tế của các bệnh viện tại Quảng Ngãi, quy trình khám và chính sách chi trả của BHYT để ước tính chính xác số tiền cần chuẩn bị từ xét nghiệm đến mua thuốc.
          </p>
        </div>

        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs shrink-0">
          <Coins className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Bảo hiểm Y tế hỗ trợ 80% - 100% đúng tuyến</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors duration-200">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Chọn Bệnh Viện & Khai Báo Khám Bệnh</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Bệnh viện tại Quảng Ngãi:
            </label>
            <select
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {hospitals.map(h => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.type} - {h.district})
                </option>
              ))}
            </select>
            {selectedHospital && (
              <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p><strong>Địa chỉ:</strong> {selectedHospital.address}</p>
                <p><strong>Hotline:</strong> {selectedHospital.hotline}</p>
                {selectedHospital.website && (
                  <a
                    href={selectedHospital.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
                  >
                    <span>Xem website chính thức bệnh viện</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Bệnh hoặc Triệu chứng cần đi khám:
            </label>
            <input
              type="text"
              value={diseaseInput}
              onChange={(e) => setDiseaseInput(e.target.value)}
              placeholder="Ví dụ: Sốt xuất huyết, Viêm dạ dày, Đau ruột thừa..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Insurance Toggle */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer">
                <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Có Thẻ Bảo Hiểm Y Tế (BHYT)</span>
              </label>
              <input
                type="checkbox"
                checked={hasBhyt}
                onChange={(e) => handleToggleHasBhyt(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
              />
            </div>

            {hasBhyt && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleChangeBhytType('80%')}
                  className={`p-2 rounded-lg border font-semibold transition-all cursor-pointer ${
                    bhytType === '80%' ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  BHYT Chuẩn 80% (Hộ gia đình, NLĐ)
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeBhytType('100%')}
                  className={`p-2 rounded-lg border font-semibold transition-all cursor-pointer ${
                    bhytType === '100%' ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  BHYT 100% (Trẻ em &lt;6t, Người nghèo)
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => handleRunEstimation()}
            disabled={isLoading || !diseaseInput}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI Đang Tính Toán Bảng Giá...</span>
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4" />
                <span>Bắt Đầu Dự Toán Chi Phí Khám & Thuốc</span>
              </>
            )}
          </button>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Right Column: Estimation Results & Clinical Workflow */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 transition-colors duration-200">
          {!estimateResult ? (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500 space-y-3">
              <Receipt className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Chưa có kết quả dự toán</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-md mx-auto">
                Hãy chọn bệnh viện tại Quảng Ngãi và bấm &quot;Bắt Đầu Dự Toán Chi Phí&quot; để xem chi tiết tiền khám, xét nghiệm và tiền thuốc.
              </p>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-300">
              
              {/* Cost Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tổng viện phí dự kiến</span>
                  <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5">
                    {estimateResult.estimatedTotalBeforeInsurance?.toLocaleString('vi-VN')} đ
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">BHYT chi trả ước tính</span>
                  <p className="text-base sm:text-lg font-black text-emerald-800 dark:text-emerald-300 font-mono mt-0.5">
                    -{estimateResult.insuranceCoverage?.toLocaleString('vi-VN')} đ
                  </p>
                </div>

                <div className={`p-3.5 rounded-xl text-center ring-2 transition-all ${
                  estimateResult.patientPayAmount === 0 
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 dark:border-emerald-700 ring-emerald-500/20'
                    : 'bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-400 dark:border-blue-700 ring-blue-500/20'
                }`}>
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    estimateResult.patientPayAmount === 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-blue-800 dark:text-blue-200'
                  }`}>
                    Bệnh nhân cần trả
                  </span>
                  <p className="text-lg sm:text-xl font-black font-mono mt-0.5">
                    {estimateResult.patientPayAmount === 0 ? (
                      <span className="text-emerald-700 dark:text-emerald-300">0 đ (Miễn phí 100%)</span>
                    ) : (
                      <span className="text-blue-900 dark:text-blue-100">{estimateResult.patientPayAmount?.toLocaleString('vi-VN')} đ</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Itemized Services Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>Chi tiết các danh mục chỉ định & tiền thuốc:</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Đơn giá niêm yết</span>
                </h4>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="px-3 py-2 text-left">Nội dung kỹ thuật / Thuốc</th>
                        <th className="px-3 py-2 text-right">Tổng giá</th>
                        <th className="px-3 py-2 text-center">BHYT</th>
                        <th className="px-3 py-2 text-right">Thực trả</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {estimateResult.items?.map((item: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                          <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-600 dark:text-slate-400">
                            {item.price?.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-3 py-2 text-center">
                            {item.coveredByBhyt ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {hasBhyt && bhytType === '100%' ? '100%' : '80%'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">0%</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold">
                            {item.patientPortion === 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">0 đ</span>
                            ) : (
                              <span className="text-blue-700 dark:text-blue-400">{item.patientPortion?.toLocaleString('vi-VN')} đ</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hospital Clinical Workflow */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Quy trình khám bệnh chuẩn tại {selectedHospital.name}:</span>
                </h4>
                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  {estimateResult.clinicalWorkflow?.map((step: string, sIdx: number) => (
                    <div key={sIdx} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {sIdx + 1}
                      </div>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                {estimateResult.advice && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700 italic">
                    💡 Lưu ý: {estimateResult.advice}
                  </p>
                )}
              </div>

              {/* Booking CTA */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Bạn hài lòng với dự toán chi phí này?
                </span>
                <button
                  onClick={() => onGoToBooking(selectedHospitalId)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Đặt Lịch Khám Tại Bệnh Viện Này Ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
};
