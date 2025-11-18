import { useState } from "react";
import { Contract } from "@/types/contract";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const getStatusBadge = () => {
    if (percentage >= 100) {
      return { label: "Dépassement", variant: "destructive" as const };
    }
    if (percentage >= 90) {
      return { label: "Proche expiration", variant: "default" as const, className: "bg-warning text-warning-foreground" };
    }
    if (percentage >= 70) {
      return { label: "Attention", variant: "default" as const, className: "bg-orange-500 text-white" };
    }
    return { label: "Bon état", variant: "default" as const, className: "bg-success text-success-foreground" };
  };

  const statusBadge = getStatusBadge();

  return (
    <Card 
      className="p-4 hover:shadow-lg transition-all cursor-pointer border-2 border-border/60 hover:border-primary/30"
      onClick={() => navigate(`/contract/${contract.contractNumber ? String(contract.contractNumber) : contract.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-card-foreground mb-0.5">
              {contract.clientName}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleEditClick}
              className="h-5 w-5 p-0"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {contract.contractNumber ? `Contrat #${contract.contractNumber}` : `Contrat #${contract.id}`}
            </p>
            <Badge variant={statusBadge.variant} className={statusBadge.className}>
              {statusBadge.label}
            </Badge>
          </div>
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

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs">Heures restantes</span>
          </div>
          <span className={`text-xl font-bold ${getStatusColor()}`}>
            {remainingHours.toFixed(1)}h
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium text-foreground">
              {contract.usedHours}h / {contract.totalHours}h
            </span>
          </div>
          <Progress value={percentage} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-right">
            {percentage.toFixed(0)}% utilisé
          </p>
        </div>

        <div className="pt-1.5 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Créé le {new Date(contract.createdDate).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>

      <EditClientNameDialog
        contractId={contract.id}
        currentName={contract.clientName}
        currentCreatedDate={contract.createdDate}
        open={editingName}
        onOpenChange={setEditingName}
        onUpdate={refetch}
      />
    </Card>
  );
};
