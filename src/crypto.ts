/**
 * Server Vault - AES-256-GCM 加密模块
 *
 * 使用 Web Crypto API 实现：
 * - PBKDF2 密钥派生（100,000 次迭代）
 * - AES-256-GCM 对称加密
 * - 格式: ENC(base64(salt + iv + ciphertext))
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ENC_PREFIX = 'ENC(';
const ENC_SUFFIX = ')';

/** 检查值是否已加密 */
export function isEncrypted(value: string): boolean {
    return typeof value === 'string' && value.startsWith(ENC_PREFIX) && value.endsWith(ENC_SUFFIX);
}

/** PBKDF2 密钥派生 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoded = new TextEncoder().encode(password);
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoded.buffer as ArrayBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

function toBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
        binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/** 加密明文 → ENC(base64) */
export async function encryptValue(plaintext: string, masterPassword: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKey(masterPassword, salt);

    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            new TextEncoder().encode(plaintext)
        )
    );

    // 打包: salt(16) + iv(12) + ciphertext
    const packed = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.length);
    packed.set(salt, 0);
    packed.set(iv, SALT_LENGTH);
    packed.set(ciphertext, SALT_LENGTH + IV_LENGTH);

    return `${ENC_PREFIX}${toBase64(packed)}${ENC_SUFFIX}`;
}

/** 解密 ENC(base64) → 明文 */
export async function decryptValue(encrypted: string, masterPassword: string): Promise<string> {
    if (!isEncrypted(encrypted)) {
        throw new Error('Value is not encrypted');
    }

    const base64 = encrypted.slice(ENC_PREFIX.length, -ENC_SUFFIX.length);
    const packed = fromBase64(base64);

    const salt = packed.slice(0, SALT_LENGTH);
    const iv = packed.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = packed.slice(SALT_LENGTH + IV_LENGTH);

    const key = await deriveKey(masterPassword, salt);

    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );

    return new TextDecoder().decode(plaintext);
}
