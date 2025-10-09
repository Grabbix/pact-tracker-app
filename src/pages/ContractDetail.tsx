import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AddInterventionDialog } from "@/components/AddInterventionDialog";
import { EditInterventionDialog } from "@/components/EditInterventionDialog";
import { RenewContractDialog } from "@/components/RenewContractDialog";
import { EditClientNameDialog } from "@/components/EditClientNameDialog";
import { exportContractToPDF } from "@/utils/pdfExport";
import { exportContractToExcel } from "@/utils/excelExport";
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  Clock, 
  User,
  TrendingUp,
  Edit,
  Trash2,
  Pencil,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { Intervention } from "@/types/contract";
import { useContracts } from "@/hooks/useContracts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getContract, addIntervention, updateIntervention, deleteIntervention, renewContract, refetch, loading } = useContracts(true);
  const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null);
  const [deletingInterventionId, setDeletingInterventionId] = useState<string | null>(null);
  const [editingClientName, setEditingClientName] = useState(false);
  
  const contract = getContract(id || "");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-lg">Chargement...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Contrat non trouvé</h1>
          <Button onClick={() => navigate("/")}>Retour aux contrats</Button>
        </div>
      </div>
    );
  }

  const percentage = (contract.usedHours / contract.totalHours) * 100;
  const remainingHours = contract.totalHours - contract.usedHours;

  const handleAddIntervention = (newIntervention: Omit<Intervention, "id">) => {
    if (id) {
      addIntervention(id, newIntervention);
    }
  };

  const handleExportPDF = () => {
    exportContractToPDF(contract);
    toast.success("PDF exporté avec succès");
  };

  const handleExportExcel = () => {
    exportContractToExcel(contract);
    toast.success("Excel exporté avec succès");
  };

  const handleEditIntervention = (intervention: Intervention) => {
    if (id) {
      updateIntervention(id, intervention);
    }
  };

  const handleDeleteIntervention = () => {
    if (id && deletingInterventionId) {
      deleteIntervention(id, deletingInterventionId);
      setDeletingInterventionId(null);
    }
  };

  const handleRenewContract = (totalHours: number) => {
    if (id) {
      renewContract(id, totalHours);
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux contrats
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-foreground">
                  {contract.clientName}
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingClientName(true)}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-muted-foreground text-lg">
                Contrat #{contract.id}
              </p>
            </div>
            <div className="flex gap-3">
              <AddInterventionDialog onAdd={handleAddIntervention} variant="billable" />
              <AddInterventionDialog onAdd={handleAddIntervention} variant="non-billable" />
              {!contract.isArchived && (
                <RenewContractDialog onRenew={handleRenewContract} />
              )}
              <Button variant="outline" onClick={handleExportPDF} className="gap-2">
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" onClick={handleExportExcel} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Heures totales</p>
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">{contract.totalHours}h</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Heures utilisées</p>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">{contract.usedHours}h</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Heures restantes</p>
              <Clock className="h-5 w-5 text-success" />
            </div>
            <p className="text-3xl font-bold text-success">{remainingHours.toFixed(1)}h</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Progression</p>
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-bold text-foreground">{percentage.toFixed(0)}%</p>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Avancement du contrat</h2>
          <Progress value={percentage} className="h-3 mb-2" />
          <p className="text-sm text-muted-foreground">
            Créé le {new Date(contract.createdDate).toLocaleDateString('fr-FR')}
          </p>
        </Card>

        {/* Interventions List */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-foreground">
            Historique des interventions ({contract.interventions.length})
          </h2>
          
          <div className="space-y-4">
            {[...contract.interventions]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((intervention) => (
              <div
                key={intervention.id}
                className={`border rounded-lg p-5 hover:border-primary/30 transition-colors ${
                  intervention.isBillable === false 
                    ? 'bg-muted/30 border-muted-foreground/20' 
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {new Date(intervention.date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {intervention.technician}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-primary">
                        {intervention.isBillable === false 
                          ? `${Math.round(intervention.hoursUsed * 60)} min` 
                          : `${intervention.hoursUsed}h`}
                      </span>
                      {intervention.isBillable === false && (
                        <span className="text-xs text-muted-foreground">(non compté)</span>
                      )}
                    </div>
                    {intervention.location && (
                      <div className="text-sm text-muted-foreground">
                        {intervention.location}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingIntervention(intervention)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingInterventionId(intervention.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-foreground">{intervention.description}</p>
              </div>
            ))}
          </div>

          {contract.interventions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune intervention enregistrée</p>
            </div>
          )}
        </Card>
      </div>

      {editingIntervention && (
        <EditInterventionDialog
          intervention={editingIntervention}
          open={!!editingIntervention}
          onOpenChange={(open) => !open && setEditingIntervention(null)}
          onEdit={handleEditIntervention}
        />
      )}

      <AlertDialog open={!!deletingInterventionId} onOpenChange={(open) => !open && setDeletingInterventionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'intervention</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette intervention ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteIntervention}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditClientNameDialog
        contractId={contract.id}
        currentName={contract.clientName}
        open={editingClientName}
        onOpenChange={setEditingClientName}
        onUpdate={refetch}
      />
    </div>
  );
};

export default ContractDetail;
