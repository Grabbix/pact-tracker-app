export type ProjectType =
  | 'mailinblack'
  | 'mail'
  | 'serveur'
  | 'installation matériel'
  | 'audit'
  | 'eset'
  | 'pare-feu'
  | 'autre';

export type ProjectStatus =
  | 'à organiser'
  | 'calé'
  | 'en cours'
  | 'état projet';

export interface ProjectNote {
  id: string;
  projectId?: string;
  note: string;
  createdAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  taskName: string;
  isCompleted: boolean;
  completedAt?: string;
  completionDetails?: string;
  createdAt: string;
}

// Type-specific fields
export interface MailinblackFields {
  licenseType?: string;
  licenseCount?: number;
  domainUnderManagement?: boolean;
}

export interface EsetFields {
  licenseType?: string;
  licenseCount?: number;
}

export interface ServerFields {
  isReplacement?: boolean;
}

export interface AuditFields {
  isNewClient?: boolean;
}

export interface FirewallFields {
  existingFirewall?: boolean;
  firewallType?: string;
  firewallManagement?: string;
  vpnNeeded?: boolean;
}

export interface MailFields {
  isCreation?: boolean;
  addressType?: 'exchange' | '365';
  addressCount?: number;
  domains?: string;
  domainsUnderManagement?: boolean;
  mailinblackConcerned?: boolean;
}

export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface Project {
  id: string;
  clientId: string;
  clientName: string;
  projectType: ProjectType;
  status: ProjectStatus;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  archivedAt?: string;
  notes: ProjectNote[];
  tasks?: ProjectTask[];
  // Type-specific fields
  mailinblackFields?: MailinblackFields;
  esetFields?: EsetFields;
  serverFields?: ServerFields;
  auditFields?: AuditFields;
  firewallFields?: FirewallFields;
  mailFields?: MailFields;
  customFields?: CustomField[];
}

export const PROJECT_TYPES: { value: ProjectType; label: string; color: string }[] = [
  { value: 'mailinblack', label: 'Mailinblack', color: 'bg-purple-500' },
  { value: 'mail', label: 'Mail', color: 'bg-blue-500' },
  { value: 'serveur', label: 'Serveur', color: 'bg-green-500' },
  { value: 'installation matériel', label: 'Installation matériel', color: 'bg-orange-500' },
  { value: 'audit', label: 'Audit', color: 'bg-yellow-500' },
  { value: 'eset', label: 'ESET', color: 'bg-red-500' },
  { value: 'pare-feu', label: 'Pare-feu', color: 'bg-pink-500' },
  { value: 'autre', label: 'Autre', color: 'bg-gray-500' },
];

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'à organiser', label: 'À organiser' },
  { value: 'calé', label: 'Calé' },
  { value: 'en cours', label: 'En cours' },
  { value: 'état projet', label: 'État projet' },
];
