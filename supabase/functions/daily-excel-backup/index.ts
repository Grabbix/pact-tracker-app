import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const API_BASE_URL = Deno.env.get('VITE_API_URL') || 'http://localhost:3001';

serve(async (req) => {
  try {
    console.log('Starting daily Excel backup...');
    
    // Appeler l'endpoint API pour exporter tous les contrats
    const response = await fetch(`${API_BASE_URL}/api/contracts/export-all-excel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();
    
    console.log(`Excel backup completed: ${result.count} contracts exported to ${result.path}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${result.count} contrats exportés avec succès`,
        path: result.path,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in daily backup:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
})
