import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

const Admin = () => {
  const navigate = useNavigate();
  const [isTriggering, setIsTriggering] = useState(false);

  const handleTriggerArxSync = async () => {
    setIsTriggering(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/trigger-arx-sync`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to trigger ARX sync');
      }

      const result = await response.json();
      toast.success(result.message || 'Synchronisation ARX déclenchée avec succès');
    } catch (error) {
      console.error('Error triggering ARX sync:', error);
      toast.error('Erreur lors du déclenchement de la synchronisation ARX');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour à l'accueil
        </Button>

        <h1 className="text-4xl font-bold mb-8">Administration</h1>
        
        <div className="space-y-4">
          <div className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Synchronisation ARX</h2>
            <p className="text-muted-foreground mb-4">
              Déclencher manuellement la synchronisation des comptes ARX
            </p>
            <Button 
              onClick={handleTriggerArxSync}
              disabled={isTriggering}
            >
              {isTriggering ? 'Synchronisation en cours...' : 'Trigger ARX'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
