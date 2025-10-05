import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Intervention } from "@/types/contract";

interface EditInterventionDialogProps {
  intervention: Intervention;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (intervention: Intervention) => void;
}

export const EditInterventionDialog = ({ 
  intervention, 
  open, 
  onOpenChange, 
  onEdit 
}: EditInterventionDialogProps) => {
  const [formData, setFormData] = useState({
    date: intervention.date,
    description: intervention.description,
    hoursUsed: intervention.hoursUsed.toString(),
    technician: intervention.technician,
  });

  useEffect(() => {
    setFormData({
      date: intervention.date,
      description: intervention.description,
      hoursUsed: intervention.hoursUsed.toString(),
      technician: intervention.technician,
    });
  }, [intervention]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.hoursUsed || !formData.technician) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    onEdit({
      id: intervention.id,
      date: formData.date,
      description: formData.description,
      hoursUsed: parseFloat(formData.hoursUsed),
      technician: formData.technician,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier l'intervention</DialogTitle>
          <DialogDescription>
            Modifiez les détails de l'intervention
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Décrivez l'intervention..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-hours">Heures utilisées</Label>
              <Input
                id="edit-hours"
                type="number"
                step="0.5"
                min="0"
                placeholder="Ex: 2.5"
                value={formData.hoursUsed}
                onChange={(e) =>
                  setFormData({ ...formData, hoursUsed: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-technician">Technicien</Label>
              <Input
                id="edit-technician"
                placeholder="Nom du technicien"
                value={formData.technician}
                onChange={(e) =>
                  setFormData({ ...formData, technician: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">Modifier</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
