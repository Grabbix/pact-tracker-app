import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface AddInterventionDialogProps {
  onAdd: (intervention: {
    date: string;
    description: string;
    hoursUsed: number;
    technician: string;
  }) => void;
}

export const AddInterventionDialog = ({ onAdd }: AddInterventionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: "",
    hoursUsed: "",
    technician: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.hoursUsed || !formData.technician) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    onAdd({
      date: formData.date,
      description: formData.description,
      hoursUsed: parseFloat(formData.hoursUsed),
      technician: formData.technician,
    });

    toast.success("Intervention ajoutée avec succès");
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: "",
      hoursUsed: "",
      technician: "",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter une intervention
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouvelle intervention</DialogTitle>
          <DialogDescription>
            Ajoutez les détails de l'intervention effectuée
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Décrivez l'intervention..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hours">Heures utilisées</Label>
              <Input
                id="hours"
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
              <Label htmlFor="technician">Technicien</Label>
              <Input
                id="technician"
                placeholder="Nom du technicien"
                value={formData.technician}
                onChange={(e) =>
                  setFormData({ ...formData, technician: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Ajouter</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
