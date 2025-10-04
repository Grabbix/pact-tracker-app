import { useState } from "react";
import { ContractCard } from "@/components/ContractCard";
import { AddContractDialog } from "@/components/AddContractDialog";
import { Input } from "@/components/ui/input";
import { Search, FileText } from "lucide-react";
import { useContracts } from "@/hooks/useContracts";

const Contracts = () => {
  const { contracts, addContract } = useContracts();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContracts = contracts.filter(contract =>
    contract.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddContract = (newContract: { clientName: string; totalHours: number }) => {
    addContract(newContract);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
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
            <AddContractDialog onAdd={handleAddContract} />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">Total contrats</p>
            <p className="text-3xl font-bold text-foreground">{contracts.length}</p>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">Contrats actifs</p>
            <p className="text-3xl font-bold text-success">
              {contracts.filter(c => c.status === "active").length}
            </p>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground mb-1">Proche expiration</p>
            <p className="text-3xl font-bold text-warning">
              {contracts.filter(c => c.status === "near-expiry").length}
            </p>
          </div>
        </div>

        {/* Contracts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContracts.map((contract) => (
            <ContractCard key={contract.id} contract={contract} />
          ))}
        </div>

        {filteredContracts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Aucun contrat trouvé pour "{searchQuery}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contracts;
