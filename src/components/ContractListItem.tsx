import { Contract } from "@/types/contract";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { differenceInMonths, differenceInDays, subMonths, format } from "date-fns";
import { fr } from "date-fns/locale";

interface ContractListItemProps {
  contract: Contract;
}

export const ContractListItem = ({ contract }: ContractListItemProps) => {
  const navigate = useNavigate();
  const percentage = (contract.usedHours / contract.totalHours) * 100;
  const remainingHours = contract.totalHours - contract.usedHours;

  const contractAge = useMemo(() => {
    const createdDate = new Date(contract.createdDate);
    const now = new Date();
    const months = differenceInMonths(now, createdDate);
    const daysAfterMonths = differenceInDays(now, subMonths(createdDate, -months));
    
    if (months === 0) {
      return `${daysAfterMonths}j`;
    }
    return `${months}m ${daysAfterMonths}j`;
  }, [contract.createdDate]);

  const lastInterventionInfo = useMemo(() => {
    if (!contract.interventions || contract.interventions.length === 0) {
      return { date: null, isInactive: true };
    }
    const latest = contract.interventions.reduce((latest, intervention) => {
      const date = new Date(intervention.date);
      return date > latest ? date : latest;
    }, new Date(contract.interventions[0].date));
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return { 
      date: format(latest, "dd/MM", { locale: fr }),
      isInactive: latest < sixMonthsAgo
    };
  }, [contract.interventions]);

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
      return { label: "Critique", variant: "default" as const, className: "bg-warning text-warning-foreground text-[10px] px-1.5 py-0" };
    }
    if (percentage >= 70) {
      return { label: "Attention", variant: "default" as const, className: "bg-orange-500 text-white text-[10px] px-1.5 py-0" };
    }
    return null;
  };

  const statusBadge = getStatusBadge();

  return (
    <div 
      className="flex items-center gap-3 px-3 py-2 border border-border/60 rounded-lg hover:border-primary/30 hover:bg-accent/30 transition-all cursor-pointer bg-card"
      onClick={() => navigate(`/contract/${contract.contractNumber ? String(contract.contractNumber) : contract.id}`)}
    >
      {/* Client & Contract info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-card-foreground truncate">
            {contract.clientName}
          </h3>
          {statusBadge && (
            <Badge variant={statusBadge.variant} className={statusBadge.className}>
              {statusBadge.label}
            </Badge>
          )}
          {lastInterventionInfo.isInactive && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-muted-foreground/50 text-muted-foreground">
              Inactif
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          #{contract.contractNumber || contract.id} · {contractAge}
        </p>
      </div>
      
      {/* Hours info */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="whitespace-nowrap">{contract.totalHours}h total</span>
        <span className="whitespace-nowrap">{contract.usedHours.toFixed(1)}h utilisées</span>
        {lastInterventionInfo.date && (
          <span className="whitespace-nowrap text-foreground/70">Dern. interv. {lastInterventionInfo.date}</span>
        )}
      </div>
      
      {/* Progress */}
      <div className="w-24">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] text-muted-foreground">{percentage.toFixed(0)}%</span>
        </div>
        <Progress value={Math.min(percentage, 100)} className="h-1" />
      </div>
      
      {/* Remaining */}
      <div className="text-right min-w-[60px]">
        <span className={`text-sm font-bold ${getStatusColor()}`}>
          {remainingHours.toFixed(1)}h
        </span>
        <p className="text-[10px] text-muted-foreground">restantes</p>
      </div>
    </div>
  );
};
