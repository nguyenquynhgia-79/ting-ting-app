import NodeCache from 'node-cache';

// Cache mặc định lưu trong 5 phút (300 giây)
// checkperiod: Mỗi 1 phút dọn rác các key hết hạn
const appCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export const cacheService = {
  get: <T>(key: string): T | undefined => {
    return appCache.get<T>(key);
  },

  set: <T>(key: string, value: T, ttlSeconds?: number): boolean => {
    if (ttlSeconds) {
      return appCache.set(key, value, ttlSeconds);
    }
    return appCache.set(key, value);
  },

  del: (key: string | string[]): void => {
    appCache.del(key);
  },

  flush: (): void => {
    appCache.flushAll();
  }
};
