import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArxEvent {
  severity: string;
  priority: string;
}

interface ArxQuota {
  allowedSpace: number | null;
  usedSpace: number | null;
}

interface ArxApiResponse {
  quota: ArxQuota;
  events: Array<{ entry: ArxEvent }>;
  lastBackupStartTime: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accountName, clientId, accountId } = await req.json();

    if (!accountName || !clientId || !accountId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const arxApiKey = Deno.env.get('ARX_API_KEY');
    if (!arxApiKey) {
      console.error('ARX_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'ARX API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch data from ARX API
    console.log(`Fetching ARX data for account: ${accountName}`);
    const arxResponse = await fetch(
      `https://api.arx.one/s9/${accountName}/supervision/events?hierarchy=Self`,
      {
        headers: {
          'Authorization': `Bearer ${arxApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!arxResponse.ok) {
      console.error(`ARX API error: ${arxResponse.status} ${arxResponse.statusText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch data from ARX API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const arxData: ArxApiResponse[] = await arxResponse.json();
    
    if (!arxData || arxData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data returned from ARX API' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accountData = arxData[0];

    // Determine status based on events
    let status = 'ok';
    if (accountData.events && accountData.events.length > 0) {
      const hasCritical = accountData.events.some(
        (event) => event.entry && event.entry.priority === 'Critical'
      );
      if (hasCritical) {
        status = 'attention_requise';
      }
    }

    // Convert bytes to GB
    const usedSpaceGb = accountData.quota.usedSpace ? accountData.quota.usedSpace / 1000000000 : null;
    const allowedSpaceGb = accountData.quota.allowedSpace ? accountData.quota.allowedSpace / 1000000000 : null;

    // Update the database via API (using your existing Node.js API)
    const apiUrl = Deno.env.get('VITE_API_URL') || 'http://localhost:3001';
    const updateResponse = await fetch(
      `${apiUrl}/api/clients/${clientId}/arx-accounts/${accountId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          lastBackupDate: accountData.lastBackupStartTime,
          usedSpaceGb,
          allowedSpaceGb,
        }),
      }
    );

    if (!updateResponse.ok) {
      console.error('Failed to update database');
      return new Response(
        JSON.stringify({ error: 'Failed to update database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully updated ARX account ${accountName}`);
    
    return new Response(
      JSON.stringify({
        success: true,
        status,
        lastBackupDate: accountData.lastBackupStartTime,
        usedSpaceGb,
        allowedSpaceGb,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in sync-arx-data function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
