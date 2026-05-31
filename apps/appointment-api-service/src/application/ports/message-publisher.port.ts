export interface IMessagePublisher {
  publish(streamName: string, payload: Record<string, any>): Promise<string>;
}
