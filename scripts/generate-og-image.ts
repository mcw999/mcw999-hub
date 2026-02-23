import sharp from "sharp";
import path from "path";

const WIDTH = 1200;
const HEIGHT = 630;

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#111827"/>
      <stop offset="100%" style="stop-color:#1e3a5f"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <text x="100" y="260" font-family="system-ui,sans-serif" font-size="72" font-weight="bold" fill="white">mcw999</text>
  <text x="100" y="340" font-family="system-ui,sans-serif" font-size="32" fill="#94a3b8">Developer Portfolio</text>
  <line x1="100" y1="380" x2="400" y2="380" stroke="#3b82f6" stroke-width="3"/>
  <text x="100" y="440" font-family="system-ui,sans-serif" font-size="22" fill="#cbd5e1">Crypto Trading / Developer Tools / Web Applications</text>
  <rect x="100" y="500" width="8" height="60" rx="4" fill="#3b82f6"/>
  <text x="124" y="530" font-family="system-ui,sans-serif" font-size="18" fill="#64748b">github.com/mcw999</text>
  <text x="124" y="555" font-family="system-ui,sans-serif" font-size="18" fill="#64748b">mcw999.github.io/mcw999-hub</text>
</svg>`;

async function main() {
  const outPath = path.join(process.cwd(), "public", "og-image.png");
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`OG image generated: ${outPath}`);
}

main().catch(console.error);
