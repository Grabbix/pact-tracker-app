import { useState, useEffect } from "react";
import { Contract, Intervention } from "@/types/contract";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useContracts = (includeArchived: boolean = false) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("contracts")
        .select(`
          *,
          interventions (*)
        `)
        .order("created_at", { ascending: false });

      if (!includeArchived) {
        query = query.eq("is_archived", false);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedContracts: Contract[] = data.map((contract) => ({
        id: contract.id,
        clientName: contract.client_name,
        totalHours: contract.total_hours,
        usedHours: contract.used_hours,
        createdDate: contract.created_date,
        status: contract.status as "active" | "expired" | "near-expiry",
        interventions: (contract.interventions || []).map((i: any) => ({
          id: i.id,
          date: i.date,
          description: i.description,
          hoursUsed: i.hours_used,
          technician: i.technician,
        })),
        isArchived: contract.is_archived,
      }));

      setContracts(formattedContracts);
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

  const addContract = async (newContract: { clientName: string; totalHours: number }) => {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .insert({
          client_name: newContract.clientName,
          total_hours: newContract.totalHours,
          used_hours: 0,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Contrat créé avec succès");
      await fetchContracts();
      return data;
    } catch (error: any) {
      console.error("Error adding contract:", error);
      toast.error("Erreur lors de la création du contrat");
    }
  };

  const addIntervention = async (contractId: string, intervention: Omit<Intervention, "id">) => {
    try {
      const { error: interventionError } = await supabase
        .from("interventions")
        .insert({
          contract_id: contractId,
          date: intervention.date,
          description: intervention.description,
          hours_used: intervention.hoursUsed,
          technician: intervention.technician,
        });

      if (interventionError) throw interventionError;

      const contract = contracts.find((c) => c.id === contractId);
      if (contract) {
        const { error: updateError } = await supabase
          .from("contracts")
          .update({
            used_hours: contract.usedHours + intervention.hoursUsed,
          })
          .eq("id", contractId);

        if (updateError) throw updateError;
      }

      toast.success("Intervention ajoutée avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error adding intervention:", error);
      toast.error("Erreur lors de l'ajout de l'intervention");
    }
  };

  const archiveContract = async (contractId: string) => {
    try {
      const { error } = await supabase
        .from("contracts")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq("id", contractId);

      if (error) throw error;

      toast.success("Contrat archivé avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error archiving contract:", error);
      toast.error("Erreur lors de l'archivage du contrat");
    }
  };

  const unarchiveContract = async (contractId: string) => {
    try {
      const { error } = await supabase
        .from("contracts")
        .update({
          is_archived: false,
          archived_at: null,
        })
        .eq("id", contractId);

      if (error) throw error;

      toast.success("Contrat désarchivé avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error unarchiving contract:", error);
      toast.error("Erreur lors de la désarchivage du contrat");
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
    archiveContract,
    unarchiveContract,
    getContract,
    refetch: fetchContracts,
  };
};
