import axios from 'axios';
import { Server as SocketIOServer } from 'socket.io';
import {
  getPublicKey,
  sendPayment,
  ensureTrustline,
} from './wallet';

export interface RunParams {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface RunEvent {
  runId: string;
  step: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'info';
  message: string;
  data?: Record<string, any>;
  timestamp: string;
}

export interface PaymentDetails {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description?: string;
  mimeType?: string;
  payTo: string;
  requiredDeadlineSeconds?: number;
  facilitatorUrl?: string;
}

let io: SocketIOServer;

export function setIO(socketIO: SocketIOServer) {
  io = socketIO;
}

function emit(runId: string, event: Omit<RunEvent, 'runId' | 'timestamp'>) {
  const fullEvent: RunEvent = {
    runId,
    timestamp: new Date().toISOString(),
    ...event,
  };
  io.of('/run-events').to(runId).emit('event', fullEvent);
}

export async function runAgent(runId: string, params: RunParams): Promise<void> {
  const { url, method, headers, body } = params;

  try {
    // Step 1: INIT
    emit(runId, {
      step: 'INIT',
      status: 'running',
      message: `Agent initialized. Wallet: ${getPublicKey().slice(0, 8)}...${getPublicKey().slice(-4)}`,
      data: { publicKey: getPublicKey() },
    });

    // Ensure USDC trustline exists
    try {
      await ensureTrustline();
    } catch (e: any) {
      // Non-fatal — account might not be funded yet
      emit(runId, {
        step: 'INIT',
        status: 'info',
        message: `Note: Could not verify USDC trustline (${e?.message || 'account may be unfunded'})`,
      });
    }

    // Step 2: REQUEST_SENT
    emit(runId, {
      step: 'REQUEST_SENT',
      status: 'running',
      message: `Sending ${method} request to ${url}`,
      data: { method, url },
    });

    let response402: any;
    try {
      const reqConfig: any = {
        method: method.toLowerCase(),
        url,
        headers: { ...headers },
        validateStatus: () => true,
      };
      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        reqConfig.data = JSON.parse(body);
        reqConfig.headers['Content-Type'] = 'application/json';
      }
      response402 = await axios(reqConfig);
    } catch (e: any) {
      throw new Error(`Failed to reach endpoint: ${e.message}`);
    }

    if (response402.status !== 402) {
      emit(runId, {
        step: 'SUCCESS',
        status: 'success',
        message: `Endpoint responded with ${response402.status} (no payment required)`,
        data: {
          statusCode: response402.status,
          responseBody: response402.data,
          responseHeaders: response402.headers,
          totalTimeMs: 0,
          note: 'Endpoint did not return 402 — no payment needed',
        },
      });
      return;
    }

    // Step 3: GOT_402
    const rawPaymentDetails =
      response402.headers['x-payment-details'] ||
      response402.headers['X-Payment-Details'];

    if (!rawPaymentDetails) {
      throw new Error('Received 402 but no X-Payment-Details header found');
    }

    let paymentDetails: PaymentDetails;
    try {
      const decoded = Buffer.from(rawPaymentDetails, 'base64').toString('utf-8');
      paymentDetails = JSON.parse(decoded);
    } catch (e) {
      throw new Error('Failed to decode X-Payment-Details header');
    }

    emit(runId, {
      step: 'GOT_402',
      status: 'running',
      message: 'Received 402 Payment Required',
      data: { paymentDetails },
    });

    // Step 4: PAYMENT_CONSTRUCTED
    const amount = paymentDetails.maxAmountRequired || '0.001';
    const destination = paymentDetails.payTo;

    if (!destination) {
      throw new Error('Payment details missing payTo field');
    }

    emit(runId, {
      step: 'PAYMENT_CONSTRUCTED',
      status: 'running',
      message: `Constructing USDC payment: ${amount} USDC → ${destination.slice(0, 8)}...`,
      data: {
        amount,
        asset: 'USDC',
        destination,
        network: paymentDetails.network || 'stellar-testnet',
      },
    });

    const startTime = Date.now();

    // Step 5: PAYMENT_SUBMITTED
    let txHash: string;
    try {
      txHash = await sendPayment(destination, amount);
    } catch (e: any) {
      const resultCodes = e?.response?.data?.extras?.result_codes;
      const detail = resultCodes
        ? `result_codes: ${JSON.stringify(resultCodes)}`
        : e.message || JSON.stringify(e);
      throw new Error(`Stellar payment failed: ${detail}`);
    }

    const explorerUrl = `https://stellar.expert/explorer/testnet/tx/${txHash}`;

    emit(runId, {
      step: 'PAYMENT_SUBMITTED',
      status: 'running',
      message: 'Transaction submitted to Stellar testnet',
      data: { txHash, explorerUrl },
    });

    // Step 6: PAYMENT_CONFIRMED
    emit(runId, {
      step: 'PAYMENT_CONFIRMED',
      status: 'running',
      message: 'Payment confirmed on-chain',
      data: { txHash, explorerUrl },
    });

    // Build receipt
    const receipt = {
      txHash,
      network: 'stellar-testnet',
      from: getPublicKey(),
      to: destination,
      amount,
      asset: `USDC:${process.env.USDC_ISSUER}`,
      timestamp: new Date().toISOString(),
      resource: paymentDetails.resource || url,
    };
    const encodedReceipt = Buffer.from(JSON.stringify(receipt)).toString('base64');

    // Step 7: RETRY_SENT
    emit(runId, {
      step: 'RETRY_SENT',
      status: 'running',
      message: 'Retrying request with payment receipt',
      data: { txHash },
    });

    let finalResponse: any;
    try {
      const reqConfig: any = {
        method: method.toLowerCase(),
        url,
        headers: {
          ...headers,
          'X-Payment-Receipt': encodedReceipt,
        },
        validateStatus: () => true,
      };
      if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        reqConfig.data = JSON.parse(body);
        reqConfig.headers['Content-Type'] = 'application/json';
      }
      finalResponse = await axios(reqConfig);
    } catch (e: any) {
      throw new Error(`Failed to retry request: ${e.message}`);
    }

    const totalTimeMs = Date.now() - startTime;

    if (finalResponse.status >= 200 && finalResponse.status < 300) {
      // Step 8: SUCCESS
      emit(runId, {
        step: 'SUCCESS',
        status: 'success',
        message: `API responded successfully (${finalResponse.status})`,
        data: {
          statusCode: finalResponse.status,
          responseBody: finalResponse.data,
          responseHeaders: finalResponse.headers,
          totalTimeMs,
          txHash,
          explorerUrl,
        },
      });
    } else {
      emit(runId, {
        step: 'ERROR',
        status: 'error',
        message: `API returned ${finalResponse.status} after payment`,
        data: {
          statusCode: finalResponse.status,
          responseBody: finalResponse.data,
          totalTimeMs,
          txHash,
          explorerUrl,
        },
      });
    }
  } catch (e: any) {
    emit(runId, {
      step: 'ERROR',
      status: 'error',
      message: e.message || 'Unknown error',
      data: { error: e.message },
    });
  }
}
