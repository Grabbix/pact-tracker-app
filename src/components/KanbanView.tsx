import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Project, PROJECT_TYPES, PROJECT_STATUSES, ProjectStatus } from "@/types/project";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface KanbanViewProps {
  projects: Project[];
  onProjectClick: (id: string) => void;
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => void;
}

interface KanbanCardProps {
  project: Project;
  onProjectClick: (id: string) => void;
}

const KanbanCard = ({ project, onProjectClick }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const projectTypeInfo = PROJECT_TYPES.find(t => t.value === project.projectType);
  const deliveryDate = project.deliveryDate ? parseISO(project.deliveryDate) : null;
  const isOverdue = deliveryDate && deliveryDate < new Date() && project.status !== "état projet";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-3"
    >
      <Card
        className="cursor-move hover:shadow-md transition-shadow"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
          onProjectClick(project.id);
        }}
      >
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${projectTypeInfo?.color}`} />
              <h4 className="font-semibold text-sm line-clamp-2">{project.title}</h4>
            </div>

            <p className="text-xs text-muted-foreground">{project.clientName}</p>

            {project.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {projectTypeInfo?.label}
              </Badge>
              {deliveryDate && (
                <Badge variant="outline" className={`text-xs ${isOverdue ? "bg-red-500/10 text-red-700 border-red-500/20" : "bg-blue-500/10 text-blue-700 border-blue-500/20"}`}>
                  {format(deliveryDate, "dd/MM/yyyy")}
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-700 border-red-500/20">
                  En retard
                </Badge>
              )}
            </div>

            {project.notes.length > 0 && (() => {
              const lastNote = [...project.notes].sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0];
              
              return (
                <div className="mt-2 p-2 bg-muted/50 rounded text-xs border border-border/50">
                  <p className="text-foreground line-clamp-2">{lastNote.note}</p>
                </div>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const KanbanColumn = ({ 
  status, 
  projects, 
  onProjectClick 
}: { 
  status: ProjectStatus; 
  projects: Project[]; 
  onProjectClick: (id: string) => void;
}) => {
  const statusInfo = PROJECT_STATUSES.find(s => s.value === status);
  const projectIds = projects.map(p => p.id);

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
    <div className="flex-1 min-w-[280px]">
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {statusInfo?.label}
            </CardTitle>
            <Badge variant="outline" className={getStatusColor(status)}>
              {projects.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <SortableContext items={projectIds} strategy={verticalListSortingStrategy}>
            <div className="min-h-[200px]">
              {projects.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Aucun projet
                </div>
              ) : (
                projects.map((project) => (
                  <KanbanCard
                    key={project.id}
                    project={project}
                    onProjectClick={onProjectClick}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  );
};

export const KanbanView = ({ projects, onProjectClick, onStatusChange }: KanbanViewProps) => {
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const project = projects.find(p => p.id === event.active.id);
    setActiveProject(project || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveProject(null);

    if (!over) return;

    const projectId = active.id as string;
    const newStatus = over.id as ProjectStatus;

    const project = projects.find(p => p.id === projectId);
    if (project && project.status !== newStatus) {
      onStatusChange(projectId, newStatus);
    }
  };

  const projectsByStatus = PROJECT_STATUSES.reduce((acc, statusInfo) => {
    acc[statusInfo.value] = projects.filter(p => p.status === statusInfo.value);
    return acc;
  }, {} as Record<ProjectStatus, Project[]>);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PROJECT_STATUSES.map((statusInfo) => (
          <SortableContext
            key={statusInfo.value}
            items={[statusInfo.value]}
            strategy={verticalListSortingStrategy}
          >
            <div id={statusInfo.value} className="flex-1 min-w-[280px]">
              <KanbanColumn
                status={statusInfo.value}
                projects={projectsByStatus[statusInfo.value]}
                onProjectClick={onProjectClick}
              />
            </div>
          </SortableContext>
        ))}
      </div>

      <DragOverlay>
        {activeProject ? (
          <Card className="cursor-move shadow-lg rotate-3 opacity-90">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${PROJECT_TYPES.find(t => t.value === activeProject.projectType)?.color}`} />
                  <h4 className="font-semibold text-sm line-clamp-2">{activeProject.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground">{activeProject.clientName}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
