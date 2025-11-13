import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking for full contracts...");

    // Récupérer les paramètres de notification
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError || !settings || !settings.triggers.contract_full) {
      console.log("No notification settings or contract_full trigger disabled");
      return new Response(
        JSON.stringify({ message: "Notifications not configured or disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Récupérer tous les contrats actifs et pleins (used_hours >= total_hours)
    const { data: contracts, error: contractsError } = await supabase
      .from("contracts")
      .select("*")
      .eq("status", "active")
      .eq("is_archived", false)
      .gte("used_hours", supabase.rpc("total_hours"));

    if (contractsError) throw contractsError;

    if (!contracts || contracts.length === 0) {
      console.log("No full contracts found");
      return new Response(
        JSON.stringify({ message: "No full contracts" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${contracts.length} full contracts`);

    // Envoyer une notification pour chaque contrat plein
    const notifications = [];
    for (const contract of contracts) {
      // Vérifier si une notification a déjà été envoyée récemment (dans les dernières 24h)
      const { data: recentNotifs } = await supabase
        .from("notification_logs")
        .select("*")
        .eq("contract_id", contract.id)
        .eq("notification_type", "contract_full")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recentNotifs && recentNotifs.length > 0) {
        console.log(`Notification already sent for contract ${contract.id} in the last 24h`);
        continue;
      }

      const subject = "[gestion] contrat plein";
      const text = `Le contrat ${contract.total_hours}h de ${contract.client_name} débuté le ${contract.created_date} est expiré`;
      
      // Envoyer l'email
      const { error: emailError } = await supabase.functions.invoke("send-notification", {
        body: {
          to: settings.email_to,
          subject,
          text,
          html: `<p>${text}</p>`,
          smtpConfig: {
            host: settings.smtp_host,
            port: settings.smtp_port,
            user: settings.smtp_user,
            password: settings.smtp_password,
            secure: settings.smtp_secure,
          },
        },
      });

      if (emailError) {
        console.error(`Error sending email for contract ${contract.id}:`, emailError);
      } else {
        // Logger la notification envoyée
        await supabase.from("notification_logs").insert({
          contract_id: contract.id,
          notification_type: "contract_full",
          email_to: settings.email_to,
          subject,
          content: text,
        });
        
        notifications.push(contract.id);
        console.log(`Notification sent for contract ${contract.id}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `${notifications.length} notifications sent`,
        contract_ids: notifications 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error checking notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
