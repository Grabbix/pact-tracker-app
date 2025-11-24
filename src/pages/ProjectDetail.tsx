import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Trash2, Plus, Archive, ArchiveRestore, Edit2 } from "lucide-react";
import { Project, PROJECT_TYPES, PROJECT_STATUSES, ProjectType, ProjectStatus, ProjectTask } from "@/types/project";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CompleteTaskDialog } from "@/components/CompleteTaskDialog";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [projectType, setProjectType] = useState<ProjectType>("autre");
  const [status, setStatus] = useState<ProjectStatus>("à organiser");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newTask, setNewTask] = useState("");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<ProjectTask | null>(null);
  const [statusSelectOpen, setStatusSelectOpen] = useState(false);

  useEffect(() => {
    loadProject();
    loadTasks();
  }, [id]);

  const loadProject = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      const data = await response.json();
      setProject(data);
      setProjectType(data.projectType);
      setStatus(data.status);
      setTitle(data.title);
      setDescription(data.description || "");
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le projet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const handleUpdateProject = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectType, status, title, description }),
      });
      if (!response.ok) throw new Error('Failed to update project');
      await loadProject();
      setEditing(false);
      toast({
        title: "Projet mis à jour",
      });
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le projet",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      setStatus(newStatus);
      await loadProject();
      toast({
        title: "Statut mis à jour",
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleArchiveToggle = async () => {
    try {
      const endpoint = project?.isArchived ? 'unarchive' : 'archive';
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}/${endpoint}`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error('Failed to toggle archive');
      await loadProject();
      toast({
        title: project?.isArchived ? "Projet désarchivé" : "Projet archivé",
      });
    } catch (error) {
      console.error('Error toggling archive:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });
      if (!response.ok) throw new Error('Failed to add note');
      setNewNote("");
      await loadProject();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Supprimer cette note ?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/project-notes/${noteId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete note');
      await loadProject();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskName: newTask }),
      });
      if (!response.ok) throw new Error('Failed to add task');
      setNewTask("");
      await loadTasks();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleTaskCheck = async (task: ProjectTask, checked: boolean) => {
    if (checked) {
      setTaskToComplete(task);
      setCompleteDialogOpen(true);
    } else {
      try {
        const response = await fetch(`${API_BASE_URL}/api/project-tasks/${task.id}/uncomplete`, {
          method: 'PATCH',
        });
        if (!response.ok) throw new Error('Failed to uncomplete task');
        await loadTasks();
      } catch (error) {
        console.error('Error uncompleting task:', error);
      }
    }
  };

  const handleCompleteTask = async (details: string) => {
    if (!taskToComplete) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/project-tasks/${taskToComplete.id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completionDetails: details }),
      });
      if (!response.ok) throw new Error('Failed to complete task');
      setTaskToComplete(null);
      await loadTasks();
      await loadProject();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/project-tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete task');
      await loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-5xl mx-auto">
          <Button variant="ghost" onClick={() => navigate("/projects")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux projets
          </Button>
          <p className="text-center text-muted-foreground mt-8">Projet introuvable</p>
        </div>
      </div>
    );
  }

  const projectTypeInfo = PROJECT_TYPES.find(t => t.value === project.projectType);
  const statusInfo = PROJECT_STATUSES.find(s => s.value === project.status);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case "à organiser":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case "calé":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      case "en cours":
        return "bg-green-500/10 text-green-700 border-green-500/20";
      case "état projet":
        return "bg-purple-500/10 text-purple-700 border-purple-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/projects")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux projets
          </Button>
          <Button
            variant="outline"
            onClick={handleArchiveToggle}
          >
            {project.isArchived ? (
              <>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Désarchiver
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Archiver
              </>
            )}
          </Button>
        </div>

        {/* Informations générales */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${projectTypeInfo?.color}`} />
                  <CardTitle className="text-2xl">{project.title}</CardTitle>
                  {project.isArchived && (
                    <Badge variant="outline" className="bg-gray-500/10 text-gray-700 border-gray-500/20">
                      Archivé
                    </Badge>
                  )}
                </div>
              </div>
              {!editing && (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {editing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type de projet</Label>
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
                    <Label>Statut</Label>
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
                  <Label>Titre</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titre du projet"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description du projet"
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => {
                    setEditing(false);
                    setProjectType(project.projectType);
                    setStatus(project.status);
                    setTitle(project.title);
                    setDescription(project.description || "");
                  }}>
                    Annuler
                  </Button>
                  <Button onClick={handleUpdateProject}>
                    Enregistrer
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <Label className="text-muted-foreground">Client</Label>
                    <Button
                      variant="link"
                      className="h-auto p-0 font-medium text-base text-foreground hover:text-primary"
                      onClick={() => navigate(`/clients/${project.clientId}`)}
                    >
                      {project.clientName}
                    </Button>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-3 h-3 rounded-full ${projectTypeInfo?.color}`} />
                      <span className="font-medium">{projectTypeInfo?.label}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Statut</Label>
                    <div className="mt-1">
                      <Select value={status} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-fit border-0 p-0 h-auto">
                          <Badge
                            variant="outline"
                            className={`${getStatusColor(project.status)} cursor-pointer hover:opacity-80`}
                          >
                            {statusInfo?.label}
                          </Badge>
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
                </div>

                <div>
                  <Label className="text-muted-foreground">Créé le</Label>
                  <p className="font-medium">
                    {format(new Date(project.createdAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </div>

                {project.deliveryDate && (
                  <div>
                    <Label className="text-muted-foreground">Date de livraison</Label>
                    <p className="font-medium text-blue-600">
                      {format(new Date(project.deliveryDate), "dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                )}

                {project.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm whitespace-pre-wrap mt-1">{project.description}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-6">
          {/* Tâches */}
          <Card>
            <CardHeader>
              <CardTitle>Tâches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Nouvelle tâche..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTask();
                    }
                  }}
                />
                <Button
                  onClick={handleAddTask}
                  disabled={!newTask.trim()}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 bg-muted rounded-lg group"
                    >
                      <Checkbox
                        checked={task.isCompleted}
                        onCheckedChange={(checked) => handleTaskCheck(task, checked as boolean)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                          {task.taskName}
                        </p>
                        {task.isCompleted && task.completedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(task.completedAt), "dd MMM yyyy", { locale: fr })}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(task.id)}
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune tâche</p>
              )}
            </CardContent>
          </Card>

          {/* Notes de suivi */}
          <Card>
            <CardHeader>
              <CardTitle>Suivi du projet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Nouvelle note de suivi..."
                  rows={2}
                />
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  size="icon"
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {project.notes.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {project.notes
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((note) => (
                      <div
                        key={note.id}
                        className="p-3 bg-muted rounded-lg space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm whitespace-pre-wrap flex-1">{note.note}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteNote(note.id)}
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(note.createdAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune note</p>
              )}
            </CardContent>
          </Card>
        </div>

        <CompleteTaskDialog
          taskName={taskToComplete?.taskName || ""}
          open={completeDialogOpen}
          onOpenChange={setCompleteDialogOpen}
          onComplete={handleCompleteTask}
        />
      </div>
    </div>
  );
};

export default ProjectDetail;
