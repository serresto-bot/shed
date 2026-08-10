module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  const adminPw = req.headers['x-admin-pw'];
  if (!adminPw || adminPw !== process.env.ADMIN_PW) {
    return res.status(401).json({ ok: false });
  }
  res.json({ ok: true, key: process.env.SHED_INTERNAL_KEY });
};
