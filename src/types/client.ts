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
  fai?: string;
  domains?: string[];
  emailType?: string;
  mailinblack?: boolean;
  arx?: boolean;
  arxQuota?: string;
  eset?: boolean;
  esetVersion?: string;
  fortinet?: boolean;
  fortinetSerialNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  activeContractsCount?: number;
  archivedContractsCount?: number;
  contacts: ContactPerson[];
}
