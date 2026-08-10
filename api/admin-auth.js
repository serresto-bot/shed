module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const { pw } = req.body || {};
  if (pw && pw === process.env.ADMIN_PW) {
    res.status(200).json({ ok: true });
  } else {
    res.status(401).json({ ok: false });
  }
};
