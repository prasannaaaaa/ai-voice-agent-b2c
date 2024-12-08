import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY')
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

if (!DEEPGRAM_API_KEY || !GROQ_API_KEY) {
  throw new Error('Missing required API keys')
}

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
    const { audioData } = await req.json()
    
    if (!audioData) {
      throw new Error('No audio data provided')
    }

    console.log('Received audio data, processing with Deepgram...')

    // Convert base64 to binary
    const binaryAudio = Uint8Array.from(atob(audioData), c => c.charCodeAt(0))

    // Process audio with Deepgram
    const deepgramResponse = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/wav',
      },
      body: binaryAudio,
    })

    if (!deepgramResponse.ok) {
      throw new Error(`Deepgram API error: ${deepgramResponse.status}`)
    }

    const transcription = await deepgramResponse.json()
    const text = transcription.results?.channels[0]?.alternatives[0]?.transcript

    if (!text) {
      throw new Error('No transcription received from Deepgram')
    }

    console.log('Transcription received:', text)

    // Generate response with Groq
    const groqResponse = await fetch('https://api.groq.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gemma-7b-it",
        messages: [
          {
            role: "system",
            content: "You are a restaurant AI assistant helping with orders and reservations. Keep responses brief and friendly."
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      })
    })

    if (!groqResponse.ok) {
      throw new Error(`Groq API error: ${groqResponse.status}`)
    }

    const aiResponse = await groqResponse.json()
    const responseText = aiResponse.choices[0]?.message?.content

    if (!responseText) {
      throw new Error('No response received from Groq')
    }

    console.log('AI Response generated:', responseText)

    // Convert response to speech using Deepgram
    const ttsResponse = await fetch('https://api.deepgram.com/v1/speak?model=aura-zeus-en', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: responseText })
    })

    if (!ttsResponse.ok) {
      throw new Error(`Text-to-speech API error: ${ttsResponse.status}`)
    }

    const audioBuffer = await ttsResponse.arrayBuffer()
    
    // Store conversation in database
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseClient
      .from('conversations')
      .insert([
        { user_input: text, ai_response: responseText }
      ])

    console.log('Conversation stored in database')

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
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})