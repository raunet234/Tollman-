import { Router, Request, Response } from 'express';
import { getPublicKey, getBalance, getExplorerUrl } from '../agent/wallet';

const router = Router();

router.get('/wallet', async (_req: Request, res: Response) => {
  try {
    const balance = await getBalance();
    res.json({
      publicKey: getPublicKey(),
      xlmBalance: balance.xlm,
      usdcBalance: balance.usdc,
      explorerUrl: getExplorerUrl(),
      friendbotUrl: `https://friendbot.stellar.org/?addr=${getPublicKey()}`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
