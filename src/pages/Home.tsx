import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Settings, Building2, Receipt } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/80 to-muted/50 flex items-center justify-center p-8">
      <div className="max-w-6xl w-full">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Gestion d'entreprise
          </h1>
          <p className="text-muted-foreground text-xl">
            Choisissez le module que vous souhaitez utiliser
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Button
            onClick={() => navigate("/contracts")}
            className="h-56 flex flex-col gap-6 text-xl hover:scale-[1.02] transition-all shadow-lg hover:shadow-2xl bg-card border-2 hover:border-primary/50"
            variant="outline"
          >
            <div className="p-6 rounded-full bg-primary/10">
              <FileText className="w-16 h-16 text-primary" />
            </div>
            <span className="font-semibold">Contrats de maintenance</span>
          </Button>

          <Button
            onClick={() => navigate("/clients")}
            className="h-56 flex flex-col gap-6 text-xl hover:scale-[1.02] transition-all shadow-lg hover:shadow-2xl bg-card border-2 hover:border-primary/50"
            variant="outline"
          >
            <div className="p-6 rounded-full bg-primary/10">
              <Building2 className="w-16 h-16 text-primary" />
            </div>
            <span className="font-semibold">Clients</span>
          </Button>

          <Button
            onClick={() => navigate("/billing")}
            className="h-56 flex flex-col gap-6 text-xl hover:scale-[1.02] transition-all shadow-lg hover:shadow-2xl bg-card border-2 hover:border-primary/50"
            variant="outline"
          >
            <div className="p-6 rounded-full bg-primary/10">
              <Receipt className="w-16 h-16 text-primary" />
            </div>
            <span className="font-semibold">Facturation</span>
          </Button>

          <Button
            onClick={() => navigate("/management")}
            className="h-56 flex flex-col gap-6 text-xl hover:scale-[1.02] transition-all shadow-lg hover:shadow-2xl bg-card border-2 hover:border-primary/50"
            variant="outline"
          >
            <div className="p-6 rounded-full bg-primary/10">
              <Settings className="w-16 h-16 text-primary" />
            </div>
            <span className="font-semibold">Gestion</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
