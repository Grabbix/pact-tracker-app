import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, X, Save, Settings, Clock, Minus } from "lucide-react";
import { PROJECT_TYPES, ProjectType } from "@/types/project";
import { toast } from "sonner";

interface ProjectTemplate {
  id: string;
  projectType: ProjectType;
  defaultTasks: string[];
  createdAt?: string;
  updatedAt?: string;
}

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

export default function Config() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<ProjectType>("mailinblack");
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(false);

  // Overtime state
  const [overtimeEntries, setOvertimeEntries] = useState<OvertimeEntry[]>([]);
  const [showOvertimeDialog, setShowOvertimeDialog] = useState(false);
  const [overtimeType, setOvertimeType] = useState<"add" | "remove">("add");
  const [selectedTechnician, setSelectedTechnician] = useState<"Théo" | "Vincent">("Théo");
  const [overtimeForm, setOvertimeForm] = useState({
    date: new Date().toISOString().split("T")[0],
    client: "",
    description: "",
    hours: "",
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchTemplates();
    fetchOvertimeEntries();
  }, []);

  useEffect(() => {
    loadTemplate(selectedType);
  }, [selectedType, templates]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/project-templates`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Erreur lors du chargement des templates');
    }
  };

  const loadTemplate = (type: ProjectType) => {
    const template = templates.find(t => t.projectType === type);
    setTasks(template?.defaultTasks || []);
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

  const saveTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/project-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: selectedType,
          defaultTasks: tasks,
        }),
      });

      if (!response.ok) throw new Error('Failed to save template');
      
      toast.success('Template sauvegardé avec succès');
      await fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Erreur lors de la sauvegarde du template');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/project-templates/${selectedType}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete template');
      
      toast.success('Template supprimé');
      setTasks([]);
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erreur lors de la suppression du template');
    }
  };

  // Overtime functions
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
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Configuration</h1>
        </div>
        <p className="text-muted-foreground">
          Configurez les templates de projets et gérez les heures supplémentaires
        </p>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Templates de projets</TabsTrigger>
          <TabsTrigger value="overtime">
            <Clock className="mr-2 h-4 w-4" />
            Heures supplémentaires
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
        <CardHeader>
          <CardTitle>Templates de projets</CardTitle>
          <CardDescription>
            Définissez des tâches par défaut pour chaque type de projet. Ces tâches seront automatiquement ajoutées lors de la création d'un nouveau projet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Type de projet</Label>
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as ProjectType)}>
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
            <Label>Tâches par défaut</Label>
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
              <Label>Tâches configurées ({tasks.length})</Label>
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-md bg-muted/50"
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

          <div className="flex gap-2 pt-4">
            <Button onClick={saveTemplate} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder le template
            </Button>
            {templates.find(t => t.projectType === selectedType) && (
              <Button onClick={deleteTemplate} variant="destructive" disabled={loading}>
                <X className="h-4 w-4 mr-2" />
                Supprimer le template
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="overtime" className="space-y-6">
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
        </TabsContent>
      </Tabs>

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
