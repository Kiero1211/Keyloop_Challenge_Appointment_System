export interface ICacheProvider {
  exists(key: string): Promise<boolean>;
  get(key: string): Promise<string | null>;
  hset(key: string, fields: Record<string, string>, ttlSeconds?: number): Promise<void>;
  hgetall(key: string): Promise<Record<string, string> | null>;
  expire(key: string, seconds: number): Promise<boolean>;
  del(key: string): Promise<void>;
  deleteMultiple(keys: string[]): Promise<void>;
  ping(): Promise<boolean>;
  setMultipleIfNotExists(items: { key: string; value: string }[], ttlSeconds: number): Promise<boolean>;
}
