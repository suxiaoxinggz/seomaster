// functions/api/gemini.js

export async function onRequestPost(context) {
  try {
    const { env, request } = context;
    const { prompt, modelId, jsonMode, stream } = await request.json();

    if (!env.API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error: API_KEY missing.' }), { status: 500 });
    }

    // Determine endpoint: standard generate or streamGenerate
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    const method = stream ? 'streamGenerateContent' : 'generateContent';
    const apiUrl = `${baseUrl}/${modelId}:${method}?key=${env.API_KEY}`; 

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: jsonMode ? { responseMimeType: "application/json" } : undefined
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.json();
        throw new Error(errorBody?.error?.message || `Google API Error: ${apiResponse.status}`);
    }

    if (stream) {
        // Handle Streaming Response
        // Google returns a stream of JSON objects. We create a pipe to forward this immediately.
        
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const reader = apiResponse.body.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        // Background processing of the stream
        (async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    // We just forward the raw bytes from Google to the client.
                    // The client (llmService.ts) handles the specific Google JSON stream parsing.
                    // This keeps the edge function fast and agnostic.
                    await writer.write(value);
                }
            } catch (e) {
                console.error("Stream error:", e);
                await writer.write(encoder.encode(JSON.stringify({ error: e.message })));
            } finally {
                await writer.close();
            }
        })();

        return new Response(readable, {
            headers: {
                'Content-Type': 'application/json', 
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } else {
        // Standard Response
        const data = await apiResponse.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return new Response(JSON.stringify({ text }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}