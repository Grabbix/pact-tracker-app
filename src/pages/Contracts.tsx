import { useState } from "react";
import { ContractCard } from "@/components/ContractCard";
import { ContractListItem } from "@/components/ContractListItem";
import { AddContractDialog } from "@/components/AddContractDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, Archive, Download, ArrowLeft, CheckCircle, TrendingUp, FileSpreadsheet, AlertTriangle, ArrowUpDown, LayoutGrid, List } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useContracts } from "@/hooks/useContracts";
import { useNavigate } from "react-router-dom";
import { exportContractToPDF } from "@/utils/pdfExport";
import { exportAllContractsToExcelBackup } from "@/utils/excelExport";
import { toast } from "sonner";

const Contracts = () => {
  const { contracts, addContract, signContract, loading } = useContracts();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterNearExpiry, setFilterNearExpiry] = useState(false);
  const [filterOverage, setFilterOverage] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const navigate = useNavigate();

  // Filter by contract type
  const signedContracts = contracts.filter(c => c.contractType !== "quote");
  const quoteContracts = contracts.filter(c => c.contractType === "quote");

  // Contracts near expiry: used >= 90% and < 100% (only signed contracts)
  const nearExpiryContracts = signedContracts.filter(c => {
    const percentage = (c.usedHours / c.totalHours) * 100;
    return percentage >= 90 && percentage < 100;
  });

  // Contracts in overage: used > 100% (only signed contracts)
  const overageContracts = signedContracts.filter(
    c => c.usedHours > c.totalHours
  );

  const filterContractsBySearch = (contractList: typeof contracts) => {
    const filtered = contractList.filter(contract => {
      const matchesSearch = contract.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      const percentage = (contract.usedHours / contract.totalHours) * 100;
      
      let matchesFilter = true;
      if (filterNearExpiry) {
        matchesFilter = percentage >= 90 && percentage < 100;
      } else if (filterOverage) {
        matchesFilter = contract.usedHours > contract.totalHours;
      }
      
      return matchesSearch && matchesFilter;
    });

    // Sort by progression percentage
    return filtered.sort((a, b) => {
      const percentageA = (a.usedHours / a.totalHours) * 100;
      const percentageB = (b.usedHours / b.totalHours) * 100;
      
      if (sortOrder === "asc") {
        return percentageA - percentageB;
      } else {
        return percentageB - percentageA;
      }
    });
  };

  const filteredSignedContracts = filterContractsBySearch(signedContracts);
  const filteredQuoteContracts = filterContractsBySearch(quoteContracts);

  const handleAddContract = (newContract: { clientName: string; clientId?: string; totalHours: number; contractType: "quote" | "signed" }) => {
    addContract(newContract);
  };

  const handleSignQuote = (quoteId: string) => {
    signContract(quoteId);
  };

  const handleExportAllPDF = () => {
    signedContracts.forEach(contract => {
      exportContractToPDF(contract);
    });
    toast.success(`${signedContracts.length} PDF(s) exporté(s) avec succès`);
  };

  const handleRunBackup = async () => {
    try {
      const result = await exportAllContractsToExcelBackup();
      toast.success(`Backup effectué : ${result.count} fichier(s) Excel créé(s) dans le dossier backup`);
    } catch (error) {
      toast.error("Erreur lors du backup");
    }
  };

  const handleExportAllExcel = async () => {
    try {
      const result = await exportAllContractsToExcelBackup();
      toast.success(`${result.count} fichier(s) Excel créé(s) dans le dossier backup`);
    } catch (error) {
      toast.error("Erreur lors de l'export Excel");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l'accueil
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="text-4xl font-bold text-foreground">
                  Contrats de maintenance
                </h1>
              </div>
              <p className="text-muted-foreground text-lg">
                Gérez vos contrats et suivez les interventions
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/archives")}
                className="gap-2"
              >
                <Archive className="h-4 w-4" />
                Archives
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export / Backup
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportAllPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportAllExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleRunBackup}>
                    <Download className="h-4 w-4 mr-2" />
                    Run Backup
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AddContractDialog onAdd={handleAddContract} />
            </div>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button
            variant={sortOrder === "desc" ? "default" : "outline"}
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="whitespace-nowrap"
          >
            <ArrowUpDown className="mr-2 h-4 w-4" />
            {sortOrder === "desc" ? "Plus pleins d'abord" : "Plus vides d'abord"}
          </Button>
          
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="whitespace-nowrap"
          >
            {viewMode === "grid" ? (
              <>
                <List className="mr-2 h-4 w-4" />
                Mode liste
              </>
            ) : (
              <>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Mode grille
              </>
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">Total contrats signés</p>
            <p className="text-3xl font-bold text-foreground">{signedContracts.length}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">Contrats actifs</p>
            <p className="text-3xl font-bold text-success">
              {signedContracts.filter(c => c.status === "active").length}
            </p>
          </div>
          <div 
            className="bg-card p-4 rounded-lg border border-border cursor-pointer hover:border-warning transition-colors"
            onClick={() => {
              setFilterNearExpiry(!filterNearExpiry);
              setFilterOverage(false);
            }}
          >
            <p className="text-sm text-muted-foreground mb-1">
              Proche expiration {filterNearExpiry && "(filtré)"}
            </p>
            <p className="text-3xl font-bold text-warning">
              {nearExpiryContracts.length}
            </p>
          </div>
          <div 
            className="bg-card p-4 rounded-lg border border-border cursor-pointer hover:border-destructive transition-colors"
            onClick={() => {
              setFilterOverage(!filterOverage);
              setFilterNearExpiry(false);
            }}
          >
            <p className="text-sm text-muted-foreground mb-1">
              Dépassements {filterOverage && "(filtré)"}
            </p>
            <p className="text-3xl font-bold text-destructive">
              {overageContracts.length}
            </p>
          </div>
        </div>

        {/* Tabs for Contracts and Quotes */}
        <Tabs defaultValue="contracts" className="w-full">
          <TabsList>
            <TabsTrigger value="contracts">
              Contrats ({signedContracts.length})
            </TabsTrigger>
            <TabsTrigger value="quotes">
              Devis ({quoteContracts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contracts">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">Chargement...</p>
              </div>
            ) : (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {filteredSignedContracts.map((contract) => (
                      <ContractCard key={contract.id} contract={contract} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 mt-6">
                    {filteredSignedContracts.map((contract) => (
                      <ContractListItem key={contract.id} contract={contract} />
                    ))}
                  </div>
                )}

                {filteredSignedContracts.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">
                      {searchQuery
                        ? `Aucun contrat trouvé pour "${searchQuery}"`
                        : "Aucun contrat signé"}
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="quotes">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">Chargement...</p>
              </div>
            ) : (
              <>
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {filteredQuoteContracts.map((quote) => (
                      <div key={quote.id} className="relative">
                        <ContractCard contract={quote} />
                        <Button
                          onClick={() => handleSignQuote(quote.id)}
                          className="absolute top-4 right-4 gap-2"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Signer
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 mt-6">
                    {filteredQuoteContracts.map((quote) => (
                      <div key={quote.id} className="relative">
                        <ContractListItem contract={quote} />
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSignQuote(quote.id);
                          }}
                          className="absolute top-1/2 -translate-y-1/2 right-4 gap-2"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Signer
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {filteredQuoteContracts.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-lg">
                      {searchQuery
                        ? `Aucun devis trouvé pour "${searchQuery}"`
                        : "Aucun devis"}
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Contracts;
