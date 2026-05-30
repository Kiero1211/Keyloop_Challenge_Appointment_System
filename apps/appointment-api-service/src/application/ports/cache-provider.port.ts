export interface ICacheProvider {
  exists(key: string): Promise<boolean>;
  hset(key: string, fields: Record<string, string>): Promise<void>;
  hgetall(key: string): Promise<Record<string, string> | null>;
  del(key: string): Promise<void>;
  ping(): Promise<boolean>;
}
