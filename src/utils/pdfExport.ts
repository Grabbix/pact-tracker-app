import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Contract } from "@/types/contract";

export const exportContractToPDF = (contract: Contract) => {
  const doc = new jsPDF();

  // Logo - Placez votre fichier gigapro.png dans le dossier public/
  // Ensuite décommentez ces lignes:
  const logo = new Image();
  logo.src = '/gigapro.png';
  doc.addImage(logo, 'PNG', 14, 10, 30, 10);

  // Header
  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246); // primary color
  doc.text("Détail du contrat de maintenance", 14, 30);

  // Client info
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Client: ${contract.clientName}`, 14, 45);
  doc.text(`Contrat N°: ${contract.id}`, 14, 52);
  doc.text(`Créé le: ${new Date(contract.createdDate).toLocaleDateString('fr-FR')}`, 14, 59);

  // Hours summary
  doc.setFontSize(11);
  doc.text(`Total d'heures: ${contract.totalHours}h`, 14, 70);
  doc.text(`Heures utilisées: ${contract.usedHours}h`, 14, 77);
  doc.text(`Heures restantes: ${(contract.totalHours - contract.usedHours).toFixed(1)}h`, 14, 84);
  
  const percentage = ((contract.usedHours / contract.totalHours) * 100).toFixed(1);
  doc.text(`Progression: ${percentage}%`, 14, 91);

  // Billable interventions table
  const billableInterventions = contract.interventions.filter(i => i.isBillable !== false);
  const tableData = billableInterventions.map(intervention => [
    new Date(intervention.date).toLocaleDateString('fr-FR'),
    intervention.description,
    intervention.technician,
    intervention.location || 'N/A',
    `${intervention.hoursUsed}h`
  ]);

  autoTable(doc, {
    startY: 100,
    head: [['Date', 'Description', 'Technicien', 'Lieu', 'Heures']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10,
      cellPadding: 5
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 65 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25 },
      4: { cellWidth: 22 }
    }
  });

  // Non-billable interventions section
  const nonBillableInterventions = contract.interventions.filter(i => i.isBillable === false);
  if (nonBillableInterventions.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Interventions non comptabilisées', 14, finalY + 15);
    
    const nonBillableData = nonBillableInterventions.map(intervention => [
      new Date(intervention.date).toLocaleDateString('fr-FR'),
      intervention.description,
      intervention.technician,
      intervention.location || 'N/A',
      `${Math.round(intervention.hoursUsed * 60)} min`
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Date', 'Description', 'Technicien', 'Lieu', 'Durée']],
      body: nonBillableData,
      theme: 'grid',
      headStyles: {
        fillColor: [150, 150, 150],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      styles: {
        fontSize: 8,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 65 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25 },
        4: { cellWidth: 22 }
      }
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} sur ${pageCount} - Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  // Save the PDF
  doc.save(`contrat-${contract.clientName.replace(/\s+/g, '-')}-${contract.id}.pdf`);
};
