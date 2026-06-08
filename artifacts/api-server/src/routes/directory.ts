import { Router } from "express";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const leadsPath = path.resolve(__dirname, "../../leads.json");

interface LeadEntry {
  name: string;
  type: string;
  location: string;
  phone?: string;
  siteUrl?: string;
  timestamp?: string;
  [key: string]: string | undefined;
}

router.get("/directory", async (_req, res) => {
  let leads: LeadEntry[] = [];
  try {
    const raw = await readFile(leadsPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) leads = parsed as LeadEntry[];
  } catch {
    leads = [];
  }

  const withSites = leads.filter((l) => l.siteUrl);

  const cards = withSites.length
    ? withSites
        .slice()
        .reverse()
        .map(
          (l) => `
    <div class="biz-card">
      <div class="biz-type">${escHtml(l.type || "Business")}</div>
      <h3 class="biz-name">${escHtml(l.name || "Unnamed Business")}</h3>
      <div class="biz-location">📍 ${escHtml(l.location || "Nigeria")}</div>
      ${l.timestamp ? `<div class="biz-date">Joined ${formatDate(l.timestamp)}</div>` : ""}
      ${
        l.siteUrl
          ? `<a href="${escHtml(l.siteUrl)}" target="_blank" rel="noopener" class="visit-btn">Visit Website →</a>`
          : ""
      }
    </div>`
        )
        .join("\n")
    : `<div class="empty-state">
        <div class="empty-icon">🏪</div>
        <h3>No businesses yet</h3>
        <p>Be the first to build your kingdom online!</p>
        <a href="/" class="build-btn">Build My Free Website</a>
      </div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Business Directory — EzeWeb</title>
  <meta name="description" content="Discover Nigerian businesses online. Built by EzeWeb — the free AI website builder." />
  <link rel="icon" type="image/png" href="/logo.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    :root{
      --black:#0D0B08;--dark:#1A1612;--cream:#F7F3EE;
      --gold:#C9922A;--gold-light:#E8B84B;--green:#2A7D5A;
      --text:#1A1612;--muted:#6B6560;--white:#FFFFFF;
    }
    body{font-family:'Outfit',sans-serif;background:var(--black);color:var(--cream);min-height:100vh;}
    /* NAV */
    nav{background:rgba(13,11,8,.98);border-bottom:1px solid rgba(201,146,42,.15);padding:1.25rem 5%;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
    .nav-logo img{height:38px;width:auto;}
    .nav-link{color:rgba(247,243,238,.65);text-decoration:none;font-size:.875rem;transition:color .2s;}
    .nav-link:hover{color:var(--gold);}
    .nav-cta{background:linear-gradient(135deg,var(--gold-light),var(--gold));color:var(--black);border-radius:6px;padding:.5rem 1.25rem;font-weight:600;font-size:.85rem;text-decoration:none;transition:transform .2s,box-shadow .2s;}
    .nav-cta:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(201,146,42,.4);}
    /* HERO */
    .dir-hero{padding:5rem 5% 3rem;text-align:center;position:relative;overflow:hidden;}
    .dir-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at top,rgba(201,146,42,.12) 0%,transparent 70%);pointer-events:none;}
    .dir-label{font-size:.75rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:1rem;}
    .dir-title{font-family:'Cormorant Garamond',serif;font-size:clamp(2.5rem,5vw,4rem);font-weight:700;color:var(--cream);line-height:1.1;margin-bottom:1rem;}
    .dir-title em{color:var(--gold);font-style:italic;}
    .dir-sub{color:rgba(247,243,238,.55);font-size:1.05rem;font-weight:300;margin-bottom:1rem;}
    .dir-count{display:inline-block;background:rgba(201,146,42,.1);border:1px solid rgba(201,146,42,.25);color:var(--gold);border-radius:100px;padding:.35rem 1rem;font-size:.8rem;font-weight:600;}
    /* GRID */
    .dir-grid{padding:3rem 5% 5rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem;max-width:1200px;margin:0 auto;}
    .biz-card{background:rgba(247,243,238,.04);border:1px solid rgba(201,146,42,.12);border-radius:16px;padding:1.75rem;transition:transform .3s ease,border-color .3s ease,box-shadow .3s ease;display:flex;flex-direction:column;gap:.75rem;}
    .biz-card:hover{transform:translateY(-6px);border-color:rgba(201,146,42,.35);box-shadow:0 20px 50px rgba(0,0,0,.4);}
    .biz-type{font-size:.7rem;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--gold);background:rgba(201,146,42,.1);border-radius:100px;padding:.25rem .75rem;width:fit-content;}
    .biz-name{font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:700;color:var(--cream);line-height:1.2;}
    .biz-location{color:rgba(247,243,238,.55);font-size:.875rem;}
    .biz-date{color:rgba(247,243,238,.3);font-size:.75rem;margin-top:auto;}
    .visit-btn{display:inline-flex;align-items:center;gap:.4rem;background:linear-gradient(135deg,var(--gold-light),var(--gold));color:var(--black);border-radius:8px;padding:.6rem 1.25rem;font-size:.875rem;font-weight:700;text-decoration:none;transition:transform .2s,box-shadow .2s;margin-top:.5rem;width:fit-content;}
    .visit-btn:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(201,146,42,.4);}
    /* EMPTY */
    .empty-state{grid-column:1/-1;text-align:center;padding:5rem 2rem;}
    .empty-icon{font-size:4rem;margin-bottom:1.5rem;}
    .empty-state h3{font-family:'Cormorant Garamond',serif;font-size:2rem;color:var(--cream);margin-bottom:.75rem;}
    .empty-state p{color:rgba(247,243,238,.5);margin-bottom:2rem;}
    .build-btn{display:inline-flex;align-items:center;gap:.5rem;background:linear-gradient(135deg,var(--gold-light),var(--gold));color:var(--black);border-radius:8px;padding:.875rem 2rem;font-weight:700;text-decoration:none;transition:transform .2s;}
    .build-btn:hover{transform:translateY(-2px);}
    /* FOOTER */
    footer{background:rgba(247,243,238,.03);border-top:1px solid rgba(201,146,42,.1);padding:2rem 5%;text-align:center;color:rgba(247,243,238,.3);font-size:.8rem;}
    footer a{color:var(--gold);text-decoration:none;}
    @media(max-width:600px){.dir-hero{padding:3rem 5% 2rem;} nav .nav-cta{display:none;}}
  </style>
</head>
<body>
<nav>
  <a href="/" class="nav-logo"><img src="/logo.png" alt="EzeWeb" /></a>
  <div style="display:flex;align-items:center;gap:1.5rem;">
    <a href="/" class="nav-link">Home</a>
    <a href="/#build" class="nav-cta">Build Free Website</a>
  </div>
</nav>

<div class="dir-hero">
  <div class="dir-label">Business Directory</div>
  <h1 class="dir-title">Nigerian Businesses<br><em>Going Digital</em></h1>
  <p class="dir-sub">Discover businesses that built their online presence with EzeWeb — for free.</p>
  <div class="dir-count">✦ ${withSites.length} ${withSites.length === 1 ? "business" : "businesses"} online</div>
</div>

<div class="dir-grid">
  ${cards}
</div>

<footer>
  <div>© 2026 <a href="/">EzeWeb</a> · Every Business Deserves a Kingdom Online</div>
</footer>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export default router;
