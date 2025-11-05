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
import { Shield, Plus, RefreshCw, Trash2, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
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
  analyzedSizeGb: number | null;
  lastUpdated: string;
}

interface HistoryEntry {
  recorded_at: string;
  used_space_gb: number | null;
  analyzed_size_gb: number | null;
  allowed_space_gb: number | null;
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
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoryEntry[]>([]);

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
    if (used === null || used === undefined || allowed === null || allowed === undefined) return "N/A";
    return `${used.toFixed(2)} Go / ${allowed.toFixed(2)} Go`;
  };

  const formatSize = (sizeGb: number | null) => {
    if (sizeGb === null || sizeGb === undefined) return "N/A";
    return `${sizeGb.toFixed(2)} Go`;
  };

  const handleRowClick = async (accountId: string) => {
    if (expandedAccountId === accountId) {
      setExpandedAccountId(null);
      return;
    }

    setExpandedAccountId(accountId);
    
    // Fetch history data from local API
    try {
      const history = await api.getArxAccountHistory(clientId, accountId);
      setHistoryData(history);
    } catch (error) {
      console.error("Error fetching ARX account history:", error);
      setHistoryData([]);
    }
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
                  <TableHead>Taille sélection</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <>
                    <TableRow key={account.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleRowClick(account.id)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {expandedAccountId === account.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          {account.accountName}
                        </div>
                      </TableCell>
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
                      <TableCell>{formatSize(account.analyzedSizeGb)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRefresh(account.id);
                            }}
                            disabled={refreshing === account.id}
                          >
                            <RefreshCw className={`h-4 w-4 ${refreshing === account.id ? "animate-spin" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(account.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedAccountId === account.id && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <div className="p-4">
                            <h4 className="text-sm font-semibold mb-4">Historique sur 40 jours</h4>
                            {historyData.length > 0 ? (
                              <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={historyData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis 
                                    dataKey="recorded_at" 
                                    tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: fr })}
                                  />
                                  <YAxis label={{ value: 'Go', angle: -90, position: 'insideLeft' }} />
                                  <Tooltip 
                                    labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                    formatter={(value: number) => `${value.toFixed(2)} Go`}
                                  />
                                  <Legend />
                                  <ReferenceLine 
                                    y={account.allowedSpaceGb || 0} 
                                    stroke="red" 
                                    strokeDasharray="3 3" 
                                    label="Volume alloué"
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="used_space_gb" 
                                    stroke="#2563eb" 
                                    strokeWidth={3}
                                    name="Volume utilisé"
                                    dot={false}
                                  />
                                  <Line 
                                    type="monotone" 
                                    dataKey="analyzed_size_gb" 
                                    stroke="#16a34a" 
                                    strokeWidth={3}
                                    name="Taille sélection"
                                    dot={false}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            ) : (
                              <p className="text-muted-foreground text-center">Aucun historique disponible</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
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
