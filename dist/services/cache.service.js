"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
// Cache mặc định lưu trong 5 phút (300 giây)
// checkperiod: Mỗi 1 phút dọn rác các key hết hạn
const appCache = new node_cache_1.default({ stdTTL: 300, checkperiod: 60 });
exports.cacheService = {
    get: (key) => {
        return appCache.get(key);
    },
    set: (key, value, ttlSeconds) => {
        if (ttlSeconds) {
            return appCache.set(key, value, ttlSeconds);
        }
        return appCache.set(key, value);
    },
    del: (key) => {
        appCache.del(key);
    },
    flush: () => {
        appCache.flushAll();
    }
};
