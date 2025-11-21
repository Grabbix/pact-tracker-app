import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CompleteTaskDialogProps {
  taskName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (details: string) => Promise<void>;
}

export const CompleteTaskDialog = ({
  taskName,
  open,
  onOpenChange,
  onComplete,
}: CompleteTaskDialogProps) => {
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      await onComplete(details);
      setDetails("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error completing task:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compléter la tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Tâche</Label>
            <p className="font-medium">{taskName}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Détails (optionnel)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Ajouter des détails sur cette tâche..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement..." : "Marquer comme complétée"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
