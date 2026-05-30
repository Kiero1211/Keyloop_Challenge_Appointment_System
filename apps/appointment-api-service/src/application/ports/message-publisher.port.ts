export interface IMessagePublisher {
  publish(streamName: string, payload: Record<string, string>): Promise<string>;
}
