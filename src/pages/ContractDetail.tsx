import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AddInterventionDialog } from "@/components/AddInterventionDialog";
import { EditInterventionDialog } from "@/components/EditInterventionDialog";
import { RenewContractDialog } from "@/components/RenewContractDialog";
import { EditClientNameDialog } from "@/components/EditClientNameDialog";
import { SendPdfDialog } from "@/components/SendPdfDialog";
import { exportContractToPDF, downloadContractPDF } from "@/utils/pdfExport";
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
  FileSpreadsheet,
  ChevronDown,
  FileText,
  Info,
  RefreshCw
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Intervention } from "@/types/contract";
import { useContracts } from "@/hooks/useContracts";
import { Client } from "@/types/client";
import { api } from "@/lib/api";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const ContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contracts, addIntervention, updateIntervention, deleteIntervention, renewContract, createRenewalQuote, signContract, deleteQuote, refetch, loading } = useContracts(true);
  const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null);
  const [deletingInterventionId, setDeletingInterventionId] = useState<string | null>(null);
  const [editingClientName, setEditingClientName] = useState(false);
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [isSigningQuote, setIsSigningQuote] = useState(false);
  const [clientData, setClientData] = useState<Client | null>(null);
  
  // Find contract by contract number (from URL) or by UUID (backward compatibility)
  const contract = contracts.find(c => 
    (c.contractNumber && String(c.contractNumber) === id) || c.id === id
  );

  // Fetch client data when contract is loaded
  useEffect(() => {
    const fetchClientData = async () => {
      if (contract?.clientId) {
        try {
          const data = await api.getClient(contract.clientId);
          setClientData(data);
        } catch (error) {
          console.error("Error fetching client data:", error);
        }
      }
    };
    fetchClientData();
  }, [contract?.clientId]);

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
          <Button onClick={() => navigate("/contracts")}>Retour aux contrats</Button>
        </div>
      </div>
    );
  }

  const percentage = (contract.usedHours / contract.totalHours) * 100;
  const remainingHours = contract.totalHours - contract.usedHours;
  
  // Calculate cumulative hours for each intervention to detect overage
  const interventionsWithOverage = contract.interventions
    .filter(i => i.isBillable !== false)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((intervention, index, arr) => {
      const cumulativeBefore = arr.slice(0, index).reduce((acc, i) => acc + i.hoursUsed, 0);
      const cumulativeAfter = cumulativeBefore + intervention.hoursUsed;
      const isOverage = cumulativeAfter > contract.totalHours;
      const overageHours = isOverage ? Math.max(0, cumulativeAfter - contract.totalHours) : 0;
      const partialOverage = cumulativeBefore < contract.totalHours && cumulativeAfter > contract.totalHours;
      return { ...intervention, isOverage, overageHours, partialOverage };
    });
  
  // Calculate total non-billable minutes
  const totalNonBillableMinutes = contract.interventions
    .filter(i => i.isBillable === false)
    .reduce((acc, i) => acc + (i.hoursUsed * 60), 0);

  const handleAddIntervention = (newIntervention: Omit<Intervention, "id">) => {
    if (contract?.id) {
      addIntervention(contract.id, newIntervention);
    }
  };

  const handleExportPDF = (includeNonBillable: boolean = true) => {
    downloadContractPDF(contract, includeNonBillable);
    toast.success("PDF exporté avec succès");
  };

  const handleExportExcel = () => {
    exportContractToExcel(contract);
    toast.success("Excel exporté avec succès");
  };

  const handleEditIntervention = (intervention: Intervention) => {
    if (contract?.id) {
      updateIntervention(contract.id, intervention);
    }
  };

  const handleDeleteIntervention = () => {
    if (contract?.id && deletingInterventionId) {
      deleteIntervention(contract.id, deletingInterventionId);
      setDeletingInterventionId(null);
    }
  };

  const handleRenewContract = async (totalHours: number) => {
    if (contract?.id && contract?.renewalQuoteId) {
      // Si un devis de renouvellement existe, on le signe
      await signContract(contract.renewalQuoteId);
      navigate("/contracts");
    } else if (contract?.id) {
      // Sinon renouvellement classique
      await renewContract(contract.id, totalHours);
      navigate("/contracts");
    }
  };

  const handleCreateRenewalQuote = async (totalHours: number) => {
    if (contract?.id) {
      setIsCreatingQuote(true);
      try {
        const result = await createRenewalQuote(contract.id, totalHours);
        if (result?.quoteId) {
          await refetch();
        }
      } finally {
        setIsCreatingQuote(false);
      }
    }
  };

  // Trouver le devis de renouvellement lié
  const renewalQuote = contract?.renewalQuoteId 
    ? contracts.find(c => c.id === contract.renewalQuoteId)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/clients">Clients</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/clients/${contract.clientName}`}>
                {contract.clientName}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                Contrat #{contract.contractNumber || contract.id}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/contracts")}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux contrats
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 
                  className="text-4xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
                  onClick={() => navigate(`/clients/${contract.clientName}`)}
                >
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
                {contract.contractNumber ? `Contrat #${contract.contractNumber}` : `Contrat #${contract.id}`}
              </p>
            </div>
            <div className="flex gap-3">
              <AddInterventionDialog onAdd={handleAddIntervention} variant="billable" />
              <AddInterventionDialog onAdd={handleAddIntervention} variant="non-billable" />
              {!contract.isArchived && contract.contractType === 'quote' && (
                <>
                  <Button variant="default" className="gap-2 bg-success hover:bg-success/90" onClick={() => {
                    if (contract?.id) {
                      signContract(contract.id).then(() => navigate("/contracts"));
                    }
                  }}>
                    <RefreshCw className="h-4 w-4" />
                    Signer le devis
                  </Button>
                  <Button variant="destructive" className="gap-2" onClick={() => {
                    if (contract?.id) {
                      deleteQuote(contract.id).then(() => navigate("/contracts"));
                    }
                  }}>
                    <Trash2 className="h-4 w-4" />
                    Supprimer le devis
                  </Button>
                </>
              )}
              {!contract.isArchived && contract.contractType === 'signed' && !contract.renewalQuoteId && (
                <>
                  <RenewContractDialog 
                    onRenew={handleRenewContract}
                    buttonLabel="Renouvellement"
                    dialogTitle="Renouveler le contrat"
                  />
                  <RenewContractDialog 
                    onRenew={handleCreateRenewalQuote}
                    buttonLabel="Devis Renouvellement"
                    dialogTitle="Créer un devis de renouvellement"
                    disabled={isCreatingQuote}
                  />
                </>
              )}
              {!contract.isArchived && contract.renewalQuoteId && renewalQuote && (
                <Button 
                  variant="default" 
                  className="gap-2 bg-success hover:bg-success/90"
                  onClick={() => setIsSigningQuote(true)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Signer Devis
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exporter
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExportPDF(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    PDF Complet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportPDF(false)}>
                    <FileText className="h-4 w-4 mr-2" />
                    PDF Interventions comptées
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <SendPdfDialog 
                contract={contract}
                clientContacts={clientData?.contacts || []}
              />
            </div>
          </div>
        </div>

        {/* Renewal Quote Banner */}
        {renewalQuote && (
          <Alert className="mb-6 border-primary/50 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                Devis de renouvellement envoyé le{" "}
                {new Date(renewalQuote.createdDate).toLocaleDateString('fr-FR')}
                {" "}- {renewalQuote.totalHours}h
              </span>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate(`/contract/${renewalQuote.contractNumber ? String(renewalQuote.contractNumber) : renewalQuote.id}`)}
                className="h-auto p-0 text-primary"
              >
                Voir le devis
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
              <Clock className={`h-5 w-5 ${remainingHours < 0 ? 'text-destructive' : percentage >= 80 ? 'text-destructive' : 'text-success'}`} />
            </div>
            <p className={`text-3xl font-bold ${remainingHours < 0 ? 'text-destructive' : percentage >= 80 ? 'text-destructive' : 'text-success'}`}>
              {remainingHours.toFixed(1)}h
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total non compté</p>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold text-muted-foreground">{totalNonBillableMinutes.toFixed(0)} min</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Progression</p>
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <p className={`text-3xl font-bold ${percentage > 100 ? 'text-destructive' : 'text-foreground'}`}>
              {percentage.toFixed(0)}%
            </p>
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

        {/* Notes internes */}
        {(contract.internalNotes || contract.clientInternalNotes) && (
          <Card className="p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 text-foreground">Notes internes</h2>
            <div className="space-y-4">
              {contract.internalNotes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Note du contrat</p>
                  <p className="text-foreground whitespace-pre-wrap">{contract.internalNotes}</p>
                </div>
              )}
              {contract.clientInternalNotes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Note du client</p>
                  <p className="text-foreground whitespace-pre-wrap">{contract.clientInternalNotes}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Interventions List */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-6 text-foreground">
            Historique des interventions ({contract.interventions.length})
          </h2>
          
          <div className="space-y-4">
            {[...contract.interventions]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((intervention) => {
                const interventionWithOverage = interventionsWithOverage.find(i => i.id === intervention.id);
                const isOverage = interventionWithOverage?.isOverage || false;
                const overageHours = interventionWithOverage?.overageHours || 0;
                const partialOverage = interventionWithOverage?.partialOverage || false;
                
                return (
              <div
                key={intervention.id}
                className={`border rounded-lg p-5 hover:border-primary/30 transition-colors ${
                  intervention.isBillable === false 
                    ? 'bg-muted/70 border-muted-foreground/30' 
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
                      <Clock className={`h-4 w-4 ${isOverage ? 'text-destructive' : 'text-primary'}`} />
                      <span className={`font-semibold ${isOverage ? 'text-destructive' : 'text-primary'}`}>
                        {intervention.isBillable === false 
                          ? `${Math.round(intervention.hoursUsed * 60)} min` 
                          : `${intervention.hoursUsed}h`}
                      </span>
                      {intervention.isBillable === false && (
                        <span className="text-xs text-muted-foreground">(non compté)</span>
                      )}
                      {isOverage && (
                        <span className="text-xs text-destructive font-medium">
                          {partialOverage 
                            ? `(dont ${overageHours.toFixed(1)}h en dépassement)` 
                            : `(dépassement)`}
                        </span>
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
            )})}
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
        currentCreatedDate={contract.createdDate}
        open={editingClientName}
        onOpenChange={setEditingClientName}
        onUpdate={refetch}
      />

      {/* Sign Quote Confirmation Dialog */}
      <AlertDialog open={isSigningQuote} onOpenChange={setIsSigningQuote}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Signer le devis de renouvellement</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous signer le devis de {renewalQuote?.totalHours}h créé le{" "}
              {renewalQuote && new Date(renewalQuote.createdDate).toLocaleDateString('fr-FR')} ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (contract.renewalQuoteId) {
                  signContract(contract.renewalQuoteId).then(() => navigate("/contracts"));
                }
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContractDetail;
