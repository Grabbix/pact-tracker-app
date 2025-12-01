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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Archive, ArchiveRestore, ArrowUpDown, Calendar as CalendarIcon, Clock, Kanban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { AddProjectDialog } from "@/components/AddProjectDialog";
import { Project, PROJECT_TYPES, PROJECT_STATUSES, ProjectType, ProjectStatus } from "@/types/project";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { KanbanView } from "@/components/KanbanView";
import { toast } from "sonner";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Projects = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [sortBy, setSortBy] = useState<"createdAt" | "deliveryDate">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [typeFilter, setTypeFilter] = useState<ProjectType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "kanban">("list");

  const {
    projects,
    loading,
    addProject,
    updateProject,
    archiveProject,
  } = useProjects(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/clients`)
      .then((res) => res.json())
      .then(setClients)
      .catch(console.error);
  }, []);

  const handleArchive = async (projectId: string) => {
    await archiveProject(projectId);
  };

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    try {
      await updateProject(projectId, { status: newStatus });
      toast.success("Statut du projet mis à jour");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast.error("Impossible de mettre à jour le statut");
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  // Filtrer et trier les projets (seulement actifs)
  const filteredProjects = projects
    .filter(p => !p.isArchived)
    .filter(p => typeFilter === "all" || p.projectType === typeFilter)
    .filter(p => statusFilter === "all" || p.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === "deliveryDate") {
        // Projets sans date de livraison à la fin
        if (!a.deliveryDate && !b.deliveryDate) return 0;
        if (!a.deliveryDate) return 1;
        if (!b.deliveryDate) return -1;
        
        const dateA = new Date(a.deliveryDate).getTime();
        const dateB = new Date(b.deliveryDate).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      } else {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
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
          <AddProjectDialog onAdd={addProject} clients={clients} onClientCreated={() => {
            fetch(`${API_BASE_URL}/api/clients`)
              .then((res) => res.json())
              .then(setClients)
              .catch(console.error);
          }} />
        </div>

        {/* Vue et Filtres */}
        <div className="mb-6 space-y-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "calendar" | "kanban")}>
            <TabsList>
              <TabsTrigger value="list">Liste</TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Calendrier
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <Kanban className="mr-2 h-4 w-4" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => navigate("/timeline")}
              className="gap-2"
            >
              <Clock className="h-4 w-4" />
              Timeline globale
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filtres</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
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
                  <label className="text-sm font-medium mb-2 block">Trier par</label>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as "createdAt" | "deliveryDate")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Date de création</SelectItem>
                      <SelectItem value="deliveryDate">Date de livraison</SelectItem>
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
                    onClick={() => navigate("/projects/archived")}
                    className="w-full gap-2"
                  >
                    <Archive className="h-4 w-4" />
                    Voir les archives
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contenu selon le mode de vue */}
        {loading ? (
          <p className="text-center text-muted-foreground">Chargement...</p>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucun projet trouvé
            </CardContent>
          </Card>
        ) : viewMode === "list" ? (
          <div className="grid gap-4">
            {filteredProjects.map((project) => {
              const projectTypeInfo = PROJECT_TYPES.find(t => t.value === project.projectType);
              const statusInfo = PROJECT_STATUSES.find(s => s.value === project.status);

              return (
                <Card
                  key={project.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
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
                          {project.deliveryDate && (
                            <span className="text-blue-600 font-medium">
                              <strong>Livraison:</strong>{" "}
                              {format(parseISO(project.deliveryDate), "dd MMMM yyyy", { locale: fr })}
                            </span>
                          )}
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

                        {project.notes.length > 0 && (() => {
                          const lastNote = [...project.notes].sort((a, b) => 
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                          )[0];
                          
                          return (
                            <div className="mt-3 p-3 bg-muted/50 rounded-md border border-border/50">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="text-xs font-semibold text-primary">
                                  Dernier suivi
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(lastNote.createdAt), "dd/MM/yyyy à HH:mm", { locale: fr })}
                                </span>
                              </div>
                              <p className="text-sm text-foreground line-clamp-2">
                                {lastNote.note}
                              </p>
                            </div>
                          );
                        })()}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchive(project.id);
                        }}
                        title="Archiver"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : viewMode === "calendar" ? (
          <CalendarView projects={filteredProjects} onProjectClick={(id) => navigate(`/projects/${id}`)} />
        ) : (
          <KanbanView 
            projects={filteredProjects} 
            onProjectClick={(id) => navigate(`/projects/${id}`)}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </div>
  );
};

// Composant Vue Calendrier
const CalendarView = ({ projects, onProjectClick }: { projects: Project[], onProjectClick: (id: string) => void }) => {
  const projectsWithDates = projects.filter(p => p.deliveryDate);
  
  // Grouper par mois
  const projectsByMonth = projectsWithDates.reduce((acc, project) => {
    const monthKey = format(parseISO(project.deliveryDate!), "MMMM yyyy", { locale: fr });
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  const sortedMonths = Object.keys(projectsByMonth).sort((a, b) => {
    const dateA = parseISO(projectsByMonth[a][0].deliveryDate!);
    const dateB = parseISO(projectsByMonth[b][0].deliveryDate!);
    return dateA.getTime() - dateB.getTime();
  });

  if (projectsWithDates.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucun projet avec date de livraison
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {sortedMonths.map((monthKey) => {
        const monthProjects = projectsByMonth[monthKey].sort((a, b) => {
          const dateA = parseISO(a.deliveryDate!);
          const dateB = parseISO(b.deliveryDate!);
          return dateA.getTime() - dateB.getTime();
        });

        return (
          <Card key={monthKey}>
            <CardHeader>
              <CardTitle className="capitalize">{monthKey}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthProjects.map((project) => {
                  const projectTypeInfo = PROJECT_TYPES.find(t => t.value === project.projectType);
                  const statusInfo = PROJECT_STATUSES.find(s => s.value === project.status);
                  const deliveryDate = parseISO(project.deliveryDate!);
                  const isOverdue = deliveryDate < new Date() && project.status !== "état projet";

                  return (
                    <div
                      key={project.id}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      onClick={() => onProjectClick(project.id)}
                    >
                      <div className="text-center min-w-[60px]">
                        <div className={`text-2xl font-bold ${isOverdue ? "text-red-600" : "text-blue-600"}`}>
                          {format(deliveryDate, "dd")}
                        </div>
                        <div className="text-xs text-muted-foreground uppercase">
                          {format(deliveryDate, "EEE", { locale: fr })}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full ${projectTypeInfo?.color}`} />
                          <span className="font-semibold">{project.title}</span>
                          <Badge variant="outline" className={`${isOverdue ? "bg-red-500/10 text-red-700 border-red-500/20" : ""}`}>
                            {statusInfo?.label}
                          </Badge>
                          {isOverdue && (
                            <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20">
                              En retard
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{project.clientName}</span>
                          <span>•</span>
                          <span>{projectTypeInfo?.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default Projects;
