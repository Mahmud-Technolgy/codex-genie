const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateRequest {
  prompt: string
  language: string
  complexity?: 'simple' | 'intermediate' | 'advanced'
  includeTests?: boolean
  includeComments?: boolean
  framework?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    // Create Supabase client
    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    // Check if user has enough credits
    const { data: credits } = await supabaseClient
      .from('credits')
      .select('amount')
      .eq('user_id', userData.user.id)
      .single()

    if (!credits || credits.amount < 1) {
      throw new Error('Insufficient credits. Please purchase more credits to continue.')
    }

    const { 
      prompt, 
      language, 
      complexity = 'intermediate',
      includeTests = false,
      includeComments = true,
      framework
    }: GenerateRequest = await req.json()

    if (!prompt || !language) {
      throw new Error('Missing prompt or language')
    }

    // Get API key from database
    const { data: apiKeyData } = await supabaseClient
      .from('api_keys')
      .select('key_value') 
      .eq('key_name', 'GEMINI_API_KEY')
      .single();

    const geminiApiKey = apiKeyData?.key_value || Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured. Please contact administrator.')
    } 

    // Build enhanced system prompt
    const complexityPrompts = {
      simple: 'Generate simple, beginner-friendly code with clear comments and basic functionality.',
      intermediate: 'Generate well-structured code following best practices with proper error handling.',
      advanced: 'Generate production-ready, optimized code with advanced patterns, comprehensive error handling, and performance considerations.'
    }

    let systemPrompt = `You are an expert ${language} developer. ${complexityPrompts[complexity]}`;
    
    if (framework) {
      systemPrompt += ` Use ${framework} framework and follow its conventions.`;
    }
    
    if (includeComments) {
      systemPrompt += ` Include detailed comments explaining the code logic.`;
    }
    
    if (includeTests) {
      systemPrompt += ` Include unit tests for the generated code.`;
    }
    
    systemPrompt += ` Follow best practices for ${language}. Ensure the code is functional, well-organized, and ready to use. Only return the code, no additional explanations unless specifically requested.`;

    // Enhanced prompt with context
    const enhancedPrompt = `${systemPrompt}\n\nUser request: ${prompt}\n\nRequirements:
- Language: ${language}
- Complexity: ${complexity}
- Framework: ${framework || 'None specified'}
- Include tests: ${includeTests ? 'Yes' : 'No'}
- Include comments: ${includeComments ? 'Yes' : 'No'}`;

    // Call Gemini API with enhanced configuration
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + geminiApiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: enhancedPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 4096,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    })

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text()
      console.error('Gemini API error:', errorData)
      throw new Error('Failed to generate code. Please try again.')
    }

    const geminiData = await geminiResponse.json()
    const generatedCode = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!generatedCode) {
      throw new Error('No code generated. Please try with a different prompt.')
    }

    // Calculate credits to deduct (more for advanced features)
    let creditsToDeduct = 1;
    if (complexity === 'advanced') creditsToDeduct += 1;
    if (includeTests) creditsToDeduct += 1;
    if (framework) creditsToDeduct += 1;

    // Ensure user has enough credits
    if (credits.amount < creditsToDeduct) {
      throw new Error(`Insufficient credits. Need ${creditsToDeduct} credits for this generation.`);
    }

    // Deduct credits
    const { error: creditError } = await supabaseClient
      .from('credits')
      .update({ 
        amount: credits.amount - creditsToDeduct,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userData.user.id)

    if (creditError) {
      console.error('Error deducting credits:', creditError)
      throw new Error('Failed to deduct credits');
    }

    // Log credit transaction
    await supabaseClient.from('credit_transactions').insert({
      user_id: userData.user.id,
      amount: -creditsToDeduct,
      type: 'usage',
      description: `Code generation - ${language} (${complexity}${includeTests ? ', with tests' : ''}${framework ? `, ${framework}` : ''})`,
    })

    // Save generation to database with enhanced metadata
    const { data: generation, error: saveError } = await supabaseClient
      .from('code_generations')
      .insert({
        user_id: userData.user.id,
        prompt,
        language,
        generated_code: generatedCode,
        credits_used: creditsToDeduct,
        model_used: 'gemini-pro'
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving generation:', saveError)
    }

    console.log(`Generated code for user ${userData.user.id}, language: ${language}, credits used: ${creditsToDeduct}`)

    return new Response(
      JSON.stringify({
        success: true,
        code: generatedCode,
        generation_id: generation?.id,
        remaining_credits: credits.amount - creditsToDeduct,
        credits_used: creditsToDeduct
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