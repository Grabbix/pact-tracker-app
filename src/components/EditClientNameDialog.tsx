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
import { Input } from "@/components/ui/input";
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
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EditClientNameDialogProps {
  contractId: string;
  currentName: string;
  currentSignedDate?: string | null;
  currentCreatedDate?: string;
  contractType?: "quote" | "signed";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const EditClientNameDialog = ({
  contractId,
  currentName,
  currentSignedDate,
  currentCreatedDate,
  contractType,
  open,
  onOpenChange,
  onUpdate,
}: EditClientNameDialogProps) => {
  const [comboOpen, setComboOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [createdDateOpen, setCreatedDateOpen] = useState(false);
  const [clients, setClients] = useState<string[]>([]);
  const [clientName, setClientName] = useState(currentName);
  const [signedDate, setSignedDate] = useState<Date | undefined>(
    currentSignedDate ? new Date(currentSignedDate) : undefined
  );
  const [createdDate, setCreatedDate] = useState<Date | undefined>(
    currentCreatedDate ? new Date(currentCreatedDate) : undefined
  );

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await api.getClientsList();
        setClients(data.map(c => c.name));
      } catch (error) {
        console.error("Error fetching clients:", error);
        setClients([]);
      }
    };
    if (open) {
      fetchClients();
      setClientName(currentName);
      setSignedDate(currentSignedDate ? new Date(currentSignedDate) : undefined);
      setCreatedDate(currentCreatedDate ? new Date(currentCreatedDate) : undefined);
    }
  }, [open, currentName, currentSignedDate, currentCreatedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) {
      toast.error("Le nom du client ne peut pas être vide");
      return;
    }

    try {
      await api.updateContract(contractId, {
        clientName,
        signedDate: signedDate?.toISOString() || null,
        createdDate: createdDate?.toISOString(),
      });
      toast.success("Contrat modifié avec succès");
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating contract:", error);
      toast.error("Erreur lors de la modification");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier le contrat</DialogTitle>
          <DialogDescription>
            Modifiez les informations du contrat
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

            <div className="grid gap-2">
              <Label>Date de création</Label>
              <Popover open={createdDateOpen} onOpenChange={setCreatedDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !createdDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {createdDate ? format(createdDate, "PPP", { locale: fr }) : <span>Sélectionner une date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={createdDate}
                    onSelect={(date) => {
                      setCreatedDate(date);
                      setCreatedDateOpen(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {contractType === "signed" && (
              <div className="grid gap-2">
                <Label>Date de signature</Label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !signedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {signedDate ? format(signedDate, "PPP", { locale: fr }) : <span>Sélectionner une date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={signedDate}
                      onSelect={(date) => {
                        setSignedDate(date);
                        setDateOpen(false);
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
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
