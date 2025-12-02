import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Eye, Download, Mail, Loader2 } from "lucide-react";
import { Contract } from "@/types/contract";
import { exportContractToPDF, downloadContractPDF } from "@/utils/pdfExport";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface PdfPreviewDialogProps {
  contract: Contract;
  clientContacts?: { name: string; email?: string; phone?: string }[];
  trigger?: React.ReactNode;
}

export const PdfPreviewDialog = ({ contract, clientContacts = [], trigger }: PdfPreviewDialogProps) => {
  const [open, setOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [includeNonBillable, setIncludeNonBillable] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [email, setEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);

  // Generate PDF when dialog opens or option changes
  useEffect(() => {
    if (open) {
      generatePreview();
    } else {
      // Clean up blob URL when dialog closes
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setShowEmailInput(false);
      setEmail("");
    }
  }, [open, includeNonBillable]);

  const generatePreview = () => {
    setIsGenerating(true);
    try {
      const doc = exportContractToPDF(contract, includeNonBillable);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    downloadContractPDF(contract, includeNonBillable);
    toast.success("PDF téléchargé");
  };

  const handleSendEmail = async () => {
    if (!email) {
      toast.error("Veuillez saisir une adresse email");
      return;
    }

    setIsSending(true);
    try {
      const doc = exportContractToPDF(contract, includeNonBillable);
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      await api.sendContractPdf(contract.id, email, pdfBase64);
      toast.success("Email envoyé avec succès");
      setShowEmailInput(false);
      setEmail("");
    } catch (error: any) {
      console.error("Error sending PDF:", error);
      toast.error(error.message || "Erreur lors de l'envoi");
    } finally {
      setIsSending(false);
    }
  };

  const contactsWithEmail = clientContacts.filter(c => c.email);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Eye className="h-4 w-4" />
            Aperçu PDF
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Aperçu du rapport PDF</DialogTitle>
          <DialogDescription>
            Contrat {contract.contractNumber ? `N°${contract.contractNumber}` : ""} - {contract.clientName}
          </DialogDescription>
        </DialogHeader>

        {/* Options */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeNonBillable"
              checked={includeNonBillable}
              onCheckedChange={(checked) => setIncludeNonBillable(checked as boolean)}
            />
            <Label htmlFor="includeNonBillable" className="text-sm">
              Inclure interventions non comptabilisées
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Télécharger
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowEmailInput(!showEmailInput)}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Envoyer
            </Button>
          </div>
        </div>

        {/* Email input */}
        {showEmailInput && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Input
              type="email"
              placeholder="Adresse email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              list="contact-emails"
            />
            <datalist id="contact-emails">
              {contactsWithEmail.map((contact, i) => (
                <option key={i} value={contact.email}>
                  {contact.name}
                </option>
              ))}
            </datalist>
            <Button onClick={handleSendEmail} disabled={isSending} size="sm">
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                "Envoyer"
              )}
            </Button>
          </div>
        )}

        {/* PDF Preview */}
        <div className="flex-1 min-h-0 bg-muted rounded-lg overflow-hidden">
          {isGenerating ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="Aperçu PDF"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Impossible de charger l'aperçu
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
