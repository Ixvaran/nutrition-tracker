import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiExtractionResponseSchema } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch user tier
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('role, daily_ai_requests, last_request_date')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const todayStr = new Date().toISOString().split('T')[0]
    let apiKeyValue: string | undefined

    if (profile.role === 'free') {
      // Check limit: 1 request per day
      const lastRequestDate = profile.last_request_date
      const currentRequests = profile.daily_ai_requests

      if (lastRequestDate === todayStr && currentRequests >= 1) {
        return NextResponse.json({
          error: 'Daily AI request limit reached (1 per day for Free tier). Upgrade to Pro Tier (BYOK) for unlimited requests!',
          limitReached: true
        }, { status: 403 })
      }

      // Free tier uses fallback key from environment
      apiKeyValue = process.env.DEEPSEEK_API_KEY_FALLBACK
      if (!apiKeyValue) {
        return NextResponse.json({ error: 'Server configuration error: Fallback API Key not configured' }, { status: 500 })
      }
    } else {
      // Pro Tier (BYOK) - read from header
      apiKeyValue = req.headers.get('x-api-key') || undefined
      if (!apiKeyValue) {
        return NextResponse.json({
          error: 'API Key missing. Pro tier requires your own DeepSeek API Key in the settings.'
        }, { status: 400 })
      }
    }

    // Parse the body
    const body = await req.json()
    const { query, currentResult, revisionPrompt } = body

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // 3. Setup DeepSeek NLU messages
    const messages = []
    if (currentResult && revisionPrompt) {
      messages.push({
        role: 'system',
        content: `You are an expert nutritionist and data parser.
You previously converted a food description into structured ingredients:
${JSON.stringify(currentResult, null, 2)}

The user now wants to revise or apply corrections/changes to this parsing.
Revision Instruction: "${revisionPrompt}"

Apply this revision. Modify, add, or delete the ingredients in the list accordingly. Estimate or recalculate serving weights and nutritional values: calories, protein (g), carbs (g), fat (g).
IMPORTANT MACRONUTRIENT MATH RULES:
- Protein and Carbs contain 4 calories per gram.
- Fat contains 9 calories per gram.
- For each ingredient and for the total, the calories MUST equal exactly: (protein * 4) + (carbs * 4) + (fat * 9). Adjust the values slightly if needed to satisfy this mathematical relation precisely.
- Keep numbers as decimals where appropriate, but round total calories to the nearest integer.

Your output must be a valid JSON object matching the exact same structure.`
      })
      messages.push({
        role: 'user',
        content: `Original Query: "${query}"\nRevision Request: "${revisionPrompt}"`
      })
    } else {
      messages.push({
        role: 'system',
        content: `You are an expert nutritionist and data parser. Convert raw qualitative food descriptions into structured ingredients.
For each ingredient, you must estimate the serving weight in grams, and calculate nutritional values: calories, protein (g), carbs (g), fat (g).
IMPORTANT MACRONUTRIENT MATH RULES:
- Protein and Carbs contain 4 calories per gram.
- Fat contains 9 calories per gram.
- For each ingredient and for the total, the calories MUST equal exactly: (protein * 4) + (carbs * 4) + (fat * 9). Adjust the values slightly if needed to satisfy this mathematical relation precisely.
- Keep numbers as decimals where appropriate, but round total calories to the nearest integer.

Your output must be a valid JSON object matching the following structure:
{
  "food_name": "General description name of the logged food",
  "parsed_ingredients": [
    {
      "ingredient_name": "specific ingredient (e.g. skinless chicken breast)",
      "estimated_grams": 150,
      "calories": 240,
      "protein": 37.5,
      "carbs": 0,
      "fat": 10
    }
  ],
  "total_calories": 240,
  "total_protein": 37.5,
  "total_carbs": 0,
  "total_fat": 10
}`
      })
      messages.push({
        role: 'user',
        content: `Parse this food entry: "${query}"`
      })
    }

    // 4. Make DeepSeek NLU request
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeyValue}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        response_format: { type: 'json_object' },
        messages
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DeepSeek API Error:', errorText)
      return NextResponse.json({ error: 'DeepSeek AI request failed. Please check your API key and try again.' }, { status: response.status })
    }

    const rawData = await response.json()
    const messageContent = rawData.choices?.[0]?.message?.content

    if (!messageContent) {
      return NextResponse.json({ error: 'Invalid response from DeepSeek API' }, { status: 500 })
    }

    // 4. Validate the AI response using Zod
    let parsedAIResponse
    try {
      parsedAIResponse = JSON.parse(messageContent)
    } catch (e) {
      return NextResponse.json({ error: 'AI output was not valid JSON' }, { status: 500 })
    }

    const validatedData = aiExtractionResponseSchema.safeParse(parsedAIResponse)
    if (!validatedData.success) {
      console.error('Zod Validation Failure:', validatedData.error.format())
      return NextResponse.json({ error: 'AI output did not match validation schema', details: validatedData.error.issues }, { status: 500 })
    }

    // 5. Update user daily limit if Free Tier
    if (profile.role === 'free') {
      const newRequests = profile.last_request_date === todayStr ? profile.daily_ai_requests + 1 : 1
      const { error: updateLimitError } = await supabase
        .from('users')
        .update({
          daily_ai_requests: newRequests,
          last_request_date: todayStr
        })
        .eq('id', user.id)

      if (updateLimitError) {
        console.error('Error updating free request usage:', updateLimitError.message)
      }
    }

    // 6. Record token usage in daily_logs
    const totalTokens = rawData.usage?.total_tokens || 0
    if (totalTokens > 0) {
      let { data: log, error: logError } = await supabase
        .from('daily_logs')
        .select('id, tokens_used')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .single()

      if (logError && logError.code === 'PGRST116') {
        await supabase
          .from('daily_logs')
          .insert({
            user_id: user.id,
            date: todayStr,
            total_calories: 0,
            total_protein: 0,
            total_carbs: 0,
            total_fat: 0,
            tokens_used: totalTokens
          })
      } else if (!logError && log) {
        await supabase
          .from('daily_logs')
          .update({
            tokens_used: (log.tokens_used || 0) + totalTokens
          })
          .eq('id', log.id)
      }
    }

    return NextResponse.json({
      ...validatedData.data,
      tokens_spent: totalTokens
    })
  } catch (err: any) {
    console.error('AI API Route Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
