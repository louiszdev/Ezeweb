import { Router } from "express";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const leadsPath = path.resolve(__dirname, "../../leads.json");

router.get("/count", async (req, res) => {
  const sheetUrl = process.env["GOOGLE_SHEET_URL"];

  if (sheetUrl) {
    try {
      const response = await fetch(sheetUrl);
      if (response.ok) {
        const data = (await response.json()) as { count?: number };
        res.json({ count: data.count ?? 0 });
        return;
      }
    } catch {
      // Fall through to local file
    }
  }

  try {
    const raw = await readFile(leadsPath, "utf-8");
    const leads = JSON.parse(raw) as unknown[];
    res.json({ count: Array.isArray(leads) ? leads.length : 0 });
  } catch {
    res.json({ count: 0 });
  }
});

export default router;
