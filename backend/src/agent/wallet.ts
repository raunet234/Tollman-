import * as StellarSdk from '@stellar/stellar-sdk';
import dotenv from 'dotenv';
dotenv.config();

const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = process.env.USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const USDC_ASSET_CODE = process.env.USDC_ASSET_CODE || 'USDC';

const server = new StellarSdk.Horizon.Server(HORIZON_URL);
const usdcAsset = new StellarSdk.Asset(USDC_ASSET_CODE, USDC_ISSUER);

let keypair: StellarSdk.Keypair;

function loadOrCreateKeypair(): StellarSdk.Keypair {
  const secret = process.env.AGENT_SECRET_KEY;
  if (secret && secret.trim() !== '') {
    try {
      return StellarSdk.Keypair.fromSecret(secret.trim());
    } catch (e) {
      console.warn('Invalid AGENT_SECRET_KEY, generating new keypair...');
    }
  }
  const newKeypair = StellarSdk.Keypair.random();
  console.log('⚠️  No AGENT_SECRET_KEY set. Generated new keypair:');
  console.log(`   Public Key: ${newKeypair.publicKey()}`);
  console.log(`   Secret Key: ${newKeypair.secret()}`);
  console.log('   Fund with Friendbot: https://friendbot.stellar.org/?addr=' + newKeypair.publicKey());
  return newKeypair;
}

keypair = loadOrCreateKeypair();

export function getPublicKey(): string {
  return keypair.publicKey();
}

export function getKeypair(): StellarSdk.Keypair {
  return keypair;
}

export function getExplorerUrl(): string {
  return `https://stellar.expert/explorer/testnet/account/${keypair.publicKey()}`;
}

export async function getBalance(): Promise<{ xlm: string; usdc: string }> {
  try {
    const account = await server.loadAccount(keypair.publicKey());
    let xlm = '0';
    let usdc = '0';
    for (const balance of account.balances) {
      if (balance.asset_type === 'native') {
        xlm = parseFloat(balance.balance).toFixed(4);
      } else if (
        balance.asset_type === 'credit_alphanum4' &&
        (balance as any).asset_code === USDC_ASSET_CODE &&
        (balance as any).asset_issuer === USDC_ISSUER
      ) {
        usdc = parseFloat(balance.balance).toFixed(4);
      }
    }
    return { xlm, usdc };
  } catch (e: any) {
    if (e?.response?.status === 404) {
      return { xlm: '0 (unfunded)', usdc: '0' };
    }
    throw e;
  }
}

export async function ensureTrustline(): Promise<void> {
  const account = await server.loadAccount(keypair.publicKey());
  const hasTrustline = account.balances.some(
    (b: any) => b.asset_code === USDC_ASSET_CODE && b.asset_issuer === USDC_ISSUER
  );
  if (hasTrustline) return;

  console.log('Setting up USDC trustline...');
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.changeTrust({ asset: usdcAsset }))
    .setTimeout(30)
    .build();
  tx.sign(keypair);
  await server.submitTransaction(tx);
  console.log('USDC trustline established.');
}

export async function sendPayment(destination: string, amount: string): Promise<string> {
  const account = await server.loadAccount(keypair.publicKey());
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination,
        asset: usdcAsset,
        amount,
      })
    )
    .setTimeout(30)
    .build();
  tx.sign(keypair);
  const result = await server.submitTransaction(tx);
  return result.hash;
}

export { usdcAsset, server };
