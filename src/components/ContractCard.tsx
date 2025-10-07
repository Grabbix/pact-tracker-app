import { useState } from "react";
import { Contract } from "@/types/contract";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Clock, AlertCircle, CheckCircle, Archive, ArchiveRestore, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useContracts } from "@/hooks/useContracts";
import { EditClientNameDialog } from "./EditClientNameDialog";

interface ContractCardProps {
  contract: Contract;
  isArchived?: boolean;
}

export const ContractCard = ({ contract, isArchived = false }: ContractCardProps) => {
  const navigate = useNavigate();
  const { archiveContract, unarchiveContract, refetch } = useContracts();
  const [editingName, setEditingName] = useState(false);
  const percentage = (contract.usedHours / contract.totalHours) * 100;
  const remainingHours = contract.totalHours - contract.usedHours;

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isArchived) {
      unarchiveContract(contract.id);
    } else {
      archiveContract(contract.id);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingName(true);
  };

  const getStatusIcon = () => {
    if (contract.status === "near-expiry") {
      return <AlertCircle className="h-5 w-5 text-warning" />;
    }
    return <CheckCircle className="h-5 w-5 text-success" />;
  };

  const getStatusColor = () => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 70) return "text-warning";
    return "text-success";
  };

  return (
    <Card 
      className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/20"
      onClick={() => navigate(`/contract/${contract.id}`)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-card-foreground mb-1">
              {contract.clientName}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEditClick}
              className="h-6 w-6 p-0"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Contrat #{contract.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleArchiveClick}
            className="h-8 w-8 p-0"
          >
            {isArchived ? (
              <ArchiveRestore className="h-4 w-4" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Heures restantes</span>
          </div>
          <span className={`text-2xl font-bold ${getStatusColor()}`}>
            {remainingHours.toFixed(1)}h
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium text-foreground">
              {contract.usedHours}h / {contract.totalHours}h
            </span>
          </div>
          <Progress value={percentage} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {percentage.toFixed(0)}% utilisé
          </p>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Créé le {new Date(contract.createdDate).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>

      <EditClientNameDialog
        contractId={contract.id}
        currentName={contract.clientName}
        open={editingName}
        onOpenChange={setEditingName}
        onUpdate={refetch}
      />
    </Card>
  );
};
