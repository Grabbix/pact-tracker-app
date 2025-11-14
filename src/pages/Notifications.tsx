import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NotificationSettings {
  id?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_secure: boolean;
  smtp_from: string;
  email_to: string;
  triggers: {
    contract_full: boolean;
  };
}

const Notifications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    smtp_host: "",
    smtp_port: 587,
    smtp_user: "",
    smtp_password: "",
    smtp_secure: false,
    smtp_from: "",
    email_to: "",
    triggers: {
      contract_full: true,
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_settings" as any)
        .select("*")
        .limit(1)
        .maybeSingle() as any;

      if (error) {
        console.error("Error loading settings:", error);
        return;
      }

      if (data) {
        setSettings({
          id: data.id,
          smtp_host: data.smtp_host || "",
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || "",
          smtp_password: data.smtp_password || "",
          smtp_secure: data.smtp_secure || false,
          smtp_from: data.smtp_from || "",
          email_to: data.email_to || "",
          triggers: data.triggers || { contract_full: true },
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_user: settings.smtp_user,
        smtp_password: settings.smtp_password,
        smtp_secure: settings.smtp_secure,
        smtp_from: settings.smtp_from,
        email_to: settings.email_to,
        triggers: settings.triggers,
      };

      if (settings.id) {
        const { error } = await supabase
          .from("notification_settings" as any)
          .update(payload)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_settings" as any)
          .insert([payload]);

        if (error) throw error;
      }

      toast({
        title: "Configuration sauvegardée",
        description: "Les paramètres de notification ont été mis à jour.",
      });

      await loadSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setTestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-notification", {
        body: {
          to: settings.email_to,
          subject: "[Test] Configuration email",
          text: "Ceci est un email de test pour vérifier la configuration SMTP.",
          smtpConfig: {
            host: settings.smtp_host,
            port: settings.smtp_port,
            user: settings.smtp_user,
            password: settings.smtp_password,
            secure: settings.smtp_secure,
            from: settings.smtp_from,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Email envoyé",
        description: "L'email de test a été envoyé avec succès.",
      });
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'email de test.",
        variant: "destructive",
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Notifications Email</h1>
            <p className="text-muted-foreground">Configuration des alertes automatiques</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres SMTP</CardTitle>
              <CardDescription>
                Configurez votre serveur SMTP pour l'envoi d'emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">Serveur SMTP</Label>
                  <Input
                    id="smtp_host"
                    placeholder="smtp.example.com"
                    value={settings.smtp_host}
                    onChange={(e) =>
                      setSettings({ ...settings, smtp_host: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">Port</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    placeholder="587"
                    value={settings.smtp_port}
                    onChange={(e) =>
                      setSettings({ ...settings, smtp_port: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_user">Utilisateur (authentification)</Label>
                  <Input
                    id="smtp_user"
                    placeholder="user@example.com"
                    value={settings.smtp_user}
                    onChange={(e) =>
                      setSettings({ ...settings, smtp_user: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_from">Adresse expéditrice</Label>
                  <Input
                    id="smtp_from"
                    type="email"
                    placeholder="noreply@example.com"
                    value={settings.smtp_from}
                    onChange={(e) =>
                      setSettings({ ...settings, smtp_from: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password">Mot de passe</Label>
                  <Input
                    id="smtp_password"
                    type="password"
                    placeholder="••••••••"
                    value={settings.smtp_password}
                    onChange={(e) =>
                      setSettings({ ...settings, smtp_password: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="smtp_secure"
                  checked={settings.smtp_secure}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, smtp_secure: checked })
                  }
                />
                <Label htmlFor="smtp_secure">Utiliser SSL/TLS</Label>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="email_to">Email de destination</Label>
                <Input
                  id="email_to"
                  type="email"
                  placeholder="admin@example.com"
                  value={settings.email_to}
                  onChange={(e) =>
                    setSettings({ ...settings, email_to: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Adresse qui recevra les notifications
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={testLoading || !settings.smtp_host}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {testLoading ? "Envoi..." : "Tester"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Triggers de notification</CardTitle>
              <CardDescription>
                Choisissez quels événements déclenchent une notification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Contrat plein</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerte lorsqu'un contrat a épuisé toutes ses heures
                  </p>
                </div>
                <Switch
                  checked={settings.triggers.contract_full}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      triggers: { ...settings.triggers, contract_full: checked },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
