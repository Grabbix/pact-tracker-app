import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CronLog {
  timestamp: string;
  type: 'arx_sync' | 'excel_backup';
  message: string;
  status: 'success' | 'error' | 'info';
}

const Admin = () => {
  const navigate = useNavigate();
  const [isTriggering, setIsTriggering] = useState(false);
  const [cronLogs, setCronLogs] = useState<CronLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    fetchCronLogs();
  }, []);

  const fetchCronLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/cron-logs`);
      if (!response.ok) {
        throw new Error('Failed to fetch cron logs');
      }
      const logs = await response.json();
      setCronLogs(logs);
    } catch (error) {
      console.error('Error fetching cron logs:', error);
      toast.error('Erreur lors du chargement des logs');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleTriggerArxSync = async () => {
    setIsTriggering(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/trigger-arx-sync`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to trigger ARX sync');
      }

      const result = await response.json();
      toast.success(result.message || 'Synchronisation ARX déclenchée avec succès');
      // Rafraîchir les logs après la synchronisation
      setTimeout(() => fetchCronLogs(), 1000);
    } catch (error) {
      console.error('Error triggering ARX sync:', error);
      toast.error('Erreur lors du déclenchement de la synchronisation ARX');
    } finally {
      setIsTriggering(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'arx_sync':
        return 'Sync ARX';
      case 'excel_backup':
        return 'Backup Excel';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à l'accueil
        </Button>

        <h1 className="text-4xl font-bold mb-8">Administration</h1>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Synchronisation ARX</CardTitle>
              <CardDescription>
                Déclencher manuellement la synchronisation des comptes ARX
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleTriggerArxSync}
                disabled={isTriggering}
              >
                {isTriggering ? 'Synchronisation en cours...' : 'Trigger ARX'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Logs des tâches planifiées</CardTitle>
                <CardDescription>
                  Historique des synchronisations ARX et backups Excel
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCronLogs}
                disabled={isLoadingLogs}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                {cronLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun log disponible
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cronLogs.map((log, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${getStatusColor(log.status)}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-xs px-2 py-1 rounded bg-background/50">
                                {getTypeLabel(log.type)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleString('fr-FR')}
                              </span>
                            </div>
                            <p className="text-sm mt-2">{log.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;
