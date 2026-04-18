import type { WalletInfo } from '../types';

interface WalletCardProps {
  walletInfo: WalletInfo | null;
  onRefresh: () => void;
}

function truncate(key: string) {
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export default function WalletCard({ walletInfo, onRefresh }: WalletCardProps) {
  if (!walletInfo) {
    return (
      <div style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, padding: 12 }}>
        <div style={{ height: 11, background: '#2a2a2a', borderRadius: 4, marginBottom: 8, width: '55%' }} />
        <div style={{ height: 10, background: '#2a2a2a', borderRadius: 4, marginBottom: 6, width: '80%' }} />
        <div style={{ height: 10, background: '#2a2a2a', borderRadius: 4, width: '45%' }} />
      </div>
    );
  }

  return (
    <div style={{ background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 8, padding: 12, fontSize: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: '#71717a', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Agent Wallet
        </span>
        <button
          onClick={onRefresh}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', fontSize: 14, padding: 0, lineHeight: 1 }}
        >
          ↻
        </button>
      </div>
      <div style={{ marginBottom: 10 }}>
        <a
          href={walletInfo.explorerUrl}
          target="_blank"
          rel="noreferrer"
          style={{ color: '#6366f1', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
        >
          {truncate(walletInfo.publicKey)}
        </a>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
        <div>
          <span style={{ color: '#71717a', fontSize: 10 }}>USDC </span>
          <span style={{ color: '#f5f5f5', fontFamily: 'JetBrains Mono, monospace' }}>{walletInfo.usdcBalance}</span>
        </div>
        <div>
          <span style={{ color: '#71717a', fontSize: 10 }}>XLM </span>
          <span style={{ color: '#f5f5f5', fontFamily: 'JetBrains Mono, monospace' }}>{walletInfo.xlmBalance}</span>
        </div>
      </div>
      <a
        href={walletInfo.friendbotUrl}
        target="_blank"
        rel="noreferrer"
        style={{ color: '#22c55e', fontSize: 11 }}
      >
        Fund via Friendbot ↗
      </a>
    </div>
  );
}
