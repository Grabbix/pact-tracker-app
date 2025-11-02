import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Phone, Mail, User, MapPin, Edit, Globe, Shield, Clock, TrendingUp, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Client } from "@/types/client";
import { Contract } from "@/types/contract";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
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
    if (id) {
      fetchClientData();
    }
  }, [id]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const [clientData, allContractsData] = await Promise.all([
        api.getClient(id!),
        api.getContracts(true) // Include archived
      ]);
      setClient(clientData);
      setContracts(allContractsData.filter(c => c.clientId === id));
    } catch (error) {
      console.error("Error fetching client data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    if (client) {
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
    }
    setIsEditDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !id) {
      toast.error("Le nom du client est requis");
      return;
    }

    const contacts = formData.contacts.filter(c => c.name.trim());

    try {
      await api.updateClient(id, { ...formData, contacts });
      toast.success("Client mis à jour avec succès");
      setIsEditDialogOpen(false);
      fetchClientData();
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

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Chargement...</div>;
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Client non trouvé</p>
          <Button onClick={() => navigate("/clients")}>Retour aux clients</Button>
        </div>
      </div>
    );
  }

  const activeContracts = contracts.filter(c => !c.isArchived && c.contractType !== "quote");
  const quoteContracts = contracts.filter(c => !c.isArchived && c.contractType === "quote");
  const archivedContracts = contracts.filter(c => c.isArchived);

  // Statistiques
  const currentYear = new Date().getFullYear();
  
  // All time stats
  const totalHoursSold = contracts.reduce((acc, c) => acc + c.totalHours, 0);
  const totalHoursUsed = contracts.reduce((acc, c) => acc + c.usedHours, 0);
  
  // Current year stats
  const currentYearContracts = contracts.filter(c => 
    new Date(c.createdDate).getFullYear() === currentYear
  );
  const currentYearHoursSold = currentYearContracts.reduce((acc, c) => acc + c.totalHours, 0);
  const currentYearHoursUsed = currentYearContracts.reduce((acc, c) => acc + c.usedHours, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/clients")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">{client.name}</h1>
            </div>
          </div>
          <Button variant="outline" onClick={handleEditClick}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <a 
                    href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline hover:text-foreground transition-colors"
                  >
                    {client.address}
                  </a>
                </div>
              )}
              {client.phoneStandard && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a 
                    href={`tel:${client.phoneStandard}`}
                    className="text-sm hover:underline hover:text-foreground transition-colors"
                  >
                    {client.phoneStandard}
                  </a>
                </div>
              )}
              {client.internalNotes && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes internes</p>
                  <p className="text-sm whitespace-pre-wrap">{client.internalNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations techniques */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Informations techniques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {client.fai && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">FAI</p>
                  <p className="text-sm">{client.fai}</p>
                </div>
              )}
              {client.domains && client.domains.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Domaines</p>
                  <div className="space-y-2">
                    {client.domains.map((domain, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{domain}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => window.open(`https://who.is/dns/${domain}`, '_blank')}
                        >
                          DNS
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => window.open(`https://who.is/rdap/${domain}`, '_blank')}
                        >
                          WHOIS
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {client.emailType && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Type de mails</p>
                  <p className="text-sm">{client.emailType}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {client.mailinblack && <Badge>Mailinblack</Badge>}
                {client.arx && <Badge>ARX {client.arxQuota && `(${client.arxQuota} Go)`}</Badge>}
                {client.eset && <Badge>ESET {client.esetVersion && `(${client.esetVersion})`}</Badge>}
                {client.fortinet && <Badge>Fortinet</Badge>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contacts */}
        {client.contacts.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personnes à contacter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {client.contacts.map((contact) => (
                  <div key={contact.id} className="p-3 border rounded-lg space-y-2">
                    <p className="font-medium">{contact.name}</p>
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <a 
                          href={`mailto:${contact.email}`}
                          className="text-muted-foreground hover:underline hover:text-foreground transition-colors truncate"
                        >
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <a 
                          href={`tel:${contact.phone}`}
                          className="text-muted-foreground hover:underline hover:text-foreground transition-colors"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Heures vendues (total)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHoursSold}h</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Heures utilisées (total)</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHoursUsed}h</div>
              <p className="text-xs text-muted-foreground">
                {totalHoursSold > 0 ? Math.round((totalHoursUsed / totalHoursSold) * 100) : 0}% utilisé
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Heures vendues ({currentYear})</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentYearHoursSold}h</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Heures utilisées ({currentYear})</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentYearHoursUsed}h</div>
              <p className="text-xs text-muted-foreground">
                {currentYearHoursSold > 0 ? Math.round((currentYearHoursUsed / currentYearHoursSold) * 100) : 0}% utilisé
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Contrats actifs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contrats signés ({activeContracts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {activeContracts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Aucun contrat signé</p>
            ) : (
              <div className="space-y-2">
                {activeContracts.map((contract) => (
                  <div
                    key={contract.id}
                    onClick={() => navigate(`/contract/${contract.id}`)}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{contract.clientName}</h3>
                      <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                        {contract.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Créé le {format(new Date(contract.createdDate), "dd MMMM yyyy", { locale: fr })}</span>
                      <span>{contract.usedHours}/{contract.totalHours}h utilisées</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Devis */}
        {quoteContracts.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Devis ({quoteContracts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quoteContracts.map((contract) => (
                  <div
                    key={contract.id}
                    onClick={() => navigate(`/contract/${contract.id}`)}
                    className="p-4 border border-warning/50 rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-warning/5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{contract.clientName}</h3>
                      <Badge variant="outline" className="border-warning text-warning">
                        Devis
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Créé le {format(new Date(contract.createdDate), "dd MMMM yyyy", { locale: fr })}</span>
                      <span>{contract.totalHours}h</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contrats archivés */}
        {archivedContracts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Contrats archivés ({archivedContracts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {archivedContracts.map((contract) => (
                  <div
                    key={contract.id}
                    onClick={() => navigate(`/contract/${contract.id}`)}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer opacity-75"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{contract.clientName}</h3>
                      <Badge variant="secondary">Archivé</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Créé le {format(new Date(contract.createdDate), "dd MMMM yyyy", { locale: fr })}</span>
                      <span>{contract.usedHours}/{contract.totalHours}h utilisées</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
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
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmit}>
                Mettre à jour
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDetail;
