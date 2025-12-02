import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, X, Save, Pencil, FileText } from "lucide-react";
import { toast } from "sonner";

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "pdf-message-templates";

export const getMessageTemplates = (): MessageTemplate[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveMessageTemplates = (templates: MessageTemplate[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
};

export default function MessageTemplatesConfig() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    setTemplates(getMessageTemplates());
  }, []);

  const resetForm = () => {
    setName("");
    setContent("");
    setEditingId(null);
  };

  const handleSave = () => {
    if (!name.trim() || !content.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const now = new Date().toISOString();
    let updatedTemplates: MessageTemplate[];

    if (editingId) {
      updatedTemplates = templates.map((t) =>
        t.id === editingId
          ? { ...t, name: name.trim(), content: content.trim(), updatedAt: now }
          : t
      );
      toast.success("Modèle mis à jour");
    } else {
      const newTemplate: MessageTemplate = {
        id: crypto.randomUUID(),
        name: name.trim(),
        content: content.trim(),
        createdAt: now,
        updatedAt: now,
      };
      updatedTemplates = [...templates, newTemplate];
      toast.success("Modèle créé");
    }

    setTemplates(updatedTemplates);
    saveMessageTemplates(updatedTemplates);
    resetForm();
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingId(template.id);
    setName(template.name);
    setContent(template.content);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ce modèle ?")) return;
    const updatedTemplates = templates.filter((t) => t.id !== id);
    setTemplates(updatedTemplates);
    saveMessageTemplates(updatedTemplates);
    toast.success("Modèle supprimé");
    if (editingId === id) resetForm();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Modèles de messages PDF
        </CardTitle>
        <CardDescription>
          Créez des modèles de messages réutilisables pour l'envoi de PDF par email.
          Utilisez {"{client}"} pour insérer le nom du client automatiquement.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="template-name">Nom du modèle</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Rapport mensuel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-content">Contenu du message</Label>
            <Textarea
              id="template-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ex: Bonjour, veuillez trouver ci-joint le rapport d'interventions pour {client}..."
              className="min-h-[100px]"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {editingId ? "Mettre à jour" : "Créer le modèle"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                Annuler
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        {templates.length > 0 ? (
          <div className="space-y-2">
            <Label>Modèles existants ({templates.length})</Label>
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-start justify-between p-4 border rounded-lg bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {template.content}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Aucun modèle créé</p>
            <p className="text-sm">Créez votre premier modèle ci-dessus</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
