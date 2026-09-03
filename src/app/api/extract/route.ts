import { NextRequest, NextResponse } from 'next/server';
import { parseBankStatementText, StatementSourceType } from '@/lib/statement-extractor';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const requestedSourceType = (formData.get('sourceType') as StatementSourceType) || 'PDF';

    if (!file) {
      return NextResponse.json(
        { error: 'No statement file provided.' },
        { status: 400 }
      );
    }

    const fileSize = file.size;
    const mimeType = file.type || '';
    const fileName = file.name.toLowerCase();

    // 1. File size limit: 15MB for PDF, 10MB for image
    if (fileSize > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File exceeds the maximum allowed size of 15MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let rawText = '';
    let pagesProcessed = 1;

    // 2. PDF Processing
    if (
      requestedSourceType === 'PDF' ||
      mimeType === 'application/pdf' ||
      fileName.endsWith('.pdf')
    ) {
      try {
        // Dynamic import of pdf-parse with ESM/CJS interop
        const pdfModule = await import('pdf-parse');
        const pdfParse = (pdfModule as any).default || (pdfModule as any);
        const pdfData = await pdfParse(buffer);
        rawText = pdfData.text || '';
        pagesProcessed = pdfData.numpages || 1;
      } catch (pdfErr: any) {
        return NextResponse.json(
          {
            success: false,
            sourceType: 'PDF',
            transactions: [],
            quality: {
              totalDetected: 0,
              highConfidenceCount: 0,
              needsReviewCount: 0,
              warnings: ['Failed to read PDF stream.'],
            },
            errorMessage:
              "We couldn't reliably read the transaction table from this PDF. The PDF may be password-protected, encrypted, or an unindexed scanned document. Please upload a clear screenshot or CSV instead.",
          },
          { status: 422 }
        );
      }
    } else if (
      requestedSourceType === 'IMAGE' ||
      mimeType.startsWith('image/') ||
      /\.(png|jpe?g|webp)$/i.test(fileName)
    ) {
      // 3. Image / Screenshot OCR Processing
      try {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng');
        const ocrResult = await worker.recognize(buffer);
        rawText = ocrResult.data.text || '';
        await worker.terminate();
      } catch (ocrErr: any) {
        return NextResponse.json(
          {
            success: false,
            sourceType: 'IMAGE',
            transactions: [],
            quality: {
              totalDetected: 0,
              highConfidenceCount: 0,
              needsReviewCount: 0,
              warnings: ['OCR worker failed to parse image stream.'],
            },
            errorMessage:
              "We couldn't reliably read the transaction table from this image. Please ensure the screenshot is high-resolution, uncropped, and contains transaction dates and amounts.",
          },
          { status: 422 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported file format. Please upload a PDF, PNG, JPG, or WEBP bank statement.' },
        { status: 400 }
      );
    }

    if (!rawText || rawText.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          sourceType: requestedSourceType,
          transactions: [],
          quality: {
            totalDetected: 0,
            highConfidenceCount: 0,
            needsReviewCount: 0,
            warnings: ['No readable text found in document.'],
          },
          errorMessage:
            "We couldn't reliably read the transaction table from this file. Please try another statement or upload a CSV.",
        },
        { status: 422 }
      );
    }

    // 4. Parse detected transactions
    const result = parseBankStatementText(rawText, requestedSourceType, pagesProcessed);

    if (!result.success || result.transactions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          sourceType: requestedSourceType,
          transactions: [],
          quality: {
            totalDetected: 0,
            highConfidenceCount: 0,
            needsReviewCount: 0,
            warnings: result.quality.warnings,
          },
          errorMessage:
            "We couldn't reliably read the transaction table from this file. Try another PDF, upload a screenshot, or upload CSV.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process statement file',
        message: err?.message || 'Internal processing error',
      },
      { status: 500 }
    );
  }
}
