import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import { PROJECT_TYPES } from "@/types/project";

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  deliveryDate: string | null;
  clientName: string;
  createdAt: string;
}

export default function Timeline() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects`);
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();
      
      // Filter only projects with delivery dates and sort by date
      const projectsWithDates = data
        .filter((p: Project) => p.deliveryDate && p.status === "calé")
        .sort((a: Project, b: Project) => 
          new Date(a.deliveryDate!).getTime() - new Date(b.deliveryDate!).getTime()
        );
      
      setProjects(projectsWithDates);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Erreur lors du chargement des projets");
    } finally {
      setLoading(false);
    }
  };

  const getProjectTypeInfo = (type: string) => {
    return PROJECT_TYPES.find(t => t.value === type) || PROJECT_TYPES[0];
  };

  const getDateStatus = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { label: "En retard", variant: "destructive" as const, days: Math.abs(diffDays) };
    } else if (diffDays === 0) {
      return { label: "Aujourd'hui", variant: "default" as const, days: 0 };
    } else if (diffDays <= 7) {
      return { label: "Cette semaine", variant: "secondary" as const, days: diffDays };
    } else if (diffDays <= 30) {
      return { label: "Ce mois", variant: "outline" as const, days: diffDays };
    }
    return { label: "À venir", variant: "outline" as const, days: diffDays };
  };

  const groupProjectsByMonth = () => {
    const groups: { [key: string]: Project[] } = {};
    
    projects.forEach(project => {
      if (project.deliveryDate) {
        const date = new Date(project.deliveryDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
        
        if (!groups[monthLabel]) {
          groups[monthLabel] = [];
        }
        groups[monthLabel].push(project);
      }
    });
    
    return groups;
  };

  const groupedProjects = groupProjectsByMonth();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/projects")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Calendar className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Timeline des projets</h1>
          </div>
          <p className="text-muted-foreground ml-14">
            Vue chronologique de tous les projets calés avec date de livraison
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Aucun projet calé avec date de livraison</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedProjects).map(([month, monthProjects]) => (
            <div key={month}>
              <h2 className="text-2xl font-semibold mb-4 capitalize">{month}</h2>
              <div className="space-y-3">
                {monthProjects.map((project) => {
                  const typeInfo = getProjectTypeInfo(project.type);
                  const dateStatus = getDateStatus(project.deliveryDate!);
                  
                  return (
                    <Card
                      key={project.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-3 h-3 rounded-full ${typeInfo.color}`} />
                              <h3 className="font-semibold text-lg truncate">{project.name}</h3>
                              <Badge variant={dateStatus.variant}>
                                {dateStatus.label}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span>Client: {project.clientName}</span>
                              <span>Type: {typeInfo.label}</span>
                              <span>Statut: {project.status}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-medium mb-1">
                              {new Date(project.deliveryDate!).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                            {dateStatus.days > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Dans {dateStatus.days} jour{dateStatus.days > 1 ? "s" : ""}
                              </div>
                            )}
                            {dateStatus.days < 0 && (
                              <div className="text-xs text-destructive">
                                Retard de {dateStatus.days} jour{dateStatus.days < -1 ? "s" : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
