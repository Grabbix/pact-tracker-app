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
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface AddContractDialogProps {
  onAdd: (contract: {
    clientName: string;
    totalHours: number;
  }) => void;
}

export const AddContractDialog = ({ onAdd }: AddContractDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    totalHours: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientName || !formData.totalHours) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    onAdd({
      clientName: formData.clientName,
      totalHours: parseFloat(formData.totalHours),
    });

    toast.success("Contrat créé avec succès");
    setFormData({
      clientName: "",
      totalHours: "",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nouveau contrat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nouveau contrat de maintenance</DialogTitle>
          <DialogDescription>
            Créez un nouveau contrat pour un client
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="clientName">Nom du client</Label>
              <Input
                id="clientName"
                placeholder="Ex: Entreprise Martin SARL"
                value={formData.clientName}
                onChange={(e) =>
                  setFormData({ ...formData, clientName: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="totalHours">Nombre d'heures total</Label>
              <Input
                id="totalHours"
                type="number"
                step="1"
                min="1"
                placeholder="Ex: 50"
                value={formData.totalHours}
                onChange={(e) =>
                  setFormData({ ...formData, totalHours: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Créer le contrat</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
