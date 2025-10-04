import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { mockContracts } from "@/data/mockContracts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AddInterventionDialog } from "@/components/AddInterventionDialog";
import { exportContractToPDF } from "@/utils/pdfExport";
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  Clock, 
  User,
  TrendingUp 
} from "lucide-react";
import { toast } from "sonner";
import { Contract, Intervention } from "@/types/contract";

const ContractDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const initialContract = mockContracts.find((c) => c.id === id);
  const [contract, setContract] = useState<Contract | undefined>(initialContract);

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
    const intervention: Intervention = {
      ...newIntervention,
      id: `i${Date.now()}`,
    };

    const updatedContract = {
      ...contract,
      usedHours: contract.usedHours + newIntervention.hoursUsed,
      interventions: [intervention, ...contract.interventions],
    };

    setContract(updatedContract);
  };

  const handleExportPDF = () => {
    exportContractToPDF(contract);
    toast.success("PDF exporté avec succès");
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
              <h1 className="text-4xl font-bold text-foreground mb-2">
                {contract.clientName}
              </h1>
              <p className="text-muted-foreground text-lg">
                Contrat #{contract.id}
              </p>
            </div>
            <div className="flex gap-3">
              <AddInterventionDialog onAdd={handleAddIntervention} />
              <Button variant="outline" onClick={handleExportPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Exporter PDF
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
            {contract.interventions.map((intervention) => (
              <div
                key={intervention.id}
                className="border border-border rounded-lg p-5 hover:border-primary/30 transition-colors"
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
                        {intervention.hoursUsed}h
                      </span>
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
    </div>
  );
};

export default ContractDetail;
