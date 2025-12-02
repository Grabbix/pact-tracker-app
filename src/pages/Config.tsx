import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Save, Settings, FolderKanban, FileText } from "lucide-react";
import { PROJECT_TYPES, ProjectType } from "@/types/project";
import { toast } from "sonner";
import MessageTemplatesConfig from "@/components/MessageTemplatesConfig";

interface ProjectTemplate {
  id: string;
  projectType: ProjectType;
  defaultTasks: string[];
  createdAt?: string;
  updatedAt?: string;
}

export default function Config() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<ProjectType>("mailinblack");
  const [tasks, setTasks] = useState<string[]>([]);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchTemplates();
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

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Configuration</h1>
        </div>
        <p className="text-muted-foreground">
          Configurez les templates de projets
        </p>
      </div>

      <Tabs defaultValue="projects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            Templates projets
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <FileText className="h-4 w-4" />
            Modèles messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
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

        <TabsContent value="messages">
          <MessageTemplatesConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
