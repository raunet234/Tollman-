import { useEffect, useRef } from 'react';
import type { RunEvent } from '../types';

interface EventTimelineProps {
  events: RunEvent[];
}

const STATUS_COLORS: Record<string, string> = {
  success: '#22c55e',
  error: '#ef4444',
  running: '#6366f1',
  info: '#3b82f6',
  pending: '#71717a',
};

const STEP_ICONS: Record<string, string> = {
  INIT: '◎',
  REQUEST_SENT: '→',
  GOT_402: '⚡',
  PAYMENT_CONSTRUCTED: '⬡',
  PAYMENT_SUBMITTED: '↑',
  PAYMENT_CONFIRMED: '✓',
  RETRY_SENT: '↺',
  SUCCESS: '✔',
  ERROR: '✖',
};

export default function EventTimeline({ events }: EventTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  if (events.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#71717a', fontSize: 13 }}>
        Hit Run to start a request
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {events.map((event, i) => {
        const color = STATUS_COLORS[event.status] ?? '#71717a';
        const icon = STEP_ICONS[event.step] ?? '•';
        return (
          <div
            key={i}
            style={{
              display: 'flex', gap: 10, padding: '8px 12px',
              background: '#1a1a1a', borderRadius: 6, borderLeft: `3px solid ${color}`,
            }}
          >
            <span style={{ color, fontFamily: 'JetBrains Mono, monospace', fontSize: 14, minWidth: 16, lineHeight: '18px' }}>
              {icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                <span style={{ color, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {event.step}
                </span>
                <span style={{ color: '#71717a', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p style={{ margin: 0, color: '#f5f5f5', fontSize: 12 }}>{event.message}</p>
              {event.data && Object.keys(event.data).length > 0 && (
                <pre
                  style={{
                    margin: '6px 0 0', padding: '6px 8px', background: '#0f0f0f',
                    borderRadius: 4, color: '#71717a', fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace', overflow: 'auto',
                    maxHeight: 120, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                  }}
                >
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
