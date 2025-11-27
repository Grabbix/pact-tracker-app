import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, X, Clock, Minus } from "lucide-react";
import { toast } from "sonner";

interface OvertimeEntry {
  id: string;
  technician: string;
  date: string;
  client: string;
  description: string;
  hours: number;
  type: "add" | "remove";
  createdAt: string;
}

export default function Technicians() {
  const [overtimeEntries, setOvertimeEntries] = useState<OvertimeEntry[]>([]);
  const [showOvertimeDialog, setShowOvertimeDialog] = useState(false);
  const [overtimeType, setOvertimeType] = useState<"add" | "remove">("add");
  const [selectedTechnician, setSelectedTechnician] = useState<"Théo" | "Vincent">("Théo");
  const [loading, setLoading] = useState(false);
  const [overtimeForm, setOvertimeForm] = useState({
    date: new Date().toISOString().split("T")[0],
    client: "",
    description: "",
    hours: "",
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchOvertimeEntries();
  }, []);

  const fetchOvertimeEntries = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/overtime-hours`);
      if (!response.ok) throw new Error('Failed to fetch overtime');
      const data = await response.json();
      setOvertimeEntries(data);
    } catch (error) {
      console.error('Error fetching overtime:', error);
      toast.error('Erreur lors du chargement des heures supplémentaires');
    }
  };

  const addOvertimeEntry = async () => {
    if (!overtimeForm.client || !overtimeForm.description || !overtimeForm.hours) {
      toast.error("Tous les champs sont requis");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/overtime-hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technician: selectedTechnician,
          date: overtimeForm.date,
          client: overtimeForm.client,
          description: overtimeForm.description,
          hours: parseFloat(overtimeForm.hours),
          type: overtimeType,
        }),
      });

      if (!response.ok) throw new Error('Failed to add overtime');
      
      toast.success(overtimeType === "add" ? "Heures supplémentaires ajoutées" : "Heures récupérées");
      setShowOvertimeDialog(false);
      setOvertimeForm({ date: new Date().toISOString().split("T")[0], client: "", description: "", hours: "" });
      await fetchOvertimeEntries();
    } catch (error) {
      console.error('Error adding overtime:', error);
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setLoading(false);
    }
  };

  const deleteOvertimeEntry = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/overtime-hours/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete overtime');
      
      toast.success('Entrée supprimée');
      await fetchOvertimeEntries();
    } catch (error) {
      console.error('Error deleting overtime:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const getOvertimeBalance = (technician: string) => {
    return overtimeEntries
      .filter(e => e.technician === technician)
      .reduce((acc, entry) => {
        return entry.type === "add" ? acc + entry.hours : acc - entry.hours;
      }, 0);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Heures supplémentaires</h1>
        </div>
        <p className="text-muted-foreground">
          Gestion des heures supplémentaires des techniciens
        </p>
      </div>

      <div className="space-y-6">
        {["Théo", "Vincent"].map((tech) => {
          const techEntries = overtimeEntries.filter(e => e.technician === tech);
          const balance = getOvertimeBalance(tech);
          
          return (
            <Card key={tech}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{tech}</CardTitle>
                    <CardDescription>
                      Solde: <span className={balance > 0 ? "text-green-600 font-semibold" : "text-muted-foreground font-semibold"}>
                        {balance.toFixed(2)} heures
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedTechnician(tech as "Théo" | "Vincent");
                        setOvertimeType("add");
                        setShowOvertimeDialog(true);
                      }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </Button>
                    {balance > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTechnician(tech as "Théo" | "Vincent");
                          setOvertimeType("remove");
                          setShowOvertimeDialog(true);
                        }}
                        className="gap-2"
                      >
                        <Minus className="h-4 w-4" />
                        Rattraper
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {techEntries.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Aucune heure supplémentaire enregistrée
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Heures</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {techEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {new Date(entry.date).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell>{entry.client}</TableCell>
                          <TableCell>{entry.description}</TableCell>
                          <TableCell className={`text-right font-semibold ${entry.type === "add" ? "text-green-600" : "text-red-600"}`}>
                            {entry.type === "add" ? "+" : "-"}{entry.hours}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteOvertimeEntry(entry.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showOvertimeDialog} onOpenChange={setShowOvertimeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {overtimeType === "add" ? "Ajouter des heures supplémentaires" : "Rattraper des heures"}
              {" - "}{selectedTechnician}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={overtimeForm.date}
                onChange={(e) => setOvertimeForm({ ...overtimeForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Input
                id="client"
                value={overtimeForm.client}
                onChange={(e) => setOvertimeForm({ ...overtimeForm, client: e.target.value })}
                placeholder="Nom du client"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={overtimeForm.description}
                onChange={(e) => setOvertimeForm({ ...overtimeForm, description: e.target.value })}
                placeholder="Objet de l'intervention"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hours">Nombre d'heures</Label>
              <Input
                id="hours"
                type="number"
                step="0.5"
                min="0"
                value={overtimeForm.hours}
                onChange={(e) => setOvertimeForm({ ...overtimeForm, hours: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOvertimeDialog(false)}>
              Annuler
            </Button>
            <Button onClick={addOvertimeEntry} disabled={loading}>
              {overtimeType === "add" ? "Ajouter" : "Rattraper"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
