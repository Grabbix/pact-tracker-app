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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { Intervention } from "@/types/contract";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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
  const [comboOpen, setComboOpen] = useState(false);
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    date: intervention.date,
    description: intervention.description,
    hoursUsed: intervention.hoursUsed.toString(),
    technician: intervention.technician,
    location: intervention.location === 'Sur site' ? 'sur-site' : 'a-distance',
  });

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const data = await api.getTechniciansList();
        setTechnicians(data);
      } catch (error) {
        console.error("Error fetching technicians:", error);
      }
    };
    fetchTechnicians();
  }, []);

  useEffect(() => {
    setFormData({
      date: intervention.date,
      description: intervention.description,
      hoursUsed: intervention.hoursUsed.toString(),
      technician: intervention.technician,
      location: intervention.location === 'Sur site' ? 'sur-site' : 'a-distance',
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
      isBillable: intervention.isBillable,
      location: formData.location === 'sur-site' ? 'Sur site' : 'À distance',
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
              <Label>Localisation</Label>
              <RadioGroup
                value={formData.location}
                onValueChange={(value) =>
                  setFormData({ ...formData, location: value as "sur-site" | "a-distance" })
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sur-site" id="edit-sur-site" />
                  <Label htmlFor="edit-sur-site" className="font-normal cursor-pointer">
                    Sur site
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="a-distance" id="edit-a-distance" />
                  <Label htmlFor="edit-a-distance" className="font-normal cursor-pointer">
                    À distance
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-technician">Technicien</Label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboOpen}
                    className="w-full justify-between"
                  >
                    {formData.technician || "Sélectionner un technicien..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Rechercher ou taper un nouveau nom..." 
                      value={formData.technician}
                      onValueChange={(value) => setFormData({ ...formData, technician: value })}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="text-sm text-muted-foreground p-2">
                          Appuyez sur Entrée pour créer "{formData.technician}"
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {technicians
                          .filter((tech) =>
                            tech.toLowerCase().includes(formData.technician.toLowerCase())
                          )
                          .map((tech) => (
                            <CommandItem
                              key={tech}
                              value={tech}
                              onSelect={() => {
                                setFormData({ ...formData, technician: tech });
                                setComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.technician === tech ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {tech}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
