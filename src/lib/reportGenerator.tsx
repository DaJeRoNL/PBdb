import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Define types for the data we expect
interface AccountReportData {
  accountName: string;
  domain: string;
  healthScore: number;
  contractValue: number;
  products: any[];
  owner: string;
  billingEmail: string;
  paymentTerms: string;
  lastInteraction: string;
  notes: any[];
}

export const generateAccountReport = (data: AccountReportData) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString();

  // --- STYLING CONSTANTS ---
  const COLORS = {
    headerBg: [80, 80, 85] as [number, number, number], // Slate 800 (Dark Grey Matte)
    textDark: [15, 23, 42] as [number, number, number], // Slate 900
    textMedium: [71, 85, 105] as [number, number, number], // Slate 600
    textLight: [148, 163, 184] as [number, number, number], // Slate 400
    accent: [59, 130, 246] as [number, number, number], // Blue 500
    bgLight: [248, 250, 252] as [number, number, number], // Slate 50
    border: [226, 232, 240] as [number, number, number], // Slate 200
  };

  const modernFont = "helvetica"; 

  // --- HEADER SECTION ---
  
  // 1. Header Background (Dark Grey Matte)
  doc.setFillColor(...COLORS.headerBg);
  doc.rect(0, 0, 210, 45, 'F'); 
  
  // 2. Logo (Favicon) - Made smaller (8x8mm which is approx 30px, or 10x10mm)
  // 48px is roughly 12mm at 96dpi, let's go with 10x10mm for a clean icon look
  try {
    const img = new Image();
    img.src = "/PBFweb48.png";
    doc.addImage(img, 'PNG', 14, 15, 10, 10);
  } catch (e) {
    // Fallback
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, 15, 10, 10, 1, 1, 'F');
  }

  // 3. Title (Montserrat Style)
  doc.setFont(modernFont, "bold");
  doc.setFontSize(22); // Slightly smaller for elegance
  doc.setTextColor(255, 255, 255);
  doc.text("Account Strategic Brief", 32, 23); // Adjusted X to 32 to sit next to 10mm icon (14+10+8)
  
  // 4. Subtitle (Raleway Style)
  doc.setFont(modernFont, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.textLight);
  doc.text(`Generated: ${today}  |  CONFIDENTIAL`, 32, 30);

  // --- HELPER: SECTION HEADER ---
  const drawSectionHeader = (title: string, y: number) => {
    // Background bar for section header
    doc.setFillColor(...COLORS.bgLight);
    doc.rect(14, y - 6, 182, 10, 'F');

    doc.setFont(modernFont, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.textDark);
    doc.text(title, 18, y); // Indented slightly inside the bar
    
    return y + 8;
  };

  // --- 1. OVERVIEW SECTION ---
  let yPos = 65;
  yPos = drawSectionHeader("1. Account Overview", yPos);

  const overviewData = [
    ["Account Name", data.accountName, "Health Score", `${data.healthScore}/100`],
    ["Domain", data.domain, "Owner", data.owner],
    ["Total Value (ARR)", `$${data.contractValue.toLocaleString()}`, "Payment Terms", data.paymentTerms],
    ["Billing Contact", data.billingEmail, "Last Activity", new Date(data.lastInteraction).toLocaleDateString()]
  ];

  autoTable(doc, {
    startY: yPos,
    body: overviewData,
    theme: 'grid',
    styles: { 
        font: modernFont,
        fontSize: 10, 
        cellPadding: 5, 
        lineColor: COLORS.border,
        textColor: COLORS.textMedium,
        lineWidth: 0.1
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [255, 255, 255], cellWidth: 40, textColor: COLORS.textMedium },
      1: { cellWidth: 55, fillColor: [255, 255, 255] },
      2: { fontStyle: 'bold', fillColor: [255, 255, 255], cellWidth: 40, textColor: COLORS.textMedium }
    },
    // Removed alternateRowStyles to keep it clean white
  });

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  // --- 2. COMMERCIALS SECTION ---
  yPos = drawSectionHeader("2. Commercial Scope & Products", yPos);

  const productRows = data.products.map(p => [
    p.name,
    p.type.toUpperCase(),
    p.type === 'commission' ? `${p.commission_percent}%` : '-',
    p.type === 'commission' 
      ? `$${(p.base_price * (p.commission_percent / 100)).toLocaleString()} (Fee)` 
      : `$${(p.base_price || 0).toLocaleString()}`,
    p.deposit_paid ? 'PAID' : 'PENDING'
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['PRODUCT / ROLE', 'TYPE', 'COMMISSION', 'VALUE / FEE', 'STATUS']],
    body: productRows,
    theme: 'plain',
    headStyles: { 
        fillColor: COLORS.headerBg,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
        cellPadding: 4
    },
    styles: { 
        font: modernFont,
        fontSize: 9,
        cellPadding: 4,
        textColor: COLORS.textMedium,
        lineWidth: 0
    },
    columnStyles: {
        0: { fontStyle: 'bold', textColor: COLORS.textDark },
        4: { fontStyle: 'bold', halign: 'center' }
    },
    // Use the hook correctly with type assertion or use standard UserOptions if types were perfect.
    // 'didDrawRow' IS a valid hook in jspdf-autotable UserOptions, but strict TS might miss it without @types/jspdf-autotable.
    // We cast to any to suppress the error as requested.
    didDrawRow: (data: any) => {
        // Modern thin separator line
        doc.setDrawColor(...COLORS.border);
        doc.setLineWidth(0.1);
        doc.line(data.table.settings.margin.left, data.cursor.y + data.row.height, data.table.settings.margin.left + data.table.width, data.cursor.y + data.row.height);
    }
  } as any);

  // @ts-ignore
  yPos = doc.lastAutoTable.finalY + 15;

  // --- 3. RECENT CONTEXT ---
  // Page break check
  if (yPos > 240) {
    doc.addPage();
    yPos = 30;
  }
  
  yPos = drawSectionHeader("3. Recent Collaboration", yPos);

  const recentNotes = data.notes.slice(0, 5).map(n => [
    new Date(n.created_at).toLocaleDateString(),
    n.profiles?.email?.split('@')[0] || 'System',
    n.content
  ]);

  if (recentNotes.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['DATE', 'AUTHOR', 'UPDATE']],
      body: recentNotes,
      theme: 'plain',
      styles: { 
          font: modernFont,
          fontSize: 9, 
          cellPadding: 5,
          textColor: COLORS.textMedium,
          valign: 'top'
      },
      headStyles: {
          textColor: COLORS.textLight,
          fontStyle: 'bold',
          fontSize: 8,
          cellPadding: { bottom: 2, top: 2 }
      },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold', textColor: COLORS.textLight }, 
        1: { cellWidth: 35, fontStyle: 'bold', textColor: COLORS.accent } 
      },
      didDrawRow: (data: any) => {
         // Subtle divider
         doc.setDrawColor(...COLORS.border);
         doc.setLineWidth(0.1);
         doc.line(data.table.settings.margin.left, data.cursor.y + data.row.height, data.table.settings.margin.left + data.table.width, data.cursor.y + data.row.height);
      }
    } as any);
  } else {
    doc.setFont(modernFont, "italic");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textLight);
    doc.text("No recent collaboration notes found.", 18, yPos + 8);
  }

  // --- FOOTER ---
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Footer Line
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.1);
    doc.line(14, 280, 196, 280);
    
    doc.setFont(modernFont, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textLight);
    
    doc.text(`PlaceByte Intelligence`, 14, 285);
    doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: 'right' });
  }

  // Save
  doc.save(`Brief_${data.accountName.replace(/\s+/g, '_')}_${today.replace(/\//g, '-')}.pdf`);
};