/**
 * FlexiFund AI — Export Generation Engine
 *
 * Single source of truth for generating professional, production-quality exports:
 * 1. PDF Report: A4 portrait, strict margins (20mm), professional typography with
 *    native Unicode Rupee (₹) support, automatic smart text wrapping (never overflows),
 *    clean visual hierarchy, card containers, proper multi-page breaks, running headers
 *    and "Page X of Y" footers.
 * 2. PNG Report: High-resolution vertical image (~1080px wide) optimized for viewing
 *    on mobile phones and messaging.
 *
 * Strictly adheres to Zero Fake Data rules and deterministic financial calculations.
 */

import { jsPDF } from 'jspdf';
import { SerializedFinancialAnalysisResult } from '../domain/analysis';
import { UserProfile } from '../context/FinancialDataContext';

export interface ExportOptions {
  scenario?: {
    incomeDropPct: number;
    expenseHikeRupees?: number;
    newEmiRupees?: number;
    scenarioLeft?: number;
    isScenarioSolvent?: boolean;
  };
  fonts?: {
    regularBase64?: string;
    boldBase64?: string;
    italicBase64?: string;
  };
}

/**
 * Formats paise into human-readable INR format: e.g. "₹12,500"
 */
function formatRupeesFromPaise(paiseStr: string | bigint | number): string {
  const p = typeof paiseStr === 'bigint' ? paiseStr : BigInt(Math.trunc(Number(paiseStr)));
  const rupees = Number(p) / 100;
  return `₹${Math.round(rupees).toLocaleString('en-IN')}`;
}

/**
 * Retrieves latest scenario from sessionStorage if available (browser-only)
 */
function getStoredScenario(): ExportOptions['scenario'] | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem('flexifund_latest_scenario');
    if (raw) return JSON.parse(raw);
  } catch {}
  return undefined;
}

/**
 * Builds the complete jsPDF instance for "FLEXIFUND AI — My Financial Plan".
 * Reused across client export and server API route for strict single source of truth.
 */
export function buildPdfDoc(
  analysis: SerializedFinancialAnalysisResult,
  profile?: UserProfile,
  options?: ExportOptions
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // 1. Page Geometry & Bounds (Strict A4: 210mm x 297mm)
  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const _pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 20; // 20mm margin (Left, Right, Top, Bottom)
  const contentWidth = pageWidth - margin * 2; // 170mm printable width
  const footerRuleY = 280;
  const footerTextY = 285;
  const maxBodyY = 270; // Hard cutoff before footer
  let y = margin;

  // 2. Font Setup with True Unicode TTF Support
  let regBase64 = options?.fonts?.regularBase64;
  let boldBase64 = options?.fonts?.boldBase64;
  let italicBase64 = options?.fonts?.italicBase64;

  if (!regBase64 && typeof window === 'undefined') {
    try {
      const fs = require('fs');
      const path = require('path');
      const regPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');
      const boldPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Bold.ttf');
      const italicPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Italic.ttf');
      if (fs.existsSync(regPath) && fs.existsSync(boldPath)) {
        regBase64 = fs.readFileSync(regPath).toString('base64');
        boldBase64 = fs.readFileSync(boldPath).toString('base64');
        if (fs.existsSync(italicPath)) {
          italicBase64 = fs.readFileSync(italicPath).toString('base64');
        }
      }
    } catch {}
  }

  let fontFamily = 'helvetica';
  if (regBase64 && boldBase64) {
    try {
      doc.addFileToVFS('Roboto-Regular.ttf', regBase64);
      doc.addFileToVFS('Roboto-Bold.ttf', boldBase64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
      if (italicBase64) {
        doc.addFileToVFS('Roboto-Italic.ttf', italicBase64);
        doc.addFont('Roboto-Italic.ttf', 'Roboto', 'italic');
      } else {
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'italic');
      }
      doc.setFont('Roboto', 'normal');
      fontFamily = 'Roboto';
    } catch (e) {
      fontFamily = 'helvetica';
    }
  }

  // Domain data extracts
  const inc = analysis.incomeAnalysis;
  const exp = analysis.expenseAnalysis;
  const res = analysis.resilienceAnalysis;
  const cap = analysis.savingsCapacity;
  const opps = analysis.savingsOpportunities || [];
  const stress = analysis.stressIndicators || [];
  const actions = analysis.prioritizedActions || [];
  const meta = analysis.metadata;
  const quality = analysis.dataQuality;

  const scenario = options?.scenario !== undefined ? options.scenario : getStoredScenario();

  // 3. Layout Primitives & Helpers

  const drawRunningHeader = () => {
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('FLEXIFUND AI — MY FINANCIAL PLAN', margin, 22);
    doc.setFont(fontFamily, 'normal');
    doc.text(`ID: ${meta.analysisId.slice(0, 10)}`, pageWidth - margin, 22, { align: 'right' });

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.25);
    doc.line(margin, 25, pageWidth - margin, 25);
  };

  const ensureSpace = (neededHeight: number) => {
    if (y + neededHeight > maxBodyY) {
      doc.addPage();
      drawRunningHeader();
      y = 32; // Standard start Y after running header
    }
  };

  const drawWrappedText = (
    text: string,
    xPos: number,
    yPos: number,
    maxWidth: number,
    lineHeight: number = 4.2
  ): number => {
    const lines = doc.splitTextToSize(text, maxWidth);
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], xPos, yPos);
      yPos += lineHeight;
    }
    return yPos;
  };

  const getWrappedHeight = (
    text: string,
    maxWidth: number,
    lineHeight: number = 4.2
  ): number => {
    const lines = doc.splitTextToSize(text, maxWidth);
    return lines.length * lineHeight;
  };

  const drawSectionTitle = (num: number, title: string) => {
    ensureSpace(32); // Keep title together with following content
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 39, 71); // #0F2747
    doc.text(`${num}. ${title}`, margin, y);
    y += 5.5;
  };

  // -------------------------------------------------------------
  // PAGE 1: BRAND HEADER BANNER
  // -------------------------------------------------------------
  doc.setFillColor(15, 27, 45); // Deep Navy #0F1B2D
  doc.roundedRect(margin, y, contentWidth, 27, 2.5, 2.5, 'F');

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('FLEXIFUND AI', margin + 6, y + 8);

  doc.setFontSize(15);
  doc.setTextColor(96, 165, 250); // Light blue
  doc.text('My Financial Plan', margin + 6, y + 15.5);

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  const genDate = new Date(meta.generatedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Personal financial resilience plan • Generated on ${genDate}`, margin + 6, y + 21.5);

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Ref: ${meta.analysisId.slice(0, 12)}`, pageWidth - margin - 6, y + 21.5, { align: 'right' });

  y += 33;

  // -------------------------------------------------------------
  // 1. HOW I'M DOING (Executive Summary 3-Card Row)
  // -------------------------------------------------------------
  drawSectionTitle(1, "How I'm Doing");

  const earnedNum = Math.round(Number(inc.monthlyAverage?.paise || inc.totalIncome.paise) / 100);
  const spentNum = Math.round(Number(exp.monthlyAverageExpenses?.paise || exp.totalExpenses.paise) / 100);
  const leftNum = earnedNum - spentNum;

  const cardGap = 3.5;
  const cardW = (contentWidth - cardGap * 2) / 3;
  const cardH = 22;

  // Card 1: Money Coming In
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, cardW, cardH, 2, 2, 'FD');

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('MONEY COMING IN', margin + 4, y + 6);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text(`₹${earnedNum.toLocaleString('en-IN')}`, margin + 4, y + 13.5);

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Monthly average earnings', margin + 4, y + 18.5);

  // Card 2: Money Going Out
  const card2X = margin + cardW + cardGap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(card2X, y, cardW, cardH, 2, 2, 'FD');

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('MONEY GOING OUT', card2X + 4, y + 6);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(13);
  doc.setTextColor(225, 29, 72); // rose-600
  doc.text(`₹${spentNum.toLocaleString('en-IN')}`, card2X + 4, y + 13.5);

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Monthly average spending', card2X + 4, y + 18.5);

  // Card 3: Money Left
  const card3X = card2X + cardW + cardGap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(card3X, y, cardW, cardH, 2, 2, 'FD');

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(leftNum >= 0 ? 5 : 225, leftNum >= 0 ? 150 : 29, leftNum >= 0 ? 105 : 72);
  doc.text(leftNum >= 0 ? 'MONEY LEFT' : 'MONTHLY SHORTFALL', card3X + 4, y + 6);

  doc.setFont(fontFamily, 'bold');
  doc.setFontSize(13);
  doc.text(
    leftNum >= 0 ? `₹${leftNum.toLocaleString('en-IN')}` : `-₹${Math.abs(leftNum).toLocaleString('en-IN')}`,
    card3X + 4,
    y + 13.5
  );

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(leftNum >= 0 ? 'Remaining monthly cushion' : 'Monthly deficit', card3X + 4, y + 18.5);

  y += cardH + 7;

  // -------------------------------------------------------------
  // 2. MONEY COMING IN
  // -------------------------------------------------------------
  drawSectionTitle(2, 'Money Coming In');

  const consFloor = formatRupeesFromPaise(inc.conservativeBaselineMonthly.paise);
  const volTxt =
    inc.volatilityRating === 'HIGH' || inc.volatilityRating === 'EXTREME'
      ? 'Changes significantly from week to week (irregular earnings)'
      : 'Fairly steady across statement period';

  const incomeItems = [
    `• Monthly average earnings: ~${formatRupeesFromPaise(inc.monthlyAverage?.paise || inc.totalIncome.paise)}/month`,
    `• Reliable floor income to plan around: ${consFloor}/month (what you can count on even in slow periods).`,
    `• Income consistency: ${volTxt}.`,
    '• Practical guidance: Your income changes from month to month, so a flexible saving target works better than a fixed commitment.',
  ];

  // Measure card height
  let inCardH = 7;
  for (const item of incomeItems) {
    inCardH += getWrappedHeight(item, contentWidth - 8, 4.2) + 1.5;
  }

  ensureSpace(inCardH);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, inCardH, 2, 2, 'FD');

  let textY = y + 5;
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  for (const item of incomeItems) {
    textY = drawWrappedText(item, margin + 4, textY, contentWidth - 8, 4.2);
    textY += 1.5;
  }

  y += inCardH + 6;

  // -------------------------------------------------------------
  // 3. MONEY GOING OUT
  // -------------------------------------------------------------
  drawSectionTitle(3, 'Money Going Out');

  const essStr = formatRupeesFromPaise(exp.essentialMonthlyBurn.paise);
  const discStr = formatRupeesFromPaise(exp.discretionaryMonthlyBurn.paise);
  const debtStr = formatRupeesFromPaise(exp.debtRepaymentsMonthly.paise);
  const hasDebt = Number(exp.debtRepaymentsMonthly.paise) > 0;

  const expenseItems = [
    `• Must-pay expenses (rent, groceries, electricity, essential fuel): ${essStr}/month`,
    `• Optional spending (dining out, tea, snacks, subscriptions, shopping): ${discStr}/month`,
  ];
  if (hasDebt) {
    expenseItems.push(`• Loan repayments & EMI commitments: ${debtStr}/month`);
  }
  expenseItems.push('• Protection rule: Keep essential must-pay expenses covered before allocating to optional spending.');

  let expCardH = 7;
  for (const item of expenseItems) {
    expCardH += getWrappedHeight(item, contentWidth - 8, 4.2) + 1.5;
  }

  ensureSpace(expCardH);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, expCardH, 2, 2, 'FD');

  textY = y + 5;
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  for (const item of expenseItems) {
    textY = drawWrappedText(item, margin + 4, textY, contentWidth - 8, 4.2);
    textY += 1.5;
  }

  y += expCardH + 6;

  // -------------------------------------------------------------
  // 4. WHERE I MAY BE ABLE TO SAVE
  // -------------------------------------------------------------
  drawSectionTitle(4, 'Where I May Be Able to Save');

  const totalPot = opps.reduce((a, b) => a + BigInt(b.potentialMonthlySaving?.paise || '0'), 0n);

  if (opps.length === 0) {
    ensureSpace(22);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('• No high-confidence savings opportunities were detected from the available information.', margin + 4, y + 7);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('  Your spending appears closely aligned with essential costs. We do not invent savings.', margin + 4, y + 13);
    y += 26;
  } else {
    // Total potential savings highlight
    ensureSpace(12);
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105);
    doc.text(`Total potential savings: ~${formatRupeesFromPaise(totalPot.toString())}/month (Potential saving — not guaranteed)`, margin + 1, y);
    y += 5;

    // Opportunities cards
    for (const opp of opps.slice(0, 4)) {
      const savAmt = opp.potentialMonthlySaving
        ? `Potential saving: ~${formatRupeesFromPaise(opp.potentialMonthlySaving.paise)}/month`
        : 'Discretionary optimization';

      const whyText = `Why: ${opp.description || opp.reasonDetected || 'Spending in this category is noticeably higher than typical for similar informal profiles.'}`;
      const actionText = `Action: ${opp.recommendedAction}`;

      const whyH = getWrappedHeight(whyText, contentWidth - 8, 3.8);
      const actH = getWrappedHeight(actionText, contentWidth - 8, 3.8);
      const oppCardH = 7 + 4.5 + whyH + 1.5 + actH + 3;

      ensureSpace(oppCardH);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, oppCardH, 2, 2, 'FD');

      let oppY = y + 5;
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 39, 71);
      doc.text(`• ${opp.title} (${savAmt})`, margin + 4, oppY);
      oppY += 4.5;

      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      oppY = drawWrappedText(whyText, margin + 6, oppY, contentWidth - 10, 3.8);
      oppY += 1;

      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(37, 99, 235);
      drawWrappedText(actionText, margin + 6, oppY, contentWidth - 10, 3.8);

      y += oppCardH + 3;
    }
    y += 3;
  }

  // -------------------------------------------------------------
  // 5. MY SAVING TARGET
  // -------------------------------------------------------------
  const starterTgt = formatRupeesFromPaise(cap.conservativeMonthlyReference.paise);
  const minTgt = formatRupeesFromPaise(cap.minimumMonthlySavings.paise);
  const maxTgt = formatRupeesFromPaise(cap.maximumMonthlySavings.paise);

  const savingTargetItems = [
    `• Starter saving target: Set aside ~${starterTgt} whenever you have a good week.`,
    `• Low-income month target: ${minTgt}/month (sustainable even during slow periods).`,
    `• Normal month target: ${starterTgt}/month.`,
    `• Good-income month capacity: Up to ${maxTgt}/month (accelerate cushion building without pressure).`,
    '• Advice: Never try to save a fixed amount if work is slow. Protect your essential living expenses first.',
  ];

  let stCardH = 7;
  for (const item of savingTargetItems) {
    stCardH += getWrappedHeight(item, contentWidth - 8, 4.2) + 1.5;
  }

  ensureSpace(6 + stCardH);
  drawSectionTitle(5, 'My Saving Target');

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, stCardH, 2, 2, 'FD');

  textY = y + 5;
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  for (const item of savingTargetItems) {
    textY = drawWrappedText(item, margin + 4, textY, contentWidth - 8, 4.2);
    textY += 1.5;
  }

  y += stCardH + 6;

  // -------------------------------------------------------------
  // 6. MY SAFETY CUSHION
  // -------------------------------------------------------------
  const dailyBurn = Math.max(1, Math.round(Number(exp.dailyEssentialBurnRate.paise) / 100));
  const target30 = `₹${(dailyBurn * 30).toLocaleString('en-IN')}`;
  const hasCash = Boolean(profile?.currentCashBalanceRupees && profile.currentCashBalanceRupees.trim() !== '');

  const cushionItems: { text: string; isBold?: boolean; isItalic?: boolean }[] = [
    { text: `• Essential daily living cost: ₹${dailyBurn} / day` },
    { text: `• 30-day starter safety cushion target: ${target30}` },
  ];

  if (hasCash) {
    const cashNum = Math.round(Number(profile!.currentCashBalanceRupees));
    const coverageDays =
      res.bufferCoverageDays !== null
        ? res.bufferCoverageDays
        : dailyBurn > 0
        ? Math.round(cashNum / dailyBurn)
        : 0;
    cushionItems.push({
      text: `• Current available cash: ₹${cashNum.toLocaleString('en-IN')} (covers approximately ${coverageDays} days of essential living expenses).`,
      isBold: true,
    });
  } else {
    cushionItems.push({
      text: '• Current available cash: Not provided',
      isBold: true,
    });
    cushionItems.push({
      text: '  Add your available cash in FlexiFund to calculate your safety-cushion coverage. We never guess current cash.',
      isItalic: true,
    });
  }
  cushionItems.push({
    text: '• Recommendation: Even 7 to 14 days of cash cushion stops you from needing high-interest daily loans.',
  });

  let cushCardH = 7;
  for (const item of cushionItems) {
    cushCardH += getWrappedHeight(item.text, contentWidth - 8, 4.2) + 1.5;
  }

  ensureSpace(6 + cushCardH);
  drawSectionTitle(6, 'My Safety Cushion');

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, cushCardH, 2, 2, 'FD');

  textY = y + 5;
  for (const item of cushionItems) {
    doc.setFont(fontFamily, item.isBold ? 'bold' : item.isItalic ? 'italic' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(item.isItalic ? 100 : 30, item.isItalic ? 116 : 41, item.isItalic ? 139 : 59);
    textY = drawWrappedText(item.text, margin + 4, textY, contentWidth - 8, 4.2);
    textY += 1.5;
  }

  y += cushCardH + 6;

  // -------------------------------------------------------------
  // 7. WHAT HAPPENS IF MY INCOME FALLS
  // -------------------------------------------------------------
  if (scenario && (scenario.incomeDropPct > 0 || scenario.expenseHikeRupees || scenario.newEmiRupees)) {
    const dropPct = scenario.incomeDropPct;
    const estLeft =
      scenario.scenarioLeft !== undefined
        ? Math.round(scenario.scenarioLeft)
        : Math.round(earnedNum * (1 - dropPct / 100) - spentNum);
    const isSolvent = scenario.isScenarioSolvent ?? estLeft >= 0;

    const scenItems = [
      `• Income change tested: -${dropPct}%`,
      `• Estimated money left after planned expenses: ${isSolvent ? '₹' : '-₹'}${Math.abs(estLeft).toLocaleString('en-IN')}`,
      `• Status: ${isSolvent ? '✓ You may still be able to cover planned expenses' : '⚠️ Planned expenses exceed simulated earnings'}`,
      isSolvent
        ? `• Simulation summary: If your income drops by ${dropPct}%, you should still retain about ₹${Math.abs(estLeft).toLocaleString('en-IN')} to cover regular essential expenses.`
        : `• Simulation summary: If your income drops by ${dropPct}%, your planned expenses could exceed earnings by ₹${Math.abs(estLeft).toLocaleString('en-IN')}. Moderating optional spends is recommended.`,
      '• Planning scenario — not a prediction.',
    ];

    let scenCardH = 7;
    for (const item of scenItems) {
      scenCardH += getWrappedHeight(item, contentWidth - 8, 4.2) + 1.5;
    }

    ensureSpace(6 + scenCardH);
    drawSectionTitle(7, 'What Happens If My Income Falls?');

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, scenCardH, 2, 2, 'FD');

    textY = y + 5;
    for (let i = 0; i < scenItems.length; i++) {
      const item = scenItems[i];
      const isLast = i === scenItems.length - 1;
      doc.setFont(fontFamily, isLast ? 'italic' : i === 2 ? 'bold' : 'normal');
      doc.setFontSize(isLast ? 7.5 : 8.5);
      doc.setTextColor(isLast ? 100 : i === 2 && !isSolvent ? 225 : 30, isLast ? 116 : i === 2 && !isSolvent ? 29 : 41, isLast ? 139 : i === 2 && !isSolvent ? 72 : 59);
      textY = drawWrappedText(item, margin + 4, textY, contentWidth - 8, 4.2);
      textY += 1.5;
    }
    y += scenCardH + 6;
  } else {
    ensureSpace(6 + 22);
    drawSectionTitle(7, 'What Happens If My Income Falls?');

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('• No scenario selected yet.', margin + 4, y + 6);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('  Test what happens if gigs or earnings drop in the "Plan Ahead" section.', margin + 4, y + 11.5);
    doc.setFont(fontFamily, 'italic');
    doc.setFontSize(7.5);
    doc.text('  Planning scenario — not a prediction.', margin + 4, y + 16.5);
    y += 28;
  }

  // -------------------------------------------------------------
  // 8. THINGS TO WATCH (Stress Indicators)
  // -------------------------------------------------------------
  if (stress.length === 0) {
    ensureSpace(6 + 18);
    drawSectionTitle(8, 'Things to Watch');

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105);
    doc.text('✓ Nothing urgent to flag', margin + 4, y + 6.5);

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("We didn't find any major warning signs or acute financial pressure in the information provided.", margin + 4, y + 12);
    y += 24;
  } else {
    ensureSpace(6 + 32);
    drawSectionTitle(8, 'Things to Watch');

    for (const item of stress.slice(0, 3)) {
      const whyText = `Why: ${item.description || item.evidence?.explanation || ''}`;
      const actText = `What you can do: ${item.recommendedAction}`;
      const whyH = getWrappedHeight(whyText, contentWidth - 8, 3.8);
      const actH = getWrappedHeight(actText, contentWidth - 8, 3.8);
      const watchCardH = 6 + 4.5 + whyH + 1.5 + actH + 3;

      ensureSpace(watchCardH);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, watchCardH, 2, 2, 'FD');

      let wY = y + 5;
      const isHighSeverity = item.severity === 'HIGH' || item.severity === 'ELEVATED_CAUTION';
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(isHighSeverity ? 225 : 15, isHighSeverity ? 29 : 39, isHighSeverity ? 72 : 71);
      doc.text(`• ${item.title} [${item.severity}]`, margin + 4, wY);
      wY += 4.5;

      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      wY = drawWrappedText(whyText, margin + 6, wY, contentWidth - 10, 3.8);
      wY += 1;

      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(37, 99, 235);
      drawWrappedText(actText, margin + 6, wY, contentWidth - 10, 3.8);

      y += watchCardH + 3;
    }
    y += 3;
  }

  // -------------------------------------------------------------
  // 9. MY NEXT 3 STEPS
  // -------------------------------------------------------------
  ensureSpace(6 + 32);
  drawSectionTitle(9, 'My Next 3 Steps');

  const displaySteps: { num: string; title: string; why: string; impact: string }[] = actions.slice(0, 3).map((a, idx) => ({
    num: `0${idx + 1}`,
    title: a.title,
    why: a.description,
    impact: a.actionUrlOrPrompt,
  }));

  if (displaySteps.length === 0) {
    displaySteps.push(
      {
        num: '01',
        title: 'Build your 30-day cushion gradually',
        why: 'Set aside money in good weeks to cover unexpected slow periods without borrowing.',
        impact: 'Transfer a small amount each good week into a separate emergency account.',
      },
      {
        num: '02',
        title: 'Review discretionary and food orders',
        why: 'Small daily savings on tea, snacks, dining and avoidable fees add up to significant security.',
        impact: 'Keep an extra ₹500 to ₹1,500 every month in your wallet.',
      },
      {
        num: '03',
        title: 'Register for social security benefits',
        why: 'Government programs provide accidental cover and medical protection at minimal cost.',
        impact: 'Register on e-Shram portal for ₹2 Lakh accident coverage.',
      }
    );
  }

  for (const step of displaySteps) {
    const whyText = `Why it matters: ${step.why}`;
    const impText = `Potential impact: ${step.impact}`;
    const whyH = getWrappedHeight(whyText, contentWidth - 12, 3.8);
    const impH = getWrappedHeight(impText, contentWidth - 12, 3.8);
    const stepCardH = 6 + 4.5 + whyH + 1.5 + impH + 3;

    ensureSpace(stepCardH);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, stepCardH, 2, 2, 'FD');

    let sY = y + 5;
    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(37, 99, 235);
    doc.text(`${step.num}`, margin + 4, sY);

    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 39, 71);
    doc.text(step.title, margin + 11, sY);
    sY += 4.5;

    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    sY = drawWrappedText(whyText, margin + 11, sY, contentWidth - 15, 3.8);
    sY += 1;

    doc.setFont(fontFamily, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(37, 99, 235);
    drawWrappedText(impText, margin + 11, sY, contentWidth - 15, 3.8);

    y += stepCardH + 3;
  }
  y += 3;

  // -------------------------------------------------------------
  // 10. SUPPORT I MAY BE ABLE TO USE
  // -------------------------------------------------------------
  const supportItems = [
    '• e-Shram Portal: National Database of Unorganised Workers. Eligible workers receive ₹2 Lakh accidental death / permanent disability insurance cover.',
    '• Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY) & PMSBY: Affordable life and disability cover (₹2 Lakh) available via your bank account.',
    '• Atal Pension Yojana (APY): Guaranteed government-backed monthly pension from age 60 for informal workers.',
    '• Official recommendation: Always verify official eligibility criteria on respective government portals before applying.',
  ];

  let supCardH = 7;
  for (const item of supportItems) {
    supCardH += getWrappedHeight(item, contentWidth - 8, 4.0) + 1.5;
  }

  ensureSpace(6 + supCardH);
  drawSectionTitle(10, 'Support I May Be Able to Use');

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, supCardH, 2, 2, 'FD');

  textY = y + 5;
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  for (const item of supportItems) {
    textY = drawWrappedText(item, margin + 4, textY, contentWidth - 8, 4.0);
    textY += 1.5;
  }

  y += supCardH + 6;

  // -------------------------------------------------------------
  // 11. DATA & LIMITATIONS
  // -------------------------------------------------------------
  const span = quality?.daysSpan || 0;
  const validTxCount = quality?.validRows || quality?.totalRows || 0;
  const grade = quality?.scoreGrade || 'B';
  const dataItems = [
    `• Statement period: ${span > 0 ? `${span} days analyzed` : 'Recent statement period'} (${validTxCount} transactions analyzed).`,
    '• Important: Current available cash is only included if explicitly entered by the user. Historical statements do not reflect current bank balance or cash in hand.',
    `• Data quality grade: Grade ${grade}. Statements covering at least 60–90 days produce the most reliable financial planning baselines.`,
  ];

  let dlCardH = 7;
  for (const item of dataItems) {
    dlCardH += getWrappedHeight(item, contentWidth - 8, 4.0) + 1.5;
  }

  ensureSpace(6 + dlCardH);
  drawSectionTitle(11, 'Data & Limitations');

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, dlCardH, 2, 2, 'FD');

  textY = y + 5;
  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  for (const item of dataItems) {
    textY = drawWrappedText(item, margin + 4, textY, contentWidth - 8, 4.0);
    textY += 1.5;
  }

  y += dlCardH + 6;

  // -------------------------------------------------------------
  // 12. IMPORTANT DISCLAIMER
  // -------------------------------------------------------------
  const discText =
    'This report provides informational financial planning guidance based on the information provided. Estimates are not guarantees and should not be treated as financial, investment, lending or insurance advice. FlexiFund AI is an educational planning platform designed to support informal and gig workers with irregular income management.';

  const discH = getWrappedHeight(discText, contentWidth - 8, 3.8);
  const discCardH = discH + 8;

  ensureSpace(6 + discCardH);
  drawSectionTitle(12, 'Important Disclaimer');

  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, discCardH, 2, 2, 'FD');

  doc.setFont(fontFamily, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  drawWrappedText(discText, margin + 4, y + 5, contentWidth - 8, 3.8);

  y += discCardH + 5;

  // -------------------------------------------------------------
  // POST-PROCESSING PASS: NUMBER ALL PAGES (Page X of Y) & FOOTERS
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, footerRuleY, pageWidth - margin, footerRuleY);

    // Footer text
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('FlexiFund AI — Confidential Personal Financial Plan', margin, footerTextY);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, footerTextY, { align: 'right' });
  }

  return doc;
}

/**
 * Generates and downloads a clean, professional PDF "FLEXIFUND AI — My Financial Plan".
 * In browser: calls `/api/export` first to download server-generated PDF with full embedded fonts;
 * falls back to client-side `buildPdfDoc` if network request fails.
 */
export async function exportPdfReport(
  analysis: SerializedFinancialAnalysisResult,
  profile?: UserProfile,
  options?: ExportOptions
): Promise<void> {
  const genDate = new Date(analysis.metadata.generatedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const filename = `My-Financial-Plan-${genDate.replace(/\s+/g, '-')}.pdf`;

  // Try server API route first for pixel-perfect font rendering
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisData: analysis,
          profile,
          options,
          format: 'pdf',
        }),
      });

      if (res.ok) {
        const pdfBlob = await res.blob();
        const blobUrl = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(blobUrl);
        return;
      }
    } catch {}
  }

  // Fallback: client-side build
  const doc = buildPdfDoc(analysis, profile, options);
  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(blobUrl);
}

/**
 * Generates and downloads a clean, friendly PNG Image of "FLEXIFUND AI — My Financial Plan".
 * Vertical layout, readable on a phone (~1080px wide).
 */
export async function exportPngReport(
  analysis: SerializedFinancialAnalysisResult,
  profile?: UserProfile,
  options?: ExportOptions
): Promise<void> {
  if (typeof window === 'undefined') return;

  const width = 1080;
  const height = 2400;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  const inc = analysis.incomeAnalysis;
  const exp = analysis.expenseAnalysis;
  const res = analysis.resilienceAnalysis;
  const cap = analysis.savingsCapacity;
  const opps = analysis.savingsOpportunities || [];
  const stress = analysis.stressIndicators || [];
  const actions = analysis.prioritizedActions || [];
  const meta = analysis.metadata;
  const quality = analysis.dataQuality;

  const scenario = options?.scenario !== undefined ? options.scenario : getStoredScenario();

  // Background
  ctx.fillStyle = '#0B1220';
  ctx.fillRect(0, 0, width, height);

  // Top Accent Bar
  ctx.fillStyle = '#2563EB';
  ctx.fillRect(0, 0, width, 12);

  // Header Banner
  ctx.fillStyle = '#111C2E';
  ctx.fillRect(40, 40, width - 80, 160);

  ctx.fillStyle = '#3B82F6';
  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('FLEXIFUND AI', 70, 85);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('My Financial Plan', 70, 130);

  const genDate = new Date(meta.generatedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  ctx.fillStyle = '#94A3B8';
  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Personal financial resilience plan • Generated on ${genDate}`, 70, 165);

  let curY = 230;

  // 1. HOW I'M DOING (3 Metrics Row)
  const earnedNum = Math.round(Number(inc.monthlyAverage?.paise || inc.totalIncome.paise) / 100);
  const spentNum = Math.round(Number(exp.monthlyAverageExpenses?.paise || exp.totalExpenses.paise) / 100);
  const leftNum = earnedNum - spentNum;

  const cardW = (width - 80 - 40) / 3;

  // Card 1
  ctx.fillStyle = '#17243A';
  ctx.beginPath();
  ctx.roundRect(40, curY, cardW, 130, 16);
  ctx.fill();
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('MONEY COMING IN', 65, curY + 35);
  ctx.fillStyle = '#60A5FA';
  ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`₹${earnedNum.toLocaleString('en-IN')}`, 65, curY + 75);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Monthly average earnings', 65, curY + 105);

  // Card 2
  ctx.fillStyle = '#17243A';
  ctx.beginPath();
  ctx.roundRect(40 + cardW + 20, curY, cardW, 130, 16);
  ctx.fill();
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('MONEY GOING OUT', 40 + cardW + 45, curY + 35);
  ctx.fillStyle = '#FB7185';
  ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`₹${spentNum.toLocaleString('en-IN')}`, 40 + cardW + 45, curY + 75);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Monthly average spending', 40 + cardW + 45, curY + 105);

  // Card 3
  ctx.fillStyle = '#17243A';
  ctx.beginPath();
  ctx.roundRect(40 + (cardW + 20) * 2, curY, cardW, 130, 16);
  ctx.fill();
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(leftNum >= 0 ? 'MONEY LEFT' : 'SHORTFALL', 40 + (cardW + 20) * 2 + 25, curY + 35);
  ctx.fillStyle = leftNum >= 0 ? '#34D399' : '#FB7185';
  ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(
    leftNum >= 0 ? `₹${leftNum.toLocaleString('en-IN')}` : `-₹${Math.abs(leftNum).toLocaleString('en-IN')}`,
    40 + (cardW + 20) * 2 + 25,
    curY + 75
  );
  ctx.fillStyle = '#94A3B8';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(leftNum >= 0 ? 'Monthly remaining cushion' : 'Monthly deficit', 40 + (cardW + 20) * 2 + 25, curY + 105);

  curY += 160;

  // 2. MONEY COMING IN & 3. MONEY GOING OUT
  const halfW = (width - 80 - 20) / 2;

  // Money Coming In Card
  ctx.fillStyle = '#17243A';
  ctx.beginPath();
  ctx.roundRect(40, curY, halfW, 190, 16);
  ctx.fill();
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('2. MONEY COMING IN', 65, curY + 35);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`• Average: ~${formatRupeesFromPaise(inc.monthlyAverage?.paise || inc.totalIncome.paise)}/month`, 65, curY + 70);
  ctx.fillText(`• Planning floor: ${formatRupeesFromPaise(inc.conservativeBaselineMonthly.paise)}/month`, 65, curY + 105);
  const volLabel = inc.volatilityRating === 'HIGH' || inc.volatilityRating === 'EXTREME' ? 'Irregular / variable' : 'Fairly steady';
  ctx.fillText(`• Pattern: ${volLabel}`, 65, curY + 140);

  // Money Going Out Card
  ctx.fillStyle = '#17243A';
  ctx.beginPath();
  ctx.roundRect(40 + halfW + 20, curY, halfW, 190, 16);
  ctx.fill();
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('3. MONEY GOING OUT', 40 + halfW + 45, curY + 35);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`• Must-pay (rent, food, fuel): ${formatRupeesFromPaise(exp.essentialMonthlyBurn.paise)}/mo`, 40 + halfW + 45, curY + 70);
  ctx.fillText(`• Optional spending: ${formatRupeesFromPaise(exp.discretionaryMonthlyBurn.paise)}/mo`, 40 + halfW + 45, curY + 105);
  if (Number(exp.debtRepaymentsMonthly.paise) > 0) {
    ctx.fillText(`• Loan repayments: ${formatRupeesFromPaise(exp.debtRepaymentsMonthly.paise)}/mo`, 40 + halfW + 45, curY + 140);
  } else {
    ctx.fillText('• Loan repayments: No active EMIs detected', 40 + halfW + 45, curY + 140);
  }

  curY += 220;

  // 4. WHERE I MAY BE ABLE TO SAVE
  ctx.fillStyle = '#17243A';
  ctx.beginPath();
  ctx.roundRect(40, curY, width - 80, 200, 16);
  ctx.fill();
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('4. WHERE I MAY BE ABLE TO SAVE', 70, curY + 35);

  const totalPotSaving = opps.reduce((a, b) => a + BigInt(b.potentialMonthlySaving?.paise || '0'), 0n);
  ctx.fillStyle = '#34D399';
  ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`Potential savings: ~${formatRupeesFromPaise(totalPotSaving.toString())}/month (Potential saving — not guaranteed)`, 70, curY + 65);

  if (opps.length === 0) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('• No high-confidence savings opportunities were detected from the available information.', 70, curY + 110);
    ctx.fillText('  Your spending appears closely aligned with essential costs.', 70, curY + 140);
  } else {
    let oppY = curY + 105;
    for (const opp of opps.slice(0, 2)) {
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const savAmt = opp.potentialMonthlySaving ? `Potential saving: ~${formatRupeesFromPaise(opp.potentialMonthlySaving.paise)}/mo` : 'Discretionary buffer';
      ctx.fillText(`• ${opp.title} (${savAmt})`, 70, oppY);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`Why: ${(opp.description || opp.reasonDetected || '').slice(0, 65)} • Action: ${opp.recommendedAction.slice(0, 50)}`, 90, oppY + 24);
      oppY += 48;
    }
  }

  curY += 230;

  // 5. MY SAVING TARGET & 6. MY SAFETY CUSHION
  ctx.fillStyle = '#17243A';
  ctx.beginPath();
  ctx.roundRect(40, curY, halfW, 200, 16);
  ctx.fill();
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('5. MY SAVING TARGET', 65, curY + 35);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`• Starter target: ~${formatRupeesFromPaise(cap.conservativeMonthlyReference.paise)}`, 65, curY + 70);
  ctx.fillText(`• Low-income month: ${formatRupeesFromPaise(cap.minimumMonthlySavings.paise)}/mo`, 65, curY + 105);
  ctx.fillText(`• Good-income month: Up to ${formatRupeesFromPaise(cap.maximumMonthlySavings.paise)}/mo`, 65, curY + 140);

  // Safety Cushion Card
  ctx.fillStyle = '#17243A';
  ctx.beginPath();
  ctx.roundRect(40 + halfW + 20, curY, halfW, 200, 16);
  ctx.fill();
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('6. MY SAFETY CUSHION', 40 + halfW + 45, curY + 35);
  const dailyB = Math.max(1, Math.round(Number(exp.dailyEssentialBurnRate.paise) / 100));
  const tgt30 = `₹${(dailyB * 30).toLocaleString('en-IN')}`;
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(`• Essential daily cost: ₹${dailyB} / day`, 40 + halfW + 45, curY + 70);
  ctx.fillText(`• 30-day cushion target: ${tgt30}`, 40 + halfW + 45, curY + 105);

  const hasEnteredCash = Boolean(profile?.currentCashBalanceRupees && profile.currentCashBalanceRupees.trim() !== '');
  if (hasEnteredCash && res.bufferCoverageDays !== null) {
    ctx.fillText(`• Current cash: ₹${Number(profile!.currentCashBalanceRupees).toLocaleString('en-IN')} (${res.bufferCoverageDays} days)`, 40 + halfW + 45, curY + 140);
  } else {
    ctx.fillText('• Current available cash: Not provided', 40 + halfW + 45, curY + 140);
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'italic 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Add your cash in FlexiFund to calculate cushion.', 40 + halfW + 45, curY + 170);
  }

  curY += 230;

  // 7. WHAT HAPPENS IF MY INCOME FALLS & 8. THINGS TO WATCH
  ctx.fillStyle = '#17243A';
  ctx.beginPath();
  ctx.roundRect(40, curY, halfW, 200, 16);
  ctx.fill();
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('7. WHAT HAPPENS IF MY INCOME FALLS?', 65, curY + 35);

  if (scenario && (scenario.incomeDropPct > 0 || scenario.expenseHikeRupees || scenario.newEmiRupees)) {
    const dropPct = scenario.incomeDropPct;
    const estLeft = scenario.scenarioLeft !== undefined ? Math.round(scenario.scenarioLeft) : earnedNum * (1 - dropPct / 100) - spentNum;
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`• Income change tested: -${dropPct}%`, 65, curY + 70);
    ctx.fillText(`• Estimated money left: ₹${estLeft.toLocaleString('en-IN')}`, 65, curY + 105);
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'italic 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Planning scenario — not a prediction.', 65, curY + 150);
  } else {
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('• No scenario selected yet.', 65, curY + 75);
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'italic 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Test income changes in Plan Ahead.', 65, curY + 115);
    ctx.fillText('Planning scenario — not a prediction.', 65, curY + 145);
  }

  // 8. Things to Watch Card
  ctx.fillStyle = '#17243A';
  ctx.beginPath();
  ctx.roundRect(40 + halfW + 20, curY, halfW, 200, 16);
  ctx.fill();
  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('8. THINGS TO WATCH', 40 + halfW + 45, curY + 35);

  if (stress.length === 0) {
    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('✓ Nothing urgent to flag', 40 + halfW + 45, curY + 75);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText("We didn't find any major warning signs.", 40 + halfW + 45, curY + 115);
  } else {
    const s1 = stress[0];
    const s1Why = s1.description || s1.evidence?.explanation || '';
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`• ${s1.title.slice(0, 32)}`, 40 + halfW + 45, curY + 75);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Why: ${s1Why.slice(0, 38)}`, 40 + halfW + 45, curY + 105);
    ctx.fillText(`Action: ${s1.recommendedAction.slice(0, 38)}`, 40 + halfW + 45, curY + 135);
  }

  curY += 230;

  // 9. MY NEXT 3 STEPS
  ctx.fillStyle = '#17243A';
  ctx.beginPath();
  ctx.roundRect(40, curY, width - 80, 240, 16);
  ctx.fill();

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('9. MY NEXT 3 STEPS', 70, curY + 35);

  const displaySteps = actions.slice(0, 3).map((a, idx) => ({
    num: `0${idx + 1}`,
    title: a.title,
    why: a.description,
    impact: a.actionUrlOrPrompt,
  }));

  if (displaySteps.length === 0) {
    displaySteps.push(
      {
        num: '01',
        title: `Set aside ${formatRupeesFromPaise(cap.conservativeMonthlyReference.paise)} in good weeks`,
        why: 'Build a buffer to weather slow periods without borrowing.',
        impact: 'Transfer to a separate emergency savings pocket.',
      },
      {
        num: '02',
        title: 'Review discretionary and food orders',
        why: 'Cut 1–2 orders a week to keep extra cash in hand.',
        impact: 'Keep an extra ~₹800/month in your pocket.',
      },
      {
        num: '03',
        title: `Target a 30-day cushion (${tgt30})`,
        why: 'Covers essential expenses if gigs pause or bike needs repair.',
        impact: 'Gradually build up to 30 days of expenses.',
      }
    );
  }

  let stepY = curY + 65;
  for (const st of displaySteps) {
    ctx.fillStyle = '#F8FAFC';
    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${st.num}. ${st.title}`, 70, stepY);
    stepY += 22;

    ctx.fillStyle = '#94A3B8';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Why: ${st.why.slice(0, 65)} • Impact: ${st.impact.slice(0, 50)}`, 90, stepY);
    stepY += 32;
  }

  curY += 265;

  // 10. SUPPORT PROGRAMS, DATA & DISCLAIMER
  ctx.fillStyle = '#17243A';
  ctx.beginPath();
  ctx.roundRect(40, curY, width - 80, 200, 16);
  ctx.fill();

  ctx.fillStyle = '#94A3B8';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('10. SUPPORT PROGRAMS & DISCLAIMER', 70, curY + 35);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('• Government Schemes: e-Shram (₹2L accidental cover), PMJJBY/PMSBY (₹2L bank life cover), APY (pension).', 70, curY + 70);
  ctx.fillText(`• Statement Scope: ${quality?.daysSpan || 0} days analyzed (${quality?.validRows || quality?.totalRows || 0} transactions, Grade ${quality?.scoreGrade || 'B'}).`, 70, curY + 105);

  ctx.fillStyle = '#64748B';
  ctx.font = 'italic 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Disclaimer: This report provides informational financial planning guidance based on uploaded statements.', 70, curY + 145);
  ctx.fillText('Estimates are not guarantees and should not be treated as professional investment or loan advice.', 70, curY + 168);

  // Trigger Download as PNG
  const dataUrl = canvas.toDataURL('image/png');
  const filename = `My-Financial-Plan-${genDate.replace(/\s+/g, '-')}.png`;
  const downloadLink = document.createElement('a');
  downloadLink.href = dataUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// Backward-compatible alias for existing callers
export const exportImageReport = exportPngReport;
