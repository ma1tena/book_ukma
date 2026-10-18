import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * SEO під час збірки: підставляє адресу сайту в canonical / Open Graph у index.html
 * і генерує robots.txt та sitemap.xml (корпуси й приміщення беремо з API бекенду).
 * Адреса сайту: VITE_SITE_URL, а на Vercel — автоматично з VERCEL_PROJECT_PRODUCTION_URL.
 */
function seo(env) {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const site = (env.VITE_SITE_URL || (vercel ? `https://${vercel}` : "")).replace(/\/$/, "");
  const api = (env.VITE_API_URL || "").replace(/\/$/, "");

  async function pages() {
    const list = ["/"];
    if (!api) return list;
    try {
      const get = async (p) => { const r = await fetch(api + p, { signal: AbortSignal.timeout(10000) }); if (!r.ok) throw new Error(r.status); return r.json(); };
      for (const b of (await get("/api/buildings")).filter((b) => b.is_active)) {
        list.push(`/building/${b.id}`);
        for (const r of await get(`/api/buildings/${b.id}/rooms`)) list.push(`/room/${r.id}`);
      }
    } catch (e) {
      console.warn(`[seo] sitemap: не вдалося отримати приміщення з ${api} (${e.message}) — у sitemap лише головна`);
    }
    return list;
  }

  return {
    name: "book-ukma-seo",
    transformIndexHtml(html) {
      return html.replaceAll("__SITE_URL__", site);
    },
    async generateBundle() {
      if (!site) console.warn("[seo] VITE_SITE_URL не задано — canonical і og:url будуть відносними, sitemap.xml не створено");
      const robots = ["User-agent: *", "Disallow: /cabinet", "Disallow: /petition", "Disallow: /auth", "Disallow: /api/"];
      if (site) {
        robots.push("", `Sitemap: ${site}/sitemap.xml`);
        const today = new Date().toISOString().slice(0, 10);
        const urls = (await pages()).map((p) => `  <url><loc>${site}${p}</loc><lastmod>${today}</lastmod></url>`).join("\n");
        this.emitFile({ type: "asset", fileName: "sitemap.xml",
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n` });
      }
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robots.join("\n") + "\n" });
    },
  };
}

// У dev-режимі /api проксується на FastAPI, тому CORS локально не заважає.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), seo(env)],
    server: { port: 5173, proxy: { "/api": "http://127.0.0.1:8000" } },
  };
});
