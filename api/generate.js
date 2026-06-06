export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { businessData } = req.body;
    if (!businessData) return res.status(400).json({ error: 'Missing business data' });

    const wa = businessData.whatsapp || businessData.phone;
    const waClean = wa.replace(/^0/, '').replace(/\s/g, '');
    const waLink = `https://wa.me/234${waClean}`;

    const prompt = `You are a world-class web designer specializing in beautiful, conversion-focused websites for African small businesses.

Create a COMPLETE, stunning single-page HTML website for this Nigerian business.

BUSINESS DETAILS:
- Name: ${businessData.name}
- Type: ${businessData.type}
- Description: ${businessData.desc}
- Location: ${businessData.location}
- Phone: ${businessData.phone}
- WhatsApp Link: ${waLink}
- Email: ${businessData.email || ''}
- Services/Products: ${businessData.services}
- Opening Hours: ${businessData.hours || 'Contact us for hours'}
- Instagram: ${businessData.instagram || ''}
- Tagline: ${businessData.tagline || ''}
- Brand Color: ${businessData.color}

DESIGN REQUIREMENTS:
1. Return ONLY valid HTML. No markdown. No explanation. No code fences. Just pure HTML starting with <!DOCTYPE html>
2. Single HTML file — all CSS and JS must be inline
3. Import beautiful Google Fonts
4. Brand color ${businessData.color} as primary
5. Mobile-first, fully responsive
6. Sections: sticky nav, hero, about, services, why choose us, testimonials, location, contact, footer
7. WhatsApp floating button always visible
8. Smooth scroll and CSS animations
9. SEO meta tags with business name and location
10. Make it feel PREMIUM — like a 500,000 naira agency built i
