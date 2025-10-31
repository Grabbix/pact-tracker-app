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

interface AddContractDialogProps {
  onAdd: (contract: {
    clientName: string;
    totalHours: number;
    contractType: "quote" | "signed";
  }) => void;
}

export const AddContractDialog = ({ onAdd }: AddContractDialogProps) => {
  const [open, setOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [clients, setClients] = useState<string[]>([]);
  const [contractType, setContractType] = useState<"quote" | "signed">("signed");
  const [formData, setFormData] = useState({
    clientName: "",
    totalHours: "",
  });

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await api.getClients();
        setClients(data);
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };
    fetchClients();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientName || !formData.totalHours) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    onAdd({
      clientName: formData.clientName,
      totalHours: parseFloat(formData.totalHours),
      contractType,
    });

    toast.success(contractType === "quote" ? "Devis créé avec succès" : "Contrat créé avec succès");
    setFormData({
      clientName: "",
      totalHours: "",
    });
    setContractType("signed");
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
            Créez un nouveau contrat ou devis pour un client
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={contractType === "signed" ? "default" : "outline"}
                  onClick={() => setContractType("signed")}
                  className="flex-1"
                >
                  Contrat signé
                </Button>
                <Button
                  type="button"
                  variant={contractType === "quote" ? "default" : "outline"}
                  onClick={() => setContractType("quote")}
                  className="flex-1"
                >
                  Devis
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clientName">Nom du client</Label>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboOpen}
                    className="w-full justify-between"
                  >
                    {formData.clientName || "Sélectionner un client..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Rechercher ou taper un nouveau nom..." 
                      value={formData.clientName}
                      onValueChange={(value) => setFormData({ ...formData, clientName: value })}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="text-sm text-muted-foreground p-2">
                          Appuyez sur Entrée pour créer "{formData.clientName}"
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {clients
                          .filter((client) =>
                            client.toLowerCase().includes(formData.clientName.toLowerCase())
                          )
                          .map((client) => (
                            <CommandItem
                              key={client}
                              value={client}
                              onSelect={() => {
                                setFormData({ ...formData, clientName: client });
                                setComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.clientName === client ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {client}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
