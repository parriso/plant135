// Vercel serverless function. Keeps your AI key on the server, never in the browser.
//
// FREE option (recommended): Google Gemini. Get a key at aistudio.google.com (no card needed)
// and set GEMINI_API_KEY in Vercel (Settings > Environment Variables), then redeploy.
// Paid option: set ANTHROPIC_API_KEY instead. If both are set, Gemini is used.
//
// Quick check: open https://YOUR-SITE.vercel.app/api/identify in a browser.
// You should see {"ok":true,"hasKey":true,"provider":"gemini"}.

const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

function provider() {
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return null;
}

async function askGemini(prompt, image) {
  const parts = [];
  if (image) parts.push({ inlineData: { mimeType: 'image/jpeg', data: image } });
  parts.push({ text: prompt });
  const models = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : GEMINI_MODELS;
  for (const model of models) {
    const r = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { maxOutputTokens: 4000, responseMimeType: 'application/json' }
        })
      }
    );
    if (r.status === 404) continue; // model name not available, try the next one
    if (!r.ok) {
      let msg = ''; try { msg = ((await r.json()).error || {}).message || ''; } catch (e) {}
      console.error('Gemini error', r.status, msg);
      if (r.status === 401 || r.status === 403 || (r.status === 400 && /api key/i.test(msg))) throw { code: 'bad_key' };
      if (r.status === 429) throw { code: 'rate_limited' };
      throw { code: 'upstream_error' };
    }
    const data = await r.json();
    const out = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    return out.map(p => p.text || '').join('\n');
  }
  throw { code: 'bad_model' };
}

async function askClaude(prompt, image) {
  const content = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } });
  content.push({ type: 'text', text: prompt });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1000, messages: [{ role: 'user', content }] })
  });
  if (!r.ok) {
    let msg = ''; try { msg = ((await r.json()).error || {}).message || ''; } catch (e) {}
    console.error('Anthropic error', r.status, msg);
    if (r.status === 401 || r.status === 403) throw { code: 'bad_key' };
    if (r.status === 404) throw { code: 'bad_model' };
    if (r.status === 429) throw { code: 'rate_limited' };
    if (/credit|balance|billing|limit/i.test(msg)) throw { code: 'no_credit' };
    throw { code: 'upstream_error' };
  }
  const data = await r.json();
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
}

module.exports = async (req, res) => {
  const which = provider();

  if (req.method === 'GET') return res.status(200).json({ ok: true, hasKey: Boolean(which), provider: which });
  if (req.method !== 'POST') return res.status(405).json({ error: 'post_only' });
  if (!which) return res.status(500).json({ error: 'missing_key' });

  const { prompt, image } = req.body || {};
  if (typeof prompt !== 'string' || !prompt || prompt.length > 4000)
    return res.status(400).json({ error: 'bad_prompt' });
  if (image && (typeof image !== 'string' || image.length > 4000000))
    return res.status(400).json({ error: 'bad_image' });

  try {
    const text = which === 'gemini' ? await askGemini(prompt, image) : await askClaude(prompt, image);
    return res.status(200).json({ text });
  } catch (e) {
    if (e && e.code) return res.status(e.code === 'rate_limited' ? 429 : 502).json({ error: e.code });
    console.error(e);
    return res.status(502).json({ error: 'request_failed' });
  }
};
