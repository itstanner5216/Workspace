/**
 * Auth Manager - Manages encrypted credential storage using IndexedDB
 * Provides secure storage for site logins with auto-expiration
 */

import { EncryptionService } from './encryption-service.js';

export class AuthManager {
  constructor(encryptionPassword = 'default') {
    this.encryptionService = new EncryptionService(encryptionPassword);
    this.dbName = 'JackPortalAuthDB';
    this.storeName = 'credentials';
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'site' });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };
    });
  }

  /**
   * Save encrypted credentials for a site
   * ttlDays: Time to live in days (default 7)
   */
  async saveCredentials(site, username, password, ttlDays = 7) {
    await this.init();

    // Encrypt credentials
    const credentials = JSON.stringify({ username, password });
    const encrypted = await this.encryptionService.encrypt(credentials);

    // Calculate expiration
    const expiresAt = Date.now() + ttlDays * 24 * 60 * 60 * 1000;

    const record = {
      site,
      encrypted,
      expiresAt,
      createdAt: Date.now(),
      ttlDays
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(record);

      request.onerror = () => reject(new Error(`Failed to save credentials for ${site}`));
      request.onsuccess = () => resolve(true);
    });
  }

  /**
   * Retrieve credentials for a site
   * Returns: { username, password } or null if expired/not found
   */
  async getCredentials(site) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(site);

      request.onerror = () => reject(new Error(`Failed to retrieve credentials for ${site}`));

      request.onsuccess = async () => {
        const record = request.result;

        if (!record) {
          resolve(null);
          return;
        }

        // Check if expired
        if (record.expiresAt < Date.now()) {
          // Delete expired record
          await this.deleteCredentials(site);
          resolve(null);
          return;
        }

        try {
          // Decrypt
          const decrypted = await this.encryptionService.decrypt(record.encrypted);
          const creds = JSON.parse(decrypted);
          resolve(creds);
        } catch (error) {
          console.error('Failed to decrypt credentials:', error);
          resolve(null);
        }
      };
    });
  }

  /**
   * Check if credentials exist for a site
   */
  async hasCredentials(site) {
    const creds = await this.getCredentials(site);
    return creds !== null;
  }

  /**
   * List all saved sites
   */
  async listSites() {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(new Error('Failed to list sites'));

      request.onsuccess = () => {
        const records = request.result;
        const sites = records
          .filter(r => r.expiresAt > Date.now()) // Only non-expired
          .map(r => ({
            site: r.site,
            createdAt: r.createdAt,
            expiresAt: r.expiresAt,
            expiresIn: Math.max(0, Math.floor((r.expiresAt - Date.now()) / 1000))
          }));

        resolve(sites);
      };
    });
  }

  /**
   * Delete credentials for a site
   */
  async deleteCredentials(site) {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(site);

      request.onerror = () => reject(new Error(`Failed to delete credentials for ${site}`));
      request.onsuccess = () => resolve(true);
    });
  }

  /**
   * Clear all saved credentials
   */
  async clearAll() {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(new Error('Failed to clear all credentials'));
      request.onsuccess = () => resolve(true);
    });
  }

  /**
   * Clean up expired credentials (call periodically)
   */
  async cleanupExpired() {
    const sites = await this.listSites();
    const currentTime = Date.now();

    for (const site of sites) {
      if (site.expiresAt < currentTime) {
        await this.deleteCredentials(site.site);
      }
    }

    return sites.length;
  }

  /**
   * Set new encryption password (re-encrypts all stored credentials)
   */
  async changeEncryptionPassword(oldPassword, newPassword) {
    await this.init();

    // Get all records with old password
    this.encryptionService.setPassword(oldPassword);
    const sites = await this.listSites();

    // Decrypt with old password
    const allCreds = {};
    for (const site of sites) {
      const creds = await this.getCredentials(site.site);
      if (creds) {
        allCreds[site.site] = creds;
      }
    }

    // Clear database
    await this.clearAll();

    // Switch to new password and re-encrypt
    this.encryptionService.setPassword(newPassword);
    for (const [site, creds] of Object.entries(allCreds)) {
      await this.saveCredentials(site, creds.username, creds.password, 7);
    }

    return true;
  }
}

export default AuthManager;
