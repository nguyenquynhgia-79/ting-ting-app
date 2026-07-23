"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrypt = exports.encrypt = void 0;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const getSecretKey = () => {
    if (ENCRYPTION_KEY && Buffer.from(ENCRYPTION_KEY, 'hex').length === 32) {
        return Buffer.from(ENCRYPTION_KEY, 'hex');
    }
    return crypto_1.default.scryptSync('development-encryption-key-fallback', 'salt', 32);
};
const encrypt = (text) => {
    if (!text)
        return text;
    try {
        const iv = crypto_1.default.randomBytes(12);
        const cipher = crypto_1.default.createCipheriv(ALGORITHM, getSecretKey(), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${encrypted}:${authTag}`;
    }
    catch (error) {
        console.error('Encryption error:', error);
        return text;
    }
};
exports.encrypt = encrypt;
const decrypt = (encryptedText) => {
    if (!encryptedText || !encryptedText.includes(':'))
        return encryptedText;
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3)
            return encryptedText;
        const [ivHex, encryptedHex, authTagHex] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, getSecretKey(), iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        console.error('Decryption error:', error);
        return '***DECRYPTION_FAILED***';
    }
};
exports.decrypt = decrypt;
