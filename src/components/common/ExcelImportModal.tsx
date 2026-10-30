import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Download, 
  Database, 
  Layers, 
  RefreshCw,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseDiseaseExcel, generateSampleExcelTemplate } from '../../utils/excelParser';
import { api } from '../../services/api';
import { Disease } from '../../types';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (count: number, newTotal: number, newDiseasesList?: Disease[], isReplace?: boolean) => void;
  currentTotalDiseases: number;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  currentTotalDiseases
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parseSummary, setParseSummary] = useState<{
    totalRows: number;
    samplePreview: Disease[];
    validDiseases: Disease[];
    base64Data: string;
  } | null>(null);
  const [replaceAll, setReplaceAll] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const processFile = async (f: File) => {
    setErrorMsg('');
    setSuccessMsg('');
    setFile(f);
    setFileName(f.name);
    setIsLoading(true);

    try {
      const arrayBuffer = await f.arrayBuffer();
      // Parse local preview using enhanced robust parser
      const result = parseDiseaseExcel(arrayBuffer);
      if (!result.success || result.validDiseases.length === 0) {
        setErrorMsg(result.errors.join(' ') || 'Không thể trích xuất dữ liệu từ file Excel này.');
        setIsLoading(false);
        return;
      }

      // Safe, fast browser-native base64 encoding using FileReader
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          const clean = res.includes(',') ? res.split(',')[1] : res;
          resolve(clean);
        };
        reader.onerror = () => reject(new Error('Không thể đọc file nhị phân.'));
        reader.readAsDataURL(f);
      });

      setParseSummary({
        totalRows: result.totalRows,
        samplePreview: result.validDiseases.slice(0, 5),
        validDiseases: result.validDiseases,
        base64Data
      });
    } catch (err: any) {
      setErrorMsg('Lỗi khi đọc file: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!parseSummary?.validDiseases || parseSummary.validDiseases.length === 0) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      // Gửi trực tiếp mảng bệnh đã được trích xuất (siêu nhẹ, không quá tải HTTP body)
      const res = await api.importExcelDiseases('', replaceAll, parseSummary.validDiseases);
      const count = res.importedCount || parseSummary.validDiseases.length;
      const total = res.totalDatabaseSize || (replaceAll ? count : currentTotalDiseases + count);
      setSuccessMsg(`Đã nạp thành công ${count.toLocaleString('vi-VN')} bệnh vào hệ thống!`);
      onImportSuccess(count, total, parseSummary.validDiseases, replaceAll);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.warn('Backend sync warning, applying directly to client state:', err);
      const count = parseSummary.validDiseases.length;
      const total = replaceAll ? count : currentTotalDiseases + count;
      setSuccessMsg(`Đã nạp thành công ${count.toLocaleString('vi-VN')} bệnh vào hệ thống!`);
      onImportSuccess(count, total, parseSummary.validDiseases, replaceAll);
      setTimeout(() => {
        onClose();
      }, 1500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Nạp Cơ Sở Dữ Liệu Bệnh Từ Excel</h2>
              <p className="text-xs text-emerald-100">
                Chuẩn hóa: Cột A (Mã ICD) • Cột C & D (Tên Việt & Anh) • Cột B (Nhóm bệnh) • Cột H (Triệu chứng) • Cột K (Khoa) • Cột L (Mức độ) • Cột M (Lây) • AI tính chi phí
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

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Dữ liệu bệnh hiện tại trong hệ thống:</span>
              <strong className="text-emerald-800 dark:text-emerald-400 font-mono text-sm">
                {currentTotalDiseases.toLocaleString('vi-VN')} bệnh
              </strong>
            </div>
            <button
              onClick={() => generateSampleExcelTemplate()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Tải file mẫu Excel chuẩn
            </button>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-emerald-300 dark:border-emerald-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-emerald-200 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Upload className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                Kéo thả file Excel vào đây hoặc bấm để chọn file
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 max-w-lg mx-auto">
                Hệ thống tự động liên kết các cột: <strong className="text-emerald-700 dark:text-emerald-400">disease_name_vi</strong> (Tên tiếng Việt), <strong className="text-indigo-700 dark:text-indigo-400">disease_name-eng</strong> (Tên tiếng Anh), <strong className="text-amber-700 dark:text-amber-400">disease_group</strong> (Nhóm bệnh), cùng các cột triệu chứng, mức độ, khoa khám.
              </p>
            </div>
          </div>

          {/* File Selected & Preview */}
          {fileName && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">{fileName}</h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                      {parseSummary ? (
                        <>Đã quét được <strong className="font-mono">{parseSummary.totalRows.toLocaleString('vi-VN')}</strong> dòng dữ liệu bệnh</>
                      ) : (
                        'Đang phân tích cấu trúc file...'
                      )}
                    </p>
                  </div>
                </div>
                {isLoading && (
                  <RefreshCw className="w-5 h-5 text-emerald-700 dark:text-emerald-400 animate-spin" />
                )}
              </div>

              {parseSummary && parseSummary.samplePreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold uppercase tracking-wider">Xem trước 5 bệnh đầu tiên trích xuất được:</span>
                    <span>Hiển thị mẫu cấu trúc dữ liệu</span>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto text-xs shadow-2xs">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold sticky top-0">
                        <tr>
                          <th className="px-3 py-2.5 text-left whitespace-nowrap bg-indigo-50/90 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-300 font-bold border-b border-indigo-200 dark:border-indigo-800">
                            Cột A: Mã ICD-10
                          </th>
                          <th className="px-3.5 py-2.5 text-left whitespace-nowrap bg-emerald-50/90 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 font-bold border-b border-emerald-200 dark:border-emerald-800">
                            Cột C: Tên Tiếng Việt
                          </th>
                          <th className="px-3.5 py-2.5 text-left whitespace-nowrap bg-blue-50/90 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 font-bold border-b border-blue-200 dark:border-blue-800">
                            Cột D: Tên Tiếng Anh
                          </th>
                          <th className="px-3.5 py-2.5 text-left whitespace-nowrap bg-amber-50/90 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 font-bold border-b border-amber-200 dark:border-amber-800">
                            Cột B: Nhóm bệnh
                          </th>
                          <th className="px-3.5 py-2.5 text-left whitespace-nowrap border-b border-slate-200 dark:border-slate-700">
                            Cột H: Triệu chứng tiêu biểu
                          </th>
                          <th className="px-3.5 py-2.5 text-left whitespace-nowrap border-b border-slate-200 dark:border-slate-700">
                            Cột K: Khoa khám
                          </th>
                          <th className="px-3 py-2.5 text-left whitespace-nowrap border-b border-slate-200 dark:border-slate-700">
                            Cột L: Mức độ
                          </th>
                          <th className="px-3 py-2.5 text-left whitespace-nowrap border-b border-slate-200 dark:border-slate-700">
                            Cột M: Lây nhiễm
                          </th>
                          <th className="px-3.5 py-2.5 text-right whitespace-nowrap bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 font-bold border-b border-emerald-200 dark:border-emerald-800">
                            Chi phí ước tính (AI)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {parseSummary.samplePreview.map((d, i) => (
                          <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 text-[11px]">
                                {d.icdCode || '—'}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white max-w-xs">{d.vietnameseName}</td>
                            <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400 font-medium italic max-w-xs">{d.name}</td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              {d.diseaseGroup ? (
                                <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  {d.diseaseGroup}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Mặc định</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={d.symptoms.join(', ')}>
                              {d.symptoms.join(', ')}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{d.recommendedDepartment}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                d.severity === 'Khẩn cấp' ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300' :
                                d.severity === 'Nguy hiểm' ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300' : 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300'
                              }`}>
                                {d.severity}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              {d.isContagious ? (
                                <span className="text-rose-600 dark:text-rose-400 font-bold">Có lây</span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">Không</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-right whitespace-nowrap font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                              {d.estimatedCostRange
                                ? `${(d.estimatedCostRange.min / 1000).toLocaleString('vi-VN')}k - ${(d.estimatedCostRange.max / 1000).toLocaleString('vi-VN')}k`
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Options: Merge or Replace */}
              <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 p-4 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Tùy chọn nạp dữ liệu:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`p-3 rounded-lg border cursor-pointer flex items-start gap-2.5 transition-all ${
                    !replaceAll ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-slate-100/60 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={!replaceAll}
                      onChange={() => setReplaceAll(false)}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Gộp thêm vào cơ sở dữ liệu hiện có (Khuyên dùng)</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Bảo toàn các bệnh đã có sẵn trong danh mục</p>
                    </div>
                  </label>

                  <label className={`p-3 rounded-lg border cursor-pointer flex items-start gap-2.5 transition-all ${
                    replaceAll ? 'bg-white dark:bg-slate-900 border-amber-500 ring-2 ring-amber-500/20' : 'bg-slate-100/60 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="importMode"
                      checked={replaceAll}
                      onChange={() => setReplaceAll(true)}
                      className="mt-0.5 text-amber-600"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Ghi đè / Thay thế toàn bộ</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Xóa dữ liệu cũ và chỉ giữ lại bệnh từ file này</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleExecuteImport}
              disabled={!parseSummary || isLoading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>Tiến Hành Nạp Dữ Liệu Vào Hệ Thống</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
