export interface Intervention {
  id: string;
  date: string;
  description: string;
  hoursUsed: number;
  technician: string;
  isBillable?: boolean;
  location?: string;
}

export interface Contract {
  id: string;
  clientName: string;
  totalHours: number;
  usedHours: number;
  createdDate: string;
  status: "active" | "expired" | "near-expiry";
  interventions: Intervention[];
  isArchived?: boolean;
}
