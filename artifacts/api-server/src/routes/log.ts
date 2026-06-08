import { Router } from "express";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const leadsPath = path.resolve(__dirname, "../../leads.json");

interface LeadEntry {
  name: string;
  type: string;
  location: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  tagline: string;
  siteUrl: string;
  timestamp: string;
}

router.post("/log", async (req, res) => {
  const {
    name,
    type,
    location,
    phone,
    whatsapp,
    email,
    instagram,
    tagline,
    siteUrl,
  } = req.body as Partial<LeadEntry>;

  const entry: LeadEntry = {
    name: name || "",
    type: type || "",
    location: location || "",
    phone: phone || "",
    whatsapp: whatsapp || "",
    email: email || "",
    instagram: instagram || "",
    tagline: tagline || "",
    siteUrl: siteUrl || "",
    timestamp: new Date().toISOString(),
  };

  try {
    let leads: LeadEntry[] = [];
    try {
      const raw = await readFile(leadsPath, "utf-8");
      leads = JSON.parse(raw) as LeadEntry[];
      if (!Array.isArray(leads)) leads = [];
    } catch {
      leads = [];
    }
    leads.push(entry);
    await writeFile(leadsPath, JSON.stringify(leads, null, 2), "utf-8");
  } catch (err) {
    req.log.error({ err }, "Failed to write leads.json");
  }

  const sheetUrl = process.env["GOOGLE_SHEET_URL"];
  if (sheetUrl) {
    try {
      await fetch(sheetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
    } catch {
      // Silent fail — Google Sheets is optional
    }
  }

  res.json({ success: true });
});

export default router;
