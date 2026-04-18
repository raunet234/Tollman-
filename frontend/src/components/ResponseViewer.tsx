import { useState } from 'react';
import type { RunEvent } from '../types';

interface ResponseViewerProps {
  events: RunEvent[];
}

export default function ResponseViewer({ events }: ResponseViewerProps) {
  const [tab, setTab] = useState<'body' | 'headers'>('body');

  const finalEvent = [...events].reverse().find(e => e.step === 'SUCCESS' || e.step === 'ERROR');
  if (!finalEvent) return null;

  const data = finalEvent.data ?? {};
  const isError = finalEvent.step === 'ERROR';
  const statusColor = isError ? '#ef4444' : '#22c55e';

  let bodyStr = '';
  if (data.body !== undefined) {
    bodyStr = typeof data.body === 'string' ? data.body : JSON.stringify(data.body, null, 2);
    try { bodyStr = JSON.stringify(JSON.parse(bodyStr), null, 2); } catch { /* not JSON */ }
  } else {
    bodyStr = finalEvent.message;
  }

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderBottom: '1px solid #2a2a2a' }}>
        <span style={{ color: statusColor, fontSize: 12, fontWeight: 600 }}>
          {isError ? '✖ Error' : '✔ Success'}
        </span>
        {data.statusCode && (
          <span style={{ color: '#71717a', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
            HTTP {data.statusCode}
          </span>
        )}
        {data.txHash && (
          <span style={{ color: '#71717a', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', marginLeft: 'auto' }}>
            tx: {String(data.txHash).slice(0, 12)}…
          </span>
        )}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a' }}>
        {(['body', 'headers'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 14px', background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid #6366f1' : '2px solid transparent',
              color: tab === t ? '#f5f5f5' : '#71717a', cursor: 'pointer', fontSize: 12,
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <pre
        style={{
          margin: 0, padding: 12, background: '#0f0f0f',
          color: '#f5f5f5', fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
          overflow: 'auto', maxHeight: 280, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
        }}
      >
        {tab === 'body'
          ? bodyStr
          : data.headers
            ? JSON.stringify(data.headers, null, 2)
            : '(no headers captured)'}
      </pre>
    </div>
  );
}
