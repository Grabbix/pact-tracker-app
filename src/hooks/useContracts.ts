import { useState, useEffect } from "react";
import { Contract, Intervention } from "@/types/contract";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const useContracts = (includeArchived: boolean = false) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const data = await api.getContracts(includeArchived);
      setContracts(data);
    } catch (error: any) {
      console.error("Error fetching contracts:", error);
      toast.error("Erreur lors du chargement des contrats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [includeArchived]);

  const addContract = async (newContract: { clientName: string; clientId?: string; totalHours: number; contractType?: "quote" | "signed" }) => {
    try {
      const data = await api.createContract(newContract);
      toast.success(newContract.contractType === "quote" ? "Devis créé avec succès" : "Contrat créé avec succès");
      await fetchContracts();
      return data;
    } catch (error: any) {
      console.error("Error adding contract:", error);
      toast.error("Erreur lors de la création du contrat");
    }
  };

  const addIntervention = async (contractId: string, intervention: Omit<Intervention, "id">) => {
    try {
      await api.createIntervention({
        contractId,
        date: intervention.date,
        description: intervention.description,
        hoursUsed: intervention.hoursUsed,
        technician: intervention.technician,
        isBillable: intervention.isBillable,
        location: intervention.location,
      });
      toast.success("Intervention ajoutée avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error adding intervention:", error);
      toast.error("Erreur lors de l'ajout de l'intervention");
    }
  };

  const archiveContract = async (contractId: string) => {
    try {
      await api.archiveContract(contractId);
      toast.success("Contrat archivé avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error archiving contract:", error);
      toast.error("Erreur lors de l'archivage du contrat");
    }
  };

  const unarchiveContract = async (contractId: string) => {
    try {
      await api.unarchiveContract(contractId);
      toast.success("Contrat désarchivé avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error unarchiving contract:", error);
      toast.error("Erreur lors de la désarchivage du contrat");
    }
  };

  const updateIntervention = async (contractId: string, intervention: Intervention) => {
    try {
      await api.updateIntervention(intervention.id, {
        contractId,
        date: intervention.date,
        description: intervention.description,
        hoursUsed: intervention.hoursUsed,
        technician: intervention.technician,
        isBillable: intervention.isBillable,
        location: intervention.location,
      });
      toast.success("Intervention modifiée avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error updating intervention:", error);
      toast.error("Erreur lors de la modification de l'intervention");
    }
  };

  const deleteIntervention = async (contractId: string, interventionId: string) => {
    try {
      await api.deleteIntervention(interventionId, contractId);
      toast.success("Intervention supprimée avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error deleting intervention:", error);
      toast.error("Erreur lors de la suppression de l'intervention");
    }
  };

  const renewContract = async (contractId: string, totalHours: number) => {
    try {
      await api.renewContract(contractId, totalHours);
      toast.success("Contrat renouvelé avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error renewing contract:", error);
      toast.error("Erreur lors du renouvellement du contrat");
    }
  };

  const createRenewalQuote = async (contractId: string, totalHours: number) => {
    try {
      const data = await api.createRenewalQuote(contractId, totalHours);
      toast.success("Devis de renouvellement créé avec succès");
      await fetchContracts();
      return data;
    } catch (error: any) {
      console.error("Error creating renewal quote:", error);
      toast.error("Erreur lors de la création du devis de renouvellement");
    }
  };

  const updateClientName = async (contractId: string, clientName: string) => {
    try {
      await api.updateClientName(contractId, clientName);
      toast.success("Nom du client modifié avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error updating client name:", error);
      toast.error("Erreur lors de la modification du nom");
    }
  };

  const signContract = async (contractId: string) => {
    try {
      await api.signContract(contractId);
      toast.success("Devis signé avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error signing contract:", error);
      toast.error("Erreur lors de la signature du devis");
    }
  };

  const getContract = (id: string) => {
    return contracts.find((c) => c.id === id);
  };

  return {
    contracts,
    loading,
    addContract,
    addIntervention,
    updateIntervention,
    deleteIntervention,
    archiveContract,
    unarchiveContract,
    renewContract,
    createRenewalQuote,
    updateClientName,
    signContract,
    getContract,
    refetch: fetchContracts,
  };
};
