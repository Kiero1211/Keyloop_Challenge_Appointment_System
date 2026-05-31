import { IMessagePublisher } from '@/application/ports/message-publisher.port';
import Redis from 'ioredis';
import { StreamPublishException } from '@/domain/exceptions';

export class RedisStreamPublisher implements IMessagePublisher {
  constructor(private readonly redisClient: Redis) {}

  async publish(streamName: string, payload: Record<string, any>): Promise<string> {
    try {
      const jsonPayload = JSON.stringify(payload);
      // XADD streamName * payload "{...}"
      const messageId = await this.redisClient.xadd(streamName, '*', 'payload', jsonPayload);
      return messageId as string;
    } catch (error: any) {
      throw new StreamPublishException(`Failed to publish message to ${streamName}: ${error.message}`);
    }
  }
}
