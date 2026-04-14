"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateShareToken = generateShareToken;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.createAccessGrant = createAccessGrant;
exports.verifyAccessGrant = verifyAccessGrant;
const crypto_1 = require("crypto");
function generateShareToken() {
    return (0, crypto_1.randomBytes)(32).toString('hex');
}
const SCRYPT_KEYLEN = 32;
const SALT_BYTES = 16;
function hashPassword(password) {
    const salt = (0, crypto_1.randomBytes)(SALT_BYTES).toString('hex');
    const hash = (0, crypto_1.scryptSync)(password, salt, SCRYPT_KEYLEN).toString('hex');
    return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash)
        return false;
    try {
        const inputHash = (0, crypto_1.scryptSync)(password, salt, SCRYPT_KEYLEN);
        return (0, crypto_1.timingSafeEqual)(Buffer.from(hash, 'hex'), inputHash);
    }
    catch {
        return false;
    }
}
const GRANT_TTL_SECONDS = 60 * 60;
function getGrantSecret() {
    const secret = process.env.SHARE_GRANT_SECRET;
    if (!secret) {
        throw new Error('SHARE_GRANT_SECRET environment variable is not set. ' +
            'Generate a strong random secret (≥32 chars) and set it before starting the server. ' +
            'Example: openssl rand -hex 32');
    }
    return secret;
}
function createAccessGrant(shareId) {
    const exp = Math.floor(Date.now() / 1000) + GRANT_TTL_SECONDS;
    const payload = Buffer.from(`${shareId}|${exp}`).toString('base64url');
    const sig = (0, crypto_1.createHmac)('sha256', getGrantSecret())
        .update(payload)
        .digest('hex');
    return { grant: `${payload}.${sig}`, expiresIn: GRANT_TTL_SECONDS };
}
function verifyAccessGrant(grant) {
    const dotIdx = grant.lastIndexOf('.');
    if (dotIdx === -1)
        return null;
    const payload = grant.slice(0, dotIdx);
    const sig = grant.slice(dotIdx + 1);
    const expectedSig = (0, crypto_1.createHmac)('sha256', getGrantSecret())
        .update(payload)
        .digest('hex');
    try {
        if (!(0, crypto_1.timingSafeEqual)(Buffer.from(sig, 'hex'), Buffer.from(expectedSig, 'hex'))) {
            return null;
        }
    }
    catch {
        return null;
    }
    const decoded = Buffer.from(payload, 'base64url').toString();
    const [shareId, expStr] = decoded.split('|');
    if (!shareId || !expStr)
        return null;
    const exp = parseInt(expStr, 10);
    if (Number.isNaN(exp) || Math.floor(Date.now() / 1000) > exp)
        return null;
    return shareId;
}
//# sourceMappingURL=share-crypto.util.js.map