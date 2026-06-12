// Pure-Node icon renderer for Loop. No external deps.
// Draws a dark rounded-rect background with an orange terminal chevron ">"
// and a small rounded "prompt" bar, then encodes a PNG via zlib.
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const SIZE = parseInt(process.argv[2] || '1024', 10)
const OUT = process.argv[3] || 'icon.png'

// Colors (RGBA)
const BG_TOP = [0x26, 0x24, 0x1f]
const BG_BOT = [0x1a, 0x19, 0x16]
const BORDER = [0x3a, 0x38, 0x33]
const ACC_A = [0xf0, 0x8a, 0x5d] // top-left of accent gradient
const ACC_B = [0xe8, 0x70, 0x3f] // bottom-right of accent gradient

// Work in a 1024 design space, scale to SIZE.
const S = SIZE / 1024

function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ]
}

// Signed distance helpers (in design-space units).
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r)
  const qy = Math.abs(py - cy) - (hh - r)
  const ax = Math.max(qx, 0)
  const ay = Math.max(qy, 0)
  return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(qx, qy), 0) - r
}

// distance from point to a segment
function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax
  const pay = py - ay
  const bax = bx - ax
  const bay = by - ay
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)))
  const dx = pax - bax * h
  const dy = pay - bay * h
  return Math.sqrt(dx * dx + dy * dy)
}

// Coverage via supersampled signed distance (smooth AA at edge).
function cov(d, aa) {
  // d < 0 inside. Return 0..1.
  return Math.max(0, Math.min(1, 0.5 - d / aa))
}

function over(dst, src, a) {
  // src over dst with src alpha a (dst assumed opaque)
  return [
    Math.round(src[0] * a + dst[0] * (1 - a)),
    Math.round(src[1] * a + dst[1] * (1 - a)),
    Math.round(src[2] * a + dst[2] * (1 - a))
  ]
}

const W = SIZE
const H = SIZE
const buf = Buffer.alloc(W * H * 4)

// Geometry in design space (1024).
const cardCx = 512,
  cardCy = 512,
  cardHw = 448,
  cardHh = 448,
  cardR = 208
// chevron points
const chev = [
  [360, 336],
  [560, 512],
  [360, 688]
]
const chevW = 72
const promptCx = 692,
  promptCy = 668,
  promptHw = 92,
  promptHh = 28,
  promptR = 28

const aa = 1.5 // edge softness in design units

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // sample at pixel center, convert to design space
    const dx = (x + 0.5) / S
    const dy = (y + 0.5) / S

    // background gradient (vertical)
    let color = lerp(BG_TOP, BG_BOT, dy / 1024)
    let alpha = 0 // alpha of the whole icon (transparent outside card)

    const dCard = sdRoundRect(dx, dy, cardCx, cardCy, cardHw, cardHh, cardR)
    const cardCov = cov(dCard, aa / S < 1 ? 1.0 : aa)
    if (cardCov > 0) {
      alpha = cardCov
      // border ring: within ~4 units of edge
      const borderCov = cov(Math.abs(dCard) - 2, aa)
      if (borderCov > 0) {
        color = over(color, BORDER, borderCov * cardCov)
      }
      // accent gradient color for shapes (diagonal)
      const t = Math.max(0, Math.min(1, ((dx - 336) + (dy - 336)) / 700))
      const acc = lerp(ACC_A, ACC_B, t)

      // chevron: min distance to the two segments
      const d1 = sdSegment(dx, dy, chev[0][0], chev[0][1], chev[1][0], chev[1][1])
      const d2 = sdSegment(dx, dy, chev[1][0], chev[1][1], chev[2][0], chev[2][1])
      const dChev = Math.min(d1, d2) - chevW / 2
      const chevCov = cov(dChev, aa)
      if (chevCov > 0) color = over(color, acc, chevCov)

      // prompt bar
      const dPrompt = sdRoundRect(dx, dy, promptCx, promptCy, promptHw, promptHh, promptR)
      const promptCov = cov(dPrompt, aa)
      if (promptCov > 0) color = over(color, acc, promptCov)
    }

    const i = (y * W + x) * 4
    buf[i] = color[0]
    buf[i + 1] = color[1]
    buf[i + 2] = color[2]
    buf[i + 3] = Math.round(alpha * 255)
  }
}

// --- PNG encode ---
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
ihdr[10] = 0
ihdr[11] = 0
ihdr[12] = 0
// raw scanlines with filter byte 0
const raw = Buffer.alloc((W * 4 + 1) * H)
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0
  buf.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4)
}
const idat = zlib.deflateSync(raw, { level: 9 })
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
fs.writeFileSync(OUT, png)
console.log('wrote', OUT, SIZE + 'x' + SIZE, png.length + ' bytes')
