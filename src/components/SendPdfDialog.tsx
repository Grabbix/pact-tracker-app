import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { ContactPerson } from "@/types/client";
import { Checkbox } from "@/components/ui/checkbox";

interface SendPdfDialogProps {
  contractId: string;
  contractNumber?: number;
  clientContacts?: ContactPerson[];
}

export const SendPdfDialog = ({ contractId, contractNumber, clientContacts }: SendPdfDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [includeNonBillable, setIncludeNonBillable] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!email) {
      toast.error("Veuillez saisir une adresse email");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/contracts/${contractId}/send-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: email,
          includeNonBillable,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'envoi");
      }

      toast.success("Email envoyé avec succès");
      setOpen(false);
      setEmail("");
      setIncludeNonBillable(false);
    } catch (error: any) {
      console.error("Error sending PDF:", error);
      toast.error(error.message || "Erreur lors de l'envoi de l'email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Mail className="h-4 w-4" />
          Envoyer par email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Envoyer le PDF par email</DialogTitle>
          <DialogDescription>
            Envoyez le rapport PDF du contrat {contractNumber ? `N°${contractNumber}` : ""} par email
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Adresse email</Label>
            <Input
              id="email"
              type="email"
              placeholder="destinataire@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {clientContacts && clientContacts.length > 0 && (
            <div className="space-y-2">
              <Label>Contacts du client</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {clientContacts.map((contact) => (
                  contact.email && (
                    <button
                      key={contact.id}
                      type="button"
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors text-sm"
                      onClick={() => setEmail(contact.email!)}
                    >
                      <div className="font-medium">{contact.name}</div>
                      <div className="text-muted-foreground text-xs">{contact.email}</div>
                    </button>
                  )
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeNonBillable"
              checked={includeNonBillable}
              onCheckedChange={(checked) => setIncludeNonBillable(checked as boolean)}
            />
            <Label htmlFor="includeNonBillable" className="text-sm cursor-pointer">
              Inclure les interventions non comptées
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? "Envoi..." : "Envoyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
