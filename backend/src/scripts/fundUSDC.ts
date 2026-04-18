import * as StellarSdk from '@stellar/stellar-sdk';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = process.env.USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const server = new StellarSdk.Horizon.Server(HORIZON_URL);
const usdcAsset = new StellarSdk.Asset('USDC', USDC_ISSUER);

async function main() {
  const secret = process.env.AGENT_SECRET_KEY;
  if (!secret?.trim()) throw new Error('AGENT_SECRET_KEY not set in .env');

  const keypair = StellarSdk.Keypair.fromSecret(secret.trim());
  const pub = keypair.publicKey();
  console.log(`Wallet: ${pub}`);

  // 1. Fund XLM via Friendbot
  try {
    await axios.get(`https://friendbot.stellar.org/?addr=${pub}`);
    console.log('✓ XLM funded via Friendbot');
  } catch (e: any) {
    const detail = e?.response?.data?.detail ?? '';
    if (detail.includes('already funded') || e?.response?.status === 400) {
      console.log('· XLM already funded');
    } else {
      console.error('Friendbot error:', e?.response?.data ?? e.message);
    }
  }

  const account = await server.loadAccount(pub);

  // 2. Add USDC trustline if missing
  const hasTrustline = account.balances.some(
    (b: any) => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER
  );

  if (!hasTrustline) {
    console.log('Setting up USDC trustline...');
    const trustTx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(StellarSdk.Operation.changeTrust({ asset: usdcAsset }))
      .setTimeout(30)
      .build();
    trustTx.sign(keypair);
    await server.submitTransaction(trustTx);
    console.log('✓ USDC trustline established');
  } else {
    console.log('· USDC trustline already exists');
  }

  // 3. Swap XLM → USDC via DEX (pathPaymentStrictReceive)
  const freshAccount = await server.loadAccount(pub);
  const xlmBal = (freshAccount.balances.find((b: any) => b.asset_type === 'native') as any)?.balance ?? '0';
  console.log(`XLM balance: ${xlmBal}`);

  console.log('Swapping XLM → 10 USDC via testnet DEX...');
  try {
    const swapTx = new StellarSdk.TransactionBuilder(freshAccount, {
      fee: (parseInt(StellarSdk.BASE_FEE) * 10).toString(),
      networkPassphrase: StellarSdk.Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.pathPaymentStrictReceive({
          sendAsset: StellarSdk.Asset.native(),
          sendMax: '200',       // spend up to 200 XLM
          destination: pub,
          destAsset: usdcAsset,
          destAmount: '10',    // receive exactly 10 USDC
          path: [],
        })
      )
      .setTimeout(30)
      .build();
    swapTx.sign(keypair);
    const result = await server.submitTransaction(swapTx);
    console.log(`✓ Swap success! tx: ${result.hash}`);
  } catch (e: any) {
    const codes = e?.response?.data?.extras?.result_codes;
    console.error('✖ Swap failed:', codes ?? e.message);
    console.log('');
    console.log('No DEX liquidity for XLM→USDC on testnet.');
    console.log('Manual options:');
    console.log('  1. Circle testnet faucet: https://faucet.circle.com');
    console.log('  2. Stellar Lab: https://laboratory.stellar.org/#account-creator?network=test');
    console.log(`  3. Stellar Expert: https://stellar.expert/explorer/testnet/account/${pub}`);
  }

  // 4. Print final balances
  console.log('\nFinal balances:');
  const finalAccount = await server.loadAccount(pub);
  for (const b of finalAccount.balances) {
    if (b.asset_type === 'native') console.log(`  XLM:  ${b.balance}`);
    if ((b as any).asset_code === 'USDC') console.log(`  USDC: ${b.balance}`);
  }
}

main().catch(err => {
  console.error(err.message ?? err);
  process.exit(1);
});
