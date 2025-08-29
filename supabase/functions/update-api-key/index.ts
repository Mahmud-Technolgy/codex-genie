import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      throw new Error('Forbidden: Admin access required')
    }

    const { key, value } = await req.json()

    if (!key || !value) {
      throw new Error('Missing key or value')
    }

    // For now, we'll store the API key in a simple table
    // In production, use proper secrets management
    if (key !== 'GEMINI_API_KEY') {
      throw new Error('Invalid API key type')
    }

    // Store the API key
    const { error: upsertError } = await supabaseClient
      .from('api_keys')
      .upsert({
        key_name: key,
        key_value: value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key_name'
      });

    if (upsertError) {
      console.error('Error storing API key:', upsertError);
      throw new Error('Failed to store API key');
    }

    // Log the action
    await supabaseClient.from('admin_logs').insert({
      admin_id: userData.user.id,
      action: 'update_api_key',
      details: { key: key }
    })

    console.log(`Admin ${userData.user.id} updated API key: ${key}`)

    return new Response(
      JSON.stringify({ success: true, message: 'API key updated successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error updating API key:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})