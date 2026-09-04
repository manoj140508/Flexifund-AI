import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  parseBankStatementText,
  parseGPaySpatialBlocks,
  deduplicateExtractedTransactions,
  StatementSourceType,
  ExtractedStatementTransaction,
  SpatialOcrLine,
} from '@/lib/statement-extractor';

export const dynamic = 'force-dynamic';

function ensureTessDataInTmp() {
  const tmpTessData = '/tmp/eng.traineddata';
  try {
    if (!fs.existsSync(tmpTessData)) {
      const candidates = [
        path.join(process.cwd(), 'src/data/tessdata/eng.traineddata'),
        path.join(process.cwd(), 'public/tessdata/eng.traineddata'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          fs.copyFileSync(p, tmpTessData);
          break;
        }
      }
    }
  } catch {
    // Non-fatal, tesseract will download to /tmp if writeable
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    // Support single 'file' or multiple 'files' (e.g. multi-screenshot upload)
    let files = formData.getAll('files') as File[];
    if (files.length === 0) {
      files = formData.getAll('file') as File[];
    }

    const rawSourceTypeParam = formData.get('sourceType') as string | null;
    const modeParam = formData.get('mode') as string | null;

    if (!files || files.length === 0 || !files[0]) {
      return NextResponse.json(
        { error: 'No statement file provided.' },
        { status: 400 }
      );
    }

    // Filter out 0-byte or invalid uploads
    const validFiles = files.filter((f) => f && f.size > 0);
    if (validFiles.length === 0) {
      return NextResponse.json(
        { error: 'Uploaded file is empty. Please select a valid statement file.' },
        { status: 400 }
      );
    }

    // Enforce size limit per file (15MB)
    for (const f of validFiles) {
      if (f.size > 15 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File "${f.name}" exceeds the maximum allowed size of 15MB.` },
          { status: 400 }
        );
      }
    }

    const firstFile = validFiles[0];
    const firstFileName = firstFile.name.toLowerCase();
    const firstMimeType = firstFile.type || '';

    // Resolve statement source type
    let resolvedSourceType: StatementSourceType | 'CSV' | null = null;
    if (firstFileName.endsWith('.csv') || firstMimeType === 'text/csv' || rawSourceTypeParam === 'CSV') {
      resolvedSourceType = 'CSV';
    } else if (firstFileName.endsWith('.pdf') || firstMimeType === 'application/pdf' || rawSourceTypeParam === 'PDF') {
      resolvedSourceType = 'PDF';
    } else if (
      /\.(png|jpe?g|webp|bmp)$/i.test(firstFileName) ||
      firstMimeType.startsWith('image/') ||
      rawSourceTypeParam === 'IMAGE'
    ) {
      resolvedSourceType = 'IMAGE';
    }

    if (!resolvedSourceType) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload a PDF, PNG, JPG, or CSV statement.' },
        { status: 400 }
      );
    }

    // 1. Direct CSV Processing
    if (resolvedSourceType === 'CSV') {
      const arrayBuffer = await firstFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { parseTransactionCSV } = await import('@/lib/csv-parser');
      const csvText = buffer.toString('utf-8');
      const csvResult = parseTransactionCSV(csvText, firstFile.name);

      if (csvResult.validTransactions.length === 0) {
        return NextResponse.json(
          {
            success: false,
            sourceType: 'CSV',
            transactions: [],
            quality: {
              totalDetected: 0,
              highConfidenceCount: 0,
              needsReviewCount: 0,
              warnings: csvResult.rejectedRows.map((r) => `Row ${r.rowNumber}: ${r.reason}`),
            },
            errorMessage:
              'No valid transactions could be parsed from this CSV. Please check column headers (Date, Description, Amount).',
          },
          { status: 422 }
        );
      }

      const transactions = csvResult.validTransactions.map((tx, idx) => ({
        id: tx.id || `csv_tx_${idx}`,
        date: tx.date,
        description: tx.rawDescription || tx.normalizedMerchant,
        amountPaise: tx.amount.paise.toString(),
        type: (tx.type === 'INCOME' ? 'CREDIT' : 'DEBIT') as 'CREDIT' | 'DEBIT',
        category: tx.category || 'UNCATEGORIZED',
        confidence: tx.confidence || 0.95,
        confidenceLevel: 'HIGH' as const,
        flaggedForReview: false,
        flagReason: null,
      }));

      return NextResponse.json({
        success: true,
        sourceType: 'CSV',
        transactions,
        quality: {
          totalDetected: transactions.length,
          highConfidenceCount: transactions.length,
          needsReviewCount: 0,
          warnings: csvResult.rejectedRows.map((r) => `Row ${r.rowNumber}: ${r.reason}`),
        },
      });
    }

    // 2. PDF Processing
    if (resolvedSourceType === 'PDF') {
      const arrayBuffer = await firstFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      let rawText = '';
      let pagesProcessed = 1;

      try {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        const textResult = await parser.getText();
        rawText = textResult.text || '';
        pagesProcessed = textResult.total || textResult.pages?.length || 1;
        await parser.destroy();

        // If scanned PDF produced insufficient text, try OCR with timeout
        if (!rawText || rawText.trim().length < 20) {
          try {
            ensureTessDataInTmp();
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('eng', 1, {
              cachePath: '/tmp',
              cacheMethod: 'write',
              errorHandler: () => {},
            });
            try {
              const ocrPromise = worker.recognize(buffer);
              const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('PDF OCR timeout')), 20000)
              );
              const ocrResult: any = await Promise.race([ocrPromise, timeoutPromise]);
              if (ocrResult?.data?.text && ocrResult.data.text.trim().length > rawText.trim().length) {
                rawText = ocrResult.data.text;
              }
            } finally {
              await worker.terminate();
            }
          } catch {
            // Keep rawText as-is for downstream validation
          }
        }
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
              warnings: ['Failed to parse PDF stream: ' + (pdfErr?.message || 'Invalid or encrypted format')],
            },
            errorMessage:
              "We couldn't reliably read the transaction table from this PDF. The PDF may be password-protected, encrypted, or unreadable. Please upload a clear screenshot or CSV instead.",
          },
          { status: 422 }
        );
      }

      if (!rawText || rawText.trim().length < 10) {
        return NextResponse.json(
          {
            success: false,
            sourceType: 'PDF',
            transactions: [],
            quality: {
              totalDetected: 0,
              highConfidenceCount: 0,
              needsReviewCount: 0,
              warnings: ['No readable text found in PDF document.'],
            },
            errorMessage:
              "We couldn't reliably read the transaction table from this PDF. Please upload a clear screenshot or CSV instead.",
          },
          { status: 422 }
        );
      }

      const result = parseBankStatementText(rawText, 'PDF', pagesProcessed);
      if (!result.success || result.transactions.length === 0) {
        return NextResponse.json(result, { status: 422 });
      }
      return NextResponse.json(result);
    }

    // 3. IMAGE / GPay Screenshot Processing (Single or Multiple Images)
    const allExtractedTransactions: ExtractedStatementTransaction[] = [];
    const allWarnings: string[] = [];
    let totalImagesProcessed = 0;
    let lastRawOcrText = '';
    let lastSpatialLines: SpatialOcrLine[] = [];
    let lastImageMeta: any = null;

    // Process each uploaded screenshot
    for (const imageFile of validFiles) {
      let worker: any = null;
      try {
        const arrayBuf = await imageFile.arrayBuffer();
        const imgBuffer = Buffer.from(arrayBuf);

        // A & B: Image verification and decoding with sharp
        const sharpModule = await import('sharp');
        const sharp = sharpModule.default || sharpModule;
        let metadata;
        try {
          metadata = await sharp(imgBuffer).metadata();
          lastImageMeta = { width: metadata.width, height: metadata.height, format: metadata.format };
        } catch {
          return NextResponse.json(
            {
              success: false,
              errorMessage: "We couldn't read transactions from this image. Try a clearer screenshot or upload a PDF/CSV statement.",
            },
            { status: 422 }
          );
        }

        // Check for tiny / unreadable thumbnail images
        if ((metadata.width && metadata.width < 200) || (metadata.height && metadata.height < 200)) {
          return NextResponse.json(
            {
              success: false,
              errorMessage: "We couldn't read transactions from this image. Try a clearer screenshot or upload a PDF/CSV statement.",
            },
            { status: 422 }
          );
        }

        // C: Preprocessing with contrast & dark-mode handling
        let sharpBuilder = sharp(imgBuffer).rotate();

        // Dark-mode detection: invert if dark background so OCR sees dark text on light background
        try {
          const stats = await sharp(imgBuffer).stats();
          if (stats && Array.isArray(stats.channels) && stats.channels.length >= 3) {
            const avgBrightness =
              (stats.channels[0].mean + stats.channels[1].mean + stats.channels[2].mean) / 3;
            if (avgBrightness < 115) {
              sharpBuilder = sharpBuilder.negate({ alpha: false });
            }
          }
        } catch {
          // Non-fatal, proceed with standard preprocessing
        }

        if (metadata.width && metadata.width < 900) {
          sharpBuilder = sharpBuilder.resize({ width: 1000, withoutEnlargement: false });
        }
        const processedImgBuffer = await sharpBuilder
          .grayscale()
          .normalize()
          .sharpen({ sigma: 1 })
          .png()
          .toBuffer();

        // D & E: Execute OCR with 25-second server-side timeout covering worker setup & recognition
        const ocrExecution = async () => {
          ensureTessDataInTmp();
          const { createWorker } = await import('tesseract.js');
          worker = await createWorker('eng', 1, {
            cachePath: '/tmp',
            cacheMethod: 'write',
            errorHandler: () => {},
          });
          return await worker.recognize(processedImgBuffer, {}, { blocks: true });
        };

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('OCR processing timed out after 25 seconds')), 25000)
        );

        const ocrResult: any = await Promise.race([ocrExecution(), timeoutPromise]);
        const extractedText = ocrResult?.data?.text || '';
        lastRawOcrText = extractedText;

        // F: Extract spatial lines from Tesseract blocks structure
        const spatialLines: SpatialOcrLine[] = [];
        if (Array.isArray(ocrResult?.data?.blocks)) {
          for (const block of ocrResult.data.blocks) {
            for (const para of (block.paragraphs || [])) {
              for (const line of (para.lines || [])) {
                if (line && line.text && line.text.trim().length > 0) {
                  spatialLines.push({
                    text: line.text.trim(),
                    bbox: line.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
                    confidence: typeof line.confidence === 'number' ? line.confidence : 80,
                  });
                }
              }
            }
          }
        }
        lastSpatialLines = spatialLines;

        if (extractedText.trim().length >= 5 || spatialLines.length > 0) {
          totalImagesProcessed++;
          const singleResult = parseGPaySpatialBlocks(spatialLines, extractedText, 1);
          if (singleResult.success && singleResult.transactions.length > 0) {
            allExtractedTransactions.push(...singleResult.transactions);
          }
        }
      } catch (err: any) {
        allWarnings.push(`Screenshot "${imageFile.name}" could not be read cleanly: ${err?.message || 'OCR error'}`);
      } finally {
        if (worker) {
          try {
            await worker.terminate();
          } catch {}
          worker = null;
        }
      }
    }

    // Deduplicate across screenshots
    const deduplicated = deduplicateExtractedTransactions(allExtractedTransactions);
    deduplicated.sort((a, b) => a.date.localeCompare(b.date));

    // Development-only OCR debug information (Requirement 2)
    const devDebug =
      process.env.NODE_ENV === 'development'
        ? {
            ocrText: lastRawOcrText,
            detectedBlocks: lastSpatialLines.map((l) => ({
              text: l.text,
              y: l.bbox.y0,
              h: l.bbox.y1 - l.bbox.y0,
              conf: l.confidence,
            })),
            parsedTransactions: deduplicated,
            errors: allWarnings,
            imageMeta: lastImageMeta,
          }
        : undefined;

    const debugOcr =
      process.env.NODE_ENV === 'development'
        ? {
            rawText: lastRawOcrText,
            lineCount: lastSpatialLines.length,
            lines: lastSpatialLines.slice(0, 100).map((l) => ({
              text: l.text,
              y0: l.bbox.y0,
              y1: l.bbox.y1,
              conf: Math.round(l.confidence),
            })),
          }
        : undefined;

    if (modeParam === 'RECEIPT') {
      const allLines =
        lastSpatialLines.length > 0
          ? lastSpatialLines.map((l) => l.text)
          : lastRawOcrText.split(/\r?\n/).filter((l) => l.trim().length > 0);

      const { parseReceiptOcrLines } = await import('@/lib/receipt-extractor');
      const receipt = parseReceiptOcrLines(allLines);

      return NextResponse.json({
        success: true,
        sourceType: 'IMAGE',
        receipt,
        devDebug,
        debugOcr,
      });
    }

    if (deduplicated.length === 0) {
      return NextResponse.json(
        {
          success: false,
          sourceType: 'IMAGE',
          transactions: [],
          pagesProcessed: totalImagesProcessed || validFiles.length,
          quality: {
            totalDetected: 0,
            highConfidenceCount: 0,
            needsReviewCount: 0,
            warnings: allWarnings.length > 0 ? allWarnings : ["We couldn't read transactions from this image."],
          },
          errorMessage:
            "We couldn't read transactions from this image. Try a clearer screenshot or upload a PDF/CSV statement.",
          devDebug,
          debugOcr,
        },
        { status: 422 }
      );
    }

    const highConfidenceCount = deduplicated.filter((t) => t.confidence === 'HIGH').length;
    const needsReviewCount = deduplicated.length - highConfidenceCount;

    if (needsReviewCount > 0) {
      allWarnings.push(`${needsReviewCount} transaction(s) need your review before analysis.`);
    }

    return NextResponse.json({
      success: true,
      sourceType: 'IMAGE',
      transactions: deduplicated,
      pagesProcessed: totalImagesProcessed,
      quality: {
        totalDetected: deduplicated.length,
        highConfidenceCount,
        needsReviewCount,
        periodStart: deduplicated[0]?.date,
        periodEnd: deduplicated[deduplicated.length - 1]?.date,
        warnings: allWarnings,
      },
      devDebug,
      debugOcr,
    });
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
