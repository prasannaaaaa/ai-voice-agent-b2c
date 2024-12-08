import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY')
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { audioData } = await req.json()

    // Process audio with Deepgram
    const deepgramResponse = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/wav',
      },
      body: audioData,
    })

    const transcription = await deepgramResponse.json()
    const text = transcription.results?.channels[0]?.alternatives[0]?.transcript || ''

    // Generate response with Groq
    const groqResponse = await fetch('https://api.groq.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gemma2-9b-it",
        messages: [
          {
            role: "system",
            content: "You are a restaurant AI assistant helping with orders and reservations."
          },
          {
            role: "user",
            content: text
          }
        ]
      })
    })

    const aiResponse = await groqResponse.json()
    const responseText = aiResponse.choices[0].message.content

    // Convert response to speech using Deepgram
    const ttsResponse = await fetch('https://api.deepgram.com/v1/speak?model=aura-helios-en', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: responseText })
    })

    const audioBuffer = await ttsResponse.arrayBuffer()
    
    // Store conversation in database
    const { data: client } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await client
      .from('conversations')
      .insert([
        { user_input: text, ai_response: responseText }
      ])

    return new Response(
      JSON.stringify({
        text: responseText,
        audio: Array.from(new Uint8Array(audioBuffer))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})