const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');

const PDF_PATH = 'C:\\Users\\HP\\Downloads\\all_slides_from_video.pdf';
const OUT_DIR = 'C:\\Users\\HP\\Downloads\\simple-reader-main\\.pdf-pages';
const TARGET_WIDTH = 1200;

class NodeCanvasFactory {
    create(w, h) {
        const canvas = createCanvas(w, h);
        return { canvas, context: canvas.getContext('2d') };
    }
    reset(cAndCtx, w, h) {
        cAndCtx.canvas.width = w;
        cAndCtx.canvas.height = h;
    }
    destroy(cAndCtx) {
        cAndCtx.canvas.width = 0;
        cAndCtx.canvas.height = 0;
        cAndCtx.context = null;
    }
}

(async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(fs.readFileSync(PDF_PATH));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise;
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const factory = new NodeCanvasFactory();
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const base = page.getViewport({ scale: 1 });
        const scale = TARGET_WIDTH / base.width;
        const viewport = page.getViewport({ scale });
        const cAndCtx = factory.create(viewport.width, viewport.height);
        await page.render({
            canvasContext: cAndCtx.context,
            viewport,
            canvasFactory: factory
        }).promise;
        const out = path.join(OUT_DIR, `page-${String(i).padStart(2, '0')}.png`);
        fs.writeFileSync(out, cAndCtx.canvas.toBuffer('image/png'));
        factory.destroy(cAndCtx);
        page.cleanup();
        console.log(`page ${i}/${doc.numPages} -> ${out} (${viewport.width}x${viewport.height})`);
    }
    console.log('DONE');
})().catch((e) => { console.error(e); process.exit(1); });
