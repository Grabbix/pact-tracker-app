import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, TrendingUp, FileText, AlertCircle, Clock, DollarSign, Target } from "lucide-react";
import { api } from "@/lib/api";
import { Contract } from "@/types/contract";
import { Client } from "@/types/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, startOfISOWeek, endOfISOWeek, isWithinInterval, parseISO, differenceInWeeks, eachWeekOfInterval, subWeeks } from "date-fns";
import { fr } from "date-fns/locale";

const Dashboard = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [allContracts, setAllContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyDialogOpen, setWeeklyDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsData, allContractsData, clientsData] = await Promise.all([
        api.getContracts(false),
        api.getContracts(true), // Tous les contrats pour les stats clients
        api.getClients()
      ]);
      setContracts(contractsData);
      setAllContracts(allContractsData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les contrats signés (exclure les devis)
  const signedContracts = contracts.filter(c => c.contractType !== 'quote');
  
  // Statistiques globales
  const totalContracts = signedContracts.length;
  const activeContracts = signedContracts.filter(c => c.status === "active").length;
  const nearExpiryContracts = signedContracts.filter(c => {
    const percentage = (c.usedHours / c.totalHours) * 100;
    return percentage >= 90 && percentage < 100;
  }).length;
  const overageContracts = signedContracts.filter(c => c.usedHours > c.totalHours).length;
  
  const totalHours = signedContracts.reduce((acc, c) => acc + c.totalHours, 0);
  const usedHours = signedContracts.reduce((acc, c) => acc + c.usedHours, 0);
  const remainingHours = totalHours - usedHours;
  const usagePercentage = totalHours > 0 ? Math.round((usedHours / totalHours) * 100) : 0;
  
  // Heures en dépassement totales
  const totalOverageHours = signedContracts.reduce((acc, c) => {
    if (c.usedHours > c.totalHours) {
      return acc + (c.usedHours - c.totalHours);
    }
    return acc;
  }, 0);

  // Weekly stats: hours for current week (Monday-Friday)
  const now = new Date();
  const weekStart = startOfISOWeek(now); // ISO week starts on Monday
  const weekEnd = endOfISOWeek(now);
  
  // Get all interventions from all contracts for the current week
  const currentWeekHours = allContracts.reduce((total, contract) => {
    const weekInterventions = contract.interventions.filter(intervention => {
      const interventionDate = parseISO(intervention.date);
      return isWithinInterval(interventionDate, { start: weekStart, end: weekEnd });
    });
    return total + weekInterventions.reduce((sum, i) => sum + i.hoursUsed, 0);
  }, 0);

  // Calculate average hours per week across all time
  const allInterventions = allContracts.flatMap(c => c.interventions);
  
  let averageWeeklyHours = 0;
  if (allInterventions.length > 0) {
    const sortedDates = allInterventions
      .map(i => parseISO(i.date))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (sortedDates.length > 0) {
      const firstDate = sortedDates[0];
      const totalWeeks = Math.max(1, differenceInWeeks(now, firstDate) + 1);
      const totalHoursAllTime = allInterventions.reduce((sum, i) => sum + i.hoursUsed, 0);
      averageWeeklyHours = totalHoursAllTime / totalWeeks;
    }
  }

  // Top 5 clients par heures utilisées (ALL TIME - tous contrats)
  const clientsWithHours = clients.map(client => {
    const clientContracts = allContracts.filter(c => c.clientId === client.id);
    const totalUsed = clientContracts.reduce((acc, c) => acc + c.usedHours, 0);
    return { name: client.name, hours: totalUsed };
  }).sort((a, b) => b.hours - a.hours).slice(0, 5);

  // Top clients en dépassement (exclure les devis)
  const clientsWithOverage = clients.map(client => {
    const clientContracts = signedContracts.filter(c => c.clientId === client.id);
    const totalOverage = clientContracts.reduce((acc, c) => {
      if (c.usedHours > c.totalHours) {
        return acc + (c.usedHours - c.totalHours);
      }
      return acc;
    }, 0);
    return { name: client.name, overage: totalOverage };
  }).filter(c => c.overage > 0).sort((a, b) => b.overage - a.overage).slice(0, 5);

  // Distribution des contrats par statut (exclure les devis)
  const validContracts = signedContracts.filter(c => {
    const percentage = (c.usedHours / c.totalHours) * 100;
    return percentage < 90;
  }).length;
  
  const nearExpiryContractsCount = signedContracts.filter(c => {
    const percentage = (c.usedHours / c.totalHours) * 100;
    return percentage >= 90 && percentage <= 100;
  }).length;
  
  const overageContractsCount = signedContracts.filter(c => c.usedHours > c.totalHours).length;
  
  const statusData = [
    { name: "Valides", value: validContracts, color: "#10b981" },
    { name: "Bientôt expirés", value: nearExpiryContractsCount, color: "#f59e0b" },
    { name: "Dépassement", value: overageContractsCount, color: "#ef4444" }
  ].filter(d => d.value > 0);

  // Heures utilisées par mois (6 derniers mois)
  const last6Months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  });

  const monthlyHours = last6Months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const hoursInMonth = signedContracts.reduce((acc, contract) => {
      const interventionsInMonth = contract.interventions.filter(i => {
        const intDate = new Date(i.date);
        return intDate >= monthStart && intDate <= monthEnd;
      });
      return acc + interventionsInMonth.reduce((sum, i) => sum + i.hoursUsed, 0);
    }, 0);

    return {
      month: format(month, "MMM", { locale: fr }),
      hours: hoursInMonth
    };
  });

  // Calculate weekly hours for last 12 weeks
  const last12Weeks = eachWeekOfInterval({
    start: subWeeks(new Date(), 11),
    end: new Date()
  }, { weekStartsOn: 1 }); // Start weeks on Monday

  const weeklyHoursData = last12Weeks.map(weekStart => {
    const weekEnd = endOfISOWeek(weekStart);
    
    const hoursInWeek = allContracts.reduce((total, contract) => {
      const weekInterventions = contract.interventions.filter(intervention => {
        const interventionDate = parseISO(intervention.date);
        return isWithinInterval(interventionDate, { start: weekStart, end: weekEnd });
      });
      return total + weekInterventions.reduce((sum, i) => sum + i.hoursUsed, 0);
    }, 0);

    return {
      weekStart: format(weekStart, "dd/MM/yyyy", { locale: fr }),
      weekEnd: format(weekEnd, "dd/MM/yyyy", { locale: fr }),
      hours: hoursInWeek
    };
  }).reverse(); // Most recent first

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => setWeeklyDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Heures Semaine</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentWeekHours.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">Moy: {averageWeeklyHours.toFixed(1)}h/sem</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Contrats Actifs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeContracts}</div>
              <p className="text-xs text-muted-foreground">sur {totalContracts} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Proche Expiration</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{nearExpiryContracts}</div>
              <p className="text-xs text-muted-foreground">90-99% utilisés</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Dépassements</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{overageContracts}</div>
              <p className="text-xs text-muted-foreground">&gt;100% utilisés</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Heures Restantes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{remainingHours}h</div>
              <p className="text-xs text-muted-foreground">{usagePercentage}% utilisé</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Heures en Dépassement</CardTitle>
              <DollarSign className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{totalOverageHours}h</div>
              <p className="text-xs text-muted-foreground">à facturer</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Clients (All Time)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clientsWithHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" name="Heures totales" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Clients en Dépassement */}
          <Card>
            <CardHeader>
              <CardTitle>Top Clients en Dépassement</CardTitle>
            </CardHeader>
            <CardContent>
              {clientsWithOverage.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={clientsWithOverage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="overage" fill="hsl(var(--destructive))" name="Heures dépassées" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">Aucun dépassement enregistré</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribution des contrats</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground">Aucune donnée disponible</p>
              )}
            </CardContent>
          </Card>

          {/* Monthly Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Heures utilisées (6 derniers mois)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="hours" stroke="hsl(var(--primary))" strokeWidth={2} name="Heures" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Hours Dialog */}
        <Dialog open={weeklyDialogOpen} onOpenChange={setWeeklyDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Heures par semaine (12 dernières semaines)</DialogTitle>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Semaine</TableHead>
                  <TableHead className="text-right">Heures</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeklyHoursData.map((week, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {week.weekStart} - {week.weekEnd}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {week.hours.toFixed(1)}h
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Dashboard;
