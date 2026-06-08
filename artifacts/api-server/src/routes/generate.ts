import { Router } from "express";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../lib/logger";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const leadsPath = path.resolve(__dirname, "../../leads.json");

interface LeadEntry {
  name: string;
  type: string;
  location: string;
  phone: string;
  siteUrl: string;
  timestamp: string;
  [key: string]: string;
}

async function checkPhoneExists(phone: string): Promise<string | null> {
  try {
    const raw = await readFile(leadsPath, "utf-8");
    const leads = JSON.parse(raw) as LeadEntry[];
    if (!Array.isArray(leads)) return null;
    const normalized = phone.replace(/\D/g, "");
    const found = leads.find((l) => l.phone.replace(/\D/g, "") === normalized && l.siteUrl);
    return found?.siteUrl ?? null;
  } catch {
    return null;
  }
}

const LANGUAGE_INSTRUCTION: Record<string, string> = {
  English: "Write all website content in standard English.",
  "Pidgin English": "Write all website content in Nigerian Pidgin English — warm, conversational, and authentic to how Nigerian people naturally speak.",
  Igbo: "Write all website content in Igbo language. Use natural, everyday Igbo that Igbo speakers will understand and connect with.",
  Yoruba: "Write all website content in Yoruba language. Use natural, everyday Yoruba that Yoruba speakers will understand and connect with.",
  Hausa: "Write all website content in Hausa language. Use natural, everyday Hausa that Hausa speakers will understand and connect with.",
};

router.post("/generate", async (req, res) => {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    return;
  }

  const {
    businessName,
    businessType,
    description,
    location,
    phone,
    whatsapp,
    email,
    services,
    openingHours,
    instagram,
    tagline,
    brandColor,
    language,
    logo,
    photos,
  } = req.body as {
    businessName: string;
    businessType: string;
    description: string;
    location: string;
    phone: string;
    whatsapp?: string;
    email?: string;
    services: string;
    openingHours?: string;
    instagram?: string;
    tagline?: string;
    brandColor?: string;
    language?: string;
    logo?: string;
    photos?: string[];
  };

  // Spam prevention: check phone number in leads.json
  const existingUrl = await checkPhoneExists(phone || "");
  if (existingUrl) {
    res.status(409).json({
      error: "DUPLICATE",
      message: `You already have an EzeWeb website! Here is your link: ${existingUrl}. Contact us on WhatsApp: wa.me/2348119098353`,
      url: existingUrl,
    });
    return;
  }

  const whatsappNumber = (whatsapp || phone || "").replace(/\D/g, "");
  const instagramHandle = instagram ? instagram.replace("@", "") : "";
  const selectedLanguage = language || "English";
  const languageInstruction = LANGUAGE_INSTRUCTION[selectedLanguage] || LANGUAGE_INSTRUCTION["English"];

  const hasLogo = logo && logo.length > 0;
  const photoList = Array.isArray(photos) ? photos.filter(Boolean) : [];
  const hasPhotos = photoList.length > 0;

  const imagePlaceholderInstructions = hasLogo || hasPhotos
    ? `
IMAGE PLACEHOLDERS (CRITICAL — use exactly as written):
${hasLogo ? `- For the business logo in header/nav and footer: use <img src="EZEWEB_LOGO_PLACEHOLDER" alt="${businessName} logo" style="height:50px;width:auto;object-fit:contain;">` : ""}
${hasPhotos ? photoList.map((_, i) => `- For business photo ${i + 1}: use <img src="EZEWEB_PHOTO${i + 1}_PLACEHOLDER" alt="${businessName} photo ${i + 1}" style="width:100%;height:300px;object-fit:cover;border-radius:12px;">`).join("\n") : ""}
Include these placeholder images naturally in appropriate sections (hero, gallery, about, services).
`
    : "";

  const prompt = `You are a world-class web designer creating a premium website for a Nigerian small business. Generate a COMPLETE, single-file HTML website. This must be stunning — equal to a ₦500,000,000 agency website.

LANGUAGE INSTRUCTION (CRITICAL): ${languageInstruction} Every word of content in the website — headings, paragraphs, buttons, navigation, testimonials, everything — must be in this language.

Business Details:
- Name: ${businessName}
- Type: ${businessType}
- Description: ${description}
- Location: ${location}
- Phone: ${phone}
- WhatsApp: ${whatsappNumber}
- Email: ${email || ""}
- Services/Products: ${services}
- Opening Hours: ${openingHours || "Mon-Sat: 8am - 8pm"}
- Instagram: ${instagramHandle}
- Tagline: ${tagline || `${businessName} — Quality You Can Trust`}
- Brand Color: ${brandColor || "#C9922A"}

${imagePlaceholderInstructions}

REQUIREMENTS:
1. Complete single HTML file with all CSS in <style> and all JS in <script>
2. Import from Google Fonts: Cormorant Garamond (headings) + Outfit (body)
3. Use brand color ${brandColor || "#C9922A"} as the primary accent color throughout
4. Mobile-responsive, mobile-first design
5. SEO meta tags (title, description, keywords, OG tags, viewport)

SECTIONS (in order):
1. Fixed navigation: ${hasLogo ? "use EZEWEB_LOGO_PLACEHOLDER for logo image" : "business name text as logo"}, nav links, WhatsApp CTA button
2. Hero: full-screen with gradient overlay, business name in large serif font, tagline, two CTA buttons (Call Us + WhatsApp), scroll indicator${hasPhotos ? ". Use EZEWEB_PHOTO1_PLACEHOLDER as hero background image" : ""}
3. About: who we are, our story, why we started — authentic Nigerian business narrative${hasPhotos && photoList.length > 1 ? ". Use EZEWEB_PHOTO2_PLACEHOLDER in this section" : ""}
4. Services/Products: grid of cards, each service with icon (emoji), name, short description — use the services listed above
5. Gallery/Portfolio (ONLY if business photos are provided): ${hasPhotos ? `show ${photoList.map((_, i) => `EZEWEB_PHOTO${i + 1}_PLACEHOLDER`).join(", ")} in a beautiful grid` : "skip this section"}
6. Why Choose Us: 3-4 benefit cards with icons
7. Testimonials: 3 cards with realistic Nigerian customer names and reviews mentioning specific benefits
8. Contact: address, phone, WhatsApp link, email, opening hours, embedded Google Maps link for the location
9. Footer: ${hasLogo ? "use EZEWEB_LOGO_PLACEHOLDER for logo" : "business name"}, tagline, quick links, social media, copyright 2026, and this badge exactly: <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;color:rgba(255,255,255,0.4)">Powered by <a href="https://ezeweb.replit.app" target="_blank" style="color:inherit;text-decoration:underline">EzeWeb</a> — Every Business Deserves a Kingdom Online</div>

SPECIAL ELEMENTS:
- Floating WhatsApp button (fixed, bottom-right) linking to https://wa.me/${whatsappNumber}
- Smooth scroll animations using IntersectionObserver (fade in from bottom)
- Smooth scrolling between sections
- Active nav link highlighting on scroll
- Hover effects on all cards (lift + shadow)
- Google Maps link: https://maps.google.com/?q=${encodeURIComponent(location)}
- ${instagram ? `Instagram link: https://instagram.com/${instagramHandle}` : ""}
- All phone links: tel:${phone}
- All WhatsApp links: https://wa.me/${whatsappNumber}

DESIGN LANGUAGE:
- Background: white and very light gray sections alternating
- Text: #1a1a1a on light backgrounds
- Headings: Cormorant Garamond, bold, large
- Body: Outfit, clean and readable
- Cards: white with soft shadow, rounded corners (12px)
- Buttons: brand color background with white text, rounded (8px), hover darken
- Hero: dark overlay on gradient background using brand color tones
- Professional, trustworthy, premium feel

Return ONLY the raw HTML code starting with <!DOCTYPE html> and ending with </html>. No markdown fences, no explanation, no preamble. Just the HTML.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      req.log.error({ status: response.status, error: errorText }, "Gemini API error");
      res.status(500).json({ error: "Failed to generate website. Check your GEMINI_API_KEY." });
      return;
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      error?: { message?: string };
    };

    if (data.error) {
      req.log.error({ error: data.error }, "Gemini API returned error");
      res.status(500).json({ error: data.error.message || "Gemini API error" });
      return;
    }

    let html = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    html = html
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    if (!html.includes("<!DOCTYPE") && !html.includes("<html")) {
      req.log.error({ sample: html.slice(0, 200) }, "Gemini did not return valid HTML");
      res.status(500).json({ error: "AI returned invalid HTML. Please try again." });
      return;
    }

    // Inject real image data in place of placeholders
    if (hasLogo) {
      const logoMime = logo!.startsWith("data:") ? "" : "data:image/jpeg;base64,";
      const logoSrc = logo!.startsWith("data:") ? logo! : `${logoMime}${logo}`;
      html = html.replace(/EZEWEB_LOGO_PLACEHOLDER/g, logoSrc);
    }
    if (hasPhotos) {
      photoList.forEach((photo, i) => {
        const photoMime = photo.startsWith("data:") ? "" : "data:image/jpeg;base64,";
        const photoSrc = photo.startsWith("data:") ? photo : `${photoMime}${photo}`;
        html = html.replace(new RegExp(`EZEWEB_PHOTO${i + 1}_PLACEHOLDER`, "g"), photoSrc);
      });
    }

    // Remove any remaining unfilled placeholders
    html = html.replace(/EZEWEB_(LOGO|PHOTO\d+)_PLACEHOLDER/g, "");

    res.json({ html });
  } catch (err) {
    logger.error({ err }, "Error calling Gemini API");
    res.status(500).json({ error: "Network error calling AI service. Please try again." });
  }
});

export default router;
