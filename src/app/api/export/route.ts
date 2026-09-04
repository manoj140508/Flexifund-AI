import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { buildPdfDoc } from '@/lib/export-generators';

const exportSchema = z.object({
  analysisData: z.any(),
  profile: z.any().optional(),
  options: z.any().optional(),
  format: z.string().optional().default('pdf'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = exportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid export payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { analysisData, profile, options, format } = parsed.data;
    const normalizedFormat = (format || 'pdf').toLowerCase();

    if (normalizedFormat === 'image' || normalizedFormat === 'png') {
      return NextResponse.json(
        {
          error: 'Image generation is performed client-side on canvas for maximum device responsiveness. Please use the "Export My Plan" button in the application interface.',
        },
        { status: 400 }
      );
    }

    // Load static Roboto TTF fonts for pristine Unicode Rupee (₹) rendering and natural letter spacing
    let fontOptions = options || {};
    try {
      const regPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');
      const boldPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Bold.ttf');
      const italicPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Italic.ttf');
      if (fs.existsSync(regPath) && fs.existsSync(boldPath)) {
        const regularBase64 = fs.readFileSync(regPath).toString('base64');
        const boldBase64 = fs.readFileSync(boldPath).toString('base64');
        const italicBase64 = fs.existsSync(italicPath) ? fs.readFileSync(italicPath).toString('base64') : undefined;
        fontOptions = {
          ...fontOptions,
          fonts: {
            regularBase64,
            boldBase64,
            italicBase64,
          },
        };
      }
    } catch (fontErr) {
      console.warn('Could not load custom TTF font for PDF generation:', fontErr);
    }

    // Generate production-quality downloadable PDF using the exact same deterministic single source of truth
    const doc = buildPdfDoc(analysisData, profile, fontOptions);
    const arrayBuffer = doc.output('arraybuffer');
    const filename = `My-Financial-Plan-${Date.now()}.pdf`;

    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to generate export', message: err?.message || String(err) },
      { status: 500 }
    );
  }
}
