import OpenAI from "openai";
import CryptoJS from "crypto-js";
import { auth } from "../firebase";

/**
 * Custom error classes for better error handling
 */
class OpenAIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenAIServiceError";
  }
}

class DatabaseError extends OpenAIServiceError {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

class EncryptionError extends OpenAIServiceError {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionError";
  }
}

/**
 * A service for interacting with the OpenAI API.
 * Securely stores API keys in IndexedDB with encryption.
 *
 * Environment Variables Required:
 * - VITE_ENCRYPTION_SALT: A secure random string used for encryption
 */
class OpenAIService {
  private static instance: OpenAIService;
  private openai: OpenAI | null = null;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = "privacy-journal-openai-db";
  private readonly STORE_NAME = "api-keys";
  private readonly API_KEY_ID = "openai-api-key";
  private readonly SALT =
    import.meta.env.VITE_ENCRYPTION_SALT || "default-salt-for-development";

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
   * @throws {DatabaseError} If database initialization fails
   */
  private initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = (event) => {
        console.error("IndexedDB error:", event);
        reject(new DatabaseError("Failed to open database"));
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
   * @returns {string} The user-specific encryption key
   */
  private getUserSecret(): string {
    const user = auth.currentUser;
    return user ? `${user.uid}-${this.SALT}` : `anonymous-${this.SALT}`;
  }

  /**
   * Encrypt the API key
   * @param {string} apiKey - The API key to encrypt
   * @returns {string} The encrypted API key
   * @throws {EncryptionError} If encryption fails
   */
  private encryptApiKey(apiKey: string): string {
    try {
      const userSecret = this.getUserSecret();
      return CryptoJS.AES.encrypt(apiKey, userSecret).toString();
    } catch (error) {
      throw new EncryptionError(
        `Failed to encrypt API key: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Decrypt the API key
   * @param {string} encryptedKey - The encrypted API key
   * @returns {string} The decrypted API key
   * @throws {EncryptionError} If decryption fails
   */
  private decryptApiKey(encryptedKey: string): string {
    try {
      const userSecret = this.getUserSecret();
      const bytes = CryptoJS.AES.decrypt(encryptedKey, userSecret);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      if (!decrypted) {
        throw new Error("Decryption resulted in empty string");
      }
      return decrypted;
    } catch (error) {
      throw new EncryptionError(
        `Failed to decrypt API key: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Save the API key to IndexedDB
   * @param {string} apiKey - The API key to save
   * @throws {DatabaseError} If saving fails
   * @throws {EncryptionError} If encryption fails
   */
  public async setApiKey(apiKey: string): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    if (!this.db) {
      throw new DatabaseError("Database not initialized");
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
          reject(new DatabaseError("Failed to store API key"));
        };
      } catch (error) {
        if (error instanceof OpenAIServiceError) {
          reject(error);
        } else {
          reject(
            new DatabaseError(
              `Failed to store API key: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            )
          );
        }
      }
    });
  }

  /**
   * Get the API key from IndexedDB
   * @returns {Promise<string | null>} The decrypted API key or null if not found
   * @throws {DatabaseError} If retrieval fails
   * @throws {EncryptionError} If decryption fails
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
        reject(new DatabaseError("Failed to retrieve API key"));
      };
    });
  }

  /**
   * Initialize OpenAI client with API key
   * @param {string} apiKey - The API key to initialize with
   */
  private initializeOpenAI(apiKey: string): void {
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Only use this in development
    });
  }

  /**
   * Ensure the OpenAI client is initialized
   * @returns {Promise<boolean>} Whether initialization was successful
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
   * @param {Blob} audioBlob - The audio blob to transcribe
   * @returns {Promise<string>} The transcribed text
   * @throws {OpenAIServiceError} If transcription fails
   */
  public async transcribeAudio(audioBlob: Blob): Promise<string> {
    const isInitialized = await this.ensureOpenAIInitialized();

    if (!isInitialized || !this.openai) {
      throw new OpenAIServiceError(
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
        throw new OpenAIServiceError(
          `OpenAI API error: ${errorData.error || response.statusText}`
        );
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      if (error instanceof OpenAIServiceError) {
        throw error;
      }
      throw new OpenAIServiceError(
        `Error transcribing audio: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Check if the API key is valid
   * @param {string} apiKey - The API key to test
   * @returns {Promise<boolean>} Whether the API key is valid
   */
  public async testApiKey(apiKey: string): Promise<boolean> {
    try {
      const formData = new FormData();
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

      return response.status !== 401;
    } catch (error) {
      console.error("Error testing API key:", error);
      return false;
    }
  }

  /**
   * Clear the API key from IndexedDB
   * @throws {DatabaseError} If clearing fails
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
        reject(new DatabaseError("Failed to clear API key"));
      };
    });
  }

  /**
   * Generate an embedding vector for the given text using the OpenAI embeddings endpoint
   * @param {string} text - The input text to embed
   * @returns {Promise<number[] | null>} The embedding vector or null if generation fails
   */
  public async generateEmbedding(text: string): Promise<number[] | null> {
    const isInitialized = await this.ensureOpenAIInitialized();

    if (!isInitialized || !this.openai) {
      console.warn("OpenAI API key is not set – cannot generate embeddings");
      return null;
    }

    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small", // Lightweight embedding model
        input: text,
      });

      if (
        response &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        // The SDK currently types embedding as number[] | string[] so we cast to number[]
        return response.data[0].embedding as unknown as number[];
      }

      return null;
    } catch (error) {
      console.error("Error generating embedding:", error);
      return null;
    }
  }

  /**
   * Generate a chat completion using OpenAI Chat Completion API.
   * @param {Array<{ role: 'system' | 'user' | 'assistant'; content: string }>} messages - The conversation messages so far.
   * @param {string} [model='gpt-3.5-turbo'] - The chat model to use.
   * @param {number} [temperature=0.7] - Sampling temperature.
   * @returns {Promise<string>} The assistant response text.
   * @throws {OpenAIServiceError} If the request fails or API key is missing.
   */
  public async getChatCompletion(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    model = "gpt-3.5-turbo",
    temperature = 0.7
  ): Promise<string> {
    const isInitialized = await this.ensureOpenAIInitialized();

    if (!isInitialized || !this.openai) {
      throw new OpenAIServiceError(
        "OpenAI API key not set. Please add your API key in settings."
      );
    }

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages,
        temperature,
      });

      const text = response.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new Error("No response text received from OpenAI");
      }
      return text;
    } catch (error) {
      throw new OpenAIServiceError(
        `Error generating chat completion: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

export const openAIService = OpenAIService.getInstance();
