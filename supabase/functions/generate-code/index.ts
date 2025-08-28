import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateRequest {
  prompt: string
  language: string
  complexity?: 'simple' | 'intermediate' | 'advanced'
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

    // Check if user has enough credits
    const { data: credits } = await supabaseClient
      .from('credits')
      .select('amount')
      .eq('user_id', user.id)
      .single()

    if (!credits || credits.amount < 1) {
      throw new Error('Insufficient credits')
    }

    const { prompt, language, complexity = 'intermediate' }: GenerateRequest = await req.json()

    if (!prompt || !language) {
      throw new Error('Missing prompt or language')
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured')
    }

    // Build the system prompt based on complexity
    const complexityPrompts = {
      simple: 'Generate simple, beginner-friendly code with clear comments.',
      intermediate: 'Generate well-structured code with good practices and explanations.',
      advanced: 'Generate production-ready, optimized code with advanced patterns and comprehensive error handling.'
    }

    const systemPrompt = `You are an expert ${language} developer. ${complexityPrompts[complexity]} 
    Follow best practices for ${language}. Include helpful comments and ensure the code is functional and well-organized.
    Only return the code, no additional explanations unless specifically requested.`

    // Call Gemini API
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + geminiApiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser request: ${prompt}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        }
      })
    })

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text()
      console.error('Gemini API error:', errorData)
      throw new Error('Failed to generate code')
    }

    const geminiData = await geminiResponse.json()
    const generatedCode = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!generatedCode) {
      throw new Error('No code generated')
    }

    // Deduct credits
    const { error: creditError } = await supabaseClient
      .from('credits')
      .update({ amount: credits.amount - 1 })
      .eq('user_id', user.id)

    if (creditError) {
      console.error('Error deducting credits:', creditError)
    }

    // Log credit transaction
    await supabaseClient.from('credit_transactions').insert({
      user_id: user.id,
      amount: -1,
      type: 'usage',
      description: `Code generation - ${language}`,
    })

    // Save generation to database
    const { data: generation, error: saveError } = await supabaseClient
      .from('code_generations')
      .insert({
        user_id: user.id,
        prompt,
        language,
        generated_code: generatedCode,
        credits_used: 1,
        model_used: 'gemini-pro'
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving generation:', saveError)
    }

    console.log(`Generated code for user ${user.id}, language: ${language}`)

    return new Response(
      JSON.stringify({
        success: true,
        code: generatedCode,
        generation_id: generation?.id,
        remaining_credits: credits.amount - 1
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error generating code:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})