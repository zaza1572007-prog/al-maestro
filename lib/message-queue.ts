import { sendWhatsAppMessage } from './whatsapp';

export interface QueuedMessage {
  id: string;
  phone: string;
  message: string;
  attempts: number;
  maxAttempts: number;
  addedAt: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  lastError?: string;
}

class WhatsAppQueue {
  private queue: QueuedMessage[] = [];
  private isProcessing = false;
  private maxRetries = 3;

  /**
   * Enqueue a WhatsApp message to be sent asynchronously in the background.
   */
  public enqueue(phone: string, message: string): string {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const queuedMsg: QueuedMessage = {
      id,
      phone,
      message,
      attempts: 0,
      maxAttempts: this.maxRetries,
      addedAt: Date.now(),
      status: 'PENDING',
    };

    this.queue.push(queuedMsg);

    // Trigger process loop asynchronously (non-blocking)
    setImmediate(() => {
      this.processQueue().catch((err) => console.error('[MESSAGE_QUEUE_ERROR]', err));
    });

    return id;
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const msg = this.queue.find((m) => m.status === 'PENDING');
      if (!msg) break;

      msg.status = 'PROCESSING';
      msg.attempts += 1;

      try {
        const res = await sendWhatsAppMessage(msg.phone, msg.message);
        if (res.success) {
          msg.status = 'COMPLETED';
          // Remove completed message from active queue
          this.queue = this.queue.filter((m) => m.id !== msg.id);
        } else {
          msg.lastError = res.error || 'Failed to send';
          if (msg.attempts >= msg.maxAttempts) {
            msg.status = 'FAILED';
            console.error(`❌ [WhatsApp Queue] Message ${msg.id} failed after ${msg.attempts} attempts: ${msg.lastError}`);
            // Remove failed message after max retries
            this.queue = this.queue.filter((m) => m.id !== msg.id);
          } else {
            msg.status = 'PENDING';
            // Wait 2 seconds before retrying next message
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      } catch (err: any) {
        msg.lastError = err.message;
        msg.status = 'PENDING';
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    this.isProcessing = false;
  }

  public getQueueStats() {
    return {
      totalInQueue: this.queue.length,
      pending: this.queue.filter((m) => m.status === 'PENDING').length,
      processing: this.queue.filter((m) => m.status === 'PROCESSING').length,
    };
  }
}

declare global {
  var __whatsAppQueueInstance: WhatsAppQueue | undefined;
}

export const whatsappQueue = global.__whatsAppQueueInstance ?? new WhatsAppQueue();
if (process.env.NODE_ENV !== 'production') {
  global.__whatsAppQueueInstance = whatsappQueue;
}
