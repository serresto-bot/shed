function safeStringify(obj) {
  return JSON.stringify(obj).replace(/[^\x00-\x7F]/g, (c) =>
    `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
  );
}

async function postToSheets(url, data) {
  const body = safeStringify(data);
  const headers = { 'Content-Type': 'application/json' };
  return fetch(url, { method: 'POST', headers, body, redirect: 'follow' });
}

function todayYYMMDD() {
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const yy = String(kst.getFullYear()).slice(-2);
  const mm = String(kst.getMonth() + 1).padStart(2, '0');
  const dd = String(kst.getDate()).padStart(2, '0');
  return yy + mm + dd;
}

function todayYYYYMMDD() {
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const yyyy = String(kst.getFullYear());
  const mm = String(kst.getMonth() + 1).padStart(2, '0');
  const dd = String(kst.getDate()).padStart(2, '0');
  return yyyy + mm + dd;
}

function getRitualCode(hexCode) {
  const drivers = ['H', 'S', 'P', 'T', 'F'];
  const scores = drivers.map((d, i) => ({
    driver: d,
    score: parseInt(hexCode.slice(i * 2, i * 2 + 2), 16),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0].driver + scores[1].driver;
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
  const { name, phone4, code, link } = body || {};

  const ritualCode = code ? getRitualCode(code) : '';

  if (!name || !phone4 || !ritualCode) {
    res.status(400).json({ ok: false, error: 'missing fields' });
    return;
  }

  const pid       = name.replace(/\s/g, '') + phone4;
  const startDate = todayYYYYMMDD();
  const ritualUrl = `https://shedevent.vercel.app/ritual.html?p=${encodeURIComponent(pid)}&n=${encodeURIComponent(name)}&r=${ritualCode}&d=${startDate}&ph=${phone4}`;

  const BOT_TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID    = process.env.TELEGRAM_CHAT_ID;
  const SHEETS_URL = process.env.SHEETS_WEBAPP_URL;

  const tasks = [];

  if (SHEETS_URL) {
    tasks.push(postToSheets(SHEETS_URL, {
      action: 'pretest',
      pid,
      name,
      phone4,
      ritualCode,
      startDate,
      code:  code  || '',
      link:  link  || '',
    }));
  }

  if (BOT_TOKEN && CHAT_ID && link) {
    const text = `■ ${todayYYMMDD()}_${name} ${phone4}\n- <a href="${link}">결과지 확인하기</a>\n- <a href="${ritualUrl}">리츄얼 &amp; 스탬프</a>`;
    tasks.push(
      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
      }).then(async r => {
        const t = await r.text();
        console.log('[telegram]', r.status, t.slice(0, 300));
        return r;
      })
    );
  } else {
    console.log('[telegram] skip — BOT_TOKEN:', !!BOT_TOKEN, 'CHAT_ID:', !!CHAT_ID);
  }

  const results = await Promise.allSettled(tasks);
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error('submit-pretest task', i, 'failed:', r.reason);
  });

  res.status(200).json({ ok: true, pid, ritualUrl });
};
