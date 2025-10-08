import * as XLSX from 'xlsx';
import { Contract } from '@/types/contract';

export const exportContractToExcel = (contract: Contract) => {
  // Prepare billable interventions data
  const billableInterventions = contract.interventions
    .filter(i => i.isBillable !== false)
    .map(intervention => ({
      Date: new Date(intervention.date).toLocaleDateString('fr-FR'),
      Description: intervention.description,
      Technicien: intervention.technician,
      Heures: intervention.hoursUsed,
      Localisation: intervention.location || 'Non spécifié'
    }));

  // Prepare non-billable interventions data (in minutes)
  const nonBillableInterventions = contract.interventions
    .filter(i => i.isBillable === false)
    .map(intervention => ({
      Date: new Date(intervention.date).toLocaleDateString('fr-FR'),
      Description: intervention.description,
      Technicien: intervention.technician,
      Minutes: Math.round(intervention.hoursUsed * 60),
      Localisation: intervention.location || 'Non spécifié'
    }));

  // Summary data
  const summary = [
    ['Client', contract.clientName],
    ['Contrat N°', contract.id],
    ['Date de création', new Date(contract.createdDate).toLocaleDateString('fr-FR')],
    ['Heures totales', contract.totalHours],
    ['Heures utilisées', contract.usedHours],
    ['Heures restantes', (contract.totalHours - contract.usedHours).toFixed(1)],
    ['Progression', `${((contract.usedHours / contract.totalHours) * 100).toFixed(1)}%`]
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryWs = XLSX.utils.aoa_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé');

  // Billable interventions sheet
  if (billableInterventions.length > 0) {
    const billableWs = XLSX.utils.json_to_sheet(billableInterventions);
    XLSX.utils.book_append_sheet(wb, billableWs, 'Interventions comptées');
  }

  // Non-billable interventions sheet
  if (nonBillableInterventions.length > 0) {
    const nonBillableWs = XLSX.utils.json_to_sheet(nonBillableInterventions);
    XLSX.utils.book_append_sheet(wb, nonBillableWs, 'Interventions non comptées');
  }

  // Save file
  XLSX.writeFile(wb, `contrat-${contract.clientName.replace(/\s+/g, '-')}-${contract.id}.xlsx`);
};

export const exportAllContractsToExcel = (contracts: Contract[]) => {
  const allData = contracts.map(contract => ({
    'Contrat N°': contract.id,
    Client: contract.clientName,
    'Heures totales': contract.totalHours,
    'Heures utilisées': contract.usedHours,
    'Heures restantes': (contract.totalHours - contract.usedHours).toFixed(1),
    Statut: contract.status,
    Archivé: contract.isArchived ? 'Oui' : 'Non',
    'Date de création': new Date(contract.createdDate).toLocaleDateString('fr-FR')
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(allData);
  XLSX.utils.book_append_sheet(wb, ws, 'Tous les contrats');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `backup-contrats-${timestamp}.xlsx`);
};
