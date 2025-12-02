import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, TrendingUp, BarChart3, Calendar, Wrench, Users, Shield, Bell, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBadge } from "@/components/NotificationBadge";
import { api } from "@/lib/api";

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    clients: any[];
    contracts: any[];
    projects: any[];
  }>({ clients: [], contracts: [], projects: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingBillingCount, setPendingBillingCount] = useState(0);

  useEffect(() => {
    const fetchPendingBilling = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_BASE_URL}/api/billing`);
        const billingItems = await res.json();
        const pending = billingItems.filter((item: any) => !item.is_processed).length;
        setPendingBillingCount(pending);
      } catch (error) {
        console.error("Error fetching billing count:", error);
      }
    };
    fetchPendingBilling();
    const interval = setInterval(fetchPendingBilling, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path === "/" || path.startsWith("/home")) return "home";
    if (path.startsWith("/billing")) return "billing";
    if (path.startsWith("/contracts") || path.startsWith("/archives")) return "contracts";
    if (path.startsWith("/clients")) return "clients";
    if (path.startsWith("/projects")) return "projects";
    return "home";
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const fetchResults = async () => {
        setIsSearching(true);
        setSearchError(false);
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
          const [clients, contracts, projectsRes] = await Promise.all([
            api.getClients(),
            api.getContracts(false),
            fetch(`${API_BASE_URL}/api/projects?includeArchived=false`).then(r => r.json()),
          ]);

          const query = searchQuery.toLowerCase();
          setSearchResults({
            clients: clients.filter((c: any) => 
              c.name.toLowerCase().includes(query)
            ).slice(0, 5),
            contracts: contracts.filter((c: any) => 
              c.clientName.toLowerCase().includes(query)
            ).slice(0, 5),
            projects: projectsRes.filter((p: any) => 
              p.title.toLowerCase().includes(query) || 
              p.clientName.toLowerCase().includes(query)
            ).slice(0, 5),
          });
        } catch (error) {
          console.error("Search error:", error);
          setSearchError(true);
          setSearchResults({ clients: [], contracts: [], projects: [] });
        } finally {
          setIsSearching(false);
        }
      };
      fetchResults();
    } else {
      setSearchResults({ clients: [], contracts: [], projects: [] });
      setSearchError(false);
    }
  }, [searchQuery]);

  const handleSelect = (type: string, id: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    
    if (type === "client") {
      navigate(`/clients/${id}`);
    } else if (type === "contract") {
      navigate(`/contracts/${id}`);
    } else if (type === "project") {
      navigate(`/projects/${id}`);
    }
  };

  return (
    <>
      <div className="border-b bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Tabs value={getCurrentTab()} className="w-auto">
            <TabsList>
              <TabsTrigger value="home" onClick={() => navigate("/")}>Accueil</TabsTrigger>
              <TabsTrigger value="billing" onClick={() => navigate("/billing")} className="gap-1.5">
                Facturation
                {pendingBillingCount > 0 && (
                  <span className="h-5 min-w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
                    {pendingBillingCount > 99 ? "99+" : pendingBillingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="contracts" onClick={() => navigate("/contracts")}>Contrats</TabsTrigger>
              <TabsTrigger value="clients" onClick={() => navigate("/clients")}>Clients</TabsTrigger>
              <TabsTrigger value="projects" onClick={() => navigate("/projects")}>Projets</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSearchOpen(true)}
              className="gap-2 min-w-[200px] justify-start text-muted-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Rechercher...</span>
              <kbd className="ml-auto pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
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

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Recherche globale</DialogTitle>
          </DialogHeader>
          <Command className="rounded-lg border-none">
            <CommandInput 
              placeholder="Rechercher des clients, contrats, projets..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {searchError ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <p className="font-medium text-destructive">Impossible de se connecter au serveur</p>
                  <p className="mt-1">Vérifiez que l'API locale est démarrée</p>
                </div>
              ) : isSearching ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Recherche en cours...
                </div>
              ) : (
                <>
                  <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
                  
                  {searchResults.clients.length > 0 && (
                    <CommandGroup heading="Clients">
                      {searchResults.clients.map((client) => (
                        <CommandItem
                          key={client.id}
                          onSelect={() => handleSelect("client", client.id)}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          <span>{client.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {searchResults.contracts.length > 0 && (
                    <CommandGroup heading="Contrats">
                      {searchResults.contracts.map((contract) => (
                        <CommandItem
                          key={contract.id}
                          onSelect={() => handleSelect("contract", contract.id)}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          <span>{contract.clientName} - {contract.totalHours}h</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {searchResults.projects.length > 0 && (
                    <CommandGroup heading="Projets">
                      {searchResults.projects.map((project) => (
                        <CommandItem
                          key={project.id}
                          onSelect={() => handleSelect("project", project.id)}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          <span>{project.title} - {project.clientName}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
};
