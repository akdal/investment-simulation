import { useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { FileDown, Loader2 } from 'lucide-react';

interface PdfExporterProps {
  targetRef: React.RefObject<HTMLDivElement | null>;
  filename?: string;
}

export function PdfExporter({ targetRef, filename = 'captable.pdf' }: PdfExporterProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!targetRef.current || isExporting) return;

    setIsExporting(true);

    try {
      // 1. DOM to Canvas (scale 2 for high resolution)
      const canvas = await html2canvas(targetRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // 2. Canvas to PDF (A4 landscape)
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // 3. Scale to fit page with margins
      const pageWidth = pdf.internal.pageSize.getWidth() - 20; // 10mm margin each side
      const pageHeight = pdf.internal.pageSize.getHeight() - 20;

      // Calculate scaling to fit within page
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);

      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;

      // Center the image on the page
      const xOffset = (pdf.internal.pageSize.getWidth() - scaledWidth) / 2;
      const yOffset = (pdf.internal.pageSize.getHeight() - scaledHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, scaledWidth, scaledHeight);
      pdf.save(filename);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF 내보내기에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="h-8 px-3 text-sm text-slate-300 hover:bg-slate-700/50 rounded-md flex items-center transition-colors disabled:opacity-50"
      title="PDF 파일로 내보내기"
    >
      {isExporting ? (
        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
      ) : (
        <FileDown className="h-3.5 w-3.5 mr-1.5" />
      )}
      PDF
    </button>
  );
}
