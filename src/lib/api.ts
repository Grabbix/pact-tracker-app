const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = {
  async getContracts(includeArchived: boolean = false) {
    const response = await fetch(
      `${API_BASE_URL}/api/contracts?includeArchived=${includeArchived}`
    );
    if (!response.ok) throw new Error('Failed to fetch contracts');
    return response.json();
  },

  async createContract(data: { 
    clientName: string; 
    totalHours: number; 
    contractType?: "quote" | "signed"; 
    createdDate?: string;
    signedDate?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create contract');
    return response.json();
  },

  async archiveContract(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/contracts/${id}/archive`, {
      method: 'PATCH',
    });
    if (!response.ok) throw new Error('Failed to archive contract');
    return response.json();
  },

  async unarchiveContract(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/contracts/${id}/unarchive`, {
      method: 'PATCH',
    });
    if (!response.ok) throw new Error('Failed to unarchive contract');
    return response.json();
  },

  async createIntervention(data: {
    contractId: string;
    date: string;
    description: string;
    hoursUsed: number;
    technician: string;
    isBillable?: boolean;
    location?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/interventions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create intervention');
    return response.json();
  },

  async updateIntervention(
    id: string,
    data: {
      contractId: string;
      date: string;
      description: string;
      hoursUsed: number;
      technician: string;
      isBillable?: boolean;
      location?: string;
    }
  ) {
    const response = await fetch(`${API_BASE_URL}/api/interventions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update intervention');
    return response.json();
  },

  async deleteIntervention(id: string, contractId: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/interventions/${id}?contractId=${contractId}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error('Failed to delete intervention');
    return response.json();
  },

  async renewContract(id: string, totalHours: number) {
    const response = await fetch(`${API_BASE_URL}/api/contracts/${id}/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalHours }),
    });
    if (!response.ok) throw new Error('Failed to renew contract');
    return response.json();
  },

  async createRenewalQuote(id: string, totalHours: number) {
    const response = await fetch(`${API_BASE_URL}/api/contracts/${id}/renewal-quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalHours }),
    });
    if (!response.ok) throw new Error('Failed to create renewal quote');
    return response.json();
  },

  async getClients() {
    const response = await fetch(`${API_BASE_URL}/api/clients`);
    if (!response.ok) throw new Error('Failed to fetch clients');
    return response.json();
  },

  async getClientsList(): Promise<{ id: string; name: string }[]> {
    const response = await fetch(`${API_BASE_URL}/api/clients-list`);
    if (!response.ok) throw new Error('Failed to fetch clients list');
    return response.json();
  },

  async getClient(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/clients/${id}`);
    if (!response.ok) throw new Error('Failed to fetch client');
    return response.json();
  },

  async createClient(data: {
    name: string;
    address?: string;
    phoneStandard?: string;
    internalNotes?: string;
    fai?: string;
    domains?: string[];
    emailType?: string;
    mailinblack?: boolean;
    arx?: boolean;
    arxQuota?: string;
    eset?: boolean;
    esetVersion?: string;
    fortinet?: boolean;
    contacts?: { name: string; email?: string; phone?: string }[];
  }) {
    const response = await fetch(`${API_BASE_URL}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create client');
    return response.json();
  },

  async updateClient(id: string, data: {
    name: string;
    address?: string;
    phoneStandard?: string;
    internalNotes?: string;
    fai?: string;
    domains?: string[];
    emailType?: string;
    mailinblack?: boolean;
    arx?: boolean;
    arxQuota?: string;
    eset?: boolean;
    esetVersion?: string;
    fortinet?: boolean;
    contacts?: { name: string; email?: string; phone?: string }[];
  }) {
    const response = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update client');
    return response.json();
  },

  async updateContract(contractId: string, data: { 
    clientName: string; 
    createdDate?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/api/contracts/${contractId}/client-name`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update contract');
    return response.json();
  },

  async signContract(id: string) {
    const response = await fetch(`${API_BASE_URL}/api/contracts/${id}/sign`, {
      method: 'PATCH',
    });
    if (!response.ok) throw new Error('Failed to sign contract');
    return response.json();
  },

  async getTechniciansList(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/api/technicians-list`);
    if (!response.ok) throw new Error('Failed to fetch technicians list');
    return response.json();
  },
};
