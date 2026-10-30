import React, { useState } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  Plus, 
  Activity, 
  Thermometer, 
  HeartPulse, 
  Smile, 
  AlertCircle, 
  CheckCircle2, 
  Tag, 
  FileText
} from 'lucide-react';
import { PatientSymptomLog } from '../../types';
import { api } from '../../services/api';

interface PatientJournalProps {
  logs: PatientSymptomLog[];
  onLogAdded: (newLog: PatientSymptomLog) => void;
  patientId: string;
  patientName: string;
}

export const PatientJournal: React.FC<PatientJournalProps> = ({
  logs,
  onLogAdded,
  patientId,
  patientName
}) => {
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [recordTime, setRecordTime] = useState(
    new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [symptomsInput, setSymptomsInput] = useState('');
  const [selectedTagSymptoms, setSelectedTagSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [bodyTemp, setBodyTemp] = useState('38.2');
  const [bloodPressure, setBloodPressure] = useState('120/80');
  const [painLevel, setPainLevel] = useState(5);
  const [mentalState, setMentalState] = useState<PatientSymptomLog['mentalState']>('Mệt mỏi');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterText, setFilterText] = useState('');

  const commonSymptomChips = [
    'Sốt cao đột ngột',
    'Đau nhức sau hốc mắt',
    'Ớn lạnh rét run',
    'Đau mỏi cơ bắp',
    'Ho khan rát họng',
    'Nổi ban đỏ dưới da',
    'Đau quặn bụng',
    'Buồn nôn / Nôn',
    'Chảy máu cam/chân răng',
    'Khó thở, tức ngực',
    'Chóng mặt, xây xẩm'
  ];

  const handleToggleChip = (chip: string) => {
    if (selectedTagSymptoms.includes(chip)) {
      setSelectedTagSymptoms(selectedTagSymptoms.filter(c => c !== chip));
    } else {
      setSelectedTagSymptoms([...selectedTagSymptoms, chip]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const customList = symptomsInput
        .split(/[,;\n]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      const combinedSymptoms = Array.from(new Set([...selectedTagSymptoms, ...customList]));
      if (combinedSymptoms.length === 0) {
        combinedSymptoms.push('Cơ thể mệt mỏi khó chịu');
      }

      const recordedAt = `${recordDate}T${recordTime}`;

      const newLog = await api.addPatientLog(patientId, {
        patientName,
        symptoms: combinedSymptoms,
        notes,
        bodyTemperature: bodyTemp ? parseFloat(bodyTemp) : undefined,
        bloodPressure: bloodPressure || undefined,
        painLevel,
        mentalState,
        assignedHospital: 'Bệnh Viện Đa Khoa Tỉnh Quảng Ngãi'
      });

      onLogAdded(newLog);
      setIsOpenForm(false);
      setNotes('');
      setSymptomsInput('');
      setSelectedTagSymptoms([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLogs = logs.filter(l => 
    l.notes.toLowerCase().includes(filterText.toLowerCase()) ||
    l.symptoms.some(s => s.toLowerCase().includes(filterText.toLowerCase())) ||
    l.recordedAt.includes(filterText)
  );

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300">
              Nhật Ký Lâm Sàng Chi Tiết
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Chức năng 2</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">Sổ Nhật Ký Triệu Chứng Từng Ngày, Từng Giờ</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl mt-0.5">
            Ghi chép chính xác giờ xuất hiện triệu chứng, cơn đau, nhiệt độ cơ thể. Bác sĩ điều trị tại bệnh viện sẽ xem trực tiếp dòng nhật ký này để chẩn đoán chính xác hơn.
          </p>
        </div>

        <button
          onClick={() => setIsOpenForm(!isOpenForm)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isOpenForm ? 'Đóng Biểu Mẫu' : 'Ghi Triệu Chứng Giờ Này'}</span>
        </button>
      </div>

      {/* Entry Form Modal / Collapsible */}
      {isOpenForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border-2 border-blue-500/40 dark:border-blue-500/50 shadow-lg space-y-5 animate-in fade-in duration-200 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Ghi Nhận Diễn Biến Bệnh Mới</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bệnh nhân: {patientName}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Ngày ghi chép:
              </label>
              <input
                type="date"
                required
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Giờ cụ thể:
              </label>
              <input
                type="time"
                required
                value={recordTime}
                onChange={(e) => setRecordTime(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Thân nhiệt (°C):
              </label>
              <input
                type="number"
                step="0.1"
                min="35"
                max="43"
                value={bodyTemp}
                onChange={(e) => setBodyTemp(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Huyết áp (mmHg):
              </label>
              <input
                type="text"
                placeholder="120/80"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium font-mono"
              />
            </div>
          </div>

          {/* Quick chips selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Chọn nhanh các triệu chứng xuất hiện lúc này:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {commonSymptomChips.map((chip) => {
                const isSelected = selectedTagSymptoms.includes(chip);
                return (
                  <button
                    type="button"
                    key={chip}
                    onClick={() => handleToggleChip(chip)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-2xs font-semibold'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {chip}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              placeholder="Nhập thêm các triệu chứng khác nếu có (phân tách bởi dấu phẩy)..."
              value={symptomsInput}
              onChange={(e) => setSymptomsInput(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Pain Scale & Mental State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Mức độ đau / khó chịu (1 - 10):</span>
                <span className="font-extrabold text-sm text-rose-600 dark:text-rose-400 font-mono">{painLevel}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={painLevel}
                onChange={(e) => setPainLevel(parseInt(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                <span>1: Đau nhẹ</span>
                <span>5: Khá đau</span>
                <span>10: Dữ dội không chịu nổi</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Tình trạng tinh thần:</label>
              <select
                value={mentalState}
                onChange={(e) => setMentalState(e.target.value as any)}
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-100"
              >
                <option value="Rất tốt">Rất tốt</option>
                <option value="Bình thường">Bình thường</option>
                <option value="Mệt mỏi">Mệt mỏi</option>
                <option value="Căng thẳng">Căng thẳng</option>
                <option value="Lo âu">Lo âu</option>
                <option value="Đau đớn">Đau đớn nhiều</option>
              </select>
            </div>
          </div>

          {/* Detailed clinical notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
              Ghi chép chi tiết cảm giác & thuốc đã uống lúc này:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ví dụ: Vừa uống 1 viên Paracetamol 500mg và 300ml nước ấm. Cơn đau đầu hạ bớt nhưng vẫn còn sốt âm ỉ, không ăn được cháo..."
              className="w-full text-xs sm:text-sm p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsOpenForm(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 cursor-pointer"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu Vào Nhật Ký Bệnh'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Filter */}
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Tìm kiếm theo triệu chứng, cảm giác, ngày giờ..."
          className="w-full sm:w-80 text-xs sm:text-sm px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
          Tổng cộng: <strong>{filteredLogs.length}</strong> lần ghi chép
        </span>
      </div>

      {/* Timeline of Logs */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-blue-200 dark:border-blue-900 space-y-6">
        {filteredLogs.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
            Chưa có ghi chép triệu chứng nào phù hợp. Hãy nhấn <strong>Ghi Triệu Chứng Giờ Này</strong> để lưu lại diễn biến sức khỏe!
          </div>
        ) : (
          filteredLogs.map((log) => {
            const dateObj = new Date(log.recordedAt);
            const dateStr = isNaN(dateObj.getTime()) ? log.recordedAt : dateObj.toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            const timeStr = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div key={log.id} className="relative group">
                
                {/* Timeline circle badge */}
                <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-blue-600/30 ring-4 ring-white dark:ring-slate-950">
                  <Clock className="w-3.5 h-3.5" />
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-xs space-y-3">
                  
                  {/* Top line: Timestamp & Vitals */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">{timeStr}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">• {dateStr}</span>
                      {log.mentalState && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {log.mentalState}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {log.bodyTemperature && (
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-bold font-mono ${
                          log.bodyTemperature >= 38.5 ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300'
                        }`}>
                          {log.bodyTemperature}°C
                        </span>
                      )}
                      {log.bloodPressure && (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold font-mono bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300">
                          {log.bloodPressure}
                        </span>
                      )}
                      {log.painLevel !== undefined && (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300">
                          Đau: {log.painLevel}/10
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Symptoms tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {log.symptoms.map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-xs font-medium border border-blue-100 dark:border-blue-800">
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Clinical note */}
                  {log.notes && (
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700 leading-relaxed">
                      {log.notes}
                    </p>
                  )}

                  {log.assignedHospital && (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>Cơ sở y tế theo dõi: <strong className="text-slate-700 dark:text-slate-300">{log.assignedHospital}</strong></span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Bác sĩ có thể đọc trực tiếp</span>
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
