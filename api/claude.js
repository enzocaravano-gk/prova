export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const API_KEY = process.env.GROQ_API_KEY;
  if (!API_KEY) {
    return new Response(JSON.stringify({ error: 'API key non configurata' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const body = await req.json();

    // Converti formato Anthropic → Groq (OpenAI-compatible)
    const groqBody = {
      model: 'llama-3.3-70b-versatile',
      max_tokens: body.max_tokens || 600,
      messages: [
        { role: 'system', content: body.system || '' },
        ...body.messages
      ]
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY,
      },
      body: JSON.stringify(groqBody)
    });

    const data = await response.json();

    // Converti risposta Groq → formato Anthropic (che JARVIS.html si aspetta)
    if (data.error) {
      return new Response(JSON.stringify({ error: data.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const anthropicFormat = {
      content: [{ type: 'text', text: data.choices?.[0]?.message?.content || '' }]
    };

    return new Response(JSON.stringify(anthropicFormat), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: { message: err.message } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
