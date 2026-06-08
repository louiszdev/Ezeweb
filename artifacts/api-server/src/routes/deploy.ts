import { Router } from "express";
import { createRequire } from "module";
import { PassThrough } from "stream";
import { logger } from "../lib/logger";

const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const archiver = _require("archiver") as typeof import("archiver");

const router = Router();

function sanitizeSiteName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

async function createZipBuffer(html: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const passThrough = new PassThrough();
    const chunks: Buffer[] = [];

    passThrough.on("data", (chunk: Buffer) => chunks.push(chunk));
    passThrough.on("end", () => resolve(Buffer.concat(chunks)));
    passThrough.on("error", reject);
    archive.on("error", reject);

    archive.pipe(passThrough);
    archive.append(html, { name: "index.html" });
    archive.finalize();
  });
}

async function pollDeploy(
  deployId: string,
  token: string,
  maxAttempts = 30
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(
      `https://api.netlify.com/api/v1/deploys/${deployId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) continue;
    const data = (await res.json()) as {
      state?: string;
      ssl_url?: string;
      url?: string;
      error_message?: string;
    };
    if (data.state === "ready") {
      return data.ssl_url || data.url || "";
    }
    if (data.state === "error") {
      throw new Error(`Deploy failed: ${data.error_message || "unknown error"}`);
    }
  }
  throw new Error("Deploy timed out. Please try again.");
}

router.post("/deploy", async (req, res) => {
  const token = process.env["NETLIFY_TOKEN"];
  if (!token) {
    res.status(500).json({ error: "NETLIFY_TOKEN is not configured" });
    return;
  }

  const { html, businessName } = req.body as { html?: string; businessName?: string };

  if (!html || !businessName) {
    res.status(400).json({ error: "html and businessName are required" });
    return;
  }

  const suffix = Math.random().toString(36).slice(2, 7);
  const siteName = `${sanitizeSiteName(businessName)}-${suffix}`;

  try {
    const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: siteName }),
    });

    if (!createRes.ok) {
      const txt = await createRes.text();
      req.log.error({ status: createRes.status, body: txt }, "Netlify create site failed");
      res.status(500).json({ error: "Failed to create Netlify site. Check your NETLIFY_TOKEN." });
      return;
    }

    const site = (await createRes.json()) as { id: string; name: string };
    const siteId = site.id;

    const zipBuffer = await createZipBuffer(html);

    const deployRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/zip",
        },
        body: zipBuffer,
      }
    );

    if (!deployRes.ok) {
      const txt = await deployRes.text();
      req.log.error({ status: deployRes.status, body: txt }, "Netlify deploy failed");
      res.status(500).json({ error: "Failed to deploy to Netlify. Please try again." });
      return;
    }

    const deploy = (await deployRes.json()) as { id: string; state?: string; ssl_url?: string; url?: string };
    const deployId = deploy.id;

    if (deploy.state === "ready") {
      const liveUrl = deploy.ssl_url || deploy.url || `https://${siteName}.netlify.app`;
      res.json({ url: liveUrl });
      return;
    }

    const liveUrl = await pollDeploy(deployId, token);
    const finalUrl = liveUrl || `https://${siteName}.netlify.app`;

    res.json({ url: finalUrl });
  } catch (err) {
    logger.error({ err }, "Deploy error");
    res.status(500).json({
      error: err instanceof Error ? err.message : "Deployment failed. Please try again.",
    });
  }
});

export default router;
