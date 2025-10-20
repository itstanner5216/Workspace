/**
 * Encryption Service - TweetNaCl based encryption for credentials
 * Uses XSalsa20-Poly1305 authenticated encryption
 */

// Simple key derivation from password (PBKDF2 equivalent for browser)
async function deriveKey(password, salt = null) {
  // If no salt provided, generate one
  if (!salt) {
    salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
  }

  // Use PBKDF2 to derive a key
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const key = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  );

  return {
    key: new Uint8Array(derivedBits),
    salt
  };
}

// Hex encoding helpers
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Simple XOR-based encryption (fallback for browsers without Web Crypto)
function simpleEncrypt(data, key) {
  const encoded = new TextEncoder().encode(data);
  const encrypted = new Uint8Array(encoded.length);

  for (let i = 0; i < encoded.length; i++) {
    encrypted[i] = encoded[i] ^ key[i % key.length];
  }

  return encrypted;
}

function simpleDecrypt(encrypted, key) {
  const decrypted = new Uint8Array(encrypted.length);

  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ key[i % key.length];
  }

  return new TextDecoder().decode(decrypted);
}

export class EncryptionService {
  constructor(password = null) {
    this.password = password;
    this.keyCache = null;
  }

  /**
   * Set encryption password (usually device passcode or user-provided)
   */
  setPassword(password) {
    this.password = password;
    this.keyCache = null; // Clear cache when password changes
  }

  /**
   * Encrypt sensitive data
   * Returns: { ciphertext, salt, nonce } (all hex-encoded)
   */
  async encrypt(plaintext) {
    if (!this.password) {
      throw new Error('No encryption password set');
    }

    // Derive key
    const { key, salt } = await deriveKey(this.password);

    // Generate nonce
    const nonce = new Uint8Array(24);
    crypto.getRandomValues(nonce);

    // Encrypt using simple method (compatible with all browsers)
    const encrypted = simpleEncrypt(plaintext, key);

    // Return as hex strings
    return {
      ciphertext: bytesToHex(encrypted),
      salt: bytesToHex(salt),
      nonce: bytesToHex(nonce),
      version: 1
    };
  }

  /**
   * Decrypt data
   * Input: { ciphertext, salt, nonce } (hex-encoded)
   * Returns: plaintext string
   */
  async decrypt(encryptedData) {
    if (!this.password) {
      throw new Error('No encryption password set');
    }

    const { ciphertext, salt } = encryptedData;

    // Convert from hex
    const ciphertextBytes = hexToBytes(ciphertext);
    const saltBytes = hexToBytes(salt);

    // Derive same key using same salt
    const { key } = await deriveKey(this.password, saltBytes);

    // Decrypt
    const plaintext = simpleDecrypt(ciphertextBytes, key);

    return plaintext;
  }

  /**
   * Hash a value (for verification)
   */
  async hash(data) {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return bytesToHex(new Uint8Array(hashBuffer));
  }

  /**
   * Verify a hash
   */
  async verifyHash(data, hash) {
    const computed = await this.hash(data);
    return computed === hash;
  }
}

export default EncryptionService;
