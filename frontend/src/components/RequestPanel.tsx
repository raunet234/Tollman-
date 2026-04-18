import { useState } from 'react';
import type { RequestConfig, WalletInfo } from '../types';
import WalletCard from './WalletCard';

interface RequestPanelProps {
  onRun: (config: RequestConfig) => void;
  isRunning: boolean;
  walletInfo: WalletInfo | null;
  onRefreshWallet: () => void;
}

const METHODS = [
  { name: 'GET', color: '#22c55e' },
  { name: 'POST', color: '#f59e0b' },
  { name: 'PUT', color: '#3b82f6' },
];

const DEMOS = [
  { label: 'demo/ping', url: 'http://localhost:3001/demo/ping' },
  { label: 'demo/echo', url: 'http://localhost:3001/demo/echo?text=hello' },
];

export default function RequestPanel({ onRun, isRunning, walletInfo, onRefreshWallet }: RequestPanelProps) {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState([{ key: '', value: '' }]);
  const [body, setBody] = useState('');
  const [showHeaders, setShowHeaders] = useState(false);
  const [showBody, setShowBody] = useState(false);

  const handleHeaderChange = (index: number, field: 'key' | 'value', val: string) => {
    const next = [...headers];
    next[index] = { ...next[index], [field]: val };
    if (index === next.length - 1 && (next[index].key || next[index].value)) {
      next.push({ key: '', value: '' });
    }
    setHeaders(next);
  };

  const removeHeader = (index: number) => {
    const next = headers.filter((_, i) => i !== index);
    setHeaders(next.length ? next : [{ key: '', value: '' }]);
  };

  const handleRun = () => {
    const activeHeaders: Record<string, string> = {};
    headers.forEach(({ key, value }) => {
      if (key.trim()) activeHeaders[key.trim()] = value;
    });
    onRun({ url, method, headers: activeHeaders, body });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 12, overflow: 'hidden' }}>
      {/* Method toggles */}
      <div style={{ display: 'flex', gap: 6 }}>
        {METHODS.map(m => (
          <button
            key={m.name}
            onClick={() => setMethod(m.name)}
            style={{
              padding: '5px 10px', borderRadius: 6, border: '1px solid',
              borderColor: method === m.name ? m.color : '#2a2a2a',
              background: method === m.name ? `${m.color}1a` : 'transparent',
              color: method === m.name ? m.color : '#71717a',
              cursor: 'pointer', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em',
            }}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* URL input */}
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !isRunning && url && handleRun()}
        placeholder="https://api.example.com/endpoint"
        style={{
          width: '100%', padding: '8px 12px', background: '#0f0f0f', border: '1px solid #2a2a2a',
          borderRadius: 6, color: '#f5f5f5', fontSize: 12,
          fontFamily: 'JetBrains Mono, monospace', outline: 'none', boxSizing: 'border-box',
        }}
      />

      {/* Demo shortcuts */}
      <div style={{ display: 'flex', gap: 6 }}>
        {DEMOS.map(d => (
          <button
            key={d.url}
            onClick={() => setUrl(d.url)}
            style={{
              padding: '3px 8px', background: 'transparent', border: '1px solid #2a2a2a',
              borderRadius: 4, color: '#71717a', cursor: 'pointer', fontSize: 11,
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Headers */}
      <div>
        <button
          onClick={() => setShowHeaders(!showHeaders)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', fontSize: 12, padding: 0 }}
        >
          {showHeaders ? '▾' : '▸'} Headers
        </button>
        {showHeaders && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {headers.map((h, i) => (
              <div key={i} style={{ display: 'flex', gap: 4 }}>
                <input
                  value={h.key}
                  onChange={e => handleHeaderChange(i, 'key', e.target.value)}
                  placeholder="Key"
                  style={{ flex: 1, padding: '5px 8px', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 4, color: '#f5f5f5', fontSize: 12, outline: 'none' }}
                />
                <input
                  value={h.value}
                  onChange={e => handleHeaderChange(i, 'value', e.target.value)}
                  placeholder="Value"
                  style={{ flex: 2, padding: '5px 8px', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 4, color: '#f5f5f5', fontSize: 12, outline: 'none' }}
                />
                {headers.length > 1 && (
                  <button
                    onClick={() => removeHeader(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', fontSize: 14, padding: '0 4px' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Body (POST/PUT only) */}
      {(method === 'POST' || method === 'PUT') && (
        <div>
          <button
            onClick={() => setShowBody(!showBody)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', fontSize: 12, padding: 0 }}
          >
            {showBody ? '▾' : '▸'} Body (JSON)
          </button>
          {showBody && (
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder='{"key": "value"}'
              rows={5}
              style={{
                display: 'block', width: '100%', marginTop: 8, padding: 8,
                background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 6,
                color: '#f5f5f5', fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              }}
            />
          )}
        </div>
      )}

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={!url || isRunning}
        style={{
          padding: '10px', background: isRunning ? '#4338ca' : '#6366f1',
          border: 'none', borderRadius: 6, color: '#fff',
          cursor: !url || isRunning ? 'not-allowed' : 'pointer',
          fontSize: 13, fontWeight: 600, opacity: !url || isRunning ? 0.7 : 1,
        }}
      >
        {isRunning ? '⟳ Running…' : '▶ Run'}
      </button>

      {/* WalletCard pinned to bottom */}
      <div style={{ marginTop: 'auto' }}>
        <WalletCard walletInfo={walletInfo} onRefresh={onRefreshWallet} />
      </div>
    </div>
  );
}
