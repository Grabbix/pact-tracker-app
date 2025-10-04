import { useState, useEffect } from "react";
import { Contract, Intervention } from "@/types/contract";
import { mockContracts } from "@/data/mockContracts";

const STORAGE_KEY = "maintenance_contracts";

export const useContracts = () => {
  const [contracts, setContracts] = useState<Contract[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : mockContracts;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
  }, [contracts]);

  const addContract = (newContract: { clientName: string; totalHours: number }) => {
    const contract: Contract = {
      id: Date.now().toString(),
      clientName: newContract.clientName,
      totalHours: newContract.totalHours,
      usedHours: 0,
      createdDate: new Date().toISOString().split('T')[0],
      status: "active",
      interventions: [],
    };

    setContracts((prev) => [contract, ...prev]);
    return contract;
  };

  const addIntervention = (contractId: string, intervention: Omit<Intervention, "id">) => {
    setContracts((prev) =>
      prev.map((contract) => {
        if (contract.id === contractId) {
          const newIntervention: Intervention = {
            ...intervention,
            id: `i${Date.now()}`,
          };

          return {
            ...contract,
            usedHours: contract.usedHours + intervention.hoursUsed,
            interventions: [newIntervention, ...contract.interventions],
          };
        }
        return contract;
      })
    );
  };

  const getContract = (id: string) => {
    return contracts.find((c) => c.id === id);
  };

  return {
    contracts,
    addContract,
    addIntervention,
    getContract,
  };
};
