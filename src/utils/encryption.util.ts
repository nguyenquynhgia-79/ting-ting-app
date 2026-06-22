import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

const getSecretKey = () => {
    if (ENCRYPTION_KEY && Buffer.from(ENCRYPTION_KEY, 'hex').length === 32) {
        return Buffer.from(ENCRYPTION_KEY, 'hex');
    }
    return crypto.scryptSync('development-encryption-key-fallback', 'salt', 32);
};

export const encrypt = (text: string | null | undefined): string | null => {
    if (!text) return text as any;
    
    try {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(), iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag().toString('hex');
        
        return `${iv.toString('hex')}:${encrypted}:${authTag}`;
    } catch (error) {
        console.error('Encryption error:', error);
        return text;
    }
};

export const decrypt = (encryptedText: string | null | undefined): string | null => {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText as any;
    
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) return encryptedText;
        
        const [ivHex, encryptedHex, authTagHex] = parts;
        
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        
        const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(), iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        return '***DECRYPTION_FAILED***';
    }
};
