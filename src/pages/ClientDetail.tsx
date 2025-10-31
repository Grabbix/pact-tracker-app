import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Phone, Mail, User, MapPin, Edit, Globe, Shield } from "lucide-react";
import { api } from "@/lib/api";
import { Client } from "@/types/client";
import { Contract } from "@/types/contract";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const [clientData, contractsData] = await Promise.all([
        api.getClient(id!),
        api.getContracts()
      ]);
      setClient(clientData);
      setContracts(contractsData.filter(c => c.clientId === id));
    } catch (error) {
      console.error("Error fetching client data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
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

  const activeContracts = contracts.filter(c => !c.isArchived);
  const archivedContracts = contracts.filter(c => c.isArchived);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/clients")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{client.name}</h1>
          </div>
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

        {/* Contrats actifs */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contrats actifs ({activeContracts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {activeContracts.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Aucun contrat actif</p>
            ) : (
              <div className="space-y-2">
                {activeContracts.map((contract) => (
                  <div
                    key={contract.id}
                    onClick={() => navigate(`/contracts/${contract.id}`)}
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
                    onClick={() => navigate(`/contracts/${contract.id}`)}
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
    </div>
  );
};

export default ClientDetail;
