const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const db = require('./database');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Créer le dossier data s'il n'existe pas
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
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
            'technician', i.technician
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
    const { contractId, date, description, hoursUsed, technician } = req.body;
    const id = randomUUID();

    const insertStmt = db.prepare(`
      INSERT INTO interventions (id, contract_id, date, description, hours_used, technician)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(id, contractId, date, description, hoursUsed, technician);

    const contract = db.prepare('SELECT used_hours FROM contracts WHERE id = ?').get(contractId);
    
    if (contract) {
      const updateStmt = db.prepare(`
        UPDATE contracts SET used_hours = ? WHERE id = ?
      `);
      updateStmt.run(contract.used_hours + hoursUsed, contractId);
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
    const { contractId, date, description, hoursUsed, technician } = req.body;

    const oldIntervention = db.prepare('SELECT hours_used FROM interventions WHERE id = ?').get(id);
    
    if (!oldIntervention) {
      return res.status(404).json({ error: 'Intervention non trouvée' });
    }

    const updateStmt = db.prepare(`
      UPDATE interventions 
      SET date = ?, description = ?, hours_used = ?, technician = ?
      WHERE id = ?
    `);

    updateStmt.run(date, description, hoursUsed, technician, id);

    const hoursDifference = hoursUsed - oldIntervention.hours_used;
    const contract = db.prepare('SELECT used_hours FROM contracts WHERE id = ?').get(contractId);

    if (contract) {
      const updateContractStmt = db.prepare(`
        UPDATE contracts SET used_hours = ? WHERE id = ?
      `);
      updateContractStmt.run(contract.used_hours + hoursDifference, contractId);
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

    const intervention = db.prepare('SELECT hours_used FROM interventions WHERE id = ?').get(id);
    
    if (!intervention) {
      return res.status(404).json({ error: 'Intervention non trouvée' });
    }

    const deleteStmt = db.prepare('DELETE FROM interventions WHERE id = ?');
    deleteStmt.run(id);

    const contract = db.prepare('SELECT used_hours FROM contracts WHERE id = ?').get(contractId);

    if (contract) {
      const updateStmt = db.prepare(`
        UPDATE contracts SET used_hours = ? WHERE id = ?
      `);
      updateStmt.run(contract.used_hours - intervention.hours_used, contractId);
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
            'technician', i.technician
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

    // Si dépassement, créer une intervention de report
    const overage = oldContract.used_hours - oldContract.total_hours;
    if (overage > 0) {
      // Récupérer la dernière intervention pour le libellé
      let lastDescription = "Heures supplémentaires";
      
      if (oldContract.interventions_json) {
        try {
          const interventions = JSON.parse(`[${oldContract.interventions_json}]`)
            .filter(i => i.id !== null)
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
        INSERT INTO interventions (id, contract_id, date, description, hours_used, technician)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        reportInterventionId,
        newContractId,
        createdDate,
        `${lastDescription} (reporté)`,
        overage,
        "Système"
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

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
