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
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface EditClientNameDialogProps {
  contractId: string;
  currentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const EditClientNameDialog = ({
  contractId,
  currentName,
  open,
  onOpenChange,
  onUpdate,
}: EditClientNameDialogProps) => {
  const [comboOpen, setComboOpen] = useState(false);
  const [clients, setClients] = useState<string[]>([]);
  const [clientName, setClientName] = useState(currentName);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await api.getClients();
        setClients(data);
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };
    if (open) {
      fetchClients();
      setClientName(currentName);
    }
  }, [open, currentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      toast.error("Le nom du client ne peut pas être vide");
      return;
    }

    try {
      await api.updateClientName(contractId, clientName);
      toast.success("Nom du client modifié avec succès");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating client name:", error);
      toast.error("Erreur lors de la modification du nom");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier le nom du client</DialogTitle>
          <DialogDescription>
            Changez le nom du client pour ce contrat
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
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
                    {clientName || "Sélectionner un client..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Rechercher ou taper un nouveau nom..."
                      value={clientName}
                      onValueChange={setClientName}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="text-sm text-muted-foreground p-2">
                          Appuyez sur Entrée pour utiliser "{clientName}"
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {clients
                          .filter((client) =>
                            client.toLowerCase().includes(clientName.toLowerCase())
                          )
                          .map((client) => (
                            <CommandItem
                              key={client}
                              value={client}
                              onSelect={() => {
                                setClientName(client);
                                setComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  clientName === client ? "opacity-100" : "opacity-0"
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
