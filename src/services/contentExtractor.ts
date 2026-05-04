import { WrapceptionError } from './errors';

/** Compress an image data URL to max width/height and JPEG quality. */
export async function compressImage(
  dataUrl: string,
  maxDim = 1536,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));
      ctx.drawImage(img, 0, 0, w, h);

      // Keep PNG for images that are already small or have transparency
      const isPng = dataUrl.startsWith('data:image/png');
      const outType = isPng && scale >= 1 ? 'image/png' : 'image/jpeg';
      resolve(canvas.toDataURL(outType, quality));
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
}

/** Extract text from a PDF data URL using pdfjs-dist (lazy-loaded). */
export async function extractTextFromPDF(dataUrl: string): Promise<string> {
  try {
    // Dynamically import pdfjs-dist to avoid bloating the initial bundle
    const pdfjsLib = await import('pdfjs-dist');

    // Point the worker to the bundled worker file
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url,
      ).toString();
    }

    // Convert data URL → Uint8Array
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 10); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter((item): item is { str: string } => 'str' in item)
        .map((item) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pageText) pageTexts.push(`[Page ${pageNum}]\n${pageText}`);
    }

    return pageTexts.join('\n\n');
  } catch (err) {
    throw new WrapceptionError(
      `PDF text extraction failed: ${err instanceof Error ? err.message : String(err)}`,
      'PDF_PARSE_FAILED',
    );
  }
}

/** Render the first page of a PDF to an image data URL (for scanned PDFs). */
export async function pdfFirstPageToImage(dataUrl: string, scale = 2): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url,
      ).toString();
    }

    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context unavailable');

    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    throw new WrapceptionError(
      `PDF render failed: ${err instanceof Error ? err.message : String(err)}`,
      'PDF_PARSE_FAILED',
    );
  }
}
