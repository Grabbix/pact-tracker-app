import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PROJECT_TYPES, PROJECT_STATUSES, ProjectType, ProjectStatus } from "@/types/project";
import { Client } from "@/types/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_BASE_URL = 'http://localhost:3001/api';

interface AddProjectDialogProps {
  onAdd: (projectData: {
    clientId: string;
    projectType: ProjectType;
    status: ProjectStatus;
    title: string;
    description?: string;
  }) => Promise<void>;
  clients: Client[];
  onClientCreated?: () => void;
}

export const AddProjectDialog = ({ onAdd, clients, onClientCreated }: AddProjectDialogProps) => {
  const [open, setOpen] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("autre");
  const [status, setStatus] = useState<ProjectStatus>("à organiser");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setClientName("");
      setClientId("");
      setProjectType("autre");
      setStatus("à organiser");
      setTitle("");
      setDescription("");
    }
  }, [open]);

  const handleCreateClient = async (name: string): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) throw new Error('Failed to create client');
      
      const newClient = await response.json();
      toast.success("Client créé avec succès");
      
      if (onClientCreated) {
        onClientCreated();
      }
      
      return newClient.id;
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error("Erreur lors de la création du client");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName || !title) {
      toast.error("Le client et le titre sont requis");
      return;
    }

    setLoading(true);
    try {
      let finalClientId = clientId;

      // If no clientId (new client), create it first
      if (!finalClientId) {
        const newClientId = await handleCreateClient(clientName);
        if (!newClientId) {
          setLoading(false);
          return;
        }
        finalClientId = newClientId;
      }

      await onAdd({
        clientId: finalClientId,
        projectType,
        status,
        title,
        description: description || undefined,
      });
      setOpen(false);
    } catch (error) {
      console.error("Error adding project:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau projet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter un projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Client *</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className="w-full justify-between"
                >
                  {clientName || "Sélectionner ou créer un client..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Rechercher ou taper un nouveau nom..." 
                    value={clientName}
                    onValueChange={(value) => {
                      setClientName(value);
                      setClientId("");
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="text-sm text-muted-foreground p-2">
                        Appuyez sur Entrée pour créer "{clientName}"
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {clients
                        .filter((client) =>
                          client.name.toLowerCase().includes(clientName.toLowerCase())
                        )
                        .map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => {
                              setClientName(client.name);
                              setClientId(client.id);
                              setComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                clientName === client.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {client.name}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type de projet *</Label>
              <Select value={projectType} onValueChange={(value) => setProjectType(value as ProjectType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut *</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ProjectStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du projet"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du projet"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !clientName || !title}>
              {loading ? "Création..." : "Créer le projet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
