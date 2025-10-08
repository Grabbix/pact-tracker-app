const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = {
  async getContracts(includeArchived: boolean = false) {
    const response = await fetch(
      `${API_BASE_URL}/api/contracts?includeArchived=${includeArchived}`
    );
    if (!response.ok) throw new Error('Failed to fetch contracts');
    return response.json();
  },

  async createContract(data: { clientName: string; totalHours: number }) {
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

  async getClients(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/api/clients`);
    if (!response.ok) throw new Error('Failed to fetch clients');
    return response.json();
  },

  async updateClientName(contractId: string, clientName: string) {
    const response = await fetch(`${API_BASE_URL}/api/contracts/${contractId}/client-name`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName }),
    });
    if (!response.ok) throw new Error('Failed to update client name');
    return response.json();
  },
};
