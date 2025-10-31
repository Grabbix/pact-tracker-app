import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, Settings } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Gestion d'entreprise</h1>
          <p className="text-muted-foreground text-lg">
            Choisissez le module que vous souhaitez utiliser
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Button
            onClick={() => navigate("/contracts")}
            className="h-64 flex flex-col gap-6 text-xl hover:scale-105 transition-transform"
            variant="outline"
          >
            <FileText className="w-24 h-24" />
            <span>Contrats de maintenance</span>
          </Button>

          <Button
            onClick={() => navigate("/management")}
            className="h-64 flex flex-col gap-6 text-xl hover:scale-105 transition-transform"
            variant="outline"
          >
            <Settings className="w-24 h-24" />
            <span>Gestion</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
