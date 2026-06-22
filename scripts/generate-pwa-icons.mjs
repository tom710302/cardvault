import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#4149f5"/>
  <rect x="128" y="152" width="200" height="260" rx="18" fill="white" opacity="0.25"/>
  <rect x="156" y="124" width="200" height="260" rx="18" fill="white" opacity="0.45"/>
  <rect x="184" y="96" width="200" height="260" rx="18" fill="white"/>
  <rect x="216" y="152" width="120" height="12" rx="6" fill="#4149f5" opacity="0.4"/>
  <rect x="216" y="180" width="80" height="10" rx="5" fill="#4149f5" opacity="0.25"/>
  <rect x="216" y="206" width="100" height="10" rx="5" fill="#4149f5" opacity="0.25"/>
</svg>`;

const sizes = [
  { size: 512, name: "icon-512.png" },
  { size: 192, name: "icon-192.png" },
  { size: 180, name: "apple-touch-icon.png" },
  { size: 32,  name: "favicon-32.png" },
  { size: 16,  name: "favicon-16.png" },
];

for (const { size, name } of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icons/${name}`);
  console.log(`✓ public/icons/${name}`);
}

console.log("Done.");
