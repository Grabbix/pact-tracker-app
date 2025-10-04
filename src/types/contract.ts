export interface Intervention {
  id: string;
  date: string;
  description: string;
  hoursUsed: number;
  technician: string;
}

export interface Contract {
  id: string;
  clientName: string;
  totalHours: number;
  usedHours: number;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "near-expiry";
  interventions: Intervention[];
}
