import { Contract } from "@/types/contract";

export const mockContracts: Contract[] = [
  {
    id: "1",
    clientName: "Entreprise Martin SARL",
    totalHours: 50,
    usedHours: 32.5,
    createdDate: "2024-01-15",
    status: "active",
    interventions: [
      {
        id: "i1",
        date: "2024-10-01",
        description: "Maintenance serveur principal",
        hoursUsed: 4,
        technician: "Jean Dupont"
      },
      {
        id: "i2",
        date: "2024-09-15",
        description: "Mise à jour système de sécurité",
        hoursUsed: 6.5,
        technician: "Marie Laurent"
      },
      {
        id: "i3",
        date: "2024-08-20",
        description: "Installation nouvelle infrastructure",
        hoursUsed: 12,
        technician: "Jean Dupont"
      },
      {
        id: "i4",
        date: "2024-07-10",
        description: "Diagnostic réseau",
        hoursUsed: 5,
        technician: "Pierre Moreau"
      },
      {
        id: "i5",
        date: "2024-06-05",
        description: "Formation utilisateurs",
        hoursUsed: 5,
        technician: "Marie Laurent"
      }
    ]
  },
  {
    id: "2",
    clientName: "Société Durand & Fils",
    totalHours: 30,
    usedHours: 8,
    createdDate: "2024-03-01",
    status: "active",
    interventions: [
      {
        id: "i6",
        date: "2024-09-25",
        description: "Support technique urgence",
        hoursUsed: 3,
        technician: "Jean Dupont"
      },
      {
        id: "i7",
        date: "2024-08-12",
        description: "Maintenance préventive",
        hoursUsed: 5,
        technician: "Pierre Moreau"
      }
    ]
  },
  {
    id: "3",
    clientName: "Cabinet Lefebvre",
    totalHours: 40,
    usedHours: 38,
    createdDate: "2024-02-10",
    status: "near-expiry",
    interventions: [
      {
        id: "i8",
        date: "2024-10-02",
        description: "Migration données cloud",
        hoursUsed: 15,
        technician: "Marie Laurent"
      },
      {
        id: "i9",
        date: "2024-08-22",
        description: "Configuration sauvegardes",
        hoursUsed: 8,
        technician: "Jean Dupont"
      },
      {
        id: "i10",
        date: "2024-07-15",
        description: "Audit sécurité",
        hoursUsed: 10,
        technician: "Pierre Moreau"
      },
      {
        id: "i11",
        date: "2024-05-20",
        description: "Optimisation performances",
        hoursUsed: 5,
        technician: "Marie Laurent"
      }
    ]
  },
  {
    id: "4",
    clientName: "Industrie Bernard SA",
    totalHours: 100,
    usedHours: 45,
    createdDate: "2023-12-01",
    status: "active",
    interventions: [
      {
        id: "i12",
        date: "2024-09-30",
        description: "Maintenance infrastructure critique",
        hoursUsed: 12,
        technician: "Jean Dupont"
      },
      {
        id: "i13",
        date: "2024-08-28",
        description: "Déploiement nouvelle version ERP",
        hoursUsed: 20,
        technician: "Marie Laurent"
      },
      {
        id: "i14",
        date: "2024-06-15",
        description: "Formation équipe IT",
        hoursUsed: 8,
        technician: "Pierre Moreau"
      },
      {
        id: "i15",
        date: "2024-04-10",
        description: "Support migration",
        hoursUsed: 5,
        technician: "Jean Dupont"
      }
    ]
  },
  {
    id: "5",
    clientName: "Restaurant Le Gourmet",
    totalHours: 20,
    usedHours: 15,
    createdDate: "2024-05-01",
    status: "active",
    interventions: [
      {
        id: "i16",
        date: "2024-09-18",
        description: "Maintenance système caisse",
        hoursUsed: 3,
        technician: "Pierre Moreau"
      },
      {
        id: "i17",
        date: "2024-07-22",
        description: "Installation nouveau terminal",
        hoursUsed: 5,
        technician: "Marie Laurent"
      },
      {
        id: "i18",
        date: "2024-06-10",
        description: "Configuration réseau WiFi",
        hoursUsed: 4,
        technician: "Jean Dupont"
      },
      {
        id: "i19",
        date: "2024-05-15",
        description: "Formation logiciel gestion",
        hoursUsed: 3,
        technician: "Pierre Moreau"
      }
    ]
  }
];
