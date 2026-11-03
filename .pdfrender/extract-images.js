const fs = require('fs');
const path = require('path');

// Extract embedded JPEG streams (DCTDecode) directly from a PDF file.
// Each page screenshot in an exported slides PDF is typically one JPEG object.
const PDF_PATH = 'C:\\Users\\HP\\Downloads\\all_slides_from_video.pdf';
const OUT_DIR = 'C:\\Users\\HP\\Downloads\\simple-reader-main\\.pdf-pages';

const buf = fs.readFileSync(PDF_PATH);
fs.mkdirSync(OUT_DIR, { recursive: true });

let count = 0;
let idx = 0;
const SOI = Buffer.from([0xff, 0xd8, 0xff]);
while (true) {
    const start = buf.indexOf(SOI, idx);
    if (start === -1) break;
    const end = buf.indexOf(Buffer.from([0xff, 0xd9]), start + 3);
    if (end === -1) break;
    const size = end + 2 - start;
    // Ignore tiny thumbnails; keep real screenshots
    if (size > 40000) {
        count++;
        const out = path.join(OUT_DIR, `img-${String(count).padStart(2, '0')}.jpg`);
        fs.writeFileSync(out, buf.subarray(start, end + 2));
        console.log(`#${count}: offset=${start} size=${(size / 1024 / 1024).toFixed(2)}MB`);
    }
    idx = end + 2;
}
console.log(`TOTAL: ${count} images`);
