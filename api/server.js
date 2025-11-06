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
    
    // Compter les contrats liés
    const contractCount = db.prepare('SELECT COUNT(*) as count FROM contracts WHERE client_id = ?').get(id);
    
    // Supprimer les contrats et interventions liés
    const contracts = db.prepare('SELECT id FROM contracts WHERE client_id = ?').all(id);
    contracts.forEach(contract => {
      db.prepare('DELETE FROM interventions WHERE contract_id = ?').run(contract.id);
    });
    db.prepare('DELETE FROM contracts WHERE client_id = ?').run(id);
    
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
    
    // Fetch data from ARX API
    console.log(`Fetching ARX data for account: ${account.account_name}`);
    const arxResponse = await fetch(
      `https://api.arx.one/s9/${account.account_name}/supervision/events?hierarchy=Self`,
      {
        headers: {
          'Authorization': `Bearer ${arxApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!arxResponse.ok) {
      console.error(`ARX API error: ${arxResponse.status} ${arxResponse.statusText}`);
      return res.status(500).json({ error: 'Erreur lors de la récupération des données ARX' });
    }

    const arxData = await arxResponse.json();
    
    if (!arxData || arxData.length === 0) {
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
        const dataResponse = await fetch(
          `https://api.arx.one/s9/${account.account_name}/data?eventID=2.1.1.3.1&minimumTime=${formattedDate}&kind=Default&skip=0&includeDescendants=false`,
          {
            headers: {
              'Authorization': `Bearer ${arxApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
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
    const todayEntry = db.prepare(`
      SELECT id FROM arx_account_history
      WHERE account_id = ? AND date(recorded_at) = date('now')
    `).get(accountId);

    if (todayEntry) {
      // Update today's entry
      db.prepare(`
        UPDATE arx_account_history
        SET status = ?, last_backup_date = ?, used_space_gb = ?, allowed_space_gb = ?, analyzed_size_gb = ?, recorded_at = datetime('now')
        WHERE id = ?
      `).run(status, accountData.LastBackupStartTime, usedSpaceGb, allowedSpaceGb, analyzedSizeGb, todayEntry.id);
    } else {
      // Insert new entry for today
      db.prepare(`
        INSERT INTO arx_account_history (id, account_id, recorded_at, status, last_backup_date, used_space_gb, allowed_space_gb, analyzed_size_gb)
        VALUES (?, ?, datetime('now'), ?, ?, ?, ?, ?)
      `).run(randomUUID(), accountId, status, accountData.LastBackupStartTime, usedSpaceGb, allowedSpaceGb, analyzedSizeGb);
    }

    // Delete entries older than 40 days
    db.prepare(`
      DELETE FROM arx_account_history
      WHERE account_id = ? AND recorded_at < datetime('now', '-40 days')
    `).run(accountId);

    console.log(`Successfully updated ARX account ${account.account_name}`);
    
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
        
        // Synchroniser avec le devis de renouvellement si existe
        syncOverageToRenewalQuote(contractId);
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

// Endpoint pour déclencher manuellement la sync ARX
app.post('/api/admin/trigger-arx-sync', async (req, res) => {
  console.log('Manual ARX sync triggered from admin panel');
  try {
    const accounts = db.prepare('SELECT * FROM arx_accounts').all();
    const arxApiKey = process.env.ARX_API_KEY;
    
    if (!arxApiKey) {
      console.error('ARX_API_KEY not configured');
      return res.status(500).json({ error: 'ARX_API_KEY not configured' });
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const account of accounts) {
      try {
        console.log(`Syncing ARX account: ${account.account_name}`);
        
        const arxResponse = await fetch(
          `https://api.arx.one/s9/${account.account_name}/supervision/events?hierarchy=Self`,
          {
            headers: {
              'Authorization': `Bearer ${arxApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!arxResponse.ok) {
          console.error(`ARX API error for ${account.account_name}: ${arxResponse.status}`);
          errorCount++;
          continue;
        }

        const arxData = await arxResponse.json();
        
        if (!arxData || arxData.length === 0) {
          console.error(`No data for ${account.account_name}`);
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

        // Update database
        db.prepare(`
          UPDATE arx_accounts 
          SET status = ?, last_backup_date = ?, used_space_gb = ?, allowed_space_gb = ?, last_updated = datetime('now')
          WHERE id = ?
        `).run(status, accountData.LastBackupStartTime, usedSpaceGb, allowedSpaceGb, account.id);

        console.log(`Successfully synced ARX account: ${account.account_name}`);
        successCount++;
      } catch (error) {
        console.error(`Error syncing ARX account ${account.account_name}:`, error);
        errorCount++;
      }
    }
    
    res.json({ 
      success: true,
      message: `Synchronisation terminée: ${successCount} succès, ${errorCount} erreurs`,
      successCount,
      errorCount
    });
  } catch (error) {
    console.error('Error during manual ARX sync:', error);
    res.status(500).json({ error: 'Erreur lors de la synchronisation ARX' });
  }
});

// Cron job pour l'export quotidien à 18h
cron.schedule('0 18 * * *', () => {
  console.log('Starting daily Excel backup at 18:00...');
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
  } catch (error) {
    console.error('Error during daily backup:', error);
  }
});

// Planifier la synchronisation des comptes ARX à 8h30
cron.schedule('30 8 * * *', async () => {
  console.log('Starting daily ARX accounts sync at 8:30...');
  try {
    const accounts = db.prepare('SELECT * FROM arx_accounts').all();
    const arxApiKey = process.env.ARX_API_KEY;
    
    if (!arxApiKey) {
      console.error('ARX_API_KEY not configured, skipping sync');
      return;
    }
    
    for (const account of accounts) {
      try {
        console.log(`Syncing ARX account: ${account.account_name}`);
        
        const arxResponse = await fetch(
          `https://api.arx.one/s9/${account.account_name}/supervision/events?hierarchy=Self`,
          {
            headers: {
              'Authorization': `Bearer ${arxApiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!arxResponse.ok) {
          console.error(`ARX API error for ${account.account_name}: ${arxResponse.status}`);
          continue;
        }

        const arxData = await arxResponse.json();
        
        if (!arxData || arxData.length === 0) {
          console.error(`No data for ${account.account_name}`);
          continue;
        }

        const accountData = arxData[0];

        // Determine status
        let status = 'ok';
        if (accountData.events && accountData.events.length > 0) {
          const hasCritical = accountData.events.some(
            (event) => event.entry && event.entry.priority === 'Critical'
          );
          if (hasCritical) {
            status = 'attention_requise';
          }
        }

        // Convert bytes to GB
        const usedSpaceGb = accountData.quota.usedSpace ? accountData.quota.usedSpace / 1000000000 : null;
        const allowedSpaceGb = accountData.quota.allowedSpace ? accountData.quota.allowedSpace / 1000000000 : null;

        // Fetch analyzed size data using last backup date
        let analyzedSizeGb = null;
        if (accountData.lastBackupStartTime) {
          try {
            const lastBackupDate = new Date(accountData.lastBackupStartTime);
            const formattedDate = lastBackupDate.toISOString().split('T')[0];
            
            console.log(`Fetching analyzed size for ${account.account_name} since ${formattedDate}`);
            const dataResponse = await fetch(
              `https://api.arx.one/s9/${account.account_name}/data?eventID=2.1.1.3.1&minimumTime=${formattedDate}&kind=Default&skip=0&includeDescendants=false`,
              {
                headers: {
                  'Authorization': `Bearer ${arxApiKey}`,
                  'Content-Type': 'application/json',
                },
              }
            );

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
        `).run(status, accountData.lastBackupStartTime, usedSpaceGb, allowedSpaceGb, analyzedSizeGb, account.id);

        // Insert into history (one entry per day)
        const today = new Date().toISOString().split('T')[0];
        const existingEntry = db.prepare(`
          SELECT id FROM arx_account_history 
          WHERE account_id = ? AND DATE(created_at) = ?
        `).get(account.id, today);

        if (existingEntry) {
          db.prepare(`
            UPDATE arx_account_history 
            SET status = ?, last_backup_date = ?, used_space_gb = ?, allowed_space_gb = ?, analyzed_size_gb = ?
            WHERE id = ?
          `).run(status, accountData.lastBackupStartTime, usedSpaceGb, allowedSpaceGb, analyzedSizeGb, existingEntry.id);
        } else {
          db.prepare(`
            INSERT INTO arx_account_history (account_id, status, last_backup_date, used_space_gb, allowed_space_gb, analyzed_size_gb)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(account.id, status, accountData.lastBackupStartTime, usedSpaceGb, allowedSpaceGb, analyzedSizeGb);
        }

        // Clean history older than 40 days
        db.prepare(`
          DELETE FROM arx_account_history 
          WHERE account_id = ? AND created_at < datetime('now', '-40 days')
        `).run(account.id);

        console.log(`Successfully synced ARX account: ${account.account_name}`);
      } catch (error) {
        console.error(`Error syncing ARX account ${account.account_name}:`, error);
      }
    }
    
    console.log('Daily ARX sync completed');
  } catch (error) {
    console.error('Error during daily ARX sync:', error);
  }
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log('Daily Excel backup scheduled at 18:00 (0 18 * * *)');
  console.log('Daily ARX sync scheduled at 8:30 (30 8 * * *)');
});
