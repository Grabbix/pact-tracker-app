import { Contract } from "@/types/contract";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface ContractListItemProps {
  contract: Contract;
}

export const ContractListItem = ({ contract }: ContractListItemProps) => {
  const navigate = useNavigate();
  const percentage = (contract.usedHours / contract.totalHours) * 100;
  const remainingHours = contract.totalHours - contract.usedHours;

  const getStatusColor = () => {
    if (percentage >= 90) return "text-destructive";
    if (percentage >= 70) return "text-warning";
    return "text-success";
  };

  const getStatusBadge = () => {
    if (percentage > 100) {
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
    <div 
      className="flex items-center gap-4 p-3 border border-border/60 rounded-lg hover:border-primary/30 hover:shadow-md transition-all cursor-pointer bg-card"
      onClick={() => navigate(`/contract/${contract.contractNumber ? String(contract.contractNumber) : contract.id}`)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold text-card-foreground truncate">
            {contract.clientName}
          </h3>
          <Badge variant={statusBadge.variant} className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {contract.contractNumber ? `#${contract.contractNumber}` : `#${contract.id}`}
        </p>
      </div>
      
      <div className="flex-1 min-w-[150px]">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Progression</span>
          <span className="text-xs font-medium text-foreground">{percentage.toFixed(0)}%</span>
        </div>
        <Progress value={percentage} className="h-1" />
      </div>
      
      <div className="text-right min-w-[80px]">
        <span className={`text-lg font-bold ${getStatusColor()}`}>
          {remainingHours.toFixed(1)}h
        </span>
        <p className="text-xs text-muted-foreground">restantes</p>
      </div>
    </div>
  );
};
