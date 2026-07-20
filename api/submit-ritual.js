// Non-ASCII 문자를 \uXXXX 이스케이프로 변환 — Apps Script ISO-8859-1 읽기 문제 우회
function safeStringify(obj) {
  return JSON.stringify(obj).replace(/[^\x00-\x7F]/g, (c) =>
    `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
  );
}

async function postToSheets(url, data) {
  const body = safeStringify(data);
  console.log('[body]', body.slice(0, 200));
  const headers = { 'Content-Type': 'application/json' };
  const res = await fetch(url, { method: 'POST', headers, body, redirect: 'follow' });
  const text = await res.text();
  console.log('[sheets]', res.status, text.slice(0, 300));
  return res;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method not allowed' });
    return;
  }

  let body = req.body;
  if (!body || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; }
  }

  const SHEETS_URL = process.env.SHEETS_WEBAPP_URL;

  if (SHEETS_URL) {
    await postToSheets(SHEETS_URL, { action: 'record', ...body })
      .catch(err => console.error('sheets error:', err));
  }

  res.status(200).json({ ok: true });
};
