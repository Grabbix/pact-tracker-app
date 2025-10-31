import { useState, useEffect } from "react";
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
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AddInterventionDialogProps {
  onAdd: (intervention: {
    date: string;
    description: string;
    hoursUsed: number;
    technician: string;
    isBillable?: boolean;
    location?: string;
  }) => void;
  variant?: 'billable' | 'non-billable';
}

export const AddInterventionDialog = ({ onAdd, variant = 'billable' }: AddInterventionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: "",
    hoursUsed: "",
    technician: "",
    location: "sur-site" as "sur-site" | "a-distance",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.hoursUsed || !formData.technician) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    // Convert minutes to hours for non-billable interventions
    let hoursValue = parseFloat(formData.hoursUsed);
    if (variant === 'non-billable') {
      hoursValue = hoursValue / 60; // Convert minutes to hours
    }

    onAdd({
      date: formData.date,
      description: formData.description,
      hoursUsed: hoursValue,
      technician: formData.technician,
      isBillable: variant === 'billable',
      location: formData.location === 'sur-site' ? 'Sur site' : 'À distance',
    });

    toast.success("Intervention ajoutée avec succès");
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: "",
      hoursUsed: "",
      technician: "",
      location: "sur-site",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" variant={variant === 'non-billable' ? 'outline' : 'default'}>
          <Plus className="h-4 w-4" />
          {variant === 'non-billable' ? 'Non compté' : 'Ajouter une intervention'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {variant === 'non-billable' ? 'Intervention non comptée' : 'Nouvelle intervention'}
          </DialogTitle>
          <DialogDescription>
            {variant === 'non-billable' 
              ? 'Ajoutez une intervention qui ne sera pas comptabilisée dans les heures du contrat (temps en minutes)'
              : 'Ajoutez les détails de l\'intervention effectuée'}
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
              <Label htmlFor="hours">
                {variant === 'non-billable' ? 'Durée (en minutes)' : 'Heures utilisées'}
              </Label>
              <Input
                id="hours"
                type="number"
                step={variant === 'non-billable' ? '1' : '0.5'}
                min="0"
                placeholder={variant === 'non-billable' ? 'Ex: 30' : 'Ex: 2.5'}
                value={formData.hoursUsed}
                onChange={(e) =>
                  setFormData({ ...formData, hoursUsed: e.target.value })
                }
              />
              {variant === 'non-billable' && (
                <p className="text-xs text-muted-foreground">
                  La durée sera convertie automatiquement ({(parseFloat(formData.hoursUsed) / 60).toFixed(2)}h)
                </p>
              )}
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
                  <RadioGroupItem value="sur-site" id="sur-site" />
                  <Label htmlFor="sur-site" className="font-normal cursor-pointer">
                    Sur site
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="a-distance" id="a-distance" />
                  <Label htmlFor="a-distance" className="font-normal cursor-pointer">
                    À distance
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="technician">Technicien</Label>
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
