/**
 * Copia o worker do pdf.js para public/pdfjs/.
 *
 * O editor de propostas rasteriza o PDF para mostrar a folha real no canvas, e
 * o pdf.js precisa carregar seu worker por URL. Resolver essa URL pelo bundler
 * (`new URL(..., import.meta.url)`) funciona em alguns setups e falha em
 * silêncio noutros — um caminho fixo em /public é previsível e funciona igual
 * em desenvolvimento e na Vercel.
 *
 * Roda no build; se o arquivo não existir, avisa mas não derruba o build.
 */
const fs = require("fs");
const path = require("path");

const origem = path.join(
  __dirname, "..", "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.min.mjs"
);
const destinoDir = path.join(__dirname, "..", "public", "pdfjs");
const destino = path.join(destinoDir, "pdf.worker.min.mjs");

if (!fs.existsSync(origem)) {
  console.warn("[copy-pdf-worker] worker do pdf.js não encontrado — o editor de propostas não vai desenhar as folhas.");
  process.exit(0);
}

fs.mkdirSync(destinoDir, { recursive: true });
fs.copyFileSync(origem, destino);
console.log("[copy-pdf-worker] worker copiado para public/pdfjs/");
