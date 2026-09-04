import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/analyze/route';
import { NextRequest } from 'next/server';
import { ExtractedStatementTransaction } from '@/lib/statement-extractor';

describe('Add Expense Persistence & Append Guarantees', () => {
  it('Requirement 24: Appending an expense to 3 existing transactions preserves all original data', async () => {
    // 3 initial transactions: Income ₹10,000, Expense ₹2,000, Expense ₹1,000
    const initialTxs: ExtractedStatementTransaction[] = [
      {
        id: 'tx_income_1',
        date: '2026-09-01',
        description: 'Swiggy Weekly Payout',
        amountPaise: '1000000', // ₹10,000
        type: 'CREDIT',
        confidence: 'HIGH',
        source: 'CSV',
      },
      {
        id: 'tx_expense_1',
        date: '2026-09-02',
        description: 'Room Rent',
        amountPaise: '200000', // ₹2,000
        type: 'DEBIT',
        confidence: 'HIGH',
        source: 'CSV',
      },
      {
        id: 'tx_expense_2',
        date: '2026-09-03',
        description: 'Groceries D-Mart',
        amountPaise: '100000', // ₹1,000
        type: 'DEBIT',
        confidence: 'HIGH',
        source: 'CSV',
      },
    ];

    // Initial analysis
    const req1 = new NextRequest('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: initialTxs }),
    });
    const res1 = await POST(req1);
    expect(res1.status).toBe(200);
    const data1 = await res1.json();

    expect(data1.incomeAnalysis.totalIncome.paise).toBe('1000000');
    expect(data1.expenseAnalysis.totalExpenses.paise).toBe('300000');
    expect(data1.transactions.length).toBe(3);

    // User then adds: Petrol ₹300 (source: Manual)
    const newExpense: ExtractedStatementTransaction = {
      id: 'tx_petrol_manual',
      date: '2026-09-04',
      description: 'Petrol',
      amountPaise: '30000', // ₹300
      type: 'DEBIT',
      confidence: 'HIGH',
      source: 'Manual',
    };

    // APPEND pattern: existing + new
    const updatedTxs = [...initialTxs, newExpense];

    const req2 = new NextRequest('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: updatedTxs }),
    });
    const res2 = await POST(req2);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();

    // Verification of exact values
    expect(data2.transactions.length).toBe(4);
    expect(data2.incomeAnalysis.totalIncome.paise).toBe('1000000'); // ₹10,000 unchanged
    expect(data2.expenseAnalysis.totalExpenses.paise).toBe('330000'); // ₹3,300 (₹3,000 + ₹300)

    // Net savings/surplus: ₹10,000 - ₹3,300 = ₹6,700
    const netPaise = BigInt(data2.incomeAnalysis.totalIncome.paise) - BigInt(data2.expenseAnalysis.totalExpenses.paise);
    expect(netPaise).toBe(670000n);

    // All original transactions must still exist with their original IDs and descriptions
    const txIds = data2.transactions.map((t: any) => t.id);
    expect(txIds).toContain('tx_income_1');
    expect(txIds).toContain('tx_expense_1');
    expect(txIds).toContain('tx_expense_2');
    expect(txIds).toContain('tx_petrol_manual');
  });

  it('Requirement 25: CSV upload produces canonical transactions, which are preserved when adding voice and receipt expenses', async () => {
    // 1. CSV Statement Ingestion
    const csvContent = [
      'Date,Description,Amount,Type',
      '2026-08-01,Zomato Payout,25000.00,Credit',
      '2026-08-05,Bike EMI,4500.00,Debit',
      '2026-08-10,Mobile Recharge,399.00,Debit',
    ].join('\n');

    const csvReq = new NextRequest('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvContent, sourceReference: 'august_statement.csv' }),
    });
    const csvRes = await POST(csvReq);
    expect(csvRes.status).toBe(200);
    const csvData = await csvRes.json();

    // Verify CSV parsed transactions are returned
    expect(csvData.transactions).toBeDefined();
    expect(csvData.transactions.length).toBe(3);
    expect(csvData.incomeAnalysis.totalIncome.paise).toBe('2500000');
    expect(csvData.expenseAnalysis.totalExpenses.paise).toBe('489900');

    // 2. Add Voice Expense: "Tea and snacks ₹60"
    const voiceTx: ExtractedStatementTransaction = {
      id: 'voice_tx_1',
      date: '2026-08-12',
      description: 'Tea and snacks',
      amountPaise: '6000', // ₹60
      type: 'DEBIT',
      confidence: 'HIGH',
      source: 'Voice',
    };

    const afterVoiceList = [...csvData.transactions, voiceTx];
    const voiceReq = new NextRequest('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: afterVoiceList }),
    });
    const voiceRes = await POST(voiceReq);
    const voiceData = await voiceRes.json();

    expect(voiceData.transactions.length).toBe(4);
    expect(voiceData.incomeAnalysis.totalIncome.paise).toBe('2500000');
    expect(voiceData.expenseAnalysis.totalExpenses.paise).toBe('495900'); // ₹4,899 + ₹60 = ₹4,959

    // 3. Add Receipt OCR Expense: "Shell Petrol Bunk ₹500"
    const receiptTx: ExtractedStatementTransaction = {
      id: 'receipt_tx_1',
      date: '2026-08-15',
      description: 'Shell Petrol Bunk',
      amountPaise: '50000', // ₹500
      type: 'DEBIT',
      confidence: 'HIGH',
      source: 'Receipt',
    };

    const afterReceiptList = [...afterVoiceList, receiptTx];
    const receiptReq = new NextRequest('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: afterReceiptList }),
    });
    const receiptRes = await POST(receiptReq);
    const receiptData = await receiptRes.json();

    expect(receiptData.transactions.length).toBe(5);
    expect(receiptData.incomeAnalysis.totalIncome.paise).toBe('2500000');
    expect(receiptData.expenseAnalysis.totalExpenses.paise).toBe('545900'); // ₹4,959 + ₹500 = ₹5,459

    // Check source tracking (Requirement 18)
    const sources = receiptData.transactions.map((t: any) => t.source);
    expect(sources).toContain('Voice');
    expect(sources).toContain('Receipt');
  });
});
