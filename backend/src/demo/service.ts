import { Router, Request, Response } from 'express';
import * as StellarSdk from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();

const USDC_ISSUER = process.env.USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const USDC_ASSET = new StellarSdk.Asset('USDC', USDC_ISSUER);
const PAYMENT_AMOUNT = '0.001';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);

const DEMO_KEYPAIR = StellarSdk.Keypair.random();
console.log(`Demo service receiving wallet: ${DEMO_KEYPAIR.publicKey()}`);

async function setupDemoWallet(): Promise<void> {
  try {
    // Fund via Friendbot
    console.log('Funding demo wallet via Friendbot...');
    const resp = await fetch(`https://friendbot.stellar.org/?addr=${DEMO_KEYPAIR.publicKey()}`);
    if (!resp.ok) throw new Error(`Friendbot failed: ${resp.status}`);
    console.log('Demo wallet funded.');

    // Set up USDC trustline
    const account = await horizon.loadAccount(DEMO_KEYPAIR.publicKey());
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.changeTrust({ asset: USDC_ASSET }))
      .setTimeout(30)
      .build();
    tx.sign(DEMO_KEYPAIR);
    await horizon.submitTransaction(tx);
    console.log('Demo wallet USDC trustline established.');
  } catch (e: any) {
    console.warn('Demo wallet setup failed (payments may fail):', e?.message);
  }
}

setupDemoWallet();

function buildPaymentDetails(resource: string, description: string) {
  const details = {
    scheme: 'exact',
    network: 'stellar-testnet',
    maxAmountRequired: PAYMENT_AMOUNT,
    resource,
    description,
    mimeType: 'application/json',
    payTo: DEMO_KEYPAIR.publicKey(),
    requiredDeadlineSeconds: 60,
    facilitatorUrl: '',
    usdcIssuer: USDC_ISSUER,
  };
  return Buffer.from(JSON.stringify(details)).toString('base64');
}

function validateReceipt(receiptHeader: string): boolean {
  try {
    const decoded = Buffer.from(receiptHeader, 'base64').toString('utf-8');
    const receipt = JSON.parse(decoded);
    // Basic validation: check required fields exist
    return !!(receipt.txHash && receipt.from && receipt.amount);
  } catch {
    return false;
  }
}

// GET /demo/ping — returns { pong: true, timestamp } after x402 payment
router.get('/ping', (req: Request, res: Response) => {
  const receipt = req.headers['x-payment-receipt'] as string;
  if (!receipt || !validateReceipt(receipt)) {
    res.setHeader('X-Payment-Details', buildPaymentDetails('/demo/ping', 'Demo x402 ping endpoint — 0.001 USDC'));
    res.status(402).json({ error: 'Payment required' });
    return;
  }
  res.json({ pong: true, timestamp: new Date().toISOString(), paid: true });
});

// GET /demo/echo?text=hello — echoes text after x402 payment
router.get('/echo', (req: Request, res: Response) => {
  const receipt = req.headers['x-payment-receipt'] as string;
  if (!receipt || !validateReceipt(receipt)) {
    res.setHeader('X-Payment-Details', buildPaymentDetails('/demo/echo', 'Demo x402 echo endpoint — 0.001 USDC'));
    res.status(402).json({ error: 'Payment required' });
    return;
  }
  const text = (req.query.text as string) || '';
  res.json({ echo: text, timestamp: new Date().toISOString(), paid: true });
});

export default router;
