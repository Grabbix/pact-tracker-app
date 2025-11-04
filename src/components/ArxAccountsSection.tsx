import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Shield, Plus, RefreshCw, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface ArxAccount {
  id: string;
  clientId: string;
  accountName: string;
  status: string;
  lastBackupDate: string | null;
  usedSpaceGb: number | null;
  allowedSpaceGb: number | null;
  lastUpdated: string;
}

interface ArxAccountsSectionProps {
  clientId: string;
}

export const ArxAccountsSection = ({ clientId }: ArxAccountsSectionProps) => {
  const [accounts, setAccounts] = useState<ArxAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newAccountName, setNewAccountName] = useState("gigapro-");
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, [clientId]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await api.getArxAccounts(clientId);
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching ARX accounts:", error);
      toast.error("Erreur lors du chargement des comptes ARX");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) {
      toast.error("Le nom du compte est requis");
      return;
    }

    try {
      await api.createArxAccount(clientId, newAccountName);
      toast.success("Compte ARX ajouté avec succès");
      setShowAddDialog(false);
      setNewAccountName("gigapro-");
      fetchAccounts();
    } catch (error) {
      console.error("Error creating ARX account:", error);
      toast.error("Erreur lors de l'ajout du compte ARX");
    }
  };

  const handleRefresh = async (accountId: string) => {
    try {
      setRefreshing(accountId);
      await api.refreshArxAccount(clientId, accountId);
      toast.success("Compte ARX actualisé");
      fetchAccounts();
    } catch (error) {
      console.error("Error refreshing ARX account:", error);
      toast.error("Erreur lors de l'actualisation");
    } finally {
      setRefreshing(null);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce compte ARX ?")) {
      return;
    }

    try {
      await api.deleteArxAccount(clientId, accountId);
      toast.success("Compte ARX supprimé");
      fetchAccounts();
    } catch (error) {
      console.error("Error deleting ARX account:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "attention_requise") {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Attention requise
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1 bg-green-600">
        <CheckCircle2 className="h-3 w-3" />
        OK
      </Badge>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: fr });
    } catch {
      return "N/A";
    }
  };

  const formatStorage = (used: number | null, allowed: number | null) => {
    if (used === null || allowed === null) return "N/A";
    return `${used.toFixed(2)} Go / ${allowed.toFixed(2)} Go`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            ARXONE - Sauvegardes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            ARXONE - Sauvegardes
          </CardTitle>
          <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un compte
          </Button>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucun compte de sauvegarde configuré
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du compte</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dernière sauvegarde</TableHead>
                  <TableHead>Volume / Alloué</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.accountName}</TableCell>
                    <TableCell>{getStatusBadge(account.status)}</TableCell>
                    <TableCell>{formatDate(account.lastBackupDate)}</TableCell>
                    <TableCell>
                      {account.usedSpaceGb !== null && account.allowedSpaceGb !== null && account.usedSpaceGb > account.allowedSpaceGb ? (
                        <Badge variant="destructive">
                          {formatStorage(account.usedSpaceGb, account.allowedSpaceGb)}
                        </Badge>
                      ) : (
                        formatStorage(account.usedSpaceGb, account.allowedSpaceGb)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRefresh(account.id)}
                          disabled={refreshing === account.id}
                        >
                          <RefreshCw className={`h-4 w-4 ${refreshing === account.id ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un compte de sauvegarde</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Nom du compte</Label>
              <Input
                id="accountName"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="gigapro-"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddAccount}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
