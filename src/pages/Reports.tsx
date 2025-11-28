import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, TrendingUp } from "lucide-react";
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import * as XLSX from 'xlsx';
import { toast } from "@/hooks/use-toast";

type ReportType = "hours" | "contracts" | "clients" | "technicians";
type PeriodType = "3months" | "6months" | "12months" | "all";

const Reports = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<ReportType>("hours");
  const [period, setPeriod] = useState<PeriodType>("6months");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedTechnician, setSelectedTechnician] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsData, clientsData] = await Promise.all([
        api.getContracts(true),
        api.getClients()
      ]);
      setContracts(contractsData);
      setClients(clientsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Get period dates
  const getPeriodDates = () => {
    const now = new Date();
    switch (period) {
      case "3months":
        return { start: subMonths(now, 2), end: now };
      case "6months":
        return { start: subMonths(now, 5), end: now };
      case "12months":
        return { start: subMonths(now, 11), end: now };
      case "all":
        return null;
    }
  };

  // Filter data based on selections
  const getFilteredData = () => {
    let filtered = contracts;

    // Filter by client
    if (selectedClient !== "all") {
      filtered = filtered.filter(c => c.clientId === selectedClient);
    }

    // Filter interventions by technician and period
    filtered = filtered.map(contract => {
      let interventions = contract.interventions;

      if (selectedTechnician !== "all") {
        interventions = interventions.filter(i => i.technician === selectedTechnician);
      }

      const periodDates = getPeriodDates();
      if (periodDates) {
        const monthStart = startOfMonth(periodDates.start);
        const monthEnd = endOfMonth(periodDates.end);
        interventions = interventions.filter(i => {
          const date = parseISO(i.date);
          return isWithinInterval(date, { start: monthStart, end: monthEnd });
        });
      }

      return { ...contract, interventions };
    });

    return filtered;
  };

  // Generate report data based on type
  const generateReportData = () => {
    const filtered = getFilteredData();
    const periodDates = getPeriodDates();

    switch (reportType) {
      case "hours": {
        if (!periodDates) {
          // All time - group by month from first intervention
          const allInterventions = filtered.flatMap(c => c.interventions);
          if (allInterventions.length === 0) return [];

          const sortedDates = allInterventions
            .map(i => parseISO(i.date))
            .sort((a, b) => a.getTime() - b.getTime());

          const firstDate = sortedDates[0];
          const months = eachMonthOfInterval({ start: firstDate, end: new Date() });

          return months.map(month => {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);
            
            const hoursInMonth = filtered.reduce((acc, contract) => {
              const interventionsInMonth = contract.interventions.filter(i => {
                const date = parseISO(i.date);
                return isWithinInterval(date, { start: monthStart, end: monthEnd });
              });
              return acc + interventionsInMonth.reduce((sum, i) => sum + i.hoursUsed, 0);
            }, 0);

            return {
              period: format(month, "MMM yyyy", { locale: fr }),
              heures: Number(hoursInMonth.toFixed(1))
            };
          });
        }

        const months = eachMonthOfInterval({ start: periodDates.start, end: periodDates.end });
        return months.map(month => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          
          const hoursInMonth = filtered.reduce((acc, contract) => {
            const interventionsInMonth = contract.interventions.filter(i => {
              const date = parseISO(i.date);
              return isWithinInterval(date, { start: monthStart, end: monthEnd });
            });
            return acc + interventionsInMonth.reduce((sum, i) => sum + i.hoursUsed, 0);
          }, 0);

          return {
            period: format(month, "MMM yyyy", { locale: fr }),
            heures: Number(hoursInMonth.toFixed(1))
          };
        });
      }

      case "contracts": {
        const signedContracts = filtered.filter(c => c.contractType !== 'quote');
        const validCount = signedContracts.filter(c => {
          const pct = (c.usedHours / c.totalHours) * 100;
          return pct < 90;
        }).length;
        const nearExpiryCount = signedContracts.filter(c => {
          const pct = (c.usedHours / c.totalHours) * 100;
          return pct >= 90 && pct <= 100;
        }).length;
        const overageCount = signedContracts.filter(c => c.usedHours > c.totalHours).length;

        return [
          { status: "Valides", count: validCount, fill: "hsl(var(--success))" },
          { status: "Près expiration", count: nearExpiryCount, fill: "hsl(var(--warning))" },
          { status: "Dépassement", count: overageCount, fill: "hsl(var(--destructive))" }
        ].filter(d => d.count > 0);
      }

      case "clients": {
        return clients
          .map(client => {
            const clientContracts = filtered.filter(c => c.clientId === client.id);
            const totalHours = clientContracts.reduce((sum, c) => 
              sum + c.interventions.reduce((s, i) => s + i.hoursUsed, 0), 0
            );
            return { 
              name: client.name.length > 20 ? client.name.substring(0, 20) + '...' : client.name,
              heures: Number(totalHours.toFixed(1))
            };
          })
          .filter(c => c.heures > 0)
          .sort((a, b) => b.heures - a.heures)
          .slice(0, 10);
      }

      case "technicians": {
        const technicianHours = new Map<string, number>();
        
        filtered.forEach(contract => {
          contract.interventions.forEach(intervention => {
            const current = technicianHours.get(intervention.technician) || 0;
            technicianHours.set(intervention.technician, current + intervention.hoursUsed);
          });
        });

        return Array.from(technicianHours.entries())
          .map(([name, heures]) => ({ 
            technicien: name, 
            heures: Number(heures.toFixed(1))
          }))
          .sort((a, b) => b.heures - a.heures);
      }

      default:
        return [];
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const data = generateReportData();
    if (data.length === 0) {
      toast({
        title: "Aucune donnée",
        description: "Aucune donnée à exporter pour cette période",
        variant: "destructive"
      });
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rapport");

    const reportName = {
      hours: "Heures",
      contracts: "Contrats",
      clients: "Clients",
      technicians: "Techniciens"
    }[reportType];

    const periodName = {
      "3months": "3mois",
      "6months": "6mois",
      "12months": "12mois",
      "all": "total"
    }[period];

    const date = format(new Date(), "yyyy-MM-dd");
    XLSX.writeFile(wb, `Rapport_${reportName}_${periodName}_${date}.xlsx`);

    toast({
      title: "Export réussi",
      description: "Le rapport a été exporté en Excel"
    });
  };

  const reportData = generateReportData();

  // Get unique technicians for filter
  const technicians = Array.from(
    new Set(contracts.flatMap(c => c.interventions.map(i => i.technician)))
  ).sort();

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
            <h1 className="text-3xl font-bold tracking-tight">Rapports personnalisés</h1>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Paramètres du rapport</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Type de rapport</label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Heures</SelectItem>
                    <SelectItem value="contracts">Contrats</SelectItem>
                    <SelectItem value="clients">Clients</SelectItem>
                    <SelectItem value="technicians">Techniciens</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Période</label>
                <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3months">3 derniers mois</SelectItem>
                    <SelectItem value="6months">6 derniers mois</SelectItem>
                    <SelectItem value="12months">12 derniers mois</SelectItem>
                    <SelectItem value="all">Depuis le début</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Client</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les clients</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Technicien</label>
                <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les techniciens</SelectItem>
                    {technicians.map(tech => (
                      <SelectItem key={tech} value={tech}>{tech}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={exportToExcel} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>
              {reportType === "hours" && "Heures travaillées"}
              {reportType === "contracts" && "Distribution des contrats"}
              {reportType === "clients" && "Top 10 clients"}
              {reportType === "technicians" && "Heures par technicien"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">
                Aucune donnée disponible pour cette période
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                {reportType === "hours" ? (
                  <LineChart data={reportData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="heures" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Heures"
                    />
                  </LineChart>
                ) : reportType === "contracts" ? (
                  <PieChart>
                    <Pie
                      data={reportData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, count }) => `${status}: ${count}`}
                      outerRadius={120}
                      dataKey="count"
                    >
                      {reportData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                ) : (
                  <BarChart data={reportData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey={reportType === "clients" ? "name" : "technicien"} 
                      angle={-45} 
                      textAnchor="end" 
                      height={100}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="heures" 
                      fill="hsl(var(--primary))" 
                      name="Heures"
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
