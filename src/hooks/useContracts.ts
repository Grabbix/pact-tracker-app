import { useState, useEffect } from "react";
import { Contract, Intervention } from "@/types/contract";
import { toast } from "sonner";
import { initDatabase, saveDatabase, generateId } from "@/lib/sqlite";

export const useContracts = (includeArchived: boolean = false) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const db = await initDatabase();

      let query = `
        SELECT c.*, 
          GROUP_CONCAT(
            json_object(
              'id', i.id,
              'date', i.date,
              'description', i.description,
              'hours_used', i.hours_used,
              'technician', i.technician
            )
          ) as interventions_json
        FROM contracts c
        LEFT JOIN interventions i ON c.id = i.contract_id
      `;

      if (!includeArchived) {
        query += " WHERE c.is_archived = 0";
      }

      query += " GROUP BY c.id ORDER BY c.created_date DESC";

      const result = db.exec(query);

      if (result.length === 0) {
        setContracts([]);
        return;
      }

      const formattedContracts: Contract[] = result[0].values.map((row: any) => {
        const interventionsJson = row[7];
        let interventions: Intervention[] = [];
        
        if (interventionsJson) {
          try {
            const parsed = JSON.parse(`[${interventionsJson}]`);
            interventions = parsed
              .filter((i: any) => i.id !== null)
              .map((i: any) => ({
                id: i.id,
                date: i.date,
                description: i.description,
                hoursUsed: i.hours_used,
                technician: i.technician,
              }));
          } catch (e) {
            console.error("Error parsing interventions:", e);
          }
        }

        return {
          id: row[0],
          clientName: row[1],
          totalHours: row[2],
          usedHours: row[3],
          createdDate: row[4],
          status: row[5] as "active" | "expired" | "near-expiry",
          isArchived: row[6] === 1,
          interventions,
        };
      });

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
      const db = await initDatabase();
      const id = generateId();
      const createdDate = new Date().toISOString();

      db.run(
        `INSERT INTO contracts (id, client_name, total_hours, used_hours, created_date, status, is_archived)
         VALUES (?, ?, ?, 0, ?, 'active', 0)`,
        [id, newContract.clientName, newContract.totalHours, createdDate]
      );

      saveDatabase();
      toast.success("Contrat créé avec succès");
      await fetchContracts();
      return { id };
    } catch (error: any) {
      console.error("Error adding contract:", error);
      toast.error("Erreur lors de la création du contrat");
    }
  };

  const addIntervention = async (contractId: string, intervention: Omit<Intervention, "id">) => {
    try {
      const db = await initDatabase();
      const id = generateId();

      db.run(
        `INSERT INTO interventions (id, contract_id, date, description, hours_used, technician)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, contractId, intervention.date, intervention.description, intervention.hoursUsed, intervention.technician]
      );

      const contract = contracts.find((c) => c.id === contractId);
      if (contract) {
        db.run(
          `UPDATE contracts SET used_hours = ? WHERE id = ?`,
          [contract.usedHours + intervention.hoursUsed, contractId]
        );
      }

      saveDatabase();
      toast.success("Intervention ajoutée avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error adding intervention:", error);
      toast.error("Erreur lors de l'ajout de l'intervention");
    }
  };

  const archiveContract = async (contractId: string) => {
    try {
      const db = await initDatabase();
      const archivedAt = new Date().toISOString();

      db.run(
        `UPDATE contracts SET is_archived = 1, archived_at = ? WHERE id = ?`,
        [archivedAt, contractId]
      );

      saveDatabase();
      toast.success("Contrat archivé avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error archiving contract:", error);
      toast.error("Erreur lors de l'archivage du contrat");
    }
  };

  const unarchiveContract = async (contractId: string) => {
    try {
      const db = await initDatabase();

      db.run(
        `UPDATE contracts SET is_archived = 0, archived_at = NULL WHERE id = ?`,
        [contractId]
      );

      saveDatabase();
      toast.success("Contrat désarchivé avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error unarchiving contract:", error);
      toast.error("Erreur lors de la désarchivage du contrat");
    }
  };

  const updateIntervention = async (contractId: string, intervention: Intervention) => {
    try {
      const db = await initDatabase();
      const contract = contracts.find((c) => c.id === contractId);
      if (!contract) return;

      const oldIntervention = contract.interventions.find((i) => i.id === intervention.id);
      if (!oldIntervention) return;

      db.run(
        `UPDATE interventions 
         SET date = ?, description = ?, hours_used = ?, technician = ?
         WHERE id = ?`,
        [intervention.date, intervention.description, intervention.hoursUsed, intervention.technician, intervention.id]
      );

      const hoursDifference = intervention.hoursUsed - oldIntervention.hoursUsed;
      db.run(
        `UPDATE contracts SET used_hours = ? WHERE id = ?`,
        [contract.usedHours + hoursDifference, contractId]
      );

      saveDatabase();
      toast.success("Intervention modifiée avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error updating intervention:", error);
      toast.error("Erreur lors de la modification de l'intervention");
    }
  };

  const deleteIntervention = async (contractId: string, interventionId: string) => {
    try {
      const db = await initDatabase();
      const contract = contracts.find((c) => c.id === contractId);
      if (!contract) return;

      const intervention = contract.interventions.find((i) => i.id === interventionId);
      if (!intervention) return;

      db.run(`DELETE FROM interventions WHERE id = ?`, [interventionId]);

      db.run(
        `UPDATE contracts SET used_hours = ? WHERE id = ?`,
        [contract.usedHours - intervention.hoursUsed, contractId]
      );

      saveDatabase();
      toast.success("Intervention supprimée avec succès");
      await fetchContracts();
    } catch (error: any) {
      console.error("Error deleting intervention:", error);
      toast.error("Erreur lors de la suppression de l'intervention");
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
    getContract,
    refetch: fetchContracts,
  };
};
