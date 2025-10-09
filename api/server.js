const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const db = require('./database');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 3001;

// Créer les dossiers nécessaires
const dataDir = path.join(__dirname, 'data');
const backupDir = path.join(__dirname, 'backup');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

app.use(cors());
app.use(express.json());

// Routes pour les contrats
app.get('/api/contracts', (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    
    let query = `
      SELECT c.*, 
        GROUP_CONCAT(
          json_object(
            'id', i.id,
            'date', i.date,
            'description', i.description,
            'hours_used', i.hours_used,
            'technician', i.technician,
            'is_billable', i.is_billable,
            'location', i.location
          )
        ) as interventions_json
      FROM contracts c
      LEFT JOIN interventions i ON c.id = i.contract_id
    `;

    if (!includeArchived) {
      query += " WHERE c.is_archived = 0";
    }

    query += " GROUP BY c.id ORDER BY c.created_date DESC";

    const rows = db.prepare(query).all();

    const contracts = rows.map(row => {
      let interventions = [];
      
      if (row.interventions_json) {
        try {
          const parsed = JSON.parse(`[${row.interventions_json}]`);
          interventions = parsed
            .filter(i => i.id !== null)
            .map(i => ({
              id: i.id,
              date: i.date,
              description: i.description,
              hoursUsed: i.hours_used,
              technician: i.technician,
              isBillable: i.is_billable === 1,
              location: i.location,
            }));
        } catch (e) {
          console.error("Error parsing interventions:", e);
        }
      }

      return {
        id: row.id,
        clientName: row.client_name,
        totalHours: row.total_hours,
        usedHours: row.used_hours,
        createdDate: row.created_date,
        status: row.status,
        isArchived: row.is_archived === 1,
        interventions,
      };
    });

    res.json(contracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des contrats' });
  }
});

app.post('/api/contracts', (req, res) => {
  try {
    const { clientName, totalHours } = req.body;
    const id = randomUUID();
    const createdDate = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO contracts (id, client_name, total_hours, used_hours, created_date, status, is_archived)
      VALUES (?, ?, ?, 0, ?, 'active', 0)
    `);

    stmt.run(id, clientName, totalHours, createdDate);

    res.json({ id, clientName, totalHours, createdDate });
  } catch (error) {
    console.error('Error adding contract:', error);
    res.status(500).json({ error: 'Erreur lors de la création du contrat' });
  }
});

app.patch('/api/contracts/:id/archive', (req, res) => {
  try {
    const { id } = req.params;
    const archivedAt = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE contracts SET is_archived = 1, archived_at = ? WHERE id = ?
    `);

    stmt.run(archivedAt, id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error archiving contract:', error);
    res.status(500).json({ error: "Erreur lors de l'archivage du contrat" });
  }
});

app.patch('/api/contracts/:id/unarchive', (req, res) => {
  try {
    const { id } = req.params;

    const stmt = db.prepare(`
      UPDATE contracts SET is_archived = 0, archived_at = NULL WHERE id = ?
    `);

    stmt.run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error unarchiving contract:', error);
    res.status(500).json({ error: 'Erreur lors de la désarchivage du contrat' });
  }
});

// Récupérer la liste des noms de clients
app.get('/api/clients', (req, res) => {
  try {
    const rows = db.prepare('SELECT DISTINCT client_name FROM contracts ORDER BY client_name ASC').all();
    const clientNames = rows.map(row => row.client_name);
    res.json(clientNames);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des clients' });
  }
});

// Mettre à jour le nom du client d'un contrat
app.patch('/api/contracts/:id/client-name', (req, res) => {
  try {
    const { id } = req.params;
    const { clientName } = req.body;

    const stmt = db.prepare('UPDATE contracts SET client_name = ? WHERE id = ?');
    stmt.run(clientName, id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating client name:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du nom du client' });
  }
});

// Routes pour les interventions
app.post('/api/interventions', (req, res) => {
  try {
    const { contractId, date, description, hoursUsed, technician, isBillable, location } = req.body;
    const id = randomUUID();

    const insertStmt = db.prepare(`
      INSERT INTO interventions (id, contract_id, date, description, hours_used, technician, is_billable, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(id, contractId, date, description, hoursUsed, technician, isBillable ? 1 : 0, location);

    // Only update used_hours if intervention is billable
    if (isBillable) {
      const contract = db.prepare('SELECT used_hours FROM contracts WHERE id = ?').get(contractId);
      
      if (contract) {
        const updateStmt = db.prepare(`
          UPDATE contracts SET used_hours = ? WHERE id = ?
        `);
        updateStmt.run(contract.used_hours + hoursUsed, contractId);
      }
    }

    res.json({ id });
  } catch (error) {
    console.error('Error adding intervention:', error);
    res.status(500).json({ error: "Erreur lors de l'ajout de l'intervention" });
  }
});

app.put('/api/interventions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { contractId, date, description, hoursUsed, technician, isBillable, location } = req.body;

    const oldIntervention = db.prepare('SELECT hours_used, is_billable FROM interventions WHERE id = ?').get(id);
    
    if (!oldIntervention) {
      return res.status(404).json({ error: 'Intervention non trouvée' });
    }

    const updateStmt = db.prepare(`
      UPDATE interventions 
      SET date = ?, description = ?, hours_used = ?, technician = ?, is_billable = ?, location = ?
      WHERE id = ?
    `);

    updateStmt.run(date, description, hoursUsed, technician, isBillable ? 1 : 0, location, id);

    // Update contract hours only if billable status is involved
    const contract = db.prepare('SELECT used_hours FROM contracts WHERE id = ?').get(contractId);
    
    if (contract) {
      let hoursDifference = 0;
      const wasBillable = oldIntervention.is_billable === 1;
      const nowBillable = isBillable;

      if (wasBillable && nowBillable) {
        // Both billable: normal difference
        hoursDifference = hoursUsed - oldIntervention.hours_used;
      } else if (wasBillable && !nowBillable) {
        // Was billable, now not: subtract old hours
        hoursDifference = -oldIntervention.hours_used;
      } else if (!wasBillable && nowBillable) {
        // Was not billable, now is: add new hours
        hoursDifference = hoursUsed;
      }
      // If both non-billable, no change needed

      if (hoursDifference !== 0) {
        const updateContractStmt = db.prepare(`
          UPDATE contracts SET used_hours = ? WHERE id = ?
        `);
        updateContractStmt.run(contract.used_hours + hoursDifference, contractId);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating intervention:', error);
    res.status(500).json({ error: "Erreur lors de la modification de l'intervention" });
  }
});

app.delete('/api/interventions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { contractId } = req.query;

    const intervention = db.prepare('SELECT hours_used, is_billable FROM interventions WHERE id = ?').get(id);
    
    if (!intervention) {
      return res.status(404).json({ error: 'Intervention non trouvée' });
    }

    const deleteStmt = db.prepare('DELETE FROM interventions WHERE id = ?');
    deleteStmt.run(id);

    // Only update contract hours if intervention was billable
    if (intervention.is_billable === 1) {
      const contract = db.prepare('SELECT used_hours FROM contracts WHERE id = ?').get(contractId);

      if (contract) {
        const updateStmt = db.prepare(`
          UPDATE contracts SET used_hours = ? WHERE id = ?
        `);
        updateStmt.run(contract.used_hours - intervention.hours_used, contractId);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting intervention:', error);
    res.status(500).json({ error: "Erreur lors de la suppression de l'intervention" });
  }
});

// Renouveler un contrat
app.post('/api/contracts/:id/renew', (req, res) => {
  try {
    const { id } = req.params;
    const { totalHours } = req.body;

    // Récupérer le contrat actuel
    const oldContract = db.prepare(`
      SELECT c.*, 
        GROUP_CONCAT(
          json_object(
            'id', i.id,
            'date', i.date,
            'description', i.description,
            'hours_used', i.hours_used,
            'technician', i.technician,
            'is_billable', i.is_billable,
            'location', i.location
          )
        ) as interventions_json
      FROM contracts c
      LEFT JOIN interventions i ON c.id = i.contract_id
      WHERE c.id = ?
      GROUP BY c.id
    `).get(id);

    if (!oldContract) {
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }

    // Archiver l'ancien contrat
    const archivedAt = new Date().toISOString();
    db.prepare('UPDATE contracts SET is_archived = 1, archived_at = ? WHERE id = ?')
      .run(archivedAt, id);

    // Créer le nouveau contrat
    const newContractId = randomUUID();
    const createdDate = new Date().toISOString();

    db.prepare(`
      INSERT INTO contracts (id, client_name, total_hours, used_hours, created_date, status, is_archived)
      VALUES (?, ?, ?, 0, ?, 'active', 0)
    `).run(newContractId, oldContract.client_name, totalHours, createdDate);

    // Si dépassement, créer une intervention de report basée sur les dernières interventions
    const overage = oldContract.used_hours - oldContract.total_hours;
    if (overage > 0) {
      // Récupérer les dernières interventions billables pour le libellé
      let lastDescription = "Heures supplémentaires";
      
      if (oldContract.interventions_json) {
        try {
          const interventions = JSON.parse(`[${oldContract.interventions_json}]`)
            .filter(i => i.id !== null && i.is_billable === 1)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          if (interventions.length > 0) {
            lastDescription = interventions[0].description;
          }
        } catch (e) {
          console.error("Error parsing interventions:", e);
        }
      }

      const reportInterventionId = randomUUID();
      db.prepare(`
        INSERT INTO interventions (id, contract_id, date, description, hours_used, technician, is_billable, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        reportInterventionId,
        newContractId,
        createdDate,
        `${lastDescription} (reporté)`,
        overage,
        "Système",
        1,
        null
      );

      // Mettre à jour les heures utilisées du nouveau contrat
      db.prepare('UPDATE contracts SET used_hours = ? WHERE id = ?')
        .run(overage, newContractId);
    }

    res.json({ 
      id: newContractId, 
      clientName: oldContract.client_name, 
      totalHours, 
      createdDate 
    });
  } catch (error) {
    console.error('Error renewing contract:', error);
    res.status(500).json({ error: 'Erreur lors du renouvellement du contrat' });
  }
});

// Export tous les contrats en Excel dans le dossier backup
app.post('/api/contracts/export-all-excel', (req, res) => {
  try {
    // Récupérer tous les contrats (actifs et archivés)
    const query = `
      SELECT c.*, 
        GROUP_CONCAT(
          json_object(
            'id', i.id,
            'date', i.date,
            'description', i.description,
            'hours_used', i.hours_used,
            'technician', i.technician,
            'is_billable', i.is_billable,
            'location', i.location
          )
        ) as interventions_json
      FROM contracts c
      LEFT JOIN interventions i ON c.id = i.contract_id
      GROUP BY c.id
      ORDER BY c.created_date DESC
    `;

    const rows = db.prepare(query).all();

    const contracts = rows.map(row => {
      let interventions = [];
      
      if (row.interventions_json) {
        try {
          const parsed = JSON.parse(`[${row.interventions_json}]`);
          interventions = parsed
            .filter(i => i.id !== null)
            .map(i => ({
              id: i.id,
              date: i.date,
              description: i.description,
              hoursUsed: i.hours_used,
              technician: i.technician,
              isBillable: i.is_billable === 1,
              location: i.location,
            }));
        } catch (e) {
          console.error("Error parsing interventions:", e);
        }
      }

      return {
        id: row.id,
        clientName: row.client_name,
        totalHours: row.total_hours,
        usedHours: row.used_hours,
        createdDate: row.created_date,
        status: row.status,
        isArchived: row.is_archived === 1,
        interventions,
      };
    });

    // Créer un fichier Excel par contrat
    let exportedCount = 0;
    const timestamp = new Date().toISOString().split('T')[0];

    contracts.forEach(contract => {
      // Interventions comptées
      const billableInterventions = contract.interventions
        .filter(i => i.isBillable !== false)
        .map(intervention => ({
          Date: new Date(intervention.date).toLocaleDateString('fr-FR'),
          Description: intervention.description,
          Technicien: intervention.technician,
          Heures: intervention.hoursUsed,
          Localisation: intervention.location || 'Non spécifié'
        }));

      // Interventions non comptées
      const nonBillableInterventions = contract.interventions
        .filter(i => i.isBillable === false)
        .map(intervention => ({
          Date: new Date(intervention.date).toLocaleDateString('fr-FR'),
          Description: intervention.description,
          Technicien: intervention.technician,
          Minutes: Math.round(intervention.hoursUsed * 60),
          Localisation: intervention.location || 'Non spécifié'
        }));

      // Résumé
      const summary = [
        ['Client', contract.clientName],
        ['Contrat N°', contract.id],
        ['Date de création', new Date(contract.createdDate).toLocaleDateString('fr-FR')],
        ['Heures totales', contract.totalHours],
        ['Heures utilisées', contract.usedHours],
        ['Heures restantes', (contract.totalHours - contract.usedHours).toFixed(1)],
        ['Progression', `${((contract.usedHours / contract.totalHours) * 100).toFixed(1)}%`],
        ['Statut', contract.isArchived ? 'Archivé' : contract.status]
      ];

      // Créer le workbook
      const wb = XLSX.utils.book_new();

      // Feuille résumé
      const summaryWs = XLSX.utils.aoa_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé');

      // Feuille interventions comptées
      if (billableInterventions.length > 0) {
        const billableWs = XLSX.utils.json_to_sheet(billableInterventions);
        XLSX.utils.book_append_sheet(wb, billableWs, 'Interventions comptées');
      }

      // Feuille interventions non comptées
      if (nonBillableInterventions.length > 0) {
        const nonBillableWs = XLSX.utils.json_to_sheet(nonBillableInterventions);
        XLSX.utils.book_append_sheet(wb, nonBillableWs, 'Interventions non comptées');
      }

      // Sauvegarder le fichier
      const fileName = `${contract.clientName.replace(/\s+/g, '-')}_${contract.id}_${timestamp}.xlsx`;
      const filePath = path.join(backupDir, fileName);
      XLSX.writeFile(wb, filePath);
      exportedCount++;
    });

    res.json({ 
      success: true, 
      count: exportedCount,
      path: backupDir
    });
  } catch (error) {
    console.error('Error exporting contracts to Excel:', error);
    res.status(500).json({ error: "Erreur lors de l'export Excel" });
  }
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
