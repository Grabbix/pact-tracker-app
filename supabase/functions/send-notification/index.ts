import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
  from: string;
}

interface EmailRequest {
  to: string;
  subject: string;
  text: string;
  html?: string;
  smtpConfig?: SmtpConfig;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, text, html, smtpConfig }: EmailRequest = await req.json();

    if (!smtpConfig) {
      throw new Error("Configuration SMTP requise");
    }

    console.log(`Sending email to ${to} via ${smtpConfig.host}:${smtpConfig.port}`);

    // Construire la commande SMTP manuellement
    const boundary = "----=_Part_0_" + Date.now();
    const messageBody = html 
      ? `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text}\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${html}\r\n\r\n--${boundary}--`
      : `Content-Type: text/plain; charset=utf-8\r\n\r\n${text}`;

    const emailMessage = [
      `From: ${smtpConfig.from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      messageBody
    ].join("\r\n");

    // Connexion SMTP
    const conn = await Deno.connect({
      hostname: smtpConfig.host,
      port: smtpConfig.port,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper pour lire les réponses
    const readResponse = async () => {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      if (n === null) throw new Error("Connection closed");
      return decoder.decode(buffer.subarray(0, n));
    };

    // Helper pour envoyer des commandes
    const sendCommand = async (command: string) => {
      await conn.write(encoder.encode(command + "\r\n"));
      return await readResponse();
    };

    // Handshake SMTP
    await readResponse(); // Greeting
    await sendCommand(`EHLO ${smtpConfig.host}`);
    
    // AUTH LOGIN
    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(smtpConfig.user));
    await sendCommand(btoa(smtpConfig.password));

    // Envoyer l'email
    await sendCommand(`MAIL FROM:<${smtpConfig.from}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");
    await sendCommand(emailMessage + "\r\n.");
    await sendCommand("QUIT");

    conn.close();

    console.log("Email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Email envoyé" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
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
