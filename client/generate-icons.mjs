import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, 'public', 'logo.png');

for (const size of [192, 512]) {
  await sharp(src)
    .resize(size, size, { fit: 'contain', background: { r: 7, g: 13, b: 26, alpha: 1 } })
    .png()
    .toFile(path.join(__dirname, 'public', `icon-${size}.png`));
  console.log(`✓ icon-${size}.png`);
}
