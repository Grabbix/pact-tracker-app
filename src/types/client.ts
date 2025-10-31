export interface ContactPerson {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt?: string;
}

export interface Client {
  id: string;
  name: string;
  address?: string;
  phoneStandard?: string;
  internalNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  activeContractsCount?: number;
  archivedContractsCount?: number;
  contacts: ContactPerson[];
}
