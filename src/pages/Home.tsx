import { useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, TrendingUp, Shield, Wrench, Users, Calendar, BarChart3, Bell, AlertCircle } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBadge } from "@/components/NotificationBadge";
import { useContracts } from "@/hooks/useContracts";
import { useProjects } from "@/hooks/useProjects";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const Home = () => {
  const navigate = useNavigate();
  const { contracts, loading: contractsLoading } = useContracts();
  const { projects, loading: projectsLoading } = useProjects();

  const today = useMemo(() => format(new Date(), "EEEE d MMMM yyyy", { locale: fr }), []);

  const topClients = useMemo(() => {
    const clientHours = contracts
      .filter(c => c.contractType === "signed" && !c.isArchived)
      .reduce((acc, contract) => {
        const existing = acc.find(c => c.clientName === contract.clientName);
        if (existing) {
          existing.totalHours += contract.totalHours;
          existing.usedHours += contract.usedHours;
        } else {
          acc.push({
            clientName: contract.clientName,
            totalHours: contract.totalHours,
            usedHours: contract.usedHours,
          });
        }
        return acc;
      }, [] as Array<{ clientName: string; totalHours: number; usedHours: number }>);

    return clientHours
      .sort((a, b) => b.usedHours - a.usedHours)
      .slice(0, 5);
  }, [contracts]);

  const nearExpiryClients = useMemo(() => {
    const clientData = contracts
      .filter(c => c.contractType === "signed" && !c.isArchived)
      .reduce((acc, contract) => {
        const existing = acc.find(c => c.clientName === contract.clientName);
        if (existing) {
          existing.totalHours += contract.totalHours;
          existing.usedHours += contract.usedHours;
        } else {
          acc.push({
            clientName: contract.clientName,
            totalHours: contract.totalHours,
            usedHours: contract.usedHours,
          });
        }
        return acc;
      }, [] as Array<{ clientName: string; totalHours: number; usedHours: number }>);

    return clientData
      .map(client => ({
        ...client,
        remainingPercent: ((client.totalHours - client.usedHours) / client.totalHours) * 100,
      }))
      .filter(client => client.remainingPercent < 100)
      .sort((a, b) => a.remainingPercent - b.remainingPercent)
      .slice(0, 5);
  }, [contracts]);

  const upcomingProjects = useMemo(() => {
    return projects
      .filter(p => !p.isArchived && p.deliveryDate)
      .sort((a, b) => {
        if (!a.deliveryDate) return 1;
        if (!b.deliveryDate) return -1;
        return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime();
      })
      .slice(0, 5);
  }, [projects]);

  const chartColors = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--accent))',
    'hsl(var(--muted))',
    'hsl(var(--chart-1))',
  ];

  const topClientsChartData = useMemo(() => 
    topClients.map((client, index) => ({
      name: client.clientName,
      hours: client.usedHours,
      fill: chartColors[index % chartColors.length],
    })), [topClients]
  );

  const nearExpiryChartData = useMemo(() =>
    nearExpiryClients.map((client, index) => ({
      name: client.clientName,
      remaining: Math.round(client.remainingPercent),
      fill: client.remainingPercent < 10 ? 'hsl(var(--destructive))' :
            client.remainingPercent < 25 ? 'hsl(var(--warning))' :
            'hsl(var(--chart-3))',
    })), [nearExpiryClients]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      {/* Top Bar */}
      <div className="border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Tabs defaultValue="home" className="w-auto">
            <TabsList>
              <TabsTrigger value="home" onClick={() => navigate("/")}>Accueil</TabsTrigger>
              <TabsTrigger value="billing" onClick={() => navigate("/billing")}>Facturation</TabsTrigger>
              <TabsTrigger value="contracts" onClick={() => navigate("/contracts")}>Contrats</TabsTrigger>
              <TabsTrigger value="clients" onClick={() => navigate("/clients")}>Clients</TabsTrigger>
              <TabsTrigger value="projects" onClick={() => navigate("/projects")}>Projets</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Dashboard
            </Button>
            
            <NotificationBadge />
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/reports")} className="cursor-pointer">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Rapports
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/timeline")} className="cursor-pointer">
                  <Calendar className="h-4 w-4 mr-2" />
                  Timeline
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/config")} className="cursor-pointer">
                  <Wrench className="h-4 w-4 mr-2" />
                  Configuration
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/technicians")} className="cursor-pointer">
                  <Users className="h-4 w-4 mr-2" />
                  Techniciens
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                  <Shield className="h-4 w-4 mr-2" />
                  Administration
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/notif")} className="cursor-pointer">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Tableau de bord</h1>
          <p className="text-muted-foreground text-lg capitalize">{today}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Top 5 Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 des clients</CardTitle>
              <CardDescription>Par heures utilisées</CardDescription>
            </CardHeader>
            <CardContent>
              {contractsLoading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : topClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun client</p>
              ) : (
                <div className="space-y-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={topClientsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                      <Bar dataKey="hours" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {topClients.map((client, index) => (
                      <div
                        key={client.clientName}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          const contract = contracts.find(c => c.clientName === client.clientName);
                          if (contract?.clientId) navigate(`/clients/${contract.clientId}`);
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: chartColors[index % chartColors.length] }}
                          />
                          <span className="font-medium text-sm">{client.clientName}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {client.usedHours}h / {client.totalHours}h
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clients bientôt terminés */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Clients bientôt terminés
              </CardTitle>
              <CardDescription>Par heures restantes (%)</CardDescription>
            </CardHeader>
            <CardContent>
              {contractsLoading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : nearExpiryClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun client proche de l'expiration</p>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={nearExpiryChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, remaining }) => `${name}: ${remaining}%`}
                          outerRadius={80}
                          dataKey="remaining"
                        >
                          {nearExpiryChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {nearExpiryClients.map((client) => (
                      <div
                        key={client.clientName}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          const contract = contracts.find(c => c.clientName === client.clientName);
                          if (contract?.clientId) navigate(`/clients/${contract.clientId}`);
                        }}
                      >
                        <div>
                          <span className="font-medium text-sm">{client.clientName}</span>
                          <p className="text-xs text-muted-foreground">
                            {client.totalHours - client.usedHours}h restantes
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-semibold ${
                            client.remainingPercent < 10 ? "text-destructive" :
                            client.remainingPercent < 25 ? "text-orange-500" :
                            "text-yellow-500"
                          }`}>
                            {client.remainingPercent.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projets à venir */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Projets à venir</CardTitle>
              <CardDescription>Par date d'échéance</CardDescription>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : upcomingProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun projet planifié</p>
              ) : (
                <div className="space-y-3">
                  {upcomingProjects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-medium">{project.title}</span>
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {project.projectType}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{project.clientName}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          {project.deliveryDate && format(new Date(project.deliveryDate), "d MMM yyyy", { locale: fr })}
                        </span>
                        <p className="text-xs text-muted-foreground capitalize">{project.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Home;
