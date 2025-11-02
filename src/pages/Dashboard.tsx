import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Users, FileText, AlertCircle, Clock, DollarSign } from "lucide-react";
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
  Line,
  Legend
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { fr } from "date-fns/locale";

const Dashboard = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsData, clientsData] = await Promise.all([
        api.getContracts(false),
        api.getClients()
      ]);
      setContracts(contractsData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Statistiques globales
  const totalClients = clients.length;
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter(c => c.status === "active").length;
  const nearExpiryContracts = contracts.filter(c => {
    const percentage = (c.usedHours / c.totalHours) * 100;
    return percentage >= 90 && percentage < 100;
  }).length;
  const overageContracts = contracts.filter(c => c.usedHours > c.totalHours).length;
  
  const totalHours = contracts.reduce((acc, c) => acc + c.totalHours, 0);
  const usedHours = contracts.reduce((acc, c) => acc + c.usedHours, 0);
  const remainingHours = totalHours - usedHours;
  const usagePercentage = totalHours > 0 ? Math.round((usedHours / totalHours) * 100) : 0;
  
  // Heures en dépassement totales
  const totalOverageHours = contracts.reduce((acc, c) => {
    if (c.usedHours > c.totalHours) {
      return acc + (c.usedHours - c.totalHours);
    }
    return acc;
  }, 0);

  // Top 5 clients par heures utilisées
  const clientsWithHours = clients.map(client => {
    const clientContracts = contracts.filter(c => c.clientId === client.id);
    const totalUsed = clientContracts.reduce((acc, c) => acc + c.usedHours, 0);
    return { name: client.name, hours: totalUsed };
  }).sort((a, b) => b.hours - a.hours).slice(0, 5);

  // Top clients en dépassement
  const clientsWithOverage = clients.map(client => {
    const clientContracts = contracts.filter(c => c.clientId === client.id);
    const totalOverage = clientContracts.reduce((acc, c) => {
      if (c.usedHours > c.totalHours) {
        return acc + (c.usedHours - c.totalHours);
      }
      return acc;
    }, 0);
    return { name: client.name, overage: totalOverage };
  }).filter(c => c.overage > 0).sort((a, b) => b.overage - a.overage).slice(0, 5);

  // Distribution des contrats par statut
  const statusData = [
    { name: "Actifs", value: contracts.filter(c => c.status === "active").length, color: "#10b981" },
    { name: "Expirés", value: contracts.filter(c => c.status === "expired").length, color: "#ef4444" },
    { name: "Proche expiration", value: contracts.filter(c => c.status === "near-expiry").length, color: "#f59e0b" }
  ].filter(d => d.value > 0);

  // Heures utilisées par mois (6 derniers mois)
  const last6Months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  });

  const monthlyHours = last6Months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const hoursInMonth = contracts.reduce((acc, contract) => {
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

  // Technicians stats
  const technicianStats = contracts.reduce((acc, contract) => {
    contract.interventions.forEach(intervention => {
      if (!acc[intervention.technician]) {
        acc[intervention.technician] = { name: intervention.technician, hours: 0, count: 0 };
      }
      acc[intervention.technician].hours += intervention.hoursUsed;
      acc[intervention.technician].count += 1;
    });
    return acc;
  }, {} as Record<string, { name: string; hours: number; count: number }>);

  const technicianData = Object.values(technicianStats).sort((a, b) => b.hours - a.hours);

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
          <Button variant="ghost" onClick={() => navigate("/contracts")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Dashboard</h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClients}</div>
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
              <CardTitle>Top 5 Clients (heures utilisées)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clientsWithHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" />
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
                  <Legend />
                  <Line type="monotone" dataKey="hours" stroke="hsl(var(--primary))" strokeWidth={2} name="Heures" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Technicians */}
          <Card>
            <CardHeader>
              <CardTitle>Activité par technicien</CardTitle>
            </CardHeader>
            <CardContent>
              {technicianData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={technicianData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" name="Heures" />
                    <Bar dataKey="count" fill="hsl(var(--secondary))" name="Interventions" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center py-12">Aucune intervention enregistrée</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
