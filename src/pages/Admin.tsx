import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, ChevronDown, ChevronUp, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface CronLog {
  id: string;
  timestamp: string;
  type: 'arx_sync' | 'excel_backup';
  message: string;
  status: 'success' | 'error' | 'info';
  details?: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [isTriggering, setIsTriggering] = useState(false);
  const [isTriggeringBackup, setIsTriggeringBackup] = useState(false);
  const [cronLogs, setCronLogs] = useState<CronLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

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

  const handleTriggerBackup = async () => {
    setIsTriggeringBackup(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/trigger-backup`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to trigger backup');
      }

      const result = await response.json();
      toast.success(result.message || 'Backup Excel déclenché avec succès');
      setTimeout(() => fetchCronLogs(), 1000);
    } catch (error) {
      console.error('Error triggering backup:', error);
      toast.error('Erreur lors du déclenchement du backup Excel');
    } finally {
      setIsTriggeringBackup(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      case 'info':
        return 'bg-blue-600';
      default:
        return 'bg-gray-600';
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

  const toggleLogExpansion = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const parseLogDetails = (detailsStr: string | undefined) => {
    if (!detailsStr) return null;
    try {
      return JSON.parse(detailsStr);
    } catch {
      return null;
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
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Synchronisation ARX</CardTitle>
                <CardDescription>
                  Déclencher manuellement la synchronisation des comptes de sauvegarde ARX
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleTriggerArxSync}
                  disabled={isTriggering}
                  className="w-full"
                >
                  {isTriggering ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Synchronisation en cours...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Lancer la synchronisation ARX
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backup Excel</CardTitle>
                <CardDescription>
                  Déclencher manuellement l'export de tous les contrats en Excel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleTriggerBackup}
                  disabled={isTriggeringBackup}
                  className="w-full"
                >
                  {isTriggeringBackup ? (
                    <>
                      <Database className="mr-2 h-4 w-4 animate-spin" />
                      Backup en cours...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Lancer le backup Excel
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

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
              <ScrollArea className="h-[500px]">
                {cronLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun log disponible
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cronLogs.map((log) => {
                      const details = parseLogDetails(log.details);
                      const isExpanded = expandedLogId === log.id;
                      const hasDetails = details && Array.isArray(details) && details.length > 0;

                      return (
                        <div
                          key={log.id}
                          className="border rounded-lg bg-card overflow-hidden"
                        >
                          <div 
                            className={`p-3 ${hasDetails ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                            onClick={() => hasDetails && toggleLogExpansion(log.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">{getTypeLabel(log.type)}</span>
                                  <Badge className={getStatusColor(log.status)}>
                                    {log.status}
                                  </Badge>
                                  {hasDetails && (
                                    isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{log.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(log.timestamp).toLocaleString('fr-FR')}
                                </p>
                              </div>
                            </div>
                          </div>

                          {hasDetails && isExpanded && (
                            <div className="border-t p-3 bg-muted/20">
                              <h4 className="text-sm font-semibold mb-2">Détails des appels API :</h4>
                              <div className="space-y-3">
                                {details.map((account: any, idx: number) => (
                                  <div key={idx} className="border rounded p-2 bg-background">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-mono text-sm font-semibold">{account.accountName}</span>
                                      <Badge variant={account.status === 'success' ? 'default' : 'destructive'}>
                                        {account.status}
                                      </Badge>
                                    </div>
                                    
                                    {account.error && (
                                      <p className="text-sm text-destructive mb-2">Erreur: {account.error}</p>
                                    )}
                                    
                                    {account.apiCalls && account.apiCalls.length > 0 && (
                                      <div className="space-y-1">
                                        <p className="text-xs font-semibold">Appels API effectués:</p>
                                        {account.apiCalls.map((call: any, callIdx: number) => (
                                          <div key={callIdx} className="text-xs font-mono bg-muted p-1 rounded">
                                            <span className="text-primary">{call.type}</span>: {call.url}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    {account.data && (
                                      <div className="mt-2 text-xs space-y-1">
                                        <p><span className="font-semibold">Status:</span> {account.data.status}</p>
                                        {account.data.usedSpaceGb && (
                                          <p><span className="font-semibold">Espace utilisé:</span> {account.data.usedSpaceGb} Go</p>
                                        )}
                                        {account.data.allowedSpaceGb && (
                                          <p><span className="font-semibold">Espace alloué:</span> {account.data.allowedSpaceGb} Go</p>
                                        )}
                                        {account.data.analyzedSizeGb && (
                                          <p><span className="font-semibold">Taille analysée:</span> {account.data.analyzedSizeGb} Go</p>
                                        )}
                                        {account.data.lastBackupDate && (
                                          <p><span className="font-semibold">Date sauvegarde:</span> {new Date(account.data.lastBackupDate).toLocaleString('fr-FR')}</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
