
export default async function handler(req, res) {
  // 1. Handle CORS Preflight (Important for browser access)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-goog-api-key, x-goog-api-client');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Parse Path from Query (Setup via vercel.json)
  let { path } = req.query;

  if (!path) {
    return res.status(400).json({ error: 'No path provided' });
  }

  // Handle array case for path (wildcards sometimes return arrays)
  const cleanPath = Array.isArray(path) ? path.join('/') : path;

  // 3. Construct Target URL
  // Base: https://generativelanguage.googleapis.com/
  // Path: v1beta/models/...
  const targetUrlObj = new URL(`https://generativelanguage.googleapis.com/${cleanPath}`);

  // 4. Forward Query Params (excluding internal Vercel params)
  // req.url contains the rewritten path like /api/proxy?path=...
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  requestUrl.searchParams.forEach((value, key) => {
    if (key !== 'path' && key !== 'match') {
      targetUrlObj.searchParams.append(key, value);
    }
  });

  // 5. Build Headers (CRITICAL: Forward API Key)
  const headers = {
    'Content-Type': 'application/json',
  };

  // Forward Google authentication headers
  if (req.headers['x-goog-api-key']) headers['x-goog-api-key'] = req.headers['x-goog-api-key'];
  if (req.headers['x-goog-api-client']) headers['x-goog-api-client'] = req.headers['x-goog-api-client'];

  // 6. Handle Body safely
  const body = req.method !== 'GET' && req.body 
    ? (typeof req.body === 'object' ? JSON.stringify(req.body) : req.body)
    : undefined;

  try {
    const response = await fetch(targetUrlObj.toString(), {
      method: req.method,
      headers: headers,
      body: body,
    });

    const responseText = await response.text();
    
    // Try returning JSON if possible, otherwise text
    try {
        const json = JSON.parse(responseText);
        return res.status(response.status).json(json);
    } catch {
        return res.status(response.status).send(responseText);
    }

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: 'Proxy Request Failed', details: String(error) });
  }
}
