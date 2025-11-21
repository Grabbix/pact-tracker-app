import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus } from "lucide-react";
import { Project, PROJECT_TYPES, PROJECT_STATUSES, ProjectType, ProjectStatus } from "@/types/project";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ProjectDetailDialogProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: {
    projectType?: ProjectType;
    status?: ProjectStatus;
    title?: string;
    description?: string;
  }) => Promise<void>;
  onAddNote: (note: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
}

export const ProjectDetailDialog = ({
  project,
  open,
  onOpenChange,
  onUpdate,
  onAddNote,
  onDeleteNote,
}: ProjectDetailDialogProps) => {
  const [editing, setEditing] = useState(false);
  const [projectType, setProjectType] = useState<ProjectType>(project?.projectType || "autre");
  const [status, setStatus] = useState<ProjectStatus>(project?.status || "à organiser");
  const [title, setTitle] = useState(project?.title || "");
  const [description, setDescription] = useState(project?.description || "");
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);

  if (!project) return null;

  const projectTypeInfo = PROJECT_TYPES.find(t => t.value === project.projectType);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onUpdate({
        projectType,
        status,
        title,
        description,
      });
      setEditing(false);
    } catch (error) {
      console.error("Error updating project:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    setLoading(true);
    try {
      await onAddNote(newNote);
      setNewNote("");
    } catch (error) {
      console.error("Error adding note:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Supprimer cette note ?")) return;
    
    setLoading(true);
    try {
      await onDeleteNote(noteId);
    } catch (error) {
      console.error("Error deleting note:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Détails du projet</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Informations</h3>
              {!editing ? (
                <Button variant="outline" onClick={() => {
                  setEditing(true);
                  setProjectType(project.projectType);
                  setStatus(project.status);
                  setTitle(project.title);
                  setDescription(project.description || "");
                }}>
                  Modifier
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? "Enregistrement..." : "Enregistrer"}
                  </Button>
                </div>
              )}
            </div>

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
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Client</Label>
                    <p className="font-medium">{project.clientName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Type</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-3 h-3 rounded-full ${projectTypeInfo?.color}`} />
                      <span className="font-medium">{projectTypeInfo?.label}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Statut</Label>
                    <p className="font-medium">
                      {PROJECT_STATUSES.find(s => s.value === project.status)?.label}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Créé le</Label>
                    <p className="font-medium">
                      {format(new Date(project.createdAt), "dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Titre</Label>
                  <p className="font-medium">{project.title}</p>
                </div>

                {project.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm whitespace-pre-wrap">{project.description}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <Separator />

          {/* Notes de suivi */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Suivi du projet</h3>

            {/* Ajouter une note */}
            <div className="space-y-2">
              <Label>Nouvelle note</Label>
              <div className="flex gap-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ajouter une note de suivi..."
                  rows={3}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddNote}
                  disabled={loading || !newNote.trim()}
                  size="icon"
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Liste des notes */}
            {project.notes.length > 0 ? (
              <div className="space-y-3">
                {project.notes
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((note) => (
                    <div
                      key={note.id}
                      className="p-3 bg-muted rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm whitespace-pre-wrap flex-1">{note.note}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={loading}
                          className="h-8 w-8 shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(note.createdAt), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune note de suivi</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
