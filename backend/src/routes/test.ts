import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runAgent } from '../agent/runner';

const router = Router();
const runs: Map<string, any> = new Map();

router.post('/test', async (req: Request, res: Response) => {
  const { url, method = 'GET', headers = {}, body } = req.body;
  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }
  const runId = uuidv4();
  runs.set(runId, { status: 'running', startedAt: new Date().toISOString() });

  // Start agent in background
  runAgent(runId, { url, method, headers, body }).then(() => {
    runs.set(runId, { status: 'complete', completedAt: new Date().toISOString() });
  }).catch((err) => {
    runs.set(runId, { status: 'error', error: err.message });
  });

  res.json({ runId });
});

router.get('/status/:runId', (req: Request, res: Response) => {
  const run = runs.get(req.params.runId as string);
  if (!run) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  res.json(run);
});

export default router;
