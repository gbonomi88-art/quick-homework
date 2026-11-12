import sharp from 'sharp';
import { readFileSync } from 'node:fs';
const full = readFileSync(new URL('./icon.svg', import.meta.url));
const round = readFileSync(new URL('../public/icons/favicon.svg', import.meta.url));
// maskable: Motiv in der Safe-Zone (80 %)
const maskable = Buffer.from(full.toString().replace('translate(106 106) scale(12.5)', 'translate(156 156) scale(8.33)'));
await sharp(round).resize(192).png().toFile('public/icons/icon-192.png');
await sharp(round).resize(512).png().toFile('public/icons/icon-512.png');
await sharp(maskable).resize(512).png().toFile('public/icons/icon-512-maskable.png');
await sharp(full).resize(180).png().toFile('public/icons/apple-touch-icon.png');
console.log('icons ok');
