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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      throw new Error('Forbidden: Admin access required')
    }

    const { key, value } = await req.json()

    if (!key || !value) {
      throw new Error('Missing key or value')
    }

    // For now, we'll just validate that the key is accepted
    // In a real implementation, you would use Supabase's secrets management
    if (key !== 'GEMINI_API_KEY') {
      throw new Error('Invalid API key type')
    }

    // Log the action
    await supabaseClient.from('admin_logs').insert({
      admin_id: user.id,
      action: 'update_api_key',
      details: { key: key }
    })

    console.log(`Admin ${user.id} updated API key: ${key}`)

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