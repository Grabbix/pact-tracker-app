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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Check, ChevronsUpDown, X } from "lucide-react";
import { PROJECT_TYPES, PROJECT_STATUSES, ProjectType, ProjectStatus, CustomField } from "@/types/project";
import { Client } from "@/types/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

interface AddProjectDialogProps {
  onAdd: (projectData: any) => Promise<void>;
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

  // Tasks
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState("");

  // Type-specific fields
  const [mailinblackLicenseType, setMailinblackLicenseType] = useState("");
  const [mailinblackLicenseCount, setMailinblackLicenseCount] = useState<number | "">("");
  const [mailinblackDomainManagement, setMailinblackDomainManagement] = useState(false);

  const [esetLicenseType, setEsetLicenseType] = useState("");
  const [esetLicenseCount, setEsetLicenseCount] = useState<number | "">("");

  const [serverIsReplacement, setServerIsReplacement] = useState(false);

  const [auditIsNewClient, setAuditIsNewClient] = useState(false);

  const [firewallExists, setFirewallExists] = useState(false);
  const [firewallType, setFirewallType] = useState("");
  const [firewallManagement, setFirewallManagement] = useState("");
  const [firewallVpnNeeded, setFirewallVpnNeeded] = useState(false);

  const [mailIsCreation, setMailIsCreation] = useState(true);
  const [mailAddressType, setMailAddressType] = useState<"exchange" | "365">("365");
  const [mailAddressCount, setMailAddressCount] = useState<number | "">("");
  const [mailDomains, setMailDomains] = useState("");
  const [mailDomainsManagement, setMailDomainsManagement] = useState(false);
  const [mailMailinblackConcerned, setMailMailinblackConcerned] = useState(false);

  // Custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState("");

  useEffect(() => {
    if (!open) {
      // Reset all fields
      setClientName("");
      setClientId("");
      setProjectType("autre");
      setStatus("à organiser");
      setTitle("");
      setDescription("");
      setTasks([]);
      setNewTask("");
      setMailinblackLicenseType("");
      setMailinblackLicenseCount("");
      setMailinblackDomainManagement(false);
      setEsetLicenseType("");
      setEsetLicenseCount("");
      setServerIsReplacement(false);
      setAuditIsNewClient(false);
      setFirewallExists(false);
      setFirewallType("");
      setFirewallManagement("");
      setFirewallVpnNeeded(false);
      setMailIsCreation(true);
      setMailAddressType("365");
      setMailAddressCount("");
      setMailDomains("");
      setMailDomainsManagement(false);
      setMailMailinblackConcerned(false);
      setCustomFields([]);
      setNewFieldLabel("");
    }
  }, [open]);

  const handleCreateClient = async (name: string): Promise<string | null> => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/clients`, {
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

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask.trim()]);
      setNewTask("");
    }
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const addCustomField = () => {
    if (newFieldLabel.trim()) {
      setCustomFields([
        ...customFields,
        { id: crypto.randomUUID(), label: newFieldLabel.trim(), value: "" }
      ]);
      setNewFieldLabel("");
    }
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const updateCustomFieldValue = (id: string, value: string) => {
    setCustomFields(customFields.map(f => f.id === id ? { ...f, value } : f));
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

      if (!finalClientId) {
        const newClientId = await handleCreateClient(clientName);
        if (!newClientId) {
          setLoading(false);
          return;
        }
        finalClientId = newClientId;
      }

      const projectData: any = {
        clientId: finalClientId,
        projectType,
        status,
        title,
        description: description || undefined,
        tasks: tasks.length > 0 ? tasks : undefined,
        customFields: customFields.length > 0 ? customFields : undefined,
      };

      // Add type-specific fields
      if (projectType === 'mailinblack') {
        projectData.mailinblackFields = {
          licenseType: mailinblackLicenseType || undefined,
          licenseCount: mailinblackLicenseCount || undefined,
          domainUnderManagement: mailinblackDomainManagement,
        };
      } else if (projectType === 'eset') {
        projectData.esetFields = {
          licenseType: esetLicenseType || undefined,
          licenseCount: esetLicenseCount || undefined,
        };
      } else if (projectType === 'serveur') {
        projectData.serverFields = {
          isReplacement: serverIsReplacement,
        };
      } else if (projectType === 'audit') {
        projectData.auditFields = {
          isNewClient: auditIsNewClient,
        };
      } else if (projectType === 'pare-feu') {
        projectData.firewallFields = {
          existingFirewall: firewallExists,
          firewallType: firewallType || undefined,
          firewallManagement: firewallManagement || undefined,
          vpnNeeded: firewallVpnNeeded,
        };
      } else if (projectType === 'mail') {
        projectData.mailFields = {
          isCreation: mailIsCreation,
          addressType: mailAddressType,
          addressCount: mailAddressCount || undefined,
          domains: mailDomains || undefined,
          domainsUnderManagement: mailDomainsManagement,
          mailinblackConcerned: mailMailinblackConcerned,
        };
      }

      await onAdd(projectData);
      setOpen(false);
    } catch (error) {
      console.error("Error adding project:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderTypeSpecificFields = () => {
    switch (projectType) {
      case 'mailinblack':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Informations Mailinblack</h3>
            <div className="space-y-2">
              <Label>Type de licence</Label>
              <Input
                value={mailinblackLicenseType}
                onChange={(e) => setMailinblackLicenseType(e.target.value)}
                placeholder="Ex: Standard, Premium..."
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre de licences</Label>
              <Input
                type="number"
                value={mailinblackLicenseCount}
                onChange={(e) => setMailinblackLicenseCount(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="Nombre"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mailinblack-domain"
                checked={mailinblackDomainManagement}
                onCheckedChange={(checked) => setMailinblackDomainManagement(checked as boolean)}
              />
              <Label htmlFor="mailinblack-domain" className="cursor-pointer">
                Domaine sous notre gestion
              </Label>
            </div>
          </div>
        );

      case 'eset':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Informations ESET</h3>
            <div className="space-y-2">
              <Label>Type de licences</Label>
              <Input
                value={esetLicenseType}
                onChange={(e) => setEsetLicenseType(e.target.value)}
                placeholder="Ex: Endpoint Security, Server Security..."
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre de licences</Label>
              <Input
                type="number"
                value={esetLicenseCount}
                onChange={(e) => setEsetLicenseCount(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="Nombre"
              />
            </div>
          </div>
        );

      case 'serveur':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Informations Serveur</h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="server-replacement"
                checked={serverIsReplacement}
                onCheckedChange={(checked) => setServerIsReplacement(checked as boolean)}
              />
              <Label htmlFor="server-replacement" className="cursor-pointer">
                Remplacement d'un serveur existant
              </Label>
            </div>
          </div>
        );

      case 'audit':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Informations Audit</h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="audit-new-client"
                checked={auditIsNewClient}
                onCheckedChange={(checked) => setAuditIsNewClient(checked as boolean)}
              />
              <Label htmlFor="audit-new-client" className="cursor-pointer">
                Nouveau client
              </Label>
            </div>
          </div>
        );

      case 'pare-feu':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Informations Pare-feu</h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="firewall-exists"
                checked={firewallExists}
                onCheckedChange={(checked) => setFirewallExists(checked as boolean)}
              />
              <Label htmlFor="firewall-exists" className="cursor-pointer">
                Un pare-feu existe déjà
              </Label>
            </div>
            {firewallExists && (
              <>
                <div className="space-y-2">
                  <Label>Type de pare-feu</Label>
                  <Input
                    value={firewallType}
                    onChange={(e) => setFirewallType(e.target.value)}
                    placeholder="Ex: Fortinet, Sophos..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gestion par</Label>
                  <Input
                    value={firewallManagement}
                    onChange={(e) => setFirewallManagement(e.target.value)}
                    placeholder="Ex: Client, Nous, Prestataire externe..."
                  />
                </div>
              </>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="vpn-needed"
                checked={firewallVpnNeeded}
                onCheckedChange={(checked) => setFirewallVpnNeeded(checked as boolean)}
              />
              <Label htmlFor="vpn-needed" className="cursor-pointer">
                Besoin de VPN
              </Label>
            </div>
          </div>
        );

      case 'mail':
        return (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Informations Mail</h3>
            <div className="space-y-2">
              <Label>Type d'opération</Label>
              <Select value={mailIsCreation ? "creation" : "migration"} onValueChange={(v) => setMailIsCreation(v === "creation")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="creation">Création</SelectItem>
                  <SelectItem value="migration">Migration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type d'adresses</Label>
              <Select value={mailAddressType} onValueChange={(v) => setMailAddressType(v as "exchange" | "365")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exchange">Exchange</SelectItem>
                  <SelectItem value="365">Office 365</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nombre d'adresses</Label>
              <Input
                type="number"
                value={mailAddressCount}
                onChange={(e) => setMailAddressCount(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="Nombre"
              />
            </div>
            <div className="space-y-2">
              <Label>Domaine(s) concerné(s)</Label>
              <Input
                value={mailDomains}
                onChange={(e) => setMailDomains(e.target.value)}
                placeholder="Ex: domain1.com, domain2.com"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mail-domains-management"
                checked={mailDomainsManagement}
                onCheckedChange={(checked) => setMailDomainsManagement(checked as boolean)}
              />
              <Label htmlFor="mail-domains-management" className="cursor-pointer">
                Domaines sous notre gestion
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mail-mailinblack"
                checked={mailMailinblackConcerned}
                onCheckedChange={(checked) => setMailMailinblackConcerned(checked as boolean)}
              />
              <Label htmlFor="mail-mailinblack" className="cursor-pointer">
                Concerné par Mailinblack
              </Label>
            </div>
          </div>
        );

      default:
        return null;
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un projet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="tasks">Tâches</TabsTrigger>
              <TabsTrigger value="specific">Spécifique</TabsTrigger>
              <TabsTrigger value="custom">Champs perso</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
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
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <div className="space-y-2">
                <Label>Ajouter des tâches</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Nom de la tâche"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTask();
                      }
                    }}
                  />
                  <Button type="button" onClick={addTask} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {tasks.length > 0 && (
                <div className="space-y-2">
                  <Label>Tâches ajoutées ({tasks.length})</Label>
                  <div className="space-y-2">
                    {tasks.map((task, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
                      >
                        <span className="text-sm">{task}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTask(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="specific" className="space-y-4">
              {renderTypeSpecificFields() || (
                <div className="text-center text-muted-foreground py-8">
                  Aucun champ spécifique pour ce type de projet
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-2">
                <Label>Ajouter un champ personnalisé</Label>
                <div className="flex gap-2">
                  <Input
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="Nom du champ"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomField();
                      }
                    }}
                  />
                  <Button type="button" onClick={addCustomField} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {customFields.length > 0 && (
                <div className="space-y-2">
                  <Label>Champs personnalisés ({customFields.length})</Label>
                  <div className="space-y-3">
                    {customFields.map((field) => (
                      <div key={field.id} className="space-y-2 p-3 border rounded-md bg-muted/50">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">{field.label}</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomField(field.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          value={field.value}
                          onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                          placeholder="Valeur"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
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
