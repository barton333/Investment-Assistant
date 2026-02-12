
export default async function handler(req, res) {
  // 1. Get the path from the query parameter (setup via vercel.json rewrites)
  // Example: /api/proxy?path=v1beta/models/gemini-3-flash-preview:generateContent
  const { path } = req.query;

  if (!path) {
    return res.status(400).json({ error: 'No path provided' });
  }

  // 2. Construct the target Google URL
  // We must retain the query string from the original URL (e.g. ?key=AIzaSy...)
  // req.url looks like /api/proxy?path=...&key=...
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const originalSearchParams = urlObj.searchParams;
  originalSearchParams.delete('path'); // Remove the Vercel internal path param
  
  const targetUrl = `https://generativelanguage.googleapis.com/${path}?${originalSearchParams.toString()}`;

  try {
    // 3. Make the request to Google
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward logic: If the client sent a body, forward it.
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();

    // 4. Return the response to the client
    // Vercel handles CORS automatically if configured in vercel.json, 
    // but explicit headers here ensure safety.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(response.status).json(data);

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: 'Failed to proxy request', details: error.message });
  }
}
