import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Navigation } from "@/components/Navigation";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Contracts from "./pages/Contracts";
import ContractDetail from "./pages/ContractDetail";
import ArchivedContracts from "./pages/ArchivedContracts";
import Management from "./pages/Management";
import Projects from "./pages/Projects";
import ArchivedProjects from "./pages/ArchivedProjects";
import ProjectDetail from "./pages/ProjectDetail";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Admin from "./pages/Admin";
import Billing from "./pages/Billing";
import Config from "./pages/Config";
import Technicians from "./pages/Technicians";
import Timeline from "./pages/Timeline";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const Notifications = lazy(() => import("./pages/Notifications"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="app-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navigation />
          <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Chargement…</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/archives" element={<ArchivedContracts />} />
              <Route path="/contract/:id" element={<ContractDetail />} />
              <Route path="/management" element={<Management />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/archived" element={<ArchivedProjects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/config" element={<Config />} />
              <Route path="/technicians" element={<Technicians />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/notif" element={<Notifications />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
