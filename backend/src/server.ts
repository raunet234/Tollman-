import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import testRouter from './routes/test';
import walletRouter from './routes/wallet';
import demoRouter from './demo/service';
import { setIO } from './agent/runner';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Routes
app.use('/api', testRouter);
app.use('/api', walletRouter);
app.use('/demo', demoRouter);

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Socket.io namespace for run events
const runEvents = io.of('/run-events');
runEvents.on('connection', (socket) => {
  socket.on('join', (runId: string) => {
    socket.join(runId);
  });
});

setIO(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`TOLLMAN backend running on http://localhost:${PORT}`);
  console.log(`Demo x402 endpoints:`);
  console.log(`  GET http://localhost:${PORT}/demo/ping`);
  console.log(`  GET http://localhost:${PORT}/demo/echo?text=hello`);
});
