export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SHEET_URL = process.env.GOOGLE_SHEET_URL;

  if (req.method === 'GET') {
    try {
      if (!SHEET_URL) return res.status(200).json({ count: 0 });
      const r = await fetch(`${SHEET_URL}?action=count`);
      const d = await r.json();
      return res.status(200).json({ count: d.count || 0 });
    } catch {
      return res.status(200).json({ count: 0 });
    }
  }

  if (req.method === 'POST') {
    try {
      const { businessData, siteUrl } = req.body;
      if (!SHEET_URL) return res.status(200).json({ success: true, count: 1 });

      const payload = {
        action: 'log',
        timestamp: new Date().toISOString(),
        businessName: businessData.name,
        businessType: businessData.type,
        location: businessData.location,
        phone: businessData.phone,
        whatsapp: businessData.whatsapp || businessData.phone,
        email: businessData.email || '',
        instagram: businessData.instagram || '',
        siteUrl: siteUrl,
        tagline: businessData.tagline || ''
      };

      const r = await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const d = await r.json();
      return res.status(200).json({ success: true, count: d.count || 0 });
    } catch (err) {
      console.error('Sheets error:', err);
      return res.status(200).json({ success: true, count: 0 });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
