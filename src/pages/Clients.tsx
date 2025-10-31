import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Search, ArrowLeft, Plus, Phone, Mail, User, MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { Client } from "@/types/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phoneStandard: "",
    internalNotes: "",
    fai: "",
    domains: [] as string[],
    emailType: "",
    mailinblack: false,
    arx: false,
    arxQuota: "",
    eset: false,
    esetVersion: "",
    fortinet: false,
    contacts: [{ name: "", email: "", phone: "" } as { name: string; email?: string; phone?: string }]
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await api.getClients();
      setClients(data);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Erreur lors du chargement des clients");
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        address: client.address || "",
        phoneStandard: client.phoneStandard || "",
        internalNotes: client.internalNotes || "",
        fai: client.fai || "",
        domains: client.domains || [],
        emailType: client.emailType || "",
        mailinblack: client.mailinblack || false,
        arx: client.arx || false,
        arxQuota: client.arxQuota || "",
        eset: client.eset || false,
        esetVersion: client.esetVersion || "",
        fortinet: client.fortinet || false,
        contacts: client.contacts.length > 0 ? client.contacts.map(c => ({ name: c.name, email: c.email, phone: c.phone })) : [{ name: "", email: "", phone: "" }]
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: "",
        address: "",
        phoneStandard: "",
        internalNotes: "",
        fai: "",
        domains: [],
        emailType: "",
        mailinblack: false,
        arx: false,
        arxQuota: "",
        eset: false,
        esetVersion: "",
        fortinet: false,
        contacts: [{ name: "", email: "", phone: "" }]
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Le nom du client est requis");
      return;
    }

    const contacts = formData.contacts.filter(c => c.name.trim());

    try {
      if (editingClient) {
        await api.updateClient(editingClient.id, { ...formData, contacts });
        toast.success("Client mis à jour avec succès");
      } else {
        await api.createClient({ ...formData, contacts });
        toast.success("Client créé avec succès");
      }
      setIsDialogOpen(false);
      fetchClients();
    } catch (error) {
      console.error("Error saving client:", error);
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const addContactField = () => {
    setFormData({
      ...formData,
      contacts: [...formData.contacts, { name: "", email: "", phone: "" }]
    });
  };

  const updateContact = (index: number, field: string, value: string) => {
    const newContacts = [...formData.contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setFormData({ ...formData, contacts: newContacts });
  };

  const removeContact = (index: number) => {
    const newContacts = formData.contacts.filter((_, i) => i !== index);
    setFormData({ ...formData, contacts: newContacts });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Clients</h1>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingClient ? "Modifier le client" : "Nouveau client"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom du client *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nom de l'entreprise"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Adresse complète"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneStandard">Numéro du standard</Label>
                  <Input
                    id="phoneStandard"
                    value={formData.phoneStandard}
                    onChange={(e) => setFormData({ ...formData, phoneStandard: e.target.value })}
                    placeholder="01 23 45 67 89"
                  />
                </div>
                <div>
                  <Label htmlFor="internalNotes">Notes internes</Label>
                  <Textarea
                    id="internalNotes"
                    value={formData.internalNotes}
                    onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                    placeholder="Notes visibles sur les contrats"
                    rows={3}
                  />
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold text-sm">Informations techniques</h3>
                  
                  <div>
                    <Label htmlFor="fai">FAI</Label>
                    <Input
                      id="fai"
                      value={formData.fai}
                      onChange={(e) => setFormData({ ...formData, fai: e.target.value })}
                      placeholder="Fournisseur d'accès internet"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Domaines</Label>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setFormData({ ...formData, domains: [...formData.domains, ""] })}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                    {formData.domains.map((domain, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Input
                          placeholder="exemple.com"
                          value={domain}
                          onChange={(e) => {
                            const newDomains = [...formData.domains];
                            newDomains[index] = e.target.value;
                            setFormData({ ...formData, domains: newDomains });
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({ ...formData, domains: formData.domains.filter((_, i) => i !== index) })}
                        >
                          Supprimer
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label htmlFor="emailType">Type de mails</Label>
                    <Input
                      id="emailType"
                      value={formData.emailType}
                      onChange={(e) => setFormData({ ...formData, emailType: e.target.value })}
                      placeholder="OVH Exchange, 365, ou autre"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="mailinblack"
                      checked={formData.mailinblack}
                      onChange={(e) => setFormData({ ...formData, mailinblack: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="mailinblack">Mailinblack</Label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="arx"
                        checked={formData.arx}
                        onChange={(e) => setFormData({ ...formData, arx: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="arx">ARX</Label>
                    </div>
                    {formData.arx && (
                      <div className="ml-6">
                        <Label htmlFor="arxQuota">Quota (Go)</Label>
                        <Input
                          id="arxQuota"
                          value={formData.arxQuota}
                          onChange={(e) => setFormData({ ...formData, arxQuota: e.target.value })}
                          placeholder="Ex: 100"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="eset"
                        checked={formData.eset}
                        onChange={(e) => setFormData({ ...formData, eset: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="eset">ESET</Label>
                    </div>
                    {formData.eset && (
                      <div className="ml-6">
                        <Label htmlFor="esetVersion">Version</Label>
                        <Input
                          id="esetVersion"
                          value={formData.esetVersion}
                          onChange={(e) => setFormData({ ...formData, esetVersion: e.target.value })}
                          placeholder="Ex: v10.1"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="fortinet"
                      checked={formData.fortinet}
                      onChange={(e) => setFormData({ ...formData, fortinet: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="fortinet">Fortinet</Label>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label>Personnes à contacter</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addContactField}>
                      <Plus className="h-3 w-3 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                  {formData.contacts.map((contact, index) => (
                    <div key={index} className="space-y-2 p-3 border rounded-md mb-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm">Contact {index + 1}</Label>
                        {formData.contacts.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeContact(index)}
                          >
                            Supprimer
                          </Button>
                        )}
                      </div>
                      <Input
                        placeholder="Nom"
                        value={contact.name}
                        onChange={(e) => updateContact(index, "name", e.target.value)}
                      />
                      <Input
                        placeholder="Email"
                        type="email"
                        value={contact.email}
                        onChange={(e) => updateContact(index, "email", e.target.value)}
                      />
                      <Input
                        placeholder="Téléphone"
                        value={contact.phone}
                        onChange={(e) => updateContact(index, "phone", e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingClient ? "Mettre à jour" : "Créer"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">Chargement...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucun client trouvé
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleOpenDialog(client)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{client.name}</span>
                    <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.address && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{client.address}</span>
                    </div>
                  )}
                  {client.phoneStandard && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{client.phoneStandard}</span>
                    </div>
                  )}
                  {client.contacts.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="text-xs font-medium text-muted-foreground">Contacts:</div>
                      {client.contacts.slice(0, 2).map((contact) => (
                        <div key={contact.id} className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate font-medium">{contact.name}</span>
                          </div>
                          {contact.email && (
                            <div className="flex items-center gap-2 text-xs ml-5">
                              <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="truncate text-muted-foreground">{contact.email}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-xs ml-5">
                              <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="truncate text-muted-foreground">{contact.phone}</span>
                            </div>
                          )}
                        </div>
                      ))}
                      {client.contacts.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{client.contacts.length - 2} autre(s)
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-4 pt-2 border-t text-sm">
                    <div>
                      <div className="font-medium">{client.activeContractsCount || 0}</div>
                      <div className="text-xs text-muted-foreground">Contrats actifs</div>
                    </div>
                    <div>
                      <div className="font-medium">{client.archivedContractsCount || 0}</div>
                      <div className="text-xs text-muted-foreground">Archivés</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Clients;
