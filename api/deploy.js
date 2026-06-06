export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { html, businessName } = req.body;
    if (!html || !businessName) return res.status(400).json({ error: 'Missing data' });

    const siteName = 'ezeweb-' +
      businessName.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 25) +
      '-' + Date.now().toString(36);

    const siteRes = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NETLIFY_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: siteName })
    });

    if (!siteRes.ok) {
      const err = await siteRes.json();
      throw new Error(err.message || 'Failed to create Netlify site');
    }

    const site = await siteRes.json();
    const zipBuffer = await buildZip(html);

    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NETLIFY_TOKEN}`,
        'Content-Type': 'application/zip'
      },
      body: zipBuffer
    });

    if (!deployRes.ok) {
      const err = await deployRes.json();
      throw new Error(err.message || 'Deploy failed');
    }

    const deploy = await deployRes.json();

    let liveUrl = `https://${siteName}.netlify.app`;
    for (let i = 0; i < 20; i++) {
      await sleep(2000);
      const check = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys/${deploy.id}`, {
        headers: { 'Authorization': `Bearer ${process.env.NETLIFY_TOKEN}` }
      });
      const d = await check.json();
      if (d.state === 'ready') { liveUrl = `https://${d.ssl_url || siteName + '.netlify.app'}`; break; }
      if (d.state === 'error') throw new Error('Netlify deploy failed');
    }

    return res.status(200).json({ url: liveUrl, siteName });

  } catch (error) {
    console.error('Deploy error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function buildZip(htmlContent) {
  const encoder = new TextEncoder();
  const fileData = encoder.encode(htmlContent);
  const fileName = encoder.encode('index.html');
  const crc = crc32(fileData);
  const now = new Date();
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);

  const localHeader = new Uint8Array(30 + fileName.length);
  const lhView = new DataView(localHeader.buffer);
  lhView.setUint32(0, 0x04034b50, true);
  lhView.setUint16(4, 20, true);
  lhView.setUint16(6, 0, true);
  lhView.setUint16(8, 0, true);
  lhView.setUint16(10, dosTime, true);
  lhView.setUint16(12, dosDate, true);
  lhView.setUint32(14, crc, true);
  lhView.setUint32(18, fileData.length, true);
  lhView.setUint32(22, fileData.length, true);
  lhView.setUint16(26, fileName.length, true);
  lhView.setUint16(28, 0, true);
  localHeader.set(fileName, 30);

  const centralDir = new Uint8Array(46 + fileName.length);
  const cdView = new DataView(centralDir.buffer);
  cdView.setUint32(0, 0x02014b50, true);
  cdView.setUint16(4, 20, true);
  cdView.setUint16(6, 20, true);
  cdView.setUint16(8, 0, true);
  cdView.setUint16(10, 0, true);
  cdView.setUint16(12, dosTime, true);
  cdView.setUint16(14, dosDate, true);
  cdView.setUint32(16, crc, true);
  cdView.setUint32(20, fileData.length, true);
  cdView.setUint32(24, fileData.length, true);
  cdView.setUint16(28, fileName.length, true);
  cdView.setUint16(30, 0, true);
  cdView.setUint16(32, 0, true);
  cdView.setUint16(34, 0, true);
  cdView.setUint16(36, 0, true);
  cdView.setUint32(38, 0x20, true);
  cdView.setUint32(42, 0, true);
  centralDir.set(fileName, 46);

  const localOffset = localHeader.length + fileData.length;
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, 1, true);
  eocdView.setUint16(10, 1, true);
  eocdView.setUint32(12, centralDir.length, true);
  eocdView.setUint32(16, localOffset, true);
  eocdView.setUint16(20, 0, true);

  const total = localHeader.length + fileData.length + centralDir.length + eocd.length;
  const result = new Uint8Array(total);
  let offset = 0;
  result.set(localHeader, offset); offset += localHeader.length;
  result.set(fileData, offset); offset += fileData.length;
  result.set(centralDir, offset); offset += centralDir.length;
  result.set(eocd, offset);
  return Buffer.from(result);
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
      }
