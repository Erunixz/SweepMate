/**
 * Renders every app icon in public/ from public/favicon.svg. Run `npm run icons` after editing the logo.
 *
 * - pwa-*.png and favicon.ico keep the rounded corners (browser tabs, desktop installs).
 * - apple-touch-icon and the maskable icon are full-bleed squares: iOS and Android round
 *   the corners themselves, and the maskable artwork is shrunk into Android's safe zone.
 */
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const pub = new URL('../public/', import.meta.url)
const svg = await readFile(new URL('favicon.svg', pub), 'utf8')

const fullBleed = (artScale = 1) =>
  svg
    .replace('rx="112"', 'rx="0"')
    .replace('<g id="art">', `<g id="art" transform="translate(256 256) scale(${artScale}) translate(-256 -256)">`)

const render = (source, size) => sharp(Buffer.from(source), { density: 72 * (size / 512) * 4 }).resize(size, size).png().toBuffer()

const outputs = [
  ['pwa-64x64.png', svg, 64],
  ['pwa-192x192.png', svg, 192],
  ['pwa-512x512.png', svg, 512],
  ['apple-touch-icon-180x180.png', fullBleed(), 180],
  // iOS and some apps request this default path without reading the page's <link> tags.
  ['apple-touch-icon.png', fullBleed(), 180],
  ['maskable-icon-512x512.png', fullBleed(0.8), 512],
]
for (const [name, source, size] of outputs) {
  await writeFile(new URL(name, pub), await render(source, size))
  console.log(`✔ ${name}`)
}

// favicon.ico: a single 48px PNG wrapped in the ICO container (supported by every current browser).
const png = await render(svg, 48)
const header = Buffer.alloc(22)
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(1, 4) // one image
header.writeUInt8(48, 6) // width
header.writeUInt8(48, 7) // height
header.writeUInt16LE(1, 10) // colour planes
header.writeUInt16LE(32, 12) // bits per pixel
header.writeUInt32LE(png.length, 14)
header.writeUInt32LE(22, 18) // image data offset
await writeFile(new URL('favicon.ico', pub), Buffer.concat([header, png]))
console.log('✔ favicon.ico')
