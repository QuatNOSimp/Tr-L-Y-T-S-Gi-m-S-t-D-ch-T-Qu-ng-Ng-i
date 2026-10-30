import * as XLSX from 'xlsx';
import { Disease, SeverityLevel } from '../types';

export interface ParseExcelResult {
  success: boolean;
  totalRows: number;
  validDiseases: Disease[];
  errors: string[];
}

/**
 * AI logic: Tự động suy luận khoảng chi phí điều trị dự kiến (VNĐ)
 * Dựa trên mức độ nguy hiểm, chuyên khoa, chẩn đoán ICD và triệu chứng
 */
export function estimateTreatmentCost(disease: {
  vietnameseName: string;
  name: string;
  severity: SeverityLevel;
  isContagious: boolean;
  diseaseGroup?: string;
  symptoms?: string[];
  recommendedDepartment?: string;
  icdCode?: string;
}): { min: number; max: number } {
  const text = `${disease.vietnameseName} ${disease.name} ${disease.diseaseGroup || ''} ${disease.recommendedDepartment || ''} ${(disease.symptoms || []).join(' ')}`.toLowerCase();

  // 1. Phẫu thuật ngoại khoa, cấp cứu chấn thương, mổ ruột thừa, can thiệp tim mạch
  if (
    text.includes('phau thuat') ||
    text.includes('mo ruot thua') ||
    text.includes('ngoai khoa') ||
    text.includes('chan thuong') ||
    text.includes('xuat huyet') ||
    text.includes('nhoi mau') ||
    text.includes('cap cuu 115')
  ) {
    return { min: 4500000, max: 15000000 };
  }

  // 2. Hồi sức tích cực, thở máy, sốc nhiễm trùng, nguy kịch
  if (
    text.includes('hoi suc') ||
    text.includes('tho may') ||
    text.includes('suy ho hap') ||
    text.includes('soc nhiem trung') ||
    text.includes('nhiem trung huyet') ||
    text.includes('tai bien')
  ) {
    return { min: 3500000, max: 12000000 };
  }

  // 3. Bệnh truyền nhiễm, sốt xuất huyết, tả, thương hàn, tay chân miệng, tiêu hóa cấp
  if (
    text.includes('sot xuat huyet') ||
    text.includes('dengue') ||
    text.includes('tay chan mieng') ||
    text.includes('salmonella') ||
    text.includes('benh ta') ||
    text.includes('cholera') ||
    text.includes('thuong han') ||
    text.includes('typhoid') ||
    text.includes('ly truc khuan') ||
    text.includes('duong ruot')
  ) {
    if (disease.severity === 'Khẩn cấp' || disease.severity === 'Nguy hiểm') {
      return { min: 1200000, max: 4500000 };
    }
    return { min: 400000, max: 1800000 };
  }

  // 4. Dạ dày - tá tràng, nội soi, tim mạch, huyết áp, tiểu đường mãn tính
  if (
    text.includes('da day') ||
    text.includes('noi soi') ||
    text.includes('tim mach') ||
    text.includes('huyet ap') ||
    text.includes('tieu duong')
  ) {
    return { min: 350000, max: 2200000 };
  }

  // 5. Cúm mùa, viêm mũi họng, dị ứng, khám ngoại trú thông thường
  if (
    text.includes('cum') ||
    text.includes('viem hong') ||
    text.includes('viem mui') ||
    text.includes('di ung') ||
    text.includes('da lieu')
  ) {
    return { min: 150000, max: 650000 };
  }

  // 6. Quy chiếu theo mức độ nghiêm trọng lâm sàng (Severity)
  switch (disease.severity) {
    case 'Khẩn cấp':
      return { min: 2500000, max: 8000000 };
    case 'Nguy hiểm':
      return { min: 800000, max: 3500000 };
    case 'Trung bình':
      return { min: 250000, max: 1200000 };
    case 'Thấp':
    default:
      return { min: 120000, max: 450000 };
  }
}

/**
 * Trình phân tích Excel CỐ ĐỊNH CHUẨN XÁC theo cấu trúc người dùng chỉ định:
 * - Cột A (0): Mã ICD-10
 * - Cột B (1): Nhóm bệnh
 * - Cột C (2): Tên bệnh Tiếng Việt
 * - Cột D (3): Tên bệnh Tiếng Anh
 * - Cột E (4): Đường lây truyền
 * - Cột F (5): Hướng dẫn chăm sóc / Điều trị
 * - Cột G (6): Biện pháp phòng tránh
 * - Cột H (7): Triệu chứng tiêu biểu
 * - Cột I (8): Cảnh báo cấp cứu
 * - Cột J (9): Độ phổ biến địa phương
 * - Cột K (10): Khoa khám
 * - Cột L (11): Mức độ
 * - Cột M (12): Lây nhiễm
 * - Chi phí ước tính: AI suy luận tự động
 */
export function parseDiseaseExcel(fileData: ArrayBuffer | Uint8Array | string): ParseExcelResult {
  const errors: string[] = [];
  const validDiseases: Disease[] = [];

  try {
    const workbook = XLSX.read(fileData, { 
      type: typeof fileData === 'string' ? (fileData.startsWith('data:') ? 'base64' : 'binary') : 'array',
      cellDates: true,
      raw: false
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, totalRows: 0, validDiseases: [], errors: ['File Excel không có sheet dữ liệu nào.'] };
    }

    // Chọn sheet có nhiều dòng dữ liệu nhất
    let targetSheetName = workbook.SheetNames[0];
    let maxRowCount = 0;
    let targetSheet = workbook.Sheets[targetSheetName];

    for (const sName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sName];
      if (sheet && sheet['!ref']) {
        const range = XLSX.utils.decode_range(sheet['!ref']);
        const count = range.e.r - range.s.r + 1;
        if (count > maxRowCount) {
          maxRowCount = count;
          targetSheetName = sName;
          targetSheet = sheet;
        }
      }
    }

    if (!targetSheet) {
      return { success: false, totalRows: 0, validDiseases: [], errors: ['Không thể đọc bảng tính trong file Excel.'] };
    }

    // Convert sheet thành mảng 2 chiều 0-based
    const raw2D = XLSX.utils.sheet_to_json<any[]>(targetSheet, { header: 1, defval: '' });

    if (!raw2D || raw2D.length === 0) {
      return { success: false, totalRows: 0, validDiseases: [], errors: ['Bảng tính không có dòng dữ liệu nào.'] };
    }

    // Kiểm tra dòng nào là bắt đầu dữ liệu thực tế:
    // Một dòng dữ liệu bệnh chuẩn luôn có Mã ICD ở Cột A (Ví dụ: A00, A00.1, A01, B08, J10, K35...)
    const isIcdPattern = (val: any): boolean => {
      const s = String(val || '').trim();
      return /^[A-Z][0-9]{2}(?:\.[0-9]{1,2})?$/i.test(s) || /^[A-Z][0-9]{2}/i.test(s);
    };

    let startRow = 0;
    // Nếu dòng 0 không bắt đầu bằng mã ICD chuẩn (mà là chữ như "Mã ICD", "STT", "Chương"...), bỏ qua dòng tiêu đề
    if (raw2D.length > 0 && !isIcdPattern(raw2D[0][0])) {
      startRow = 1;
      // Nếu dòng 1 cũng là tiêu đề phụ, bỏ qua tiếp
      if (raw2D.length > 1 && !isIcdPattern(raw2D[1][0]) && String(raw2D[1][2] || '').trim() === '') {
        startRow = 2;
      }
    }

    const dataRows = raw2D.slice(startRow);

    if (dataRows.length === 0) {
      return { success: false, totalRows: 0, validDiseases: [], errors: ['File Excel chỉ có tiêu đề, không tìm thấy các dòng dữ liệu bệnh.'] };
    }

    dataRows.forEach((row, rowIdx) => {
      if (!Array.isArray(row)) return;

      const getVal = (colIdx: number): string => {
        if (colIdx >= 0 && colIdx < row.length) {
          return String(row[colIdx] ?? '').trim();
        }
        return '';
      };

      // ĐỌC TRỰC TIẾP CÁC CỘT THEO ĐÚNG ĐẶC TẢ NGƯỜI DÙNG:
      // Cột A (index 0): Mã ICD-10
      const rawIcd = getVal(0);
      // Cột B (index 1): Nhóm bệnh
      const rawGroup = getVal(1);
      // Cột C (index 2): Tên bệnh Tiếng Việt
      const rawVi = getVal(2);
      // Cột D (index 3): Tên bệnh Tiếng Anh
      const rawEng = getVal(3);
      // Cột E (index 4): Đường lây truyền
      const rawTransmission = getVal(4);
      // Cột F (index 5): Cách chăm sóc
      const rawCare = getVal(5);
      // Cột G (index 6): Phòng tránh
      const rawPrevention = getVal(6);
      // Cột H (index 7): Triệu chứng tiêu biểu
      const rawSymptoms = getVal(7);
      // Cột I (index 8): Cảnh báo cấp cứu
      const rawEmergency = getVal(8);
      // Cột J (index 9): Độ phổ biến
      const rawPrevalence = getVal(9);
      // Cột K (index 10): Khoa khám
      const rawDept = getVal(10);
      // Cột L (index 11): Mức độ
      const rawSeverity = getVal(11);
      // Cột M (index 12): Lây nhiễm
      const rawContagious = getVal(12);

      // Bỏ qua dòng trống hoàn toàn
      if (!rawIcd && !rawVi && !rawEng && !rawGroup && row.every(c => String(c ?? '').trim() === '')) {
        return;
      }

      // Làm sạch mã ICD-10
      let icdCode = rawIcd;
      const icdMatch = rawIcd.match(/(?:ICD(?:-10)?[:\s]*)?([A-Z][0-9]{2}(?:\.[0-9]{1,2})?)/i);
      if (icdMatch && icdMatch[1]) {
        icdCode = icdMatch[1].toUpperCase();
      }

      // Cột C là Tên Tiếng Việt, Cột D là Tên Tiếng Anh
      const vietnameseName = rawVi || rawEng || (icdCode ? `Bệnh mã ${icdCode}` : `Bệnh số ${validDiseases.length + 1}`);
      const name = rawEng || rawVi || (icdCode ? `Disease ${icdCode}` : `Disease ${validDiseases.length + 1}`);
      const diseaseGroup = rawGroup || undefined;

      // Cột H: Triệu chứng tiêu biểu
      const symptoms = rawSymptoms
        ? rawSymptoms.split(/[,;\n\r|•\t]+/).map(s => s.trim()).filter(s => s.length > 0)
        : (diseaseGroup ? [`Theo dõi sát các biểu hiện lâm sàng nhóm ${diseaseGroup}`] : ['Theo dõi thân nhiệt và các triệu chứng lâm sàng']);

      // Cột L: Mức độ nguy hiểm (Thấp / Trung bình / Nguy hiểm / Khẩn cấp)
      const sNorm = rawSeverity.toLowerCase();
      let severity: SeverityLevel = 'Trung bình';
      if (sNorm.includes('khan') || sNorm.includes('emergency') || sNorm.includes('capcuu') || sNorm === '4') {
        severity = 'Khẩn cấp';
      } else if (sNorm.includes('cao') || sNorm.includes('nguy') || sNorm.includes('high') || sNorm === '3') {
        severity = 'Nguy hiểm';
      } else if (sNorm.includes('thap') || sNorm.includes('low') || sNorm.includes('nhe') || sNorm === '1') {
        severity = 'Thấp';
      }

      // Cột M: Lây nhiễm (Có / Không)
      const cNorm = rawContagious.toLowerCase();
      const isContagious = cNorm.includes('co') || cNorm.includes('lay') || cNorm.includes('true') || cNorm.includes('1') || cNorm.includes('yes');

      // Cột K: Khoa khám
      const recommendedDepartment = rawDept || 
        (diseaseGroup ? (diseaseGroup.toLowerCase().includes('khoa') ? diseaseGroup : `Chuyên khoa ${diseaseGroup}`) : 
        (isContagious ? 'Khoa Bệnh Nhiệt Đới' : 'Khoa Khám Bệnh Đa Khoa'));

      // Cột E: Đường lây truyền
      const transmissionMode = rawTransmission || (isContagious ? 'Đường hô hấp / giọt bắn hoặc tiêu hóa' : 'Không lây nhiễm');

      // Cột F: Chăm sóc
      const careInstructions = rawCare || 'Nghỉ ngơi, uống đủ nước, theo dõi thân nhiệt và đi khám bác sĩ.';

      // Cột G: Phòng tránh
      const prevention = rawPrevention || 'Giữ gìn vệ sinh thân thể, rửa tay thường xuyên, ăn chín uống sôi.';

      // Cột I: Dấu hiệu cấp cứu
      const emergencyWarningSigns = rawEmergency
        ? rawEmergency.split(/[,;\n\r|•\t]+/).map(s => s.trim()).filter(s => s.length > 0)
        : undefined;

      // Cột J: Độ phổ biến địa phương
      const pNorm = rawPrevalence.toLowerCase();
      let quangNgaiPrevalence: 'Cao' | 'Trung bình' | 'Thấp' = isContagious ? 'Cao' : 'Trung bình';
      if (pNorm.includes('cao') || pNorm.includes('high')) quangNgaiPrevalence = 'Cao';
      else if (pNorm.includes('thap') || pNorm.includes('low')) quangNgaiPrevalence = 'Thấp';

      // Chi phí ước tính do AI tự động suy luận
      const estimatedCostRange = estimateTreatmentCost({
        vietnameseName,
        name,
        severity,
        isContagious,
        diseaseGroup,
        symptoms,
        recommendedDepartment,
        icdCode
      });

      validDiseases.push({
        id: `excel-dis-${Date.now()}-${rowIdx}`,
        name,
        vietnameseName,
        diseaseGroup,
        icdCode: icdCode || undefined,
        symptoms,
        severity,
        isContagious,
        transmissionMode,
        careInstructions,
        prevention,
        recommendedDepartment,
        quangNgaiPrevalence,
        emergencyWarningSigns,
        estimatedCostRange
      });
    });

    if (validDiseases.length === 0) {
      return {
        success: false,
        totalRows: dataRows.length,
        validDiseases: [],
        errors: ['Không tìm thấy dòng dữ liệu bệnh hợp lệ trong bảng tính. Vui lòng kiểm tra lại nội dung file.']
      };
    }

    return {
      success: true,
      totalRows: validDiseases.length,
      validDiseases,
      errors
    };
  } catch (err: any) {
    return {
      success: false,
      totalRows: 0,
      validDiseases: [],
      errors: [err.message || 'Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng .xlsx, .xls hoặc .csv.']
    };
  }
}

export function generateSampleExcelTemplate(): void {
  const sampleData = [
    {
      'Mã ICD-10 (Cột A)': 'A00.1',
      'Nhóm bệnh (Cột B)': 'A00 - Bệnh tả',
      'Tên bệnh Tiếng Việt (Cột C)': 'Bệnh tả do Vibrio cholerae 01, biovar eltor',
      'Tên bệnh Tiếng Anh (Cột D)': 'Cholera due to Vibrio cholerae 01, biovar eltor',
      'Đường lây (Cột E)': 'Đường tiêu hóa qua thức ăn, nước uống nhiễm phẩy khuẩn tả',
      'Chăm sóc (Cột F)': 'Bù nước và điện giải khẩn cấp bằng Oresol, truyền dịch nếu nặng',
      'Phòng tránh (Cột G)': 'Ăn chín uống sôi, vệ sinh nguồn nước, tiêm vaccine phòng tả',
      'Triệu chứng tiêu biểu (Cột H)': 'Tiêu chảy xối xả phân như nước vo gạo, nôn nhiều, mất nước nhanh',
      'Cảnh báo cấp cứu (Cột I)': 'Mạch nhanh nhỏ khó bắt, tụt huyết áp, trụy mạch, mắt trũng sâu',
      'Phổ biến (Cột J)': 'Cao',
      'Khoa khám (Cột K)': 'Khoa Bệnh Nhiệt Đới / Cấp Cứu',
      'Mức độ (Cột L)': 'Khẩn cấp',
      'Lây nhiễm (Cột M)': 'Có lây'
    },
    {
      'Mã ICD-10 (Cột A)': 'A01',
      'Nhóm bệnh (Cột B)': 'A01 - Sốt thương hàn và phó thương hàn',
      'Tên bệnh Tiếng Việt (Cột C)': 'Sốt thương hàn và phó thương hàn',
      'Tên bệnh Tiếng Anh (Cột D)': 'Typhoid and paratyphoid fevers',
      'Đường lây (Cột E)': 'Đường tiêu hóa, tiếp xúc phân và nước tiểu người bệnh',
      'Chăm sóc (Cột F)': 'Dinh dưỡng cháo súp loãng, hạ sốt, dùng kháng sinh đặc hiệu',
      'Phòng tránh (Cột G)': 'Rửa tay bằng xà phòng, kiểm soát vệ sinh thực phẩm',
      'Triệu chứng tiêu biểu (Cột H)': 'Sốt cao li bì hình bậc thang, đau đầu dữ dội, ban hoa đào ngực bụng',
      'Cảnh báo cấp cứu (Cột I)': 'Thủng ruột, xuất huyết tiêu hóa, bụng chướng gồng cứng',
      'Phổ biến (Cột J)': 'Trung bình',
      'Khoa khám (Cột K)': 'Khoa Bệnh Nhiệt Đới / Tiêu Hóa',
      'Mức độ (Cột L)': 'Nguy hiểm',
      'Lây nhiễm (Cột M)': 'Có lây'
    },
    {
      'Mã ICD-10 (Cột A)': 'A01.0',
      'Nhóm bệnh (Cột B)': 'A01 - Sốt thương hàn',
      'Tên bệnh Tiếng Việt (Cột C)': 'Bệnh thương hàn',
      'Tên bệnh Tiếng Anh (Cột D)': 'Typhoid fever',
      'Đường lây (Cột E)': 'Trực khuẩn Salmonella typhi qua đường tiêu hóa',
      'Chăm sóc (Cột F)': 'Cách ly phòng riêng, ăn đồ mềm nguội, uống nhiều nước',
      'Phòng tránh (Cột G)': 'Tiêm phòng vaccine thương hàn định kỳ',
      'Triệu chứng tiêu biểu (Cột H)': 'Sốt cao kéo dài, lách to, mạch nhiệt phân ly, táo bón hoặc tiêu chảy',
      'Cảnh báo cấp cứu (Cột I)': 'Li bì mê sảng, đau bụng hố chậu phải dữ dội',
      'Phổ biến (Cột J)': 'Trung bình',
      'Khoa khám (Cột K)': 'Khoa Truyền Nhiễm',
      'Mức độ (Cột L)': 'Nguy hiểm',
      'Lây nhiễm (Cột M)': 'Có lây'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Du_Lieu_A_M');
  XLSX.writeFile(wb, 'Mau_Danh_Muc_Benh_Chuan_A_M.xlsx');
}
