// Extract the one big screenshot image XObject per page and encode as PNG.
// Avoids the pdfjs page.render() path which segfaults with @napi-rs/canvas here.
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');

const PDF_PATH = 'C:/Users/HP/Downloads/all_slides_from_video.pdf';
const OUT_DIR = 'C:/Users/HP/Downloads/simple-reader-main/.pdf-pages';

// pdfjs ImageKind
const GRAYSCALE_1BPP = 1, RGB_24BPP = 2, RGBA_32BPP = 3;

function toRGBA(img) {
    const { width, height, kind, data } = img;
    const out = Buffer.alloc(width * height * 4);
    if (kind === RGBA_32BPP) {
        out.set(data.subarray(0, out.length));
    } else if (kind === RGB_24BPP) {
        for (let i = 0, j = 0; i < width * height; i++) {
            out[j++] = data[i * 3]; out[j++] = data[i * 3 + 1]; out[j++] = data[i * 3 + 2]; out[j++] = 255;
        }
    } else if (kind === GRAYSCALE_1BPP) {
        const rowBytes = (width + 7) >> 3;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const bit = (data[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1;
                const v = bit ? 255 : 0;
                const j = (y * width + x) * 4;
                out[j] = out[j + 1] = out[j + 2] = v; out[j + 3] = 255;
            }
        }
    } else {
        throw new Error('unknown ImageKind ' + kind);
    }
    return out;
}

(async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(fs.readFileSync(PDF_PATH));
    const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const OPS = pdfjs.OPS;
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const opList = await page.getOperatorList();
        // pick the largest image xobject on the page
        const imgIds = [];
        for (let k = 0; k < opList.fnArray.length; k++) {
            if (opList.fnArray[k] === OPS.paintImageXObject) imgIds.push(opList.argsArray[k][0]);
        }
        await new Promise((resolve) => {
            const tryNext = (idx) => {
                if (idx >= imgIds.length) { console.log(`page ${i}: no usable image (${imgIds.length} candidates)`); resolve(); return; }
                page.objs.get(imgIds[idx], (img) => {
                    try {
                        if (!img || !img.width || img.width < 400) { tryNext(idx + 1); return; }
                        const canvas = createCanvas(img.width, img.height);
                        const ctx = canvas.getContext('2d');
                        const id = ctx.createImageData(img.width, img.height);
                        id.data.set(toRGBA(img));
                        ctx.putImageData(id, 0, 0);
                        const out = path.join(OUT_DIR, `page-${String(i).padStart(2, '0')}.png`);
                        fs.writeFileSync(out, canvas.toBuffer('image/png'));
                        console.log(`page ${i}: ${img.width}x${img.height} -> ${out}`);
                    } catch (e) {
                        console.log(`page ${i} img ${imgIds[idx]}: ${e.message}`);
                    }
                    resolve();
                });
            };
            if (imgIds.length === 0) { console.log(`page ${i}: no image ops`); resolve(); return; }
            tryNext(0);
        });
        page.cleanup();
    }
    console.log('DONE');
})().catch((e) => { console.error(e); process.exit(1); });
