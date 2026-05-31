export interface ICacheProvider {
  exists(key: string): Promise<boolean>;
  get(key: string): Promise<string | null>;
  hset(key: string, fields: Record<string, string>): Promise<void>;
  hgetall(key: string): Promise<Record<string, string> | null>;
  del(key: string): Promise<void>;
  deleteMultiple(keys: string[]): Promise<void>;
  ping(): Promise<boolean>;
  setMultipleIfNotExists(items: { key: string; value: string }[], ttlSeconds: number): Promise<boolean>;
}
