import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

async function testIndividualPaymentScreen() {
  console.log('Testing Individual GPay Payment Screenshot through /api/extract...');

  // 1. Generate realistic Individual GPay Detail Screen
  const svg = `<svg width='600' height='650' xmlns='http://www.w3.org/2000/svg'>
    <rect width='100%' height='100%' fill='#FFFFFF'/>
    <text x='50' y='60' font-family='Arial' font-size='20' fill='#64748B'>Google Pay</text>
    <text x='50' y='140' font-family='Arial' font-size='28' font-weight='bold' fill='#0F2747'>Swiggy Instamart</text>
    <text x='50' y='180' font-family='Arial' font-size='16' fill='#64748B'>swiggy@okhdfcbank</text>
    <text x='50' y='250' font-family='Arial' font-size='36' font-weight='bold' fill='#0F2747'>Rs. 540.00</text>
    <text x='50' y='300' font-family='Arial' font-size='18' font-weight='bold' fill='#059669'>Completed</text>
    <text x='50' y='360' font-family='Arial' font-size='18' fill='#64748B'>12 Aug 2026, 8:45 PM</text>
    <text x='50' y='420' font-family='Arial' font-size='16' fill='#64748B'>UPI transaction ID: 423456789012</text>
    <text x='50' y='470' font-family='Arial' font-size='16' fill='#64748B'>To: State Bank of India •••• 1234</text>
    <text x='50' y='520' font-family='Arial' font-size='16' fill='#64748B'>From: HDFC Bank •••• 5678</text>
  </svg>`;

  const svgPath = path.join(process.cwd(), 'scripts/temp_individual_gpay.svg');
  const pngPath = path.join(process.cwd(), 'scripts/temp_individual_gpay.png');
  fs.writeFileSync(svgPath, svg);
  execSync(`sips -s format png "${svgPath}" --out "${pngPath}"`, { stdio: 'ignore' });

  const buf = fs.readFileSync(pngPath);
  const blob = new Blob([buf], { type: 'image/png' });
  const form = new FormData();
  form.append('file', blob, 'temp_individual_gpay.png');

  const res = await fetch('http://localhost:3000/api/extract', { method: 'POST', body: form });
  const json = await res.json();

  console.log('HTTP Status:', res.status);
  console.log('Extraction Success:', json.success);
  if (!json.success) {
    console.log('Error message:', json.errorMessage);
    console.log('devDebug:', JSON.stringify(json.devDebug, null, 2));
  }
  console.log('Extracted Transactions:', json.transactions?.length);
  for (const tx of json.transactions || []) {
    const rupees = (Number(tx.amountPaise) / 100).toFixed(2);
    console.log(` • Date: ${tx.date} | Merchant: ${tx.description} | Amount: ₹${rupees} | Type: ${tx.type} | Conf: ${tx.confidence}`);
  }

  // Cleanup
  fs.unlinkSync(svgPath);
  fs.unlinkSync(pngPath);

  if (!json.success || !json.transactions || json.transactions.length !== 1) {
    throw new Error(`Failed: expected exactly 1 transaction, got ${json.transactions?.length}`);
  }

  const tx = json.transactions[0];
  if (!tx.description.toLowerCase().includes('swiggy')) {
    throw new Error(`Expected merchant 'Swiggy', got '${tx.description}'`);
  }
  if (tx.amountPaise !== '54000') {
    throw new Error(`Expected amount ₹540.00 (54000 paise), got ${tx.amountPaise}`);
  }
  if (tx.date !== '2026-08-12') {
    throw new Error(`Expected date '2026-08-12', got '${tx.date}'`);
  }

  console.log('✅ Individual Payment Screen Extraction PASSED with 100% precision!');
}

testIndividualPaymentScreen().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
