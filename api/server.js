// Load environment variables (dotenv if available, else fallback parser)
try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
} catch (err) {
  try {
    const fs = require('fs');
    const path = require('path');
    const candidates = [path.join(__dirname, '..', '.env'), path.join(__dirname, '.env')];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        content.split('\n').forEach((line) => {
          const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
          if (match) {
            let val = match[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
              val = val.slice(1, -1);
            }
            if (!(match[1] in process.env)) process.env[match[1]] = val;
          }
        });
        console.log(`Loaded environment variables from ${p} (fallback)`);
        break;
      }
    }
  } catch (e) {
    console.warn('dotenv not available and fallback failed; relying on existing environment vars');
  }
}

const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const db = require('./database');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const cron = require('node-cron');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3001;

// Créer les dossiers nécessaires
const dataDir = path.join(__dirname, 'data');
const backupDir = path.join(dataDir, 'backup');

console.log('Data directory path:', dataDir);
console.log('Backup directory path:', backupDir);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Created data directory');
}
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log('Created backup directory');
} else {
  console.log('Backup directory already exists');
}

app.use(cors());
app.use(express.json());

// Helper function to log cron jobs
function logCronJob(type, message, status = 'info', details = null, triggerType = 'cron') {
  try {
    const id = randomUUID();
    db.prepare(`
      INSERT INTO cron_logs (id, type, message, status, details, trigger_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, type, message, status, details ? JSON.stringify(details) : null, triggerType);
    
    // Nettoyer les logs de plus de 30 jours
    db.prepare(`
      DELETE FROM cron_logs WHERE timestamp < datetime('now', '-30 days')
    `).run();
  } catch (error) {
    console.error('Error logging cron job:', error);
  }
}

// Helper function to generate contract number based on client name
function generateContractNumber(clientName) {
  // Clean and prepare the client name
  const cleanName = clientName
    .toUpperCase()
    .replace(/[^A-Z]/g, ''); // Remove special chars and numbers
  
  // Try to find a unique prefix starting with 4 letters, then 5, then 6
  let prefix = '';
  let prefixLength = 4;
  
  while (prefixLength <= Math.max(6, cleanName.length)) {
    prefix = cleanName
      .substring(0, prefixLength)
      .padEnd(prefixLength, 'X'); // Pad with X if less than prefixLength letters
    
    // Check if this prefix already exists for a different client
    const existingContract = db.prepare(
      'SELECT DISTINCT client_name FROM contracts WHERE contract_number LIKE ? AND client_name != ?'
    ).get(`${prefix}%`, clientName);
    
    // If no collision or we've used all available letters, use this prefix
    if (!existingContract || prefixLength >= cleanName.length) {
      break;
    }
    
    prefixLength++;
  }
  
  // Get the highest number for this prefix and this specific client
  const maxNumberRow = db.prepare(
    'SELECT MAX(CAST(SUBSTR(contract_number, ?) AS INTEGER)) as max_number FROM contracts WHERE contract_number LIKE ? AND client_name = ?'
  ).get(prefix.length + 1, `${prefix}%`, clientName);
  
  const nextNumber = (maxNumberRow.max_number || 0) + 1;
  
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

// Routes pour les contrats
app.get('/api/contracts', (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    
    let query = `
      SELECT c.*, cl.internal_notes as client_internal_notes,
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
      LEFT JOIN clients cl ON c.client_id = cl.id
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
        contractNumber: row.contract_number,
        clientName: row.client_name,
        clientId: row.client_id,
        totalHours: row.total_hours,
        usedHours: row.used_hours,
        createdDate: row.created_date,
        status: row.status,
        isArchived: row.is_archived === 1,
        contractType: row.contract_type || 'signed',
        signedDate: row.signed_date,
        internalNotes: row.internal_notes,
        clientInternalNotes: row.client_internal_notes,
        renewalQuoteId: row.renewal_quote_id,
        linkedContractId: row.linked_contract_id,
        interventions,
      };
    });

    res.json(contracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des contrats' });
  }
});

// Get contract by contract number
app.get('/api/contracts/by-number/:contractNumber', (req, res) => {
  try {
    const { contractNumber } = req.params;
    const contract = db.prepare(`
      SELECT c.*, 
        GROUP_CONCAT(
          json_object(
            'id', i.id,
            'date', i.date,
            'description', i.description,
            'hoursUsed', i.hours_used,
            'technician', i.technician,
            'isBillable', i.is_billable,
            'location', i.location
          )
        ) as interventions
      FROM contracts c
      LEFT JOIN interventions i ON c.id = i.contract_id
      WHERE c.contract_number = ?
      GROUP BY c.id
    `).get(contractNumber);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const formattedContract = {
      ...contract,
      isArchived: !!contract.is_archived,
      usedHours: contract.used_hours,
      totalHours: contract.total_hours,
      createdDate: contract.created_date,
      contractNumber: contract.contract_number,
      contractType: contract.contract_type,
      signedDate: contract.signed_date,
      renewalQuoteId: contract.renewal_quote_id,
      linkedContractId: contract.linked_contract_id,
      internalNotes: contract.internal_notes,
      clientInternalNotes: contract.client_internal_notes,
      clientId: contract.client_id,
      interventions: contract.interventions 
        ? JSON.parse(`[${contract.interventions}]`) 
        : []
    };

    res.json(formattedContract);
  } catch (error) {
    console.error('Error fetching contract by number:', error);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

app.post('/api/contracts', (req, res) => {
  try {
    const { clientName, clientId, totalHours, contractType, internalNotes, createdDate: customCreatedDate, signedDate: customSignedDate } = req.body;
    const id = randomUUID();
    const createdDate = customCreatedDate || new Date().toISOString();
    const type = contractType || 'signed';
    const signedDate = customSignedDate || (type === 'signed' ? createdDate : null);

    let finalClientId = clientId;

    // Si pas de clientId fourni, chercher ou créer le client
    if (!finalClientId && clientName) {
      // Vérifier si un client avec ce nom existe déjà
      const existingClient = db.prepare('SELECT id FROM clients WHERE name = ?').get(clientName);
      
      if (existingClient) {
        finalClientId = existingClient.id;
      } else {
        // Créer un nouveau client
        const newClientId = randomUUID();
        db.prepare(`
          INSERT INTO clients (id, name, created_at, updated_at)
          VALUES (?, ?, ?, ?)
        `).run(newClientId, clientName, createdDate, createdDate);
        finalClientId = newClientId;
      }
    }

    // Generate contract number based on client name
    const contractNumber = generateContractNumber(clientName);

    const stmt = db.prepare(`
      INSERT INTO contracts (id, contract_number, client_name, client_id, total_hours, used_hours, created_date, status, is_archived, contract_type, signed_date, internal_notes)
      VALUES (?, ?, ?, ?, ?, 0, ?, 'active', 0, ?, ?, ?)
    `);

    stmt.run(id, contractNumber, clientName, finalClientId || null, totalHours, createdDate, type, signedDate, internalNotes || null);

    res.json({ id, contractNumber, clientName, totalHours, createdDate, contractType: type, signedDate });
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

// Routes pour les clients
app.get('/api/clients', (req, res) => {
  try {
    const clients = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM contracts WHERE client_id = c.id AND is_archived = 0) as active_contracts_count,
        (SELECT COUNT(*) FROM contracts WHERE client_id = c.id AND is_archived = 1) as archived_contracts_count
      FROM clients c
      ORDER BY c.name ASC
    `).all();
    
    const clientsWithContacts = clients.map(client => {
      const contacts = db.prepare('SELECT * FROM contact_persons WHERE client_id = ? ORDER BY name ASC').all(client.id);
      return {
        id: client.id,
        name: client.name,
        address: client.address,
        phoneStandard: client.phone_standard,
        internalNotes: client.internal_notes,
        fai: client.fai,
        domains: client.domains ? JSON.parse(client.domains) : [],
        emailType: client.email_type,
        mailinblack: client.mailinblack === 1,
        arx: client.arx === 1,
        arxQuota: client.arx_quota,
        eset: client.eset === 1,
        esetVersion: client.eset_version,
        fortinet: client.fortinet === 1,
        createdAt: client.created_at,
        updatedAt: client.updated_at,
        activeContractsCount: client.active_contracts_count,
        archivedContractsCount: client.archived_contracts_count,
        contacts: contacts.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          createdAt: c.created_at
        }))
      };
    });
    
    res.json(clientsWithContacts);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des clients' });
  }
});

// Get client by name (must be before :id route to avoid conflicts)
app.get('/api/clients/by-name/:name', (req, res) => {
  try {
    const { name } = req.params;
    const client = db.prepare('SELECT * FROM clients WHERE name = ?').get(decodeURIComponent(name));
    
    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    
    const contacts = db.prepare('SELECT * FROM contact_persons WHERE client_id = ? ORDER BY name ASC').all(client.id);
    const activeContracts = db.prepare('SELECT COUNT(*) as count FROM contracts WHERE client_id = ? AND is_archived = 0').get(client.id);
    const archivedContracts = db.prepare('SELECT COUNT(*) as count FROM contracts WHERE client_id = ? AND is_archived = 1').get(client.id);
    
    res.json({
      id: client.id,
      name: client.name,
      address: client.address,
      phoneStandard: client.phone_standard,
      internalNotes: client.internal_notes,
      fai: client.fai,
      domains: client.domains ? JSON.parse(client.domains) : [],
      emailType: client.email_type,
      mailinblack: client.mailinblack === 1,
      arx: client.arx === 1,
      arxQuota: client.arx_quota,
      eset: client.eset === 1,
      esetVersion: client.eset_version,
      fortinet: client.fortinet === 1,
      createdAt: client.created_at,
      updatedAt: client.updated_at,
      activeContractsCount: activeContracts.count,
      archivedContractsCount: archivedContracts.count,
      contacts: contacts.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        createdAt: c.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching client by name:', error);
    res.status(500).json({ error: 'Erreur lors du chargement du client' });
  }
});

app.get('/api/clients/:id', (req, res) => {
  try {
    const { id } = req.params;
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    
    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    
    const contacts = db.prepare('SELECT * FROM contact_persons WHERE client_id = ? ORDER BY name ASC').all(id);
    const activeContracts = db.prepare('SELECT COUNT(*) as count FROM contracts WHERE client_id = ? AND is_archived = 0').get(id);
    const archivedContracts = db.prepare('SELECT COUNT(*) as count FROM contracts WHERE client_id = ? AND is_archived = 1').get(id);
    
    res.json({
      id: client.id,
      name: client.name,
      address: client.address,
      phoneStandard: client.phone_standard,
      internalNotes: client.internal_notes,
      fai: client.fai,
      domains: client.domains ? JSON.parse(client.domains) : [],
      emailType: client.email_type,
      mailinblack: client.mailinblack === 1,
      arx: client.arx === 1,
      arxQuota: client.arx_quota,
      eset: client.eset === 1,
      esetVersion: client.eset_version,
      fortinet: client.fortinet === 1,
      createdAt: client.created_at,
      updatedAt: client.updated_at,
      activeContractsCount: activeContracts.count,
      archivedContractsCount: archivedContracts.count,
      contacts: contacts.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        createdAt: c.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Erreur lors du chargement du client' });
  }
});

app.post('/api/clients', (req, res) => {
  try {
    const { name, address, phoneStandard, internalNotes, fai, domains, emailType, mailinblack, arx, arxQuota, eset, esetVersion, fortinet, contacts } = req.body;
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO clients (id, name, address, phone_standard, internal_notes, fai, domains, email_type, mailinblack, arx, arx_quota, eset, eset_version, fortinet, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      name, 
      address || null, 
      phoneStandard || null, 
      internalNotes || null, 
      fai || null,
      domains ? JSON.stringify(domains) : null,
      emailType || null,
      mailinblack ? 1 : 0,
      arx ? 1 : 0,
      arxQuota || null,
      eset ? 1 : 0,
      esetVersion || null,
      fortinet ? 1 : 0,
      createdAt, 
      createdAt
    );
    
    // Ajouter les contacts
    if (contacts && contacts.length > 0) {
      const insertContact = db.prepare(`
        INSERT INTO contact_persons (id, client_id, name, email, phone, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      contacts.forEach(contact => {
        insertContact.run(randomUUID(), id, contact.name, contact.email || null, contact.phone || null, createdAt);
      });
    }
    
    res.json({ id, name });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Erreur lors de la création du client' });
  }
});

app.patch('/api/clients/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phoneStandard, internalNotes, fai, domains, emailType, mailinblack, arx, arxQuota, eset, esetVersion, fortinet, contacts } = req.body;
    const updatedAt = new Date().toISOString();
    
    db.prepare(`
      UPDATE clients 
      SET name = ?, address = ?, phone_standard = ?, internal_notes = ?, fai = ?, domains = ?, email_type = ?, mailinblack = ?, arx = ?, arx_quota = ?, eset = ?, eset_version = ?, fortinet = ?, updated_at = ?
      WHERE id = ?
    `).run(
      name, 
      address || null, 
      phoneStandard || null, 
      internalNotes || null, 
      fai || null,
      domains ? JSON.stringify(domains) : null,
      emailType || null,
      mailinblack ? 1 : 0,
      arx ? 1 : 0,
      arxQuota || null,
      eset ? 1 : 0,
      esetVersion || null,
      fortinet ? 1 : 0,
      updatedAt, 
      id
    );
    
    // Supprimer les anciens contacts et ajouter les nouveaux
    db.prepare('DELETE FROM contact_persons WHERE client_id = ?').run(id);
    
    if (contacts && contacts.length > 0) {
      const insertContact = db.prepare(`
        INSERT INTO contact_persons (id, client_id, name, email, phone, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const createdAt = new Date().toISOString();
      contacts.forEach(contact => {
        insertContact.run(randomUUID(), id, contact.name, contact.email || null, contact.phone || null, createdAt);
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du client' });
  }
});

app.delete('/api/clients/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer le nom du client pour supprimer les billing_items
    const client = db.prepare('SELECT name FROM clients WHERE id = ?').get(id);
    
    // Compter les contrats liés
    const contractCount = db.prepare('SELECT COUNT(*) as count FROM contracts WHERE client_id = ?').get(id);
    
    // Supprimer les contrats et interventions liés
    const contracts = db.prepare('SELECT id FROM contracts WHERE client_id = ?').all(id);
    contracts.forEach(contract => {
      db.prepare('DELETE FROM interventions WHERE contract_id = ?').run(contract.id);
    });
    db.prepare('DELETE FROM contracts WHERE client_id = ?').run(id);
    
    // Supprimer les éléments de facturation associés au client
    db.prepare('DELETE FROM billing_items WHERE client_name = ?').run(client.name);
    
    // Supprimer les contacts du client
    db.prepare('DELETE FROM contact_persons WHERE client_id = ?').run(id);
    
    // Supprimer le client
    db.prepare('DELETE FROM clients WHERE id = ?').run(id);
    
    res.json({ success: true, deletedContractsCount: contractCount.count });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du client' });
  }
});

app.get('/api/clients-list', (req, res) => {
  try {
    const clients = db.prepare('SELECT id, name FROM clients ORDER BY name ASC').all();
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients list:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des clients' });
  }
});

// Get list of unique technicians
app.get('/api/technicians-list', (req, res) => {
  try {
    const technicians = db.prepare('SELECT DISTINCT technician FROM interventions ORDER BY technician ASC').all();
    res.json(technicians.map(t => t.technician));
  } catch (error) {
    console.error('Error fetching technicians list:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des techniciens' });
  }
});

// ARX Accounts routes
app.get('/api/clients/:clientId/arx-accounts', (req, res) => {
  try {
    const { clientId } = req.params;
    const accounts = db.prepare('SELECT * FROM arx_accounts WHERE client_id = ? ORDER BY account_name ASC').all(clientId);
    
    const formattedAccounts = accounts.map(account => ({
      id: account.id,
      clientId: account.client_id,
      accountName: account.account_name,
      status: account.status,
      lastBackupDate: account.last_backup_date,
      usedSpaceGb: account.used_space_gb,
      allowedSpaceGb: account.allowed_space_gb,
      analyzedSizeGb: account.analyzed_size_gb,
      lastUpdated: account.last_updated
    }));
    
    res.json(formattedAccounts);
  } catch (error) {
    console.error('Error fetching ARX accounts:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des comptes ARX' });
  }
});

app.post('/api/clients/:clientId/arx-accounts', (req, res) => {
  try {
    const { clientId } = req.params;
    const { accountName } = req.body;
    
    const accountId = randomUUID();
    db.prepare(`
      INSERT INTO arx_accounts (id, client_id, account_name, status)
      VALUES (?, ?, ?, 'ok')
    `).run(accountId, clientId, accountName);
    
    res.json({ id: accountId, clientId, accountName, status: 'ok' });
  } catch (error) {
    console.error('Error creating ARX account:', error);
    res.status(500).json({ error: 'Erreur lors de la création du compte ARX' });
  }
});

app.patch('/api/clients/:clientId/arx-accounts/:accountId', (req, res) => {
  try {
    const { accountId } = req.params;
    const { status, lastBackupDate, usedSpaceGb, allowedSpaceGb, analyzedSizeGb } = req.body;
    
    db.prepare(`
      UPDATE arx_accounts 
      SET status = ?, last_backup_date = ?, used_space_gb = ?, allowed_space_gb = ?, analyzed_size_gb = ?, last_updated = datetime('now')
      WHERE id = ?
    `).run(status, lastBackupDate, usedSpaceGb, allowedSpaceGb, analyzedSizeGb, accountId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating ARX account:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du compte ARX' });
  }
});

app.post('/api/clients/:clientId/arx-accounts/:accountId/refresh', async (req, res) => {
  try {
    const { clientId, accountId } = req.params;
    
    // Get the account details
    const account = db.prepare('SELECT * FROM arx_accounts WHERE id = ?').get(accountId);
    if (!account) {
      return res.status(404).json({ error: 'Compte ARX non trouvé' });
    }

    const arxApiKey = process.env.ARX_API_KEY;
    if (!arxApiKey) {
      return res.status(500).json({ error: 'ARX_API_KEY non configurée' });
    }
    
    const accountDetail = {
      accountName: account.account_name,
      status: 'success',
      apiCalls: [],
      data: {}
    };
    
    // Fetch data from ARX API
    console.log(`Fetching ARX data for account: ${account.account_name}`);
    const supervisionUrl = `https://api.arx.one/s9/${account.account_name}/supervision/events?hierarchy=Self`;
    accountDetail.apiCalls.push({ type: 'GET', url: supervisionUrl });
    
    const arxResponse = await fetch(supervisionUrl, {
      headers: {
        'Authorization': `Bearer ${arxApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!arxResponse.ok) {
      console.error(`ARX API error: ${arxResponse.status} ${arxResponse.statusText}`);
      accountDetail.status = 'error';
      accountDetail.error = `ARX API error: ${arxResponse.statusText}`;
      logCronJob('arx_sync', `Refresh manuel: ${account.account_name}`, 'error', [accountDetail], 'manual');
      return res.status(500).json({ error: 'Erreur lors de la récupération des données ARX' });
    }

    const arxData = await arxResponse.json();
    
    if (!arxData || arxData.length === 0) {
      accountDetail.status = 'error';
      accountDetail.error = 'Aucune donnée retournée';
      logCronJob('arx_sync', `Refresh manuel: ${account.account_name}`, 'error', [accountDetail], 'manual');
      return res.status(404).json({ error: 'Aucune donnée retournée par l\'API ARX' });
    }

    const accountData = arxData[0];

    // Determine status based on events (ARX API uses PascalCase)
    let status = 'ok';
    if (accountData.Events && accountData.Events.length > 0) {
      const hasCritical = accountData.Events.some(
        (event) => event.Priority === 'Critical'
      );
      if (hasCritical) {
        status = 'attention_requise';
      }
    }

    // Convert bytes to GB (ARX API uses PascalCase: Quota.UsedSpace, Quota.AllowedSpace)
    const usedSpaceGb = accountData?.Quota?.UsedSpace != null
      ? accountData.Quota.UsedSpace / 1000000000
      : null;
    const allowedSpaceGb = accountData?.Quota?.AllowedSpace != null
      ? accountData.Quota.AllowedSpace / 1000000000
      : null;

    // Fetch analyzed size since last backup and update DB
    let analyzedSizeGb = null;
    try {
      if (accountData.LastBackupStartTime) {
        const formattedDate = new Date(accountData.LastBackupStartTime).toISOString().split('T')[0];
        console.log(`Fetching analyzed size for ${account.account_name} since ${formattedDate}`);
        const dataUrl = `https://api.arx.one/s9/${account.account_name}/data/latest?eventID=2.1.1.3.1&skip=0&includeDescendants=false&includeFullInformation=false`;
        accountDetail.apiCalls.push({ type: 'GET', url: dataUrl });
        
        const dataResponse = await fetch(dataUrl, {
          headers: {
            'Authorization': `Bearer ${arxApiKey}`,
            'Content-Type': 'application/json',
          },
        });
        if (dataResponse.ok) {
          const dataEvents = await dataResponse.json();
          const analyzedSizeStr = dataEvents?.[0]?.LiteralValues?.['analyzed-size'];
          if (analyzedSizeStr) {
            const analyzedSizeBytes = parseInt(String(analyzedSizeStr).replace(/[^\d]/g, ''), 10);
            if (!Number.isNaN(analyzedSizeBytes)) {
              analyzedSizeGb = analyzedSizeBytes / 1000000000;
            }
          }
        }
      }
    } catch (e) {
      console.error('Error fetching analyzed size:', e);
    }

    // Update the current state in arx_accounts
    db.prepare(`
      UPDATE arx_accounts 
      SET status = ?, last_backup_date = ?, used_space_gb = ?, allowed_space_gb = ?, analyzed_size_gb = ?, last_updated = datetime('now')
      WHERE id = ?
    `).run(status, accountData.LastBackupStartTime, usedSpaceGb, allowedSpaceGb, analyzedSizeGb, accountId);

    // Check if there's already an entry for today
    // Check if we already have an entry for the backup date
    if (accountData.LastBackupStartTime) {
      const backupDate = new Date(accountData.LastBackupStartTime).toISOString().split('T')[0];
      const existingEntry = db.prepare(`
        SELECT id FROM arx_account_history
        WHERE account_id = ? AND date(recorded_at) = ?
      `).get(accountId, backupDate);

      if (existingEntry) {
        // Update existing entry
        db.prepare(`
          UPDATE arx_account_history
          SET status = ?, last_backup_date = ?, used_space_gb = ?, allowed_space_gb = ?, analyzed_size_gb = ?
          WHERE id = ?
        `).run(status, accountData.LastBackupStartTime, usedSpaceGb, allowedSpaceGb, analyzedSizeGb, existingEntry.id);
      } else {
        // Insert new entry
        db.prepare(`
          INSERT INTO arx_account_history (id, account_id, recorded_at, status, last_backup_date, used_space_gb, allowed_space_gb, analyzed_size_gb)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), accountId, accountData.LastBackupStartTime, status, accountData.LastBackupStartTime, usedSpaceGb, allowedSpaceGb, analyzedSizeGb);
      }
    }

    // Delete entries older than 40 days
    db.prepare(`
      DELETE FROM arx_account_history
      WHERE account_id = ? AND recorded_at < datetime('now', '-40 days')
    `).run(accountId);

    console.log(`Successfully updated ARX account ${account.account_name}`);
    
    accountDetail.data = {
      status,
      usedSpaceGb: usedSpaceGb?.toFixed(2),
      allowedSpaceGb: allowedSpaceGb?.toFixed(2),
      analyzedSizeGb: analyzedSizeGb?.toFixed(2),
      lastBackupDate: accountData.LastBackupStartTime
    };
    
    logCronJob('arx_sync', `Refresh manuel: ${account.account_name}`, 'success', [accountDetail], 'manual');
    
    res.json({
      success: true,
      status,
      lastBackupDate: accountData.LastBackupStartTime,
      usedSpaceGb,
      allowedSpaceGb,
      analyzedSizeGb,
    });
  } catch (error) {
    console.error('Error refreshing ARX account:', error);
    logCronJob('arx_sync', `Refresh manuel erreur: ${error.message}`, 'error', null, 'manual');
    res.status(500).json({ error: 'Erreur lors de l\'actualisation du compte ARX' });
  }
});

app.delete('/api/clients/:clientId/arx-accounts/:accountId', (req, res) => {
  try {
    const { accountId } = req.params;
    
    db.prepare('DELETE FROM arx_accounts WHERE id = ?').run(accountId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting ARX account:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du compte ARX' });
  }
});

// Get ARX account history (last 40 days)
app.get('/api/clients/:clientId/arx-accounts/:accountId/history', (req, res) => {
  try {
    const { accountId } = req.params;
    
    const history = db.prepare(`
      SELECT 
        recorded_at,
        status,
        last_backup_date,
        used_space_gb,
        allowed_space_gb,
        analyzed_size_gb
      FROM arx_account_history
      WHERE account_id = ?
        AND recorded_at >= datetime('now', '-40 days')
      ORDER BY recorded_at ASC
    `).all(accountId);
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching ARX account history:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
});


// Signer un devis (le transformer en contrat signé)
app.patch('/api/contracts/:id/sign', (req, res) => {
  try {
    const { id } = req.params;
    const signedDate = new Date().toISOString();

    // Récupérer le contrat/devis à signer
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }

    // Si c'est un devis de renouvellement lié à un contrat
    if (contract.linked_contract_id) {
      // Les heures sont déjà synchronisées via syncOverageToRenewalQuote
      // Pas besoin de les reporter à nouveau
      
      // Archiver l'ancien contrat
      const archivedAt = new Date().toISOString();
      db.prepare('UPDATE contracts SET is_archived = 1, archived_at = ? WHERE id = ?')
        .run(archivedAt, contract.linked_contract_id);
      
      // Transformer le devis en contrat signé
      db.prepare(`
        UPDATE contracts 
        SET contract_type = 'signed', signed_date = ?, linked_contract_id = NULL 
        WHERE id = ?
      `).run(signedDate, id);
      
      // Supprimer le lien dans l'ancien contrat
      db.prepare('UPDATE contracts SET renewal_quote_id = NULL WHERE id = ?')
        .run(contract.linked_contract_id);
    } else {
      // Simple signature de devis
      db.prepare(`
        UPDATE contracts SET contract_type = 'signed', signed_date = ? WHERE id = ?
      `).run(signedDate, id);
    }

    res.json({ success: true, signedDate });
  } catch (error) {
    console.error('Error signing contract:', error);
    res.status(500).json({ error: 'Erreur lors de la signature du contrat' });
  }
});

// Créer un devis de renouvellement
app.post('/api/contracts/:id/renewal-quote', (req, res) => {
  try {
    const { id } = req.params;
    const { totalHours } = req.body;

    // Récupérer le contrat actuel avec ses interventions
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

    // Créer le devis de renouvellement
    const quoteId = randomUUID();
    const createdDate = new Date().toISOString();

    // Generate contract number based on client name
    const contractNumber = generateContractNumber(oldContract.client_name);

    db.prepare(`
      INSERT INTO contracts (id, contract_number, client_name, client_id, total_hours, used_hours, created_date, status, is_archived, contract_type, signed_date, linked_contract_id)
      VALUES (?, ?, ?, ?, ?, 0, ?, 'active', 0, 'quote', NULL, ?)
    `).run(quoteId, contractNumber, oldContract.client_name, oldContract.client_id, totalHours, createdDate, id);

    // Si dépassement, créer une intervention de report
    const overage = oldContract.used_hours - oldContract.total_hours;
    if (overage > 0) {
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
        quoteId,
        createdDate,
        `${lastDescription} (reporté)`,
        overage,
        "Système",
        1,
        null
      );

      // Mettre à jour les heures utilisées du devis
      db.prepare('UPDATE contracts SET used_hours = ? WHERE id = ?')
        .run(overage, quoteId);
    }

    // Lier le contrat original au devis de renouvellement
    db.prepare('UPDATE contracts SET renewal_quote_id = ? WHERE id = ?')
      .run(quoteId, id);

    res.json({ 
      quoteId, 
      clientName: oldContract.client_name, 
      totalHours, 
      createdDate 
    });
  } catch (error) {
    console.error('Error creating renewal quote:', error);
    res.status(500).json({ error: 'Erreur lors de la création du devis de renouvellement' });
  }
});

// Mettre à jour le nom du client d'un contrat
app.patch('/api/contracts/:id/client-name', (req, res) => {
  try {
    const { id } = req.params;
    const { clientName, createdDate } = req.body;

    let query = 'UPDATE contracts SET client_name = ?';
    let params = [clientName];

    if (createdDate !== undefined) {
      query += ', created_date = ?';
      params.push(createdDate);
    }

    query += ' WHERE id = ?';
    params.push(id);

    const stmt = db.prepare(query);
    stmt.run(...params);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du contrat' });
  }
});

// Supprimer un devis et restaurer le contrat lié
app.delete('/api/contracts/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer le contrat à supprimer
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    // Vérifier que c'est bien un devis
    if (contract.contract_type !== 'quote') {
      return res.status(400).json({ error: 'Only quotes can be deleted' });
    }
    
    // Trouver le contrat lié
    if (contract.linked_contract_id) {
      // Retirer le renewal_quote_id du contrat actif
      db.prepare('UPDATE contracts SET renewal_quote_id = NULL WHERE id = ?')
        .run(contract.linked_contract_id);
    }
    
    // Supprimer les interventions du devis
    db.prepare('DELETE FROM interventions WHERE contract_id = ?').run(id);
    
    // Supprimer le devis
    db.prepare('DELETE FROM contracts WHERE id = ?').run(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting quote:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to sync overage interventions to renewal quote
function syncOverageToRenewalQuote(contractId) {
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(contractId);
  
  if (!contract || !contract.renewal_quote_id) {
    return; // Pas de devis lié
  }

  // Récupérer toutes les interventions billables du contrat actif, triées par date
  const interventions = db.prepare(`
    SELECT * FROM interventions 
    WHERE contract_id = ? AND is_billable = 1
    ORDER BY date ASC
  `).all(contractId);

  // Calculer quelles interventions sont en dépassement
  let cumulativeHours = 0;
  const overageInterventions = [];
  
  interventions.forEach(intervention => {
    const hoursBefore = cumulativeHours;
    cumulativeHours += intervention.hours_used;
    
    if (cumulativeHours > contract.total_hours) {
      // Cette intervention est (au moins partiellement) en dépassement
      if (hoursBefore >= contract.total_hours) {
        // Entièrement en dépassement
        overageInterventions.push({
          ...intervention,
          overageHours: intervention.hours_used
        });
      } else {
        // Partiellement en dépassement
        const overageHours = cumulativeHours - contract.total_hours;
        overageInterventions.push({
          ...intervention,
          overageHours: overageHours
        });
      }
    }
  });

  // Supprimer toutes les anciennes interventions reportées dans le devis
  db.prepare(`
    DELETE FROM interventions 
    WHERE contract_id = ? AND technician = 'Système' AND description LIKE '%(reporté)%'
  `).run(contract.renewal_quote_id);

  // Créer les nouvelles interventions reportées
  let totalOverage = 0;
  overageInterventions.forEach(intervention => {
    const reportId = randomUUID();
    const description = `${intervention.description} (reporté)`;
    
    db.prepare(`
      INSERT INTO interventions (id, contract_id, date, description, hours_used, technician, is_billable, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reportId,
      contract.renewal_quote_id,
      intervention.date,
      description,
      intervention.overageHours,
      "Système",
      1,
      intervention.location
    );
    
    totalOverage += intervention.overageHours;
  });

  // Mettre à jour les heures utilisées du devis
  db.prepare('UPDATE contracts SET used_hours = ? WHERE id = ?')
    .run(totalOverage, contract.renewal_quote_id);
}

// Routes pour les interventions
app.post('/api/interventions', async (req, res) => {
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
      const contract = db.prepare('SELECT used_hours, total_hours, contract_number, client_name FROM contracts WHERE id = ?').get(contractId);
      
      if (contract) {
        const newUsedHours = contract.used_hours + hoursUsed;
        const updateStmt = db.prepare(`
          UPDATE contracts SET used_hours = ? WHERE id = ?
        `);
        updateStmt.run(newUsedHours, contractId);
        
        // Synchroniser avec le devis de renouvellement si existe
        syncOverageToRenewalQuote(contractId);

        // Check if contract just became full (>= 100%) and send notification
        if (newUsedHours >= contract.total_hours && contract.used_hours < contract.total_hours) {
          // Contract just became full, trigger notification
          const notificationSettings = db.prepare('SELECT * FROM notification_settings ORDER BY created_at DESC LIMIT 1').get();
          
          if (notificationSettings && JSON.parse(notificationSettings.triggers).contract_full) {
            // Run email sending in background
            setImmediate(async () => {
              try {
                const PDFDocument = require('pdfkit');
                
                // Create transporter
                const transporter = nodemailer.createTransport({
                  host: notificationSettings.smtp_host,
                  port: notificationSettings.smtp_port,
                  secure: notificationSettings.smtp_secure === 1,
                  auth: {
                    user: notificationSettings.smtp_user,
                    pass: notificationSettings.smtp_password,
                  },
                });

                // Get full contract data with interventions
                const fullContract = db.prepare(`
                  SELECT c.*, 
                    GROUP_CONCAT(
                      json_object(
                        'id', i.id,
                        'date', i.date,
                        'description', i.description,
                        'hoursUsed', i.hours_used,
                        'technician', i.technician,
                        'isBillable', i.is_billable,
                        'location', i.location
                      )
                    ) as interventions
                  FROM contracts c
                  LEFT JOIN interventions i ON c.id = i.contract_id
                  WHERE c.id = ?
                  GROUP BY c.id
                `).get(contractId);

                // Generate PDF using PDFKit
                const interventions = fullContract.interventions ? JSON.parse(`[${fullContract.interventions}]`).filter(i => i.isBillable) : [];
                
                const pdfBuffer = await new Promise((resolve, reject) => {
                  const doc = new PDFDocument({ margin: 50 });
                  const chunks = [];
                  
                  doc.on('data', chunk => chunks.push(chunk));
                  doc.on('end', () => resolve(Buffer.concat(chunks)));
                  doc.on('error', reject);

                  // Header
                  doc.rect(0, 0, doc.page.width, 80).fill('#3b82f6');
                  doc.fillColor('#ffffff').fontSize(24).text('RAPPORT DE CONTRAT', 0, 30, { align: 'center' });
                  doc.fontSize(10).text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 0, 55, { align: 'center' });

                  // Contract info
                  doc.fillColor('#000000').fontSize(12);
                  doc.text(`Client: ${fullContract.client_name}`, 50, 100);
                  doc.text(`Contrat N°: ${fullContract.contract_number}`, 50, 120);
                  doc.text(`Date de création: ${new Date(fullContract.created_date).toLocaleDateString('fr-FR')}`, 50, 140);

                  // Hours summary
                  doc.fontSize(14).text('Résumé des heures', 50, 170);
                  doc.fontSize(11);
                  doc.text(`Total: ${fullContract.total_hours}h | Utilisées: ${newUsedHours}h | Restantes: ${Math.max(0, fullContract.total_hours - newUsedHours)}h`, 50, 190);

                  // Interventions table
                  doc.fontSize(14).text('Interventions facturables', 50, 220);
                  let y = 245;
                  doc.fontSize(10);
                  
                  // Table header
                  doc.fillColor('#3b82f6').rect(50, y, 495, 20).fill();
                  doc.fillColor('#ffffff').text('Date', 55, y + 5).text('Description', 130, y + 5)
                     .text('Lieu', 350, y + 5).text('Heures', 480, y + 5);
                  
                  y += 20;
                  doc.fillColor('#000000');
                  
                  // Table rows
                  interventions.forEach((intervention, idx) => {
                    if (y > 700) {
                      doc.addPage();
                      y = 50;
                    }
                    
                    if (idx % 2 === 0) {
                      doc.fillColor('#f0f0f0').rect(50, y, 495, 20).fill();
                      doc.fillColor('#000000');
                    }
                    
                    doc.text(new Date(intervention.date).toLocaleDateString('fr-FR'), 55, y + 5, { width: 70 });
                    doc.text(intervention.description, 130, y + 5, { width: 210 });
                    doc.text(intervention.location || '', 350, y + 5, { width: 120 });
                    doc.text(`${intervention.hoursUsed}h`, 480, y + 5);
                    y += 20;
                  });

                  doc.end();
                });

                // Send email with PDF attachment
                await transporter.sendMail({
                  from: notificationSettings.smtp_from,
                  to: notificationSettings.email_to,
                  subject: `⚠️ Alerte: Contrat ${fullContract.contract_number} plein - ${fullContract.client_name}`,
                  html: `
                    <h2 style="color: #3b82f6;">Contrat plein</h2>
                    <p>Le contrat <strong>${fullContract.contract_number}</strong> pour le client <strong>${fullContract.client_name}</strong> a atteint 100% de ses heures.</p>
                    <ul>
                      <li>Total d'heures: <strong>${fullContract.total_hours}h</strong></li>
                      <li>Heures utilisées: <strong>${newUsedHours}h</strong></li>
                      <li>Heures restantes: <strong>${Math.max(0, fullContract.total_hours - newUsedHours)}h</strong></li>
                    </ul>
                    <p>Vous trouverez le rapport complet du contrat en pièce jointe.</p>
                  `,
                  attachments: [{
                    filename: `Contrat_${fullContract.contract_number}_${fullContract.client_name.replace(/[^a-z0-9]/gi, '_')}.pdf`,
                    content: pdfBuffer
                  }]
                });

                // Log success
                logCronJob('notification', `Email envoyé: contrat ${fullContract.contract_number} plein`, 'success', {
                  contractId,
                  contractNumber: fullContract.contract_number,
                  clientName: fullContract.client_name,
                  usedHours: newUsedHours,
                  totalHours: fullContract.total_hours,
                  to: notificationSettings.email_to
                }, 'auto');

              } catch (emailError) {
                console.error('Error sending contract full notification:', emailError);
                // Log failure
                logCronJob('notification', `Échec envoi email: contrat ${contract.contract_number}`, 'error', {
                  contractId,
                  error: emailError.message
                }, 'auto');
              }
            });
          }
        }
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
        
        // Synchroniser avec le devis de renouvellement si existe
        syncOverageToRenewalQuote(contractId);
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
        
        // Synchroniser avec le devis de renouvellement si existe
        syncOverageToRenewalQuote(contractId);
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

    // Generate contract number based on client name
    const contractNumber = generateContractNumber(oldContract.client_name);

    db.prepare(`
      INSERT INTO contracts (id, contract_number, client_name, client_id, total_hours, used_hours, created_date, status, is_archived, contract_type, signed_date)
      VALUES (?, ?, ?, ?, ?, 0, ?, 'active', 0, 'signed', ?)
    `).run(newContractId, contractNumber, oldContract.client_name, oldContract.client_id, totalHours, createdDate, createdDate);

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
        contractType: row.contract_type,
        signedDate: row.signed_date,
        interventions,
      };
    });

    // Créer un fichier Excel par contrat
    let exportedCount = 0;

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

      // Créer le dossier client si nécessaire
      const clientFolderName = contract.clientName.replace(/[\/\\?%*:|"<>]/g, '-');
      const clientFolderPath = path.join(backupDir, clientFolderName);
      
      if (!fs.existsSync(clientFolderPath)) {
        fs.mkdirSync(clientFolderPath, { recursive: true });
      }

      // Supprimer tous les fichiers existants pour ce contrat (même client + même heures)
      const existingFiles = fs.readdirSync(clientFolderPath);
      const contractFilePattern = `${clientFolderName}_${contract.totalHours}h_`;
      existingFiles.forEach(file => {
        if (file.includes(contractFilePattern)) {
          const oldFilePath = path.join(clientFolderPath, file);
          try {
            fs.unlinkSync(oldFilePath);
          } catch (err) {
            console.error(`Error deleting old file ${file}:`, err);
          }
        }
      });

      // Déterminer le statut pour le nom du fichier
      let statusPrefix = 'actif';
      if (contract.isArchived) {
        statusPrefix = 'archive';
      } else if (contract.contractType === 'quote') {
        statusPrefix = 'devis';
      }

      // Formater la date de signature
      const signedDateStr = contract.signedDate 
        ? new Date(contract.signedDate).toLocaleDateString('fr-FR').replace(/\//g, '-')
        : 'non-signe';

      // Sauvegarder le fichier
      const fileName = `[${statusPrefix}]${clientFolderName}_${contract.totalHours}h_${signedDateStr}.xlsx`;
      const filePath = path.join(clientFolderPath, fileName);
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

// Endpoint pour récupérer les logs des cron jobs
app.get('/api/admin/cron-logs', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM cron_logs 
      ORDER BY timestamp DESC 
      LIMIT 100
    `).all();
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching cron logs:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des logs' });
  }
});

// Route pour déclencher l'alerte hebdomadaire des contrats
app.post('/api/admin/trigger-contract-alert', async (req, res) => {
  console.log('Manual trigger for weekly contract alert');
  logCronJob('contract_alert', 'Démarrage de l\'alerte hebdomadaire des contrats', 'info', null, 'manual');
  
  try {
    // Get notification settings
    const notificationSettings = db.prepare('SELECT * FROM notification_settings LIMIT 1').get();
    
    if (!notificationSettings) {
      const errorMsg = 'Aucun paramètre de notification configuré';
      logCronJob('contract_alert', errorMsg, 'error', null, 'manual');
      return res.status(400).json({ error: errorMsg });
    }

    // Get all active contracts at 100% or more
    const query = `
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
      WHERE c.is_archived = 0 
        AND c.contract_type != 'quote'
        AND (c.used_hours * 1.0 / c.total_hours) >= 1.0
      GROUP BY c.id
      ORDER BY c.client_name ASC
    `;

    const rows = db.prepare(query).all();
    
    if (rows.length === 0) {
      const successMsg = 'Aucun contrat à 100% ou en dépassement';
      logCronJob('contract_alert', successMsg, 'success', null, 'manual');
      return res.json({ success: true, message: successMsg, count: 0 });
    }

    // Build email text content
    let emailText = `Alerte hebdomadaire - Contrats à 100% ou en dépassement\n`;
    emailText += `Date: ${new Date().toLocaleDateString('fr-FR')}\n`;
    emailText += `Nombre de contrats concernés: ${rows.length}\n\n`;
    emailText += `${'='.repeat(80)}\n\n`;

    rows.forEach((row, index) => {
      const percentage = (row.used_hours / row.total_hours) * 100;
      const overageHours = row.used_hours - row.total_hours;
      
      // Check if renewal quote exists
      const hasRenewalQuote = row.renewal_quote_id ? 'OUI' : 'NON';
      
      emailText += `${index + 1}. Client: ${row.client_name}\n`;
      emailText += `   Contrat N°: ${row.contract_number || row.id}\n`;
      emailText += `   Heures utilisées / vendues: ${row.used_hours}h / ${row.total_hours}h\n`;
      emailText += `   Progression: ${percentage.toFixed(1)}%\n`;
      
      if (overageHours > 0) {
        emailText += `   ⚠️ DÉPASSEMENT: ${overageHours.toFixed(1)}h\n`;
      } else {
        emailText += `   ⚠️ CONTRAT PLEIN (100%)\n`;
      }
      
      emailText += `   Devis de renouvellement associé: ${hasRenewalQuote}\n`;
      emailText += `\n${'-'.repeat(80)}\n\n`;
    });

    // Send email
    const transporter = nodemailer.createTransport({
      host: notificationSettings.smtp_host,
      port: notificationSettings.smtp_port,
      secure: notificationSettings.smtp_secure === 1,
      auth: {
        user: notificationSettings.smtp_user,
        pass: notificationSettings.smtp_password,
      },
    });

    await transporter.sendMail({
      from: notificationSettings.smtp_from,
      to: notificationSettings.email_to,
      subject: `📊 Alerte hebdomadaire - ${rows.length} contrat(s) à 100% ou en dépassement`,
      text: emailText,
    });

    const successMsg = `Alerte envoyée avec succès: ${rows.length} contrat(s) concerné(s)`;
    logCronJob('contract_alert', successMsg, 'success', JSON.stringify({ count: rows.length }), 'manual');
    
    res.json({ 
      success: true, 
      message: successMsg,
      count: rows.length 
    });
  } catch (error) {
    console.error('Error sending contract alert:', error);
    logCronJob('contract_alert', 'Erreur lors de l\'envoi de l\'alerte', 'error', error.message, 'manual');
    res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'alerte' });
  }
});

// Endpoint pour déclencher manuellement le backup Excel
app.post('/api/admin/trigger-backup', async (req, res) => {
  console.log('Manual Excel backup triggered from admin panel');
  logCronJob('excel_backup', 'Démarrage du backup Excel manuel', 'info');
  
  try {
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
        contractType: row.contract_type,
        signedDate: row.signed_date,
        interventions,
      };
    });

    let exportedCount = 0;

    contracts.forEach(contract => {
      const billableInterventions = contract.interventions
        .filter(i => i.isBillable !== false)
        .map(intervention => ({
          Date: new Date(intervention.date).toLocaleDateString('fr-FR'),
          Description: intervention.description,
          Technicien: intervention.technician,
          Heures: intervention.hoursUsed,
          Localisation: intervention.location || 'Non spécifié'
        }));

      const nonBillableInterventions = contract.interventions
        .filter(i => i.isBillable === false)
        .map(intervention => ({
          Date: new Date(intervention.date).toLocaleDateString('fr-FR'),
          Description: intervention.description,
          Technicien: intervention.technician,
          Minutes: Math.round(intervention.hoursUsed * 60),
          Localisation: intervention.location || 'Non spécifié'
        }));

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

      const wb = XLSX.utils.book_new();
      const summaryWs = XLSX.utils.aoa_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé');

      if (billableInterventions.length > 0) {
        const billableWs = XLSX.utils.json_to_sheet(billableInterventions);
        XLSX.utils.book_append_sheet(wb, billableWs, 'Interventions comptées');
      }

      if (nonBillableInterventions.length > 0) {
        const nonBillableWs = XLSX.utils.json_to_sheet(nonBillableInterventions);
        XLSX.utils.book_append_sheet(wb, nonBillableWs, 'Interventions non comptées');
      }

      // Créer le dossier client si nécessaire
      const clientFolderName = contract.clientName.replace(/[\/\\?%*:|"<>]/g, '-');
      const clientFolderPath = path.join(backupDir, clientFolderName);
      
      if (!fs.existsSync(clientFolderPath)) {
        fs.mkdirSync(clientFolderPath, { recursive: true });
      }

      // Supprimer tous les fichiers existants pour ce contrat (même client + même heures)
      const existingFiles = fs.readdirSync(clientFolderPath);
      const contractFilePattern = `${clientFolderName}_${contract.totalHours}h_`;
      existingFiles.forEach(file => {
        if (file.includes(contractFilePattern)) {
          const oldFilePath = path.join(clientFolderPath, file);
          try {
            fs.unlinkSync(oldFilePath);
          } catch (err) {
            console.error(`Error deleting old file ${file}:`, err);
          }
        }
      });

      // Déterminer le statut pour le nom du fichier
      let statusPrefix = 'actif';
      if (contract.isArchived) {
        statusPrefix = 'archive';
      } else if (contract.contractType === 'quote') {
        statusPrefix = 'devis';
      }

      // Formater la date de signature
      const signedDateStr = contract.signedDate 
        ? new Date(contract.signedDate).toLocaleDateString('fr-FR').replace(/\//g, '-')
        : 'non-signe';

      const fileName = `[${statusPrefix}]${clientFolderName}_${contract.totalHours}h_${signedDateStr}.xlsx`;
      const filePath = path.join(clientFolderPath, fileName);
      XLSX.writeFile(wb, filePath);
      exportedCount++;
    });

    const message = `Backup manuel terminé: ${exportedCount} contrats exportés`;
    console.log(message);
    logCronJob('excel_backup', message, 'success', null, 'manual');
    
    res.json({ 
      success: true,
      message,
      count: exportedCount,
      path: backupDir
    });
  } catch (error) {
    console.error('Error during manual backup:', error);
    logCronJob('excel_backup', `Erreur lors du backup manuel: ${error.message}`, 'error', null, 'manual');
    res.status(500).json({ error: 'Erreur lors du backup Excel' });
  }
});

// Endpoint pour déclencher manuellement la sync ARX
app.post('/api/admin/trigger-arx-sync', async (req, res) => {
  console.log('Manual ARX sync triggered from admin panel');
  logCronJob('arx_sync', 'Démarrage de la synchronisation manuelle ARX', 'info', null, 'manual');
  
  try {
    const accounts = db.prepare('SELECT * FROM arx_accounts').all();
    const arxApiKey = process.env.ARX_API_KEY;
    
    if (!arxApiKey) {
      console.error('ARX_API_KEY not configured');
      logCronJob('arx_sync', 'ARX_API_KEY non configurée', 'error', null, 'manual');
      return res.status(500).json({ error: 'ARX_API_KEY not configured' });
    }
    
    let successCount = 0;
    let errorCount = 0;
    const apiCallDetails = [];
    
    for (const account of accounts) {
      try {
        console.log(`Syncing ARX account: ${account.account_name}`);
        const accountDetail = {
          accountName: account.account_name,
          status: 'success',
          apiCalls: []
        };
        
        // Call 1: supervision/events
        const supervisionUrl = `https://api.arx.one/s9/${account.account_name}/supervision/events?hierarchy=Self`;
        accountDetail.apiCalls.push({ url: supervisionUrl, type: 'supervision' });
        
        const arxResponse = await fetch(supervisionUrl, {
          headers: {
            'Authorization': `Bearer ${arxApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!arxResponse.ok) {
          console.error(`ARX API error for ${account.account_name}: ${arxResponse.status}`);
          accountDetail.status = 'error';
          accountDetail.error = `HTTP ${arxResponse.status}`;
          apiCallDetails.push(accountDetail);
          errorCount++;
          continue;
        }

        const arxData = await arxResponse.json();
        
        if (!arxData || arxData.length === 0) {
          console.error(`No data for ${account.account_name}`);
          accountDetail.status = 'error';
          accountDetail.error = 'Aucune donnée retournée';
          apiCallDetails.push(accountDetail);
          errorCount++;
          continue;
        }

        const accountData = arxData[0];

        // Determine status
        let status = 'ok';
        if (accountData.Events && accountData.Events.length > 0) {
          const hasCritical = accountData.Events.some(
            (event) => event.Priority === 'Critical'
          );
          if (hasCritical) {
            status = 'attention_requise';
          }
        }

        // Convert bytes to GB
        const usedSpaceGb = accountData.Quota?.UsedSpace ? accountData.Quota.UsedSpace / 1000000000 : null;
        const allowedSpaceGb = accountData.Quota?.AllowedSpace ? accountData.Quota.AllowedSpace / 1000000000 : null;

        // Fetch analyzed size data using last backup date
        let analyzedSizeGb = null;
        if (accountData.LastBackupStartTime) {
          try {
            const lastBackupDate = new Date(accountData.LastBackupStartTime);
            const formattedDate = lastBackupDate.toISOString().split('T')[0];
            
            console.log(`Fetching analyzed size for ${account.account_name} since ${formattedDate}`);
            const dataUrl = `https://api.arx.one/s9/${account.account_name}/data?eventID=2.1.1.3.1&minimumTime=${formattedDate}&kind=Default&skip=0&includeDescendants=false`;
            accountDetail.apiCalls.push({ url: dataUrl, type: 'analyzed-size' });
            
            const dataResponse = await fetch(dataUrl, {
              headers: {
                'Authorization': `Bearer ${arxApiKey}`,
                'Content-Type': 'application/json',
              },
            });

            if (dataResponse.ok) {
              const dataEvents = await dataResponse.json();
              if (dataEvents && dataEvents.length > 0 && dataEvents[0].LiteralValues['analyzed-size']) {
                const analyzedSizeStr = dataEvents[0].LiteralValues['analyzed-size'];
                const analyzedSizeBytes = parseInt(analyzedSizeStr.replace(' B', ''));
                analyzedSizeGb = analyzedSizeBytes / 1000000000;
                console.log(`Analyzed size: ${analyzedSizeGb} GB`);
              }
            }
          } catch (error) {
            console.error(`Error fetching analyzed size for ${account.account_name}:`, error);
          }
        }

        // Update database with analyzed_size_gb
        db.prepare(`
          UPDATE arx_accounts 
          SET status = ?, last_backup_date = ?, used_space_gb = ?, allowed_space_gb = ?, analyzed_size_gb = ?, last_updated = datetime('now')
          WHERE id = ?
        `).run(status, accountData.LastBackupStartTime, usedSpaceGb, allowedSpaceGb, analyzedSizeGb, account.id);

        // Insert into history using last_backup_date as recorded_at
        if (accountData.LastBackupStartTime) {
          const backupDate = new Date(accountData.LastBackupStartTime).toISOString().split('T')[0];
          const existingEntry = db.prepare(`
            SELECT id FROM arx_account_history 
            WHERE account_id = ? AND DATE(recorded_at) = ?
          `).get(account.id, backupDate);

          if (existingEntry) {
            db.prepare(`
              UPDATE arx_account_history 
              SET status = ?, last_backup_date = ?, used_space_gb = ?, allowed_space_gb = ?, analyzed_size_gb = ?
              WHERE id = ?
            `).run(status, accountData.LastBackupStartTime, usedSpaceGb, allowedSpaceGb, analyzedSizeGb, existingEntry.id);
          } else {
            db.prepare(`
              INSERT INTO arx_account_history (id, account_id, recorded_at, status, last_backup_date, used_space_gb, allowed_space_gb, analyzed_size_gb)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(randomUUID(), account.id, accountData.LastBackupStartTime, status, accountData.LastBackupStartTime, usedSpaceGb, allowedSpaceGb, analyzedSizeGb);
          }
        }

        // Clean history older than 40 days
        db.prepare(`
          DELETE FROM arx_account_history 
          WHERE account_id = ? AND recorded_at < datetime('now', '-40 days')
        `).run(account.id);

        accountDetail.data = {
          status,
          usedSpaceGb: usedSpaceGb?.toFixed(2),
          allowedSpaceGb: allowedSpaceGb?.toFixed(2),
          analyzedSizeGb: analyzedSizeGb?.toFixed(2),
          lastBackupDate: accountData.LastBackupStartTime
        };
        apiCallDetails.push(accountDetail);

        console.log(`Successfully synced ARX account: ${account.account_name}`);
        successCount++;
      } catch (error) {
        console.error(`Error syncing ARX account ${account.account_name}:`, error);
        apiCallDetails.push({
          accountName: account.account_name,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }
    
    const message = `Synchronisation terminée: ${successCount} succès, ${errorCount} erreurs`;
    logCronJob('arx_sync', message, errorCount > 0 ? 'error' : 'success', apiCallDetails, 'manual');
    
    res.json({ 
      success: true,
      message,
      successCount,
      errorCount
    });
  } catch (error) {
    console.error('Error during manual ARX sync:', error);
    logCronJob('arx_sync', `Erreur: ${error.message}`, 'error', null, 'manual');
    res.status(500).json({ error: 'Erreur lors de la synchronisation ARX' });
  }
});

// Tâche planifiée hebdomadaire pour l'alerte des contrats (chaque lundi à 9h00)
cron.schedule('0 9 * * 1', async () => {
  console.log('Starting weekly contract alert on Monday at 9:00...');
  logCronJob('contract_alert', 'Démarrage de l\'alerte hebdomadaire des contrats', 'info');
  
  try {
    // Get notification settings
    const notificationSettings = db.prepare('SELECT * FROM notification_settings LIMIT 1').get();
    
    if (!notificationSettings) {
      const errorMsg = 'Aucun paramètre de notification configuré';
      logCronJob('contract_alert', errorMsg, 'error');
      return;
    }

    // Get all active contracts at 100% or more
    const query = `
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
      WHERE c.is_archived = 0 
        AND c.contract_type != 'quote'
        AND (c.used_hours * 1.0 / c.total_hours) >= 1.0
      GROUP BY c.id
      ORDER BY c.client_name ASC
    `;

    const rows = db.prepare(query).all();
    
    if (rows.length === 0) {
      const successMsg = 'Aucun contrat à 100% ou en dépassement';
      logCronJob('contract_alert', successMsg, 'success');
      return;
    }

    // Build email text content
    let emailText = `Alerte hebdomadaire - Contrats à 100% ou en dépassement\n`;
    emailText += `Date: ${new Date().toLocaleDateString('fr-FR')}\n`;
    emailText += `Nombre de contrats concernés: ${rows.length}\n\n`;
    emailText += `${'='.repeat(80)}\n\n`;

    rows.forEach((row, index) => {
      const percentage = (row.used_hours / row.total_hours) * 100;
      const overageHours = row.used_hours - row.total_hours;
      
      // Check if renewal quote exists
      const hasRenewalQuote = row.renewal_quote_id ? 'OUI' : 'NON';
      
      emailText += `${index + 1}. Client: ${row.client_name}\n`;
      emailText += `   Contrat N°: ${row.contract_number || row.id}\n`;
      emailText += `   Heures utilisées / vendues: ${row.used_hours}h / ${row.total_hours}h\n`;
      emailText += `   Progression: ${percentage.toFixed(1)}%\n`;
      
      if (overageHours > 0) {
        emailText += `   ⚠️ DÉPASSEMENT: ${overageHours.toFixed(1)}h\n`;
      } else {
        emailText += `   ⚠️ CONTRAT PLEIN (100%)\n`;
      }
      
      emailText += `   Devis de renouvellement associé: ${hasRenewalQuote}\n`;
      emailText += `\n${'-'.repeat(80)}\n\n`;
    });

    // Send email
    const transporter = nodemailer.createTransport({
      host: notificationSettings.smtp_host,
      port: notificationSettings.smtp_port,
      secure: notificationSettings.smtp_secure === 1,
      auth: {
        user: notificationSettings.smtp_user,
        pass: notificationSettings.smtp_password,
      },
    });

    await transporter.sendMail({
      from: notificationSettings.smtp_from,
      to: notificationSettings.email_to,
      subject: `📊 Alerte hebdomadaire - ${rows.length} contrat(s) à 100% ou en dépassement`,
      text: emailText,
    });

    const successMsg = `Alerte envoyée avec succès: ${rows.length} contrat(s) concerné(s)`;
    logCronJob('contract_alert', successMsg, 'success', JSON.stringify({ count: rows.length }));
  } catch (error) {
    console.error('Error in weekly contract alert:', error);
    logCronJob('contract_alert', 'Erreur lors de l\'envoi de l\'alerte', 'error', error.message);
  }
});

// Cron job pour l'export quotidien à 18h
cron.schedule('0 18 * * *', () => {
  console.log('Starting daily Excel backup at 18:00...');
  logCronJob('excel_backup', 'Démarrage du backup Excel quotidien', 'info');
  try {
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
        contractType: row.contract_type,
        signedDate: row.signed_date,
        interventions,
      };
    });

    let exportedCount = 0;

    contracts.forEach(contract => {
      const billableInterventions = contract.interventions
        .filter(i => i.isBillable !== false)
        .map(intervention => ({
          Date: new Date(intervention.date).toLocaleDateString('fr-FR'),
          Description: intervention.description,
          Technicien: intervention.technician,
          Heures: intervention.hoursUsed,
          Localisation: intervention.location || 'Non spécifié'
        }));

      const nonBillableInterventions = contract.interventions
        .filter(i => i.isBillable === false)
        .map(intervention => ({
          Date: new Date(intervention.date).toLocaleDateString('fr-FR'),
          Description: intervention.description,
          Technicien: intervention.technician,
          Minutes: Math.round(intervention.hoursUsed * 60),
          Localisation: intervention.location || 'Non spécifié'
        }));

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

      const wb = XLSX.utils.book_new();
      const summaryWs = XLSX.utils.aoa_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Résumé');

      if (billableInterventions.length > 0) {
        const billableWs = XLSX.utils.json_to_sheet(billableInterventions);
        XLSX.utils.book_append_sheet(wb, billableWs, 'Interventions comptées');
      }

      if (nonBillableInterventions.length > 0) {
        const nonBillableWs = XLSX.utils.json_to_sheet(nonBillableInterventions);
        XLSX.utils.book_append_sheet(wb, nonBillableWs, 'Interventions non comptées');
      }

      // Créer le dossier client si nécessaire
      const clientFolderName = contract.clientName.replace(/[\/\\?%*:|"<>]/g, '-');
      const clientFolderPath = path.join(backupDir, clientFolderName);
      
      if (!fs.existsSync(clientFolderPath)) {
        fs.mkdirSync(clientFolderPath, { recursive: true });
      }

      // Supprimer tous les fichiers existants pour ce contrat (même client + même heures)
      const existingFiles = fs.readdirSync(clientFolderPath);
      const contractFilePattern = `${clientFolderName}_${contract.totalHours}h_`;
      existingFiles.forEach(file => {
        if (file.includes(contractFilePattern)) {
          const oldFilePath = path.join(clientFolderPath, file);
          try {
            fs.unlinkSync(oldFilePath);
          } catch (err) {
            console.error(`Error deleting old file ${file}:`, err);
          }
        }
      });

      // Déterminer le statut pour le nom du fichier
      let statusPrefix = 'actif';
      if (contract.isArchived) {
        statusPrefix = 'archive';
      } else if (contract.contractType === 'quote') {
        statusPrefix = 'devis';
      }

      // Formater la date de signature
      const signedDateStr = contract.signedDate 
        ? new Date(contract.signedDate).toLocaleDateString('fr-FR').replace(/\//g, '-')
        : 'non-signe';

      const fileName = `[${statusPrefix}]${clientFolderName}_${contract.totalHours}h_${signedDateStr}.xlsx`;
      const filePath = path.join(clientFolderPath, fileName);
      XLSX.writeFile(wb, filePath);
      exportedCount++;
    });

    console.log(`Daily backup completed: ${exportedCount} contracts exported to ${backupDir}`);
    logCronJob('excel_backup', `Backup terminé avec succès: ${exportedCount} contrats exportés`, 'success');
  } catch (error) {
    console.error('Error during daily backup:', error);
    logCronJob('excel_backup', `Erreur lors du backup: ${error.message}`, 'error');
  }
});

// Planifier la synchronisation des comptes ARX à 8h30
cron.schedule('30 8 * * *', async () => {
  console.log('Starting daily ARX accounts sync at 8:30...');
  logCronJob('arx_sync', 'Démarrage de la synchronisation ARX automatique', 'info');
  
  try {
    const accounts = db.prepare('SELECT * FROM arx_accounts').all();
    const arxApiKey = process.env.ARX_API_KEY;
    
    if (!arxApiKey) {
      console.error('ARX_API_KEY not configured, skipping sync');
      logCronJob('arx_sync', 'ARX_API_KEY non configurée', 'error');
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    const apiCallDetails = [];
    
    for (const account of accounts) {
      try {
        console.log(`Syncing ARX account: ${account.account_name}`);
        const accountDetail = {
          accountName: account.account_name,
          status: 'success',
          apiCalls: []
        };
        
        // Call 1: supervision/events
        const supervisionUrl = `https://api.arx.one/s9/${account.account_name}/supervision/events?hierarchy=Self`;
        accountDetail.apiCalls.push({ url: supervisionUrl, type: 'supervision' });
        
        const arxResponse = await fetch(
          supervisionUrl,
          {
            headers: {
              'Authorization': `Bearer ${arxApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!arxResponse.ok) {
          console.error(`ARX API error for ${account.account_name}: ${arxResponse.status}`);
          accountDetail.status = 'error';
          accountDetail.error = `HTTP ${arxResponse.status}`;
          apiCallDetails.push(accountDetail);
          errorCount++;
          continue;
        }

        const arxData = await arxResponse.json();
        
        if (!arxData || arxData.length === 0) {
          console.error(`No data for ${account.account_name}`);
          accountDetail.status = 'error';
          accountDetail.error = 'Aucune donnée retournée';
          apiCallDetails.push(accountDetail);
          errorCount++;
          continue;
        }

        const accountData = arxData[0];

        // Determine status - UTILISER LA STRUCTURE QUI FONCTIONNE (majuscules)
        let status = 'ok';
        if (accountData.Events && accountData.Events.length > 0) {
          const hasCritical = accountData.Events.some(
            (event) => event.Priority === 'Critical'
          );
          if (hasCritical) {
            status = 'attention_requise';
          }
        }

        // Convert bytes to GB - UTILISER LA STRUCTURE QUI FONCTIONNE
        const usedSpaceGb = accountData.Quota?.UsedSpace ? accountData.Quota.UsedSpace / 1000000000 : null;
        const allowedSpaceGb = accountData.Quota?.AllowedSpace ? accountData.Quota.AllowedSpace / 1000000000 : null;

        // Fetch analyzed size data using latest endpoint
        let analyzedSizeGb = null;
        if (accountData.LastBackupStartTime) {
          try {
            console.log(`Fetching analyzed size for ${account.account_name} using latest endpoint`);
            const dataUrl = `https://api.arx.one/s9/${account.account_name}/data/latest?eventID=2.1.1.3.1&skip=0&includeDescendants=false&includeFullInformation=false`;
            accountDetail.apiCalls.push({ url: dataUrl, type: 'analyzed-size' });
            
            const dataResponse = await fetch(dataUrl, {
              headers: {
                'Authorization': `Bearer ${arxApiKey}`,
                'Content-Type': 'application/json',
              },
            });

            if (dataResponse.ok) {
              const dataEvents = await dataResponse.json();
              const analyzedSizeStr = dataEvents?.[0]?.LiteralValues?.['analyzed-size'];
              if (analyzedSizeStr) {
                const analyzedSizeBytes = parseInt(String(analyzedSizeStr).replace(/[^\d]/g, ''), 10);
                if (!Number.isNaN(analyzedSizeBytes)) {
                  analyzedSizeGb = analyzedSizeBytes / 1000000000;
                  console.log(`Analyzed size: ${analyzedSizeGb} GB`);
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching analyzed size for ${account.account_name}:`, error);
          }
        }

        // Update database with analyzed_size_gb
        db.prepare(`
          UPDATE arx_accounts 
          SET status = ?, last_backup_date = ?, used_space_gb = ?, allowed_space_gb = ?, analyzed_size_gb = ?, last_updated = datetime('now')
          WHERE id = ?
        `).run(status, accountData.LastBackupStartTime, usedSpaceGb, allowedSpaceGb, analyzedSizeGb, account.id);

        // Insert into history using last_backup_date as recorded_at
        if (accountData.LastBackupStartTime) {
          const backupDate = new Date(accountData.LastBackupStartTime).toISOString().split('T')[0];
          const existingEntry = db.prepare(`
            SELECT id FROM arx_account_history 
            WHERE account_id = ? AND DATE(recorded_at) = ?
          `).get(account.id, backupDate);

          if (existingEntry) {
            db.prepare(`
              UPDATE arx_account_history 
              SET status = ?, last_backup_date = ?, used_space_gb = ?, allowed_space_gb = ?, analyzed_size_gb = ?
              WHERE id = ?
            `).run(status, accountData.LastBackupStartTime, usedSpaceGb, allowedSpaceGb, analyzedSizeGb, existingEntry.id);
          } else {
            db.prepare(`
              INSERT INTO arx_account_history (id, account_id, recorded_at, status, last_backup_date, used_space_gb, allowed_space_gb, analyzed_size_gb)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(randomUUID(), account.id, accountData.LastBackupStartTime, status, accountData.LastBackupStartTime, usedSpaceGb, allowedSpaceGb, analyzedSizeGb);
          }
        }

        // Delete entries older than 40 days
        db.prepare(`
          DELETE FROM arx_account_history
          WHERE account_id = ? AND recorded_at < datetime('now', '-40 days')
        `).run(account.id);

        accountDetail.data = {
          status,
          usedSpaceGb: usedSpaceGb?.toFixed(2),
          allowedSpaceGb: allowedSpaceGb?.toFixed(2),
          analyzedSizeGb: analyzedSizeGb?.toFixed(2),
          lastBackupDate: accountData.LastBackupStartTime
        };
        apiCallDetails.push(accountDetail);

        console.log(`Successfully synced ARX account: ${account.account_name}`);
        successCount++;
      } catch (error) {
        console.error(`Error syncing ARX account ${account.account_name}:`, error);
        apiCallDetails.push({
          accountName: account.account_name,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }
    
    const message = `Synchronisation automatique terminée: ${successCount} succès, ${errorCount} erreurs sur ${accounts.length} comptes`;
    console.log(message);
    logCronJob('arx_sync', message, errorCount > 0 ? 'error' : 'success', apiCallDetails);
  } catch (error) {
    console.error('Error during daily ARX sync:', error);
    logCronJob('arx_sync', `Erreur lors de la synchronisation: ${error.message}`, 'error');
  }
});

// Routes pour les éléments de facturation
app.get('/api/billing-items', (req, res) => {
  try {
    const items = db.prepare(`
      SELECT * FROM billing_items 
      ORDER BY is_processed ASC, created_at DESC
    `).all();
    
    res.json(items.map(item => ({
      id: item.id,
      clientName: item.client_name,
      description: item.description,
      technician: item.technician,
      isProcessed: item.is_processed === 1,
      createdAt: item.created_at,
    })));
  } catch (error) {
    console.error('Error fetching billing items:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des éléments de facturation' });
  }
});

app.get('/api/billing-items/client/:clientName', (req, res) => {
  try {
    const { clientName } = req.params;
    const items = db.prepare(`
      SELECT * FROM billing_items 
      WHERE client_name = ?
      ORDER BY is_processed ASC, created_at DESC
    `).all(clientName);
    
    res.json(items.map(item => ({
      id: item.id,
      clientName: item.client_name,
      description: item.description,
      technician: item.technician,
      isProcessed: item.is_processed === 1,
      createdAt: item.created_at,
    })));
  } catch (error) {
    console.error('Error fetching client billing items:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des éléments de facturation' });
  }
});

app.post('/api/billing-items', (req, res) => {
  try {
    const { clientName, description, technician } = req.body;
    
    if (!clientName || !description || !technician) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const id = randomUUID();
    
    db.prepare(`
      INSERT INTO billing_items (id, client_name, description, technician)
      VALUES (?, ?, ?, ?)
    `).run(id, clientName, description, technician);

    res.json({ 
      success: true,
      id,
      clientName,
      description,
      technician,
      isProcessed: false,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error creating billing item:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'élément de facturation' });
  }
});

app.patch('/api/billing-items/:id/process', (req, res) => {
  try {
    const { id } = req.params;
    
    db.prepare(`
      UPDATE billing_items 
      SET is_processed = 1 
      WHERE id = ?
    `).run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking billing item as processed:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
});

// Routes pour la configuration des notifications
app.get('/api/notification-settings', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM notification_settings LIMIT 1').get();
    
    if (!settings) {
      return res.json(null);
    }
    
    res.json({
      id: settings.id,
      smtp_host: settings.smtp_host,
      smtp_port: settings.smtp_port,
      smtp_user: settings.smtp_user,
      smtp_password: settings.smtp_password,
      smtp_secure: settings.smtp_secure === 1,
      smtp_from: settings.smtp_from,
      email_to: settings.email_to,
      triggers: JSON.parse(settings.triggers),
      created_at: settings.created_at,
      updated_at: settings.updated_at
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des paramètres' });
  }
});

app.post('/api/notification-settings', (req, res) => {
  try {
    const { smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure, smtp_from, email_to, triggers } = req.body;
    
    const existing = db.prepare('SELECT id FROM notification_settings LIMIT 1').get();
    
    if (existing) {
      db.prepare(`
        UPDATE notification_settings 
        SET smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_password = ?, smtp_secure = ?, 
            smtp_from = ?, email_to = ?, triggers = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure ? 1 : 0, smtp_from, email_to, JSON.stringify(triggers), existing.id);
    } else {
      const id = randomUUID();
      db.prepare(`
        INSERT INTO notification_settings (id, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure, smtp_from, email_to, triggers)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure ? 1 : 0, smtp_from, email_to, JSON.stringify(triggers));
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving notification settings:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde des paramètres' });
  }
});

app.post('/api/notification-settings/test', async (req, res) => {
  try {
    const { smtp, to } = req.body;
    
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.password
      }
    });
    
    await transporter.sendMail({
      from: smtp.from,
      to: to,
      subject: '[Test] Configuration email',
      text: 'Ceci est un email de test. Si vous recevez ce message, la configuration SMTP est correcte.'
    });
    
    res.json({ success: true, message: 'Email de test envoyé avec succès' });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send PDF by email (manual send)
app.post('/api/contracts/:id/send-pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const { to, includeNonBillable } = req.body;
    
    const notificationSettings = db.prepare('SELECT * FROM notification_settings ORDER BY created_at DESC LIMIT 1').get();
    
    if (!notificationSettings) {
      return res.status(400).json({ error: 'Configuration email non trouvée' });
    }

    if (!to) {
      return res.status(400).json({ error: 'Email destinataire requis' });
    }

    const { pdfBase64 } = req.body;
    
    if (!pdfBase64) {
      return res.status(400).json({ error: 'PDF requis' });
    }
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: notificationSettings.smtp_host,
      port: notificationSettings.smtp_port,
      secure: notificationSettings.smtp_secure === 1,
      auth: {
        user: notificationSettings.smtp_user,
        pass: notificationSettings.smtp_password,
      },
    });

    // Get contract info for email
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id);

    if (!contract) {
      return res.status(404).json({ error: 'Contrat non trouvé' });
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Send email
    await transporter.sendMail({
      from: notificationSettings.smtp_from,
      to: to,
      subject: `Rapport de contrat ${contract.contract_number} - ${contract.client_name}`,
      html: `
        <h2>Rapport de contrat</h2>
        <p>Veuillez trouver ci-joint le rapport du contrat <strong>${contract.contract_number}</strong> pour <strong>${contract.client_name}</strong>.</p>
        <ul>
          <li>Total d'heures: <strong>${contract.total_hours}h</strong></li>
          <li>Heures utilisées: <strong>${contract.used_hours}h</strong></li>
          <li>Heures restantes: <strong>${Math.max(0, contract.total_hours - contract.used_hours)}h</strong></li>
        </ul>
      `,
      attachments: [{
        filename: `Contrat_${contract.contract_number}_${contract.client_name.replace(/[^a-z0-9]/gi, '_')}.pdf`,
        content: pdfBuffer
      }]
    });

    // Log manual send
    logCronJob('notification', `Email envoyé manuellement: contrat ${contract.contract_number}`, 'success', {
      contractId: id,
      contractNumber: contract.contract_number,
      clientName: contract.client_name,
      to: to
    }, 'manual');

    res.json({ success: true, message: 'Email envoyé avec succès' });
  } catch (error) {
    console.error('Error sending PDF by email:', error);
    logCronJob('notification', `Échec envoi email manuel`, 'error', { error: error.message }, 'manual');
    res.status(500).json({ error: error.message });
  }
});

// Routes pour les projets
app.get('/api/projects', (req, res) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    
    let query = `
      SELECT p.*, c.name as client_name,
        GROUP_CONCAT(
          json_object(
            'id', n.id,
            'note', n.note,
            'created_at', n.created_at
          )
        ) as notes_json
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN project_notes n ON p.id = n.project_id
    `;

    if (!includeArchived) {
      query += " WHERE p.is_archived = 0";
    }

    query += " GROUP BY p.id ORDER BY p.created_at DESC";

    const rows = db.prepare(query).all();

    const projects = rows.map(row => {
      let notes = [];
      
      if (row.notes_json) {
        try {
          const parsed = JSON.parse(`[${row.notes_json}]`);
          notes = parsed
            .filter(n => n.id !== null)
            .map(n => ({
              id: n.id,
              note: n.note,
              createdAt: n.created_at,
            }));
        } catch (e) {
          console.error("Error parsing project notes:", e);
        }
      }

      return {
        id: row.id,
        clientId: row.client_id,
        clientName: row.client_name,
        projectType: row.project_type,
        status: row.status,
        title: row.title,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isArchived: row.is_archived === 1,
        archivedAt: row.archived_at,
        notes,
        mailinblackFields: row.mailinblack_fields ? JSON.parse(row.mailinblack_fields) : undefined,
        esetFields: row.eset_fields ? JSON.parse(row.eset_fields) : undefined,
        serverFields: row.server_fields ? JSON.parse(row.server_fields) : undefined,
        auditFields: row.audit_fields ? JSON.parse(row.audit_fields) : undefined,
        firewallFields: row.firewall_fields ? JSON.parse(row.firewall_fields) : undefined,
        mailFields: row.mail_fields ? JSON.parse(row.mail_fields) : undefined,
        customFields: row.custom_fields ? JSON.parse(row.custom_fields) : undefined,
      };
    });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des projets' });
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const row = db.prepare(`
      SELECT p.*, c.name as client_name,
        GROUP_CONCAT(
          json_object(
            'id', n.id,
            'note', n.note,
            'created_at', n.created_at
          )
        ) as notes_json
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN project_notes n ON p.id = n.project_id
      WHERE p.id = ?
      GROUP BY p.id
    `).get(id);

    if (!row) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    let notes = [];
    
    if (row.notes_json) {
      try {
        const parsed = JSON.parse(`[${row.notes_json}]`);
        notes = parsed
          .filter(n => n.id !== null)
          .map(n => ({
            id: n.id,
            note: n.note,
            createdAt: n.created_at,
          }));
      } catch (e) {
        console.error("Error parsing project notes:", e);
      }
    }

    const project = {
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      projectType: row.project_type,
      status: row.status,
      title: row.title,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isArchived: row.is_archived === 1,
      archivedAt: row.archived_at,
      notes,
      mailinblackFields: row.mailinblack_fields ? JSON.parse(row.mailinblack_fields) : undefined,
      esetFields: row.eset_fields ? JSON.parse(row.eset_fields) : undefined,
      serverFields: row.server_fields ? JSON.parse(row.server_fields) : undefined,
      auditFields: row.audit_fields ? JSON.parse(row.audit_fields) : undefined,
      firewallFields: row.firewall_fields ? JSON.parse(row.firewall_fields) : undefined,
      mailFields: row.mail_fields ? JSON.parse(row.mail_fields) : undefined,
      customFields: row.custom_fields ? JSON.parse(row.custom_fields) : undefined,
    };

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Erreur lors du chargement du projet' });
  }
});

app.post('/api/projects', (req, res) => {
  try {
    const { 
      clientId, 
      projectType, 
      status, 
      title, 
      description,
      tasks,
      mailinblackFields,
      esetFields,
      serverFields,
      auditFields,
      firewallFields,
      mailFields,
      customFields
    } = req.body;
    const id = randomUUID();
    const now = new Date().toISOString();

    // Insert project
    db.prepare(`
      INSERT INTO projects (
        id, client_id, project_type, status, title, description, 
        mailinblack_fields, eset_fields, server_fields, audit_fields, 
        firewall_fields, mail_fields, custom_fields, 
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, 
      clientId, 
      projectType, 
      status || 'à organiser', 
      title, 
      description || null,
      mailinblackFields ? JSON.stringify(mailinblackFields) : null,
      esetFields ? JSON.stringify(esetFields) : null,
      serverFields ? JSON.stringify(serverFields) : null,
      auditFields ? JSON.stringify(auditFields) : null,
      firewallFields ? JSON.stringify(firewallFields) : null,
      mailFields ? JSON.stringify(mailFields) : null,
      customFields ? JSON.stringify(customFields) : null,
      now, 
      now
    );

    // Add initial tasks if provided
    if (tasks && Array.isArray(tasks)) {
      const taskStmt = db.prepare(`
        INSERT INTO project_tasks (id, project_id, task_name, created_at)
        VALUES (?, ?, ?, ?)
      `);
      
      tasks.forEach(taskName => {
        taskStmt.run(randomUUID(), id, taskName, now);
      });
    }

    res.json({ id, clientId, projectType, status: status || 'à organiser', title, description, createdAt: now });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Erreur lors de la création du projet' });
  }
});

app.patch('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { projectType, status, title, description } = req.body;
    const now = new Date().toISOString();

    const updates = [];
    const values = [];

    if (projectType !== undefined) {
      updates.push('project_type = ?');
      values.push(projectType);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification fournie' });
    }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.prepare(`
      UPDATE projects
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du projet' });
  }
});

app.patch('/api/projects/:id/archive', (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE projects
      SET is_archived = 1, archived_at = ?
      WHERE id = ?
    `).run(now, id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error archiving project:', error);
    res.status(500).json({ error: 'Erreur lors de l\'archivage du projet' });
  }
});

app.patch('/api/projects/:id/unarchive', (req, res) => {
  try {
    const { id } = req.params;

    db.prepare(`
      UPDATE projects
      SET is_archived = 0, archived_at = NULL
      WHERE id = ?
    `).run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error unarchiving project:', error);
    res.status(500).json({ error: 'Erreur lors de la désarchivage du projet' });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;

    db.prepare('DELETE FROM projects WHERE id = ?').run(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du projet' });
  }
});

app.post('/api/projects/:id/notes', (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const noteId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO project_notes (id, project_id, note, created_at)
      VALUES (?, ?, ?, ?)
    `).run(noteId, id, note, now);

    // Update project updated_at
    db.prepare(`
      UPDATE projects SET updated_at = ? WHERE id = ?
    `).run(now, id);

    res.json({ id: noteId, projectId: id, note, createdAt: now });
  } catch (error) {
    console.error('Error adding project note:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la note' });
  }
});

app.delete('/api/project-notes/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Get project_id before deletion to update project timestamp
    const note = db.prepare('SELECT project_id FROM project_notes WHERE id = ?').get(id);
    
    if (note) {
      db.prepare('DELETE FROM project_notes WHERE id = ?').run(id);
      
      // Update project updated_at
      const now = new Date().toISOString();
      db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, note.project_id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project note:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la note' });
  }
});

// Routes pour les tâches de projet
app.get('/api/projects/:id/tasks', (req, res) => {
  try {
    const { id } = req.params;
    
    const tasks = db.prepare(`
      SELECT * FROM project_tasks 
      WHERE project_id = ? 
      ORDER BY is_completed ASC, created_at ASC
    `).all(id);

    const formattedTasks = tasks.map(task => ({
      id: task.id,
      projectId: task.project_id,
      taskName: task.task_name,
      isCompleted: task.is_completed === 1,
      completedAt: task.completed_at,
      completionDetails: task.completion_details,
      createdAt: task.created_at,
    }));

    res.json(formattedTasks);
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    res.status(500).json({ error: 'Erreur lors du chargement des tâches' });
  }
});

app.post('/api/projects/:id/tasks', (req, res) => {
  try {
    const { id } = req.params;
    const { taskName } = req.body;
    const taskId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO project_tasks (id, project_id, task_name, created_at)
      VALUES (?, ?, ?, ?)
    `).run(taskId, id, taskName, now);

    // Update project updated_at
    db.prepare(`
      UPDATE projects SET updated_at = ? WHERE id = ?
    `).run(now, id);

    res.json({ id: taskId, projectId: id, taskName, isCompleted: false, createdAt: now });
  } catch (error) {
    console.error('Error adding project task:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la tâche' });
  }
});

app.patch('/api/project-tasks/:id/complete', (req, res) => {
  try {
    const { id } = req.params;
    const { completionDetails } = req.body;
    const now = new Date().toISOString();

    // Get task and project info
    const task = db.prepare('SELECT * FROM project_tasks WHERE id = ?').get(id);
    
    if (!task) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    // Mark task as completed
    db.prepare(`
      UPDATE project_tasks
      SET is_completed = 1, completed_at = ?, completion_details = ?
      WHERE id = ?
    `).run(now, completionDetails || null, id);

    // Add note to project
    const noteId = randomUUID();
    const noteText = completionDetails 
      ? `✓ ${task.task_name}\n${completionDetails}`
      : `✓ ${task.task_name}`;
    
    db.prepare(`
      INSERT INTO project_notes (id, project_id, note, created_at)
      VALUES (?, ?, ?, ?)
    `).run(noteId, task.project_id, noteText, now);

    // Update project updated_at
    db.prepare(`
      UPDATE projects SET updated_at = ? WHERE id = ?
    `).run(now, task.project_id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Erreur lors de la complétion de la tâche' });
  }
});

app.patch('/api/project-tasks/:id/uncomplete', (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    // Get task info
    const task = db.prepare('SELECT project_id FROM project_tasks WHERE id = ?').get(id);
    
    if (!task) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    // Mark task as not completed
    db.prepare(`
      UPDATE project_tasks
      SET is_completed = 0, completed_at = NULL, completion_details = NULL
      WHERE id = ?
    `).run(id);

    // Update project updated_at
    db.prepare(`
      UPDATE projects SET updated_at = ? WHERE id = ?
    `).run(now, task.project_id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error uncompleting task:', error);
    res.status(500).json({ error: 'Erreur lors de la décomplétion de la tâche' });
  }
});

app.delete('/api/project-tasks/:id', (req, res) => {
  try {
    const { id } = req.params;

    // Get project_id before deletion
    const task = db.prepare('SELECT project_id FROM project_tasks WHERE id = ?').get(id);
    
    if (task) {
      db.prepare('DELETE FROM project_tasks WHERE id = ?').run(id);
      
      // Update project updated_at
      const now = new Date().toISOString();
      db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, task.project_id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project task:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la tâche' });
  }
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log('Scheduled tasks:');
  console.log('- Weekly contract alert: Monday at 9:00 AM (0 9 * * 1)');
  console.log('- Daily Excel backup: 18:00 (0 18 * * *)');
  console.log('- Daily ARX sync: 8:30 AM (30 8 * * *)');
});
