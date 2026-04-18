import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import RequestPanel from './components/RequestPanel';
import EventTimeline from './components/EventTimeline';
import ResponseViewer from './components/ResponseViewer';
import type { RunEvent, WalletInfo, RequestConfig } from './types';

const BACKEND = 'http://localhost:3001';

export default function App() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io(`${BACKEND}/run-events`);
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/wallet`);
      if (res.ok) setWalletInfo(await res.json());
    } catch { /* backend not up yet */ }
  };

  useEffect(() => { fetchWallet(); }, []);

  const handleRun = async (config: RequestConfig) => {
    setEvents([]);
    setIsRunning(true);

    try {
      const res = await fetch(`${BACKEND}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const { runId } = await res.json();

      socket?.emit('join', runId);
      socket?.off('event');
      socket?.on('event', (evt: RunEvent) => {
        setEvents(prev => [...prev, evt]);
        if (evt.step === 'SUCCESS' || evt.step === 'ERROR') {
          setIsRunning(false);
          fetchWallet();
        }
      });
    } catch {
      setIsRunning(false);
    }
  };

  const hasResult = events.some(e => e.step === 'SUCCESS' || e.step === 'ERROR');

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Left panel */}
      <div style={{
        width: 340, minWidth: 340, background: '#1a1a1a', borderRight: '1px solid #2a2a2a',
        padding: 16, display: 'flex', flexDirection: 'column', overflow: 'auto',
      }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#6366f1', letterSpacing: '-0.02em' }}>
            TOLLMAN
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#71717a' }}>x402 Payment Agent</p>
        </div>
        <RequestPanel
          onRun={handleRun}
          isRunning={isRunning}
          walletInfo={walletInfo}
          onRefreshWallet={fetchWallet}
        />
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f0f0f' }}>
        {/* Header */}
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid #2a2a2a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Event Stream
          </span>
          {events.length > 0 && (
            <button
              onClick={() => setEvents([])}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', fontSize: 11 }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Timeline */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <EventTimeline events={events} />
        </div>

        {/* Response viewer */}
        {hasResult && (
          <div style={{ padding: 16, borderTop: '1px solid #2a2a2a', flexShrink: 0 }}>
            <ResponseViewer events={events} />
          </div>
        )}
      </div>
    </div>
  );
}
