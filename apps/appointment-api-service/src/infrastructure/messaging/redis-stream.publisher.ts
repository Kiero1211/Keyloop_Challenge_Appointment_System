import { IMessagePublisher } from '../../application/ports/message-publisher.port';
import Redis from 'ioredis';
import { StreamPublishException } from '../../domain/exceptions';

export class RedisStreamPublisher implements IMessagePublisher {
  constructor(private readonly redisClient: Redis) {}

  async publish(streamName: string, payload: Record<string, string>): Promise<string> {
    try {
      // Flatten the payload object into an array of strings
      const args: string[] = [];
      for (const [key, value] of Object.entries(payload)) {
        args.push(key, value);
      }

      // XADD streamName * key1 value1 key2 value2 ...
      const messageId = await this.redisClient.xadd(streamName, '*', ...args);
      return messageId as string;
    } catch (error: any) {
      throw new StreamPublishException(`Failed to publish message to ${streamName}: ${error.message}`);
    }
  }
}
