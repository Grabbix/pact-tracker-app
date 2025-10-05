import { useState } from "react";
import { ContractCard } from "@/components/ContractCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Archive, ArrowLeft } from "lucide-react";
import { useContracts } from "@/hooks/useContracts";
import { useNavigate } from "react-router-dom";

const ArchivedContracts = () => {
  const { contracts, loading } = useContracts(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const archivedContracts = contracts.filter(c => c.isArchived);
  const filteredContracts = archivedContracts.filter(contract =>
    contract.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Archive className="h-8 w-8 text-primary" />
                <h1 className="text-4xl font-bold text-foreground">
                  Contrats archivés
                </h1>
              </div>
              <p className="text-muted-foreground text-lg">
                Consultez vos contrats archivés
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>

        {/* Stats */}
        <div className="mb-8">
          <div className="bg-card p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">Total archivés</p>
            <p className="text-3xl font-bold text-foreground">{archivedContracts.length}</p>
          </div>
        </div>

        {/* Contracts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">Chargement...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContracts.map((contract) => (
                <ContractCard key={contract.id} contract={contract} isArchived />
              ))}
            </div>

            {filteredContracts.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  {searchQuery
                    ? `Aucun contrat archivé trouvé pour "${searchQuery}"`
                    : "Aucun contrat archivé"}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ArchivedContracts;
