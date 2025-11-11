import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Contract } from "@/types/contract";

export const exportContractToPDF = (contract: Contract, includeNonBillable: boolean = true) => {
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
  doc.rect(0, 0, pageWidth, 50, 'F');
  
  // Accent line
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 50, pageWidth, 3, 'F');

  // Logo
  const logo = new Image();
  logo.src = '/gigapro.png';
  doc.addImage(logo, 'PNG', 15, 12, 45, 40.6);

  // Company info (right side)
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  const companyInfo = [
    'Giga Pro',
    'Benoît BRAMI & Benoît CADE',
    'contact@giga-pro.fr'
  ];
  companyInfo.forEach((line, i) => {
    doc.text(line, pageWidth - 15, 15 + (i * 5), { align: 'right' });
  });

  // ========== DOCUMENT TITLE ==========
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text("Rapport de Contrat", 15, 68);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })}`, 15, 75);

  // ========== CLIENT INFO CARD ==========
  const cardY = 85;
  const contractRef = contract.contractNumber ? `CT-${String(contract.contractNumber).padStart(4, '0')}` : contract.id;
  
  // Card background
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(15, cardY, pageWidth - 30, 40, 3, 3, 'F');
  
  // Card border
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, cardY, pageWidth - 30, 40, 3, 3, 'S');
  
  // Client info content
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text(contract.clientName, 22, cardY + 12);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text(`Contrat N° ${contractRef}`, 22, cardY + 20);
  doc.text(`Date de création: ${new Date(contract.createdDate).toLocaleDateString('fr-FR')}`, 22, cardY + 27);
  
  // Status badge
  const statusX = pageWidth - 50;
  doc.setFillColor(accentGreen[0], accentGreen[1], accentGreen[2]);
  doc.roundedRect(statusX, cardY + 8, 30, 8, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('ACTIF', statusX + 15, cardY + 13, { align: 'center' });

  // ========== HOURS SUMMARY CARDS ==========
  const cardsY = cardY + 50;
  const cardWidth = (pageWidth - 45) / 3;
  const percentage = ((contract.usedHours / contract.totalHours) * 100).toFixed(1);
  const remainingHours = (contract.totalHours - contract.usedHours).toFixed(1);
  
  // Card 1: Total Hours
  doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
  doc.roundedRect(15, cardsY, cardWidth, 28, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text('Total d\'heures', 15 + cardWidth/2, cardsY + 8, { align: 'center' });
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${contract.totalHours}h`, 15 + cardWidth/2, cardsY + 20, { align: 'center' });
  
  // Card 2: Used Hours
  doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
  doc.roundedRect(15 + cardWidth + 5, cardsY, cardWidth, 28, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text('Heures utilisées', 15 + cardWidth + 5 + cardWidth/2, cardsY + 8, { align: 'center' });
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${contract.usedHours}h`, 15 + cardWidth + 5 + cardWidth/2, cardsY + 20, { align: 'center' });
  
  // Card 3: Remaining Hours
  const remainingColor = parseFloat(remainingHours) > 5 ? accentGreen : [239, 68, 68];
  doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2]);
  doc.roundedRect(15 + (cardWidth + 5) * 2, cardsY, cardWidth, 28, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text('Heures restantes', 15 + (cardWidth + 5) * 2 + cardWidth/2, cardsY + 8, { align: 'center' });
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(remainingColor[0], remainingColor[1], remainingColor[2]);
  doc.text(`${remainingHours}h`, 15 + (cardWidth + 5) * 2 + cardWidth/2, cardsY + 20, { align: 'center' });

  // ========== PROGRESS BAR ==========
  const progressY = cardsY + 38;
  const progressBarWidth = pageWidth - 30;
  const progressBarHeight = 20;
  
  // Progress bar label
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textGray[0], textGray[1], textGray[2]);
  doc.text('Progression du contrat', 15, progressY + 2);
  
  // Progress bar background
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(15, progressY + 5, progressBarWidth, progressBarHeight, 3, 3, 'F');
  
  // Progress bar fill
  const fillWidth = (progressBarWidth * parseFloat(percentage)) / 100;
  const progressColor = parseFloat(percentage) < 80 ? accentGreen : parseFloat(percentage) < 95 ? [250, 204, 21] : [239, 68, 68];
  doc.setFillColor(progressColor[0], progressColor[1], progressColor[2]);
  doc.roundedRect(15, progressY + 5, fillWidth, progressBarHeight, 3, 3, 'F');
  
  // Progress percentage text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  if (fillWidth > 20) {
    doc.text(`${percentage}%`, 15 + fillWidth - 5, progressY + 17, { align: 'right' });
  } else {
    doc.setTextColor(textGray[0], textGray[1], textGray[2]);
    doc.text(`${percentage}%`, 15 + fillWidth + 5, progressY + 17);
  }

  // ========== INTERVENTIONS SECTION ==========
  const tableStartY = progressY + 35;
  
  // Section title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkBlue[0], darkBlue[1], darkBlue[2]);
  doc.text('Interventions réalisées', 15, tableStartY - 5);
  
  // Decorative line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(2);
  doc.line(15, tableStartY - 1, 80, tableStartY - 1);

  const billableInterventions = contract.interventions.filter(i => i.isBillable !== false);
  const tableData = billableInterventions.map((intervention, index) => [
    new Date(intervention.date).toLocaleDateString('fr-FR'),
    intervention.description,
    intervention.technician || 'N/A',
    intervention.location || '-',
    `${intervention.hoursUsed}h`
  ]);

  autoTable(doc, {
    startY: tableStartY + 5,
    head: [['Date', 'Description', 'Technicien', 'Lieu', 'Heures']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
      cellPadding: 6
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 5,
      textColor: [55, 65, 81]
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      0: { cellWidth: 28, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 32, halign: 'center' },
      3: { cellWidth: 25, halign: 'center' },
      4: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [59, 130, 246] }
    },
    styles: {
      lineColor: [209, 213, 219],
      lineWidth: 0.1,
      overflow: 'linebreak'
    },
    margin: { left: 15, right: 15 }
  });

  // ========== NON-BILLABLE INTERVENTIONS SECTION ==========
  if (includeNonBillable) {
    const nonBillableInterventions = contract.interventions.filter(i => i.isBillable === false);
    if (nonBillableInterventions.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      
      // Add space before section
      const nonBillStartY = finalY + 15;
      
      // Info box
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(15, nonBillStartY - 5, pageWidth - 30, 12, 2, 2, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(146, 64, 14);
      doc.text('ℹ️  Interventions non comptabilisées', 20, nonBillStartY + 2);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Ces interventions ne sont pas déduites du forfait d\'heures', 20, nonBillStartY + 6);
      
      const nonBillableData = nonBillableInterventions.map(intervention => [
        new Date(intervention.date).toLocaleDateString('fr-FR'),
        intervention.description,
        intervention.technician || 'N/A',
        intervention.location || '-',
        `${Math.round(intervention.hoursUsed * 60)} min`
      ]);

      autoTable(doc, {
        startY: nonBillStartY + 12,
        head: [['Date', 'Description', 'Technicien', 'Lieu', 'Durée']],
        body: nonBillableData,
        theme: 'grid',
        headStyles: {
          fillColor: [120, 113, 108],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
          cellPadding: 5
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 4,
          textColor: [100, 100, 100]
        },
        alternateRowStyles: {
          fillColor: [250, 250, 249]
        },
        columnStyles: {
          0: { cellWidth: 28, halign: 'center' },
          1: { cellWidth: 70 },
          2: { cellWidth: 32, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [120, 113, 108] }
        },
        styles: {
          lineColor: [209, 213, 219],
          lineWidth: 0.1
        },
        margin: { left: 15, right: 15 }
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
  doc.save(`Rapport_${contractRef}_${clientName}_${date}.pdf`);
};
