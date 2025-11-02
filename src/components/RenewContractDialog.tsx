import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";

interface RenewContractDialogProps {
  onRenew: (totalHours: number) => void;
  buttonLabel?: string;
  dialogTitle?: string;
  disabled?: boolean;
}

export const RenewContractDialog = ({ onRenew, buttonLabel = "Renouveler", dialogTitle = "Renouveler le contrat", disabled = false }: RenewContractDialogProps) => {
  const [open, setOpen] = useState(false);
  const [totalHours, setTotalHours] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(totalHours);
    if (hours > 0) {
      onRenew(hours);
      setOpen(false);
      setTotalHours("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" disabled={disabled}>
          <RefreshCw className="h-4 w-4" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Le contrat actuel sera archivé et un nouveau sera créé. Les heures en dépassement seront automatiquement reportées.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="hours">Nombre d'heures du nouveau contrat</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0.5"
                placeholder="Ex: 40"
                value={totalHours}
                onChange={(e) => setTotalHours(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Renouveler</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
