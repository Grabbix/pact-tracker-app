import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

interface Notification {
  id: string;
  type: "contract" | "project" | "overtime";
  title: string;
  message: string;
  link?: string;
  severity: "info" | "warning" | "error";
}

export function NotificationBadge() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const [contractsRes, projectsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/contracts`),
        fetch(`${API_BASE_URL}/api/projects`),
      ]);

      const contracts = await contractsRes.json();
      const projects = await projectsRes.json();

      const notifs: Notification[] = [];

      // Check contracts at 80%+ usage
      contracts.forEach((contract: any) => {
        if (!contract.is_archived) {
          const usagePercent = (contract.used_hours / contract.total_hours) * 100;
          if (usagePercent >= 95) {
            notifs.push({
              id: `contract-${contract.id}`,
              type: "contract",
              title: "Contrat presque épuisé",
              message: `${contract.client_name}: ${usagePercent.toFixed(0)}% utilisé`,
              link: `/contract/${contract.id}`,
              severity: "error",
            });
          } else if (usagePercent >= 80) {
            notifs.push({
              id: `contract-${contract.id}`,
              type: "contract",
              title: "Contrat à surveiller",
              message: `${contract.client_name}: ${usagePercent.toFixed(0)}% utilisé`,
              link: `/contract/${contract.id}`,
              severity: "warning",
            });
          }
        }
      });

      // Check projects with approaching or passed delivery dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      projects.forEach((project: any) => {
        if (project.status === "calé" && project.deliveryDate) {
          const deliveryDate = new Date(project.deliveryDate);
          deliveryDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            notifs.push({
              id: `project-${project.id}`,
              type: "project",
              title: "Projet en retard",
              message: `${project.name}: livraison prévue le ${new Date(project.deliveryDate).toLocaleDateString("fr-FR")}`,
              link: `/projects/${project.id}`,
              severity: "error",
            });
          } else if (diffDays <= 7) {
            notifs.push({
              id: `project-${project.id}`,
              type: "project",
              title: "Livraison proche",
              message: `${project.name}: dans ${diffDays} jour${diffDays > 1 ? "s" : ""}`,
              link: `/projects/${project.id}`,
              severity: "warning",
            });
          }
        }
      });

      setNotifications(notifs);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "bg-destructive text-destructive-foreground";
      case "warning":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-primary text-primary-foreground";
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full relative">
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {notifications.length > 9 ? "9+" : notifications.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b p-4">
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-sm text-muted-foreground">
            {notifications.length} action{notifications.length > 1 ? "s" : ""} nécessaire{notifications.length > 1 ? "s" : ""}
          </p>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Aucune notification</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => notif.link && navigate(notif.link)}
                  className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors mb-2"
                >
                  <div className="flex items-start gap-3">
                    <Badge className={`${getSeverityColor(notif.severity)} mt-1`} variant="secondary">
                      {notif.type === "contract" ? "C" : "P"}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{notif.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
