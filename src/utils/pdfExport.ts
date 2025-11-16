import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Contract } from "@/types/contract";

export const exportContractToPDF = (contract: Contract, includeNonBillable: boolean = true): jsPDF => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Colors
  const primaryColor = [59, 130, 246];
  const darkBlue = [30, 58, 138];
  const lightBlue = [219, 234, 254];
  const accentGreen = [34, 197, 94];
  const textGray = [55, 65, 81];
  const lightGray = [243, 244, 246];

  // ========== HEADER SECTION ==========
  // Background header bar
  doc.setFillColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.rect(0, 0, pageWidth, 20, 'F');
  
  // Accent line
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 20, pageWidth, 1.5, 'F');

  // Logo - centered vertically in header
  const logo = new Image();
  logo.src = '/gigapro.png';
  const logoHeight = 45;
  const logoWidth = 40.6;
  const logoY = (20 - logoHeight) / 2;
  doc.addImage(logo, 'PNG', 15, logoY, logoWidth, logoHeight);

  // Company info (right side)
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  const companyInfo = [
    'Giga Pro',
    'contact@giga-pro.fr'
  ];
  companyInfo.forEach((line, i) => {
    doc.text(line, pageWidth - 15, 8 + (i * 4), { align: 'right' });
  });

  // ========== DOCUMENT TITLE ==========
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text("Rapport de Contrat", 15, 30);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })}`, 15, 35);

  // ========== CLIENT INFO CARD ==========
  const cardY = 42;
  const contractRef = contract.contractNumber ? `CT-${String(contract.contractNumber).padStart(4, '0')}` : contract.id;
  
  // Card background
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(15, cardY, pageWidth - 30, 20, 2, 2, 'F');
  
  // Card border
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, cardY, pageWidth - 30, 20, 2, 2, 'S');
  
  // Client info content
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text(contract.clientName, 20, cardY + 7);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(`Contrat N° ${contractRef}`, 20, cardY + 12);
  doc.text(`Date de création: ${new Date(contract.createdDate).toLocaleDateString('fr-FR')}`, 20, cardY + 16);
  
  // Status badge
  const statusX = pageWidth - 38;
  doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.roundedRect(statusX, cardY + 6, 20, 5, 1.5, 1.5, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('ACTIF', statusX + 10, cardY + 9.5, { align: 'center' });

  // ========== COMPACT HOURS & PROGRESS SECTION ==========
  const summaryY = cardY + 25;
  const summaryHeight = 18;
  const percentage = ((contract.usedHours / contract.totalHours) * 100).toFixed(1);
  const remainingHours = (contract.totalHours - contract.usedHours).toFixed(1);
  
  // Background box
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(15, summaryY, pageWidth - 30, summaryHeight, 2, 2, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.roundedRect(15, summaryY, pageWidth - 30, summaryHeight, 2, 2, 'S');
  
  // Hours info - compact inline
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text('Total:', 20, summaryY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${contract.totalHours}h`, 35, summaryY + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text('Utilisées:', 50, summaryY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${contract.usedHours}h`, 70, summaryY + 6);
  
  const remainingColor = parseFloat(remainingHours) > 5 ? accentGreen : [239, 68, 68];
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text('Restantes:', 85, summaryY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(remainingColor[0], remainingColor[1], remainingColor[2]);
  doc.text(`${remainingHours}h`, 105, summaryY + 6);
  
  // Compact progress bar
  const progressBarY = summaryY + 10;
  const progressBarWidth = pageWidth - 50;
  const progressBarHeight = 6;
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text('Progression:', 20, progressBarY + 1);
  
  // Progress bar background
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(20, progressBarY + 2, progressBarWidth, progressBarHeight, 1.5, 1.5, 'F');
  
  // Progress bar fill
  const fillWidth = (progressBarWidth * parseFloat(percentage)) / 100;
  const progressColor = parseFloat(percentage) < 80 ? accentGreen : parseFloat(percentage) < 95 ? [250, 204, 21] : [239, 68, 68];
  doc.setFillColor(progressColor[0], progressColor[1], progressColor[2]);
  doc.roundedRect(20, progressBarY + 2, fillWidth, progressBarHeight, 1.5, 1.5, 'F');
  
  // Progress percentage text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  if (fillWidth > 15) {
    doc.text(`${percentage}%`, 20 + fillWidth - 2, progressBarY + 6.5, { align: 'right' });
  } else {
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`${percentage}%`, 20 + fillWidth + 2, progressBarY + 6.5);
  }

  // ========== INTERVENTIONS SECTION ==========
  const tableStartY = summaryY + 25;
  
  // Section title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text('Interventions réalisées', 15, tableStartY - 3);
  
  // Decorative line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(1.5);
  doc.line(15, tableStartY, 70, tableStartY);

  const billableInterventions = contract.interventions.filter(i => i.isBillable !== false);
  const tableData = billableInterventions.map((intervention, index) => [
    new Date(intervention.date).toLocaleDateString('fr-FR'),
    intervention.description,
    intervention.location || '-',
    `${intervention.hoursUsed}h`
  ]);

  autoTable(doc, {
    startY: tableStartY + 3,
    head: [['Date', 'Description', 'Lieu', 'Heures']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3.5,
      textColor: [55, 65, 81]
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 105 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [59, 130, 246] }
    },
    styles: {
      lineColor: [209, 213, 219],
      lineWidth: 0.1,
      overflow: 'linebreak'
    },
    margin: { left: 15, right: 15, bottom: 35 }
  });

  // ========== NON-BILLABLE INTERVENTIONS SECTION ==========
  if (includeNonBillable) {
    const nonBillableInterventions = contract.interventions.filter(i => i.isBillable === false);
    if (nonBillableInterventions.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      
      // Check if we have enough space (at least 50mm from bottom)
      const spaceNeeded = 50;
      const spaceAvailable = pageHeight - finalY - 35; // 35mm for footer
      
      let nonBillStartY = finalY + 12;
      
      // Add new page if not enough space
      if (spaceAvailable < spaceNeeded) {
        doc.addPage();
        nonBillStartY = 20;
      }
      
      // Info box
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(15, nonBillStartY - 4, pageWidth - 30, 10, 1.5, 1.5, 'F');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(146, 64, 14);
      doc.text('Interventions non comptabilisées', 20, nonBillStartY + 1);
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('Ces interventions ne sont pas déduites du forfait d\'heures', 20, nonBillStartY + 5);
      
      const nonBillableData = nonBillableInterventions.map(intervention => [
        new Date(intervention.date).toLocaleDateString('fr-FR'),
        intervention.description,
        intervention.location || '-',
        `${Math.round(intervention.hoursUsed * 60)} min`
      ]);

      autoTable(doc, {
        startY: nonBillStartY + 10,
        head: [['Date', 'Description', 'Lieu', 'Durée']],
        body: nonBillableData,
        theme: 'grid',
        headStyles: {
          fillColor: [120, 113, 108],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          cellPadding: 3.5
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 3,
          textColor: [100, 100, 100]
        },
        alternateRowStyles: {
          fillColor: [250, 250, 249]
        },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center' },
          1: { cellWidth: 105 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [120, 113, 108] }
        },
        styles: {
          lineColor: [209, 213, 219],
          lineWidth: 0.1
        },
        margin: { left: 15, right: 15, bottom: 35 }
      });
    }
  }

  // ========== FOOTER ==========
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = pageHeight - 25;
    
    // Footer separator line
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(15, footerY, pageWidth - 15, footerY);
    
    // Footer content
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    // Left: Company info
    doc.text('Giga Pro - L’informatique pour les professionnels', 15, footerY + 6);
    doc.text('Email: contact@gigapro.fr | Web: www.giga-pro.fr', 15, footerY + 11);
    
    // Right: Page number and date
    doc.text(`Page ${i} sur ${pageCount}`, pageWidth - 15, footerY + 6, { align: 'right' });
    doc.text(
      `Généré le ${new Date().toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      })} à ${new Date().toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`,
      pageWidth - 15,
      footerY + 11,
      { align: 'right' }
    );
    
    // Document confidentiality notice
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Document confidentiel - Usage strictement réservé au client mentionné',
      pageWidth / 2,
      footerY + 17,
      { align: 'center' }
    );
  }

  // Save the PDF with contract number if available
  const clientName = contract.clientName.replace(/[^a-zA-Z0-9]/g, '-');
  const date = new Date().toISOString().split('T')[0];
  
  // Return the PDF document for further use (like sending by email)
  return doc;
};

// Helper function to download the PDF
export const downloadContractPDF = (contract: Contract, includeNonBillable: boolean = true) => {
  const doc = exportContractToPDF(contract, includeNonBillable);
  const contractRef = contract.contractNumber ? `CT-${String(contract.contractNumber).padStart(4, '0')}` : contract.id;
  const fileName = `Contrat_${contractRef}_${contract.clientName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
