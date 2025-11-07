import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface BillingItem {
  id: string;
  clientName: string;
  description: string;
  technician: string;
  isProcessed: boolean;
  createdAt: string;
}

const Billing = () => {
  const navigate = useNavigate();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showProcessed, setShowProcessed] = useState(false);
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [technicians, setTechnicians] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    clientName: "",
    description: "",
    technician: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsData, clientsData, techniciansData] = await Promise.all([
        api.getBillingItems(),
        api.getClientsList(),
        api.getTechniciansList(),
      ]);
      setBillingItems(itemsData);
      setClients(clientsData);
      setTechnicians(techniciansData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.clientName || !formData.description || !formData.technician) {
      toast.error("Tous les champs sont requis");
      return;
    }

    try {
      await api.createBillingItem(formData);
      toast.success("Élément ajouté avec succès");
      setShowAddDialog(false);
      setFormData({ clientName: "", description: "", technician: "" });
      fetchData();
    } catch (error) {
      console.error("Error creating billing item:", error);
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleMarkProcessed = async (id: string) => {
    try {
      await api.markBillingItemProcessed(id);
      toast.success("Marqué comme traité");
      fetchData();
    } catch (error) {
      console.error("Error marking as processed:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const filteredItems = billingItems.filter(
    (item) => item.isProcessed === showProcessed
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <p>Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Facturation</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant={showProcessed ? "outline" : "default"}
              onClick={() => setShowProcessed(false)}
            >
              À traiter
            </Button>
            <Button
              variant={showProcessed ? "default" : "outline"}
              onClick={() => setShowProcessed(true)}
            >
              Traités
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {showProcessed ? "Éléments traités" : "À facturer"}
            </CardTitle>
            {!showProcessed && (
              <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {filteredItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {showProcessed
                  ? "Aucun élément traité"
                  : "Aucun élément à facturer"}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Technicien</TableHead>
                    <TableHead>Date</TableHead>
                    {!showProcessed && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell
                        className="font-medium cursor-pointer hover:underline"
                        onClick={() => navigate(`/clients/${item.clientName}`)}
                      >
                        {item.clientName}
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell>{item.technician}</TableCell>
                      <TableCell>
                        {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      {!showProcessed && (
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkProcessed(item.id)}
                            className="gap-2"
                          >
                            <Check className="h-4 w-4" />
                            Traité
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un élément à facturer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select
                value={formData.clientName}
                onValueChange={(value) =>
                  setFormData({ ...formData, clientName: value })
                }
              >
                <SelectTrigger id="client">
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.name}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Quoi</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Description de la facturation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="technician">Technicien</Label>
              <Select
                value={formData.technician}
                onValueChange={(value) =>
                  setFormData({ ...formData, technician: value })
                }
              >
                <SelectTrigger id="technician">
                  <SelectValue placeholder="Sélectionner un technicien" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech} value={tech}>
                      {tech}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAdd}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;
