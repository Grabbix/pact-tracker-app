import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AddContractDialogWithClientProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  contractType: "quote" | "signed";
  onAdd: (contract: {
    clientName: string;
    totalHours: number;
    contractType: "quote" | "signed";
    createdDate?: string;
  }) => void;
}

export const AddContractDialogWithClient = ({ 
  open, 
  onOpenChange, 
  clientName, 
  contractType,
  onAdd 
}: AddContractDialogWithClientProps) => {
  const [dateOpen, setDateOpen] = useState(false);
  const [createdDate, setCreatedDate] = useState<Date>(new Date());
  const [totalHours, setTotalHours] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!totalHours) {
      return;
    }

    onAdd({
      clientName,
      totalHours: parseFloat(totalHours),
      contractType,
      createdDate: createdDate.toISOString(),
    });

    setTotalHours("");
    setCreatedDate(new Date());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {contractType === "quote" ? "Nouveau devis" : "Nouveau contrat de maintenance"}
          </DialogTitle>
          <DialogDescription>
            Pour {clientName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="totalHours">Nombre d'heures total</Label>
              <Input
                id="totalHours"
                type="number"
                step="1"
                min="1"
                placeholder="Ex: 50"
                value={totalHours}
                onChange={(e) => setTotalHours(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Date de création</Label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(createdDate, "PPP", { locale: fr })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={createdDate}
                    onSelect={(date) => {
                      if (date) {
                        setCreatedDate(date);
                      }
                      setDateOpen(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Créer {contractType === "quote" ? "le devis" : "le contrat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
