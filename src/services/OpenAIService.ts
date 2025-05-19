import OpenAI from "openai";
import CryptoJS from "crypto-js";
import { auth } from "../firebase";

/**
 * A service for interacting with the OpenAI API.
 * Securely stores API keys in IndexedDB with encryption.
 */
class OpenAIService {
  private static instance: OpenAIService;
  private openai: OpenAI | null = null;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = "privacy-journal-openai-db";
  private readonly STORE_NAME = "api-keys";
  private readonly API_KEY_ID = "openai-api-key";
  private readonly SALT = "privacy-journal-salt"; // This would ideally be stored securely

  private constructor() {
    this.initializeDB();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  /**
   * Initialize the IndexedDB database
   */
  private initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = (event) => {
        console.error("IndexedDB error:", event);
        reject(new Error("Failed to open database"));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log("IndexedDB initialized successfully");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: "id" });
          console.log("Object store created");
        }
      };
    });
  }

  /**
   * Get the user-specific encryption key
   */
  private getUserSecret(): string {
    const user = auth.currentUser;
    // Use user ID as part of the encryption key, with a fallback
    return user ? `${user.uid}-${this.SALT}` : `anonymous-${this.SALT}`;
  }

  /**
   * Encrypt the API key
   */
  private encryptApiKey(apiKey: string): string {
    const userSecret = this.getUserSecret();
    return CryptoJS.AES.encrypt(apiKey, userSecret).toString();
  }

  /**
   * Decrypt the API key
   */
  private decryptApiKey(encryptedKey: string): string {
    const userSecret = this.getUserSecret();
    const bytes = CryptoJS.AES.decrypt(encryptedKey, userSecret);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Save the API key to IndexedDB
   */
  public async setApiKey(apiKey: string): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      try {
        const encryptedKey = this.encryptApiKey(apiKey);

        const transaction = this.db!.transaction(
          [this.STORE_NAME],
          "readwrite"
        );
        const store = transaction.objectStore(this.STORE_NAME);

        const request = store.put({
          id: this.API_KEY_ID,
          key: encryptedKey,
          timestamp: Date.now(),
        });

        request.onsuccess = () => {
          this.initializeOpenAI(apiKey);
          resolve();
        };

        request.onerror = (event) => {
          console.error("Error storing API key:", event);
          reject(new Error("Failed to store API key"));
        };
      } catch (error) {
        console.error("Error encrypting and storing API key:", error);
        reject(error);
      }
    });
  }

  /**
   * Get the API key from IndexedDB
   */
  public async getApiKey(): Promise<string | null> {
    if (!this.db) {
      try {
        await this.initializeDB();
      } catch (error) {
        console.error("Failed to initialize database:", error);
        return null;
      }
    }

    if (!this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], "readonly");
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(this.API_KEY_ID);

      request.onsuccess = () => {
        if (!request.result) {
          resolve(null);
          return;
        }

        try {
          const decryptedKey = this.decryptApiKey(request.result.key);
          resolve(decryptedKey);
        } catch (error) {
          console.error("Error decrypting API key:", error);
          resolve(null);
        }
      };

      request.onerror = (event) => {
        console.error("Error retrieving API key:", event);
        reject(new Error("Failed to retrieve API key"));
      };
    });
  }

  /**
   * Initialize OpenAI client with API key
   */
  private initializeOpenAI(apiKey: string): void {
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Only use this in development
    });
  }

  /**
   * Ensure the OpenAI client is initialized
   */
  private async ensureOpenAIInitialized(): Promise<boolean> {
    if (!this.openai) {
      const apiKey = await this.getApiKey();
      if (apiKey) {
        this.initializeOpenAI(apiKey);
        return true;
      }
      return false;
    }
    return true;
  }

  /**
   * Transcribe audio using OpenAI Whisper API
   */
  public async transcribeAudio(audioBlob: Blob): Promise<string> {
    const isInitialized = await this.ensureOpenAIInitialized();

    if (!isInitialized || !this.openai) {
      throw new Error(
        "OpenAI API key not set. Please add your API key in settings."
      );
    }

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", "whisper-1");

      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await this.getApiKey()}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: response.statusText }));
        throw new Error(
          `OpenAI API error: ${errorData.error || response.statusText}`
        );
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw error;
    }
  }

  /**
   * Check if the API key is valid
   */
  public async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const formData = new FormData();
      // Create a small test audio file (1px transparent PNG as placeholder)
      const base64Data =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
      const blob = await (
        await fetch(`data:image/png;base64,${base64Data}`)
      ).blob();

      formData.append("file", blob, "test.png");
      formData.append("model", "whisper-1");

      const response = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
        }
      );

      // If we get a 400 error, it means the API key is valid but the file format is wrong
      // If we get a 401 error, it means the API key is invalid
      return response.status !== 401;
    } catch (error) {
      console.error("Error testing API key:", error);
      return false;
    }
  }

  /**
   * Clear the API key from IndexedDB
   */
  public async clearApiKey(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], "readwrite");
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(this.API_KEY_ID);

      request.onsuccess = () => {
        this.openai = null;
        resolve();
      };

      request.onerror = (event) => {
        console.error("Error clearing API key:", event);
        reject(new Error("Failed to clear API key"));
      };
    });
  }
}

export const openAIService = OpenAIService.getInstance();
