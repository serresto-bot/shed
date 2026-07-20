const APPS_URL = process.env.SHEETS_WEBAPP_URL;

module.exports = async (req, res) => {
  if (!APPS_URL) {
    res.status(500).json({ ok: false, error: 'SHEETS_WEBAPP_URL not set' });
    return;
  }

  const { action, pid, name, phone } = req.query;
  const params = new URLSearchParams({ action });
  if (pid)   params.set('pid',   pid);
  if (name)  params.set('name',  name);
  if (phone) params.set('phone', phone);

  try {
    const r    = await fetch(`${APPS_URL}?${params}`, { redirect: 'follow' });
    const text = await r.text();
    const data = JSON.parse(text);
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
};
