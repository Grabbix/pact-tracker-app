import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Archive, ArchiveRestore, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { AddProjectDialog } from "@/components/AddProjectDialog";
import { ProjectDetailDialog } from "@/components/ProjectDetailDialog";
import { Project, PROJECT_TYPES, PROJECT_STATUSES, ProjectType, ProjectStatus } from "@/types/project";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const API_BASE_URL = 'http://localhost:3001/api';

const Projects = () => {
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const [clients, setClients] = useState([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [typeFilter, setTypeFilter] = useState<ProjectType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const {
    projects,
    loading,
    addProject,
    updateProject,
    archiveProject,
    unarchiveProject,
    addNote,
    deleteNote,
  } = useProjects(showArchived);

  useEffect(() => {
    fetch(`${API_BASE_URL}/clients`)
      .then((res) => res.json())
      .then(setClients)
      .catch(console.error);
  }, []);

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
    setDetailDialogOpen(true);
  };

  const handleUpdateProject = async (updates: {
    projectType?: ProjectType;
    status?: ProjectStatus;
    title?: string;
    description?: string;
  }) => {
    if (!selectedProject) return;
    await updateProject(selectedProject.id, updates);
    // Refetch to update the selected project
    const updatedProject = projects.find(p => p.id === selectedProject.id);
    if (updatedProject) {
      setSelectedProject(updatedProject);
    }
  };

  const handleAddNote = async (note: string) => {
    if (!selectedProject) return;
    await addNote(selectedProject.id, note);
    // Refetch to update the selected project
    const updatedProject = projects.find(p => p.id === selectedProject.id);
    if (updatedProject) {
      setSelectedProject(updatedProject);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId);
    // Refetch to update the selected project
    if (selectedProject) {
      const updatedProject = projects.find(p => p.id === selectedProject.id);
      if (updatedProject) {
        setSelectedProject(updatedProject);
      }
    }
  };

  const handleArchiveToggle = async (projectId: string, isArchived: boolean) => {
    if (isArchived) {
      await unarchiveProject(projectId);
    } else {
      await archiveProject(projectId);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  // Filtrer et trier les projets
  const filteredProjects = projects
    .filter(p => typeFilter === "all" || p.projectType === typeFilter)
    .filter(p => statusFilter === "all" || p.status === statusFilter)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

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
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à l'accueil
            </Button>
            <h1 className="text-4xl font-bold">Gestion de projets</h1>
          </div>
          <AddProjectDialog onAdd={addProject} clients={clients} />
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Type de projet</label>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as ProjectType | "all")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
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

              <div>
                <label className="text-sm font-medium mb-2 block">Statut</label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ProjectStatus | "all")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {PROJECT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Ordre</label>
                <Button variant="outline" onClick={toggleSortOrder} className="w-full">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  {sortOrder === "asc" ? "Plus ancien" : "Plus récent"}
                </Button>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Archivés</label>
                <Button
                  variant="outline"
                  onClick={() => setShowArchived(!showArchived)}
                  className="w-full"
                >
                  {showArchived ? "Masquer" : "Afficher"} archivés
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des projets */}
        {loading ? (
          <p className="text-center text-muted-foreground">Chargement...</p>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucun projet trouvé
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredProjects.map((project) => {
              const projectTypeInfo = PROJECT_TYPES.find(t => t.value === project.projectType);
              const statusInfo = PROJECT_STATUSES.find(s => s.value === project.status);

              return (
                <Card
                  key={project.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleProjectClick(project)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${projectTypeInfo?.color}`} />
                          <h3 className="font-semibold text-lg">{project.title}</h3>
                          <Badge variant="outline" className={getStatusColor(project.status)}>
                            {statusInfo?.label}
                          </Badge>
                          {project.isArchived && (
                            <Badge variant="outline" className="bg-gray-500/10 text-gray-700 border-gray-500/20">
                              Archivé
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span>
                            <strong>Client:</strong> {project.clientName}
                          </span>
                          <span>
                            <strong>Type:</strong> {projectTypeInfo?.label}
                          </span>
                          <span>
                            <strong>Créé le:</strong>{" "}
                            {format(new Date(project.createdAt), "dd MMMM yyyy", { locale: fr })}
                          </span>
                          {project.notes.length > 0 && (
                            <span>
                              <strong>Notes:</strong> {project.notes.length}
                            </span>
                          )}
                        </div>

                        {project.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {project.description}
                          </p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveToggle(project.id, project.isArchived);
                        }}
                      >
                        {project.isArchived ? (
                          <ArchiveRestore className="h-4 w-4" />
                        ) : (
                          <Archive className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialog de détails */}
        <ProjectDetailDialog
          project={selectedProject}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          onUpdate={handleUpdateProject}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
        />
      </div>
    </div>
  );
};

export default Projects;
