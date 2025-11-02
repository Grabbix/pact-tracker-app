import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Phone, Mail, User, MapPin, Edit, Globe, Shield, Clock, TrendingUp } from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedName, setEditedName] = useState("");

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
    setEditedName(client?.name || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveClientName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedName.trim() || !id) {
      toast.error("Le nom du client ne peut pas être vide");
      return;
    }

    try {
      await api.updateClient(id, { ...client!, name: editedName });
      toast.success("Nom du client modifié avec succès");
      fetchClientData();
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating client name:", error);
      toast.error("Erreur lors de la modification du nom");
    }
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
                  <div className="flex flex-wrap gap-1">
                    {client.domains.map((domain, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{domain}</Badge>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le nom du client</DialogTitle>
            <DialogDescription>
              Modifiez le nom du client
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveClientName}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nom du client</Label>
                <Input
                  id="name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="Nom du client"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDetail;
