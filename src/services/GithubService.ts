import { Octokit } from "octokit";
import { openAIService } from "./OpenAIService";

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  folderId?: string; // Associate entries with folders
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string; // For nested folders
  color?: string; // For visual organization
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface OctokitError {
  status?: number;
  message?: string;
  errors?: Array<{ message: string; code: string }>;
}

class GithubService {
  private octokit: Octokit | null = null;
  private username: string | null = null;
  private repoName = "privacy-journal-entries";
  private githubAvailable = true; // Track if GitHub storage is available
  // Vector database file name (stored at repo root)
  private vectorDbFileName = "vector_db.json";

  constructor() {}

  initialize(accessToken: string, username: string) {
    this.octokit = new Octokit({ auth: accessToken });
    this.username = username;
    this.githubAvailable = true; // Reset on initialize

    // Set a more specific repository name to avoid conflicts
    // Add timestamp to create a truly unique name if needed
    this.repoName = `privacy-journal-entries-${username.replace(
      /[^a-zA-Z0-9-]/g,
      "-"
    )}`;

    // Verify GitHub access right away and then directly check repo
    this.verifyGitHubAccess().then((success) => {
      if (success) {
        // After username has been corrected, check the repo with the right username
        this.ensureRepoExists().catch((err) => {
          console.error("Failed to initialize repository:", err);
        });
      }
    });
  }

  // Add method to get current repository name
  getCurrentRepoName(): string {
    return this.repoName;
  }

  // Add method to set current repository
  setCurrentRepo(repoName: string) {
    this.repoName = repoName;
  }

  // Add method to list all user repositories
  async getUserRepositories(): Promise<Repository[]> {
    if (!this.octokit || !this.username) {
      throw new Error("GitHub service not initialized");
    }

    try {
      const { data: repos } =
        await this.octokit.rest.repos.listForAuthenticatedUser({
          per_page: 100,
          sort: "updated",
          direction: "desc",
        });

      return repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        description: repo.description,
        created_at: repo.created_at || new Date().toISOString(),
        updated_at: repo.updated_at || new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Error fetching user repositories:", error);
      throw error;
    }
  }

  // Add method to get repositories that might contain journal entries
  async getJournalRepositories(): Promise<Repository[]> {
    const allRepos = await this.getUserRepositories();

    // Filter for repos that might contain journal entries
    // Look for repos with "journal", "privacy", "entries" in name or description
    const journalKeywords = ["journal", "privacy", "entries", "diary", "notes"];

    return allRepos.filter((repo) => {
      const name = repo.name.toLowerCase();
      const description = (repo.description || "").toLowerCase();

      return journalKeywords.some(
        (keyword) => name.includes(keyword) || description.includes(keyword)
      );
    });
  }

  // Add method to create a new journal repository
  async createJournalRepository(customName?: string): Promise<string> {
    if (!this.octokit || !this.username) {
      throw new Error("GitHub service not initialized");
    }

    const timestamp = new Date().getTime();
    const repoName =
      customName ||
      `privacy-journal-entries-${this.username.replace(
        /[^a-zA-Z0-9-]/g,
        "-"
      )}-${timestamp}`;

    try {
      await this.octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        private: true,
        description: "Private repository for journal entries",
        auto_init: true,
      });

      this.repoName = repoName;
      return repoName;
    } catch (error) {
      console.error("Error creating journal repository:", error);
      throw error;
    }
  }

  // Add a method to verify GitHub access
  private async verifyGitHubAccess() {
    try {
      if (!this.octokit) {
        throw new Error("GitHub service not initialized");
      }

      // Test API access by getting the authenticated user
      const { data: user } = await this.octokit.rest.users.getAuthenticated();

      // Update username if it's different from what was provided
      if (user.login !== this.username) {
        console.log(`Updating username from ${this.username} to ${user.login}`);
        this.username = user.login;
        // Also update the repository name to match the correct username pattern
        this.repoName = `privacy-journal-entries-${user.login.replace(
          /[^a-zA-Z0-9-]/g,
          "-"
        )}`;
        console.log(`Updated repository name to: ${this.repoName}`);
      }

      return true;
    } catch (error) {
      console.error("Failed to verify GitHub access:", error);
      this.githubAvailable = false;
      return false;
    }
  }

  async ensureRepoExists() {
    if (!this.octokit || !this.username) {
      console.error(
        "GitHub service not initialized, defaulting to local storage"
      );
      this.githubAvailable = false;
      return false;
    }

    try {
      // List the user's repos first to find if our repo exists
      try {
        const { data: repos } =
          await this.octokit.rest.repos.listForAuthenticatedUser({
            per_page: 100,
          });

        const existingRepo = repos.find((repo) => repo.name === this.repoName);

        if (existingRepo) {
          return true;
        }
      } catch (listError) {
        console.error("Error listing repositories:", listError);
      }

      // If we didn't find it in the list, try to directly access it
      try {
        await this.octokit.rest.repos.get({
          owner: this.username,
          repo: this.repoName,
        });
        return true;
      } catch (getError) {
        // If 404, we'll try to create it below
        console.log(
          "Repository not found with direct access, will try to create it:",
          getError instanceof Error ? getError.message : String(getError)
        );
      }

      // If we get here, we need to create the repository
      try {
        await this.createRepo();
        console.log("Repository created successfully");
        return true;
      } catch (createError) {
        const createOctokitError = createError as OctokitError;

        // If repository already exists (422), we need to check the specific error
        if (createOctokitError.status === 422) {
          // Check if the error is because the repository already exists
          const repoExistsError = createOctokitError.errors?.some(
            (e) => e.message && e.message.includes("already exists")
          );

          if (repoExistsError) {
            // Try creating with a timestamp-based unique name
            const timestamp = new Date().getTime();
            this.repoName = `privacy-journal-entries-${this.username.replace(
              /[^a-zA-Z0-9-]/g,
              "-"
            )}-${timestamp}`;
            console.log(`Creating repository with timestamp: ${this.repoName}`);

            try {
              await this.createRepo();
              console.log(
                "Successfully created repository with timestamped name"
              );
              return true;
            } catch (timestampError) {
              console.error(
                "Failed to create repository with timestamped name:",
                timestampError
              );
              this.githubAvailable = false;
              return false;
            }
          }
        }

        console.error("Error creating repository:", createError);
        this.githubAvailable = false;
        return false;
      }
    } catch (error) {
      console.error("Error checking repository:", error);
      this.githubAvailable = false;
      return false;
    }
  }

  private async createRepo() {
    if (!this.octokit) {
      throw new Error("GitHub service not initialized");
    }

    console.log("Creating repository:", this.repoName);
    try {
      await this.octokit.rest.repos.createForAuthenticatedUser({
        name: this.repoName,
        private: true,
        description: "Private repository for journal entries",
        auto_init: true,
      });
      console.log("Repository created successfully:", this.repoName);
    } catch (error) {
      const octokitError = error as OctokitError;

      // If repository already exists (422), return without throwing
      if (
        octokitError.status === 422 &&
        octokitError.errors?.some(
          (e) => e.message && e.message.includes("already exists")
        )
      ) {
        console.log(
          "Repository already exists, continuing with local storage fallback"
        );
        this.githubAvailable = false;
        return;
      }

      // Log detailed error information
      console.error("Error creating repository:", {
        status: octokitError.status,
        message: octokitError.message,
        errors: octokitError.errors,
      });
      throw error;
    }
  }

  async createJournalEntry(
    title: string,
    content: string,
    folderId?: string
  ): Promise<JournalEntry> {
    if (!this.octokit || !this.username) {
      throw new Error("GitHub service not initialized");
    }

    // First ensure we have the correct username from GitHub
    await this.verifyGitHubAccess();

    // Check if GitHub repo is accessible
    this.githubAvailable = await this.ensureRepoExists();

    const now = new Date().toISOString();
    const id = now.replace(/[:.]/g, "-");

    const newEntry = {
      id,
      title,
      content,
      createdAt: now,
      updatedAt: now,
      folderId,
    };

    // If GitHub is not available, use local storage
    if (!this.githubAvailable) {
      console.log("Using local storage to create journal entry");
      const entries = this.getLocalJournalEntries();
      entries.push(newEntry);
      this.saveLocalJournalEntries(entries);
      return newEntry;
    }

    try {
      // Simplified: Always store in root directory, use metadata for folder tracking
      const filePath = `${id}.md`;

      const frontMatter = `---
title: ${title}
createdAt: ${now}
updatedAt: ${now}${folderId ? `\nfolderId: ${folderId}` : ''}
---

${content}`;

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.username,
        repo: this.repoName,
        path: filePath,
        message: `Create journal entry: ${title}`,
        content: btoa(unescape(encodeURIComponent(frontMatter))),
      });

      // Generate and store vector embedding (best-effort)
      try {
        await this.upsertEntryEmbedding(id, `${title}\n\n${content}`);
      } catch (err) {
        console.error("Failed to generate/save embedding for new entry:", err);
      }

      return newEntry;
    } catch (error) {
      console.error("Error creating journal entry:", error);
      const entries = this.getLocalJournalEntries();
      entries.push(newEntry);
      this.saveLocalJournalEntries(entries);
      return newEntry;
    }
  }

  async getAllJournalEntries(): Promise<JournalEntry[]> {
    if (!this.octokit || !this.username) {
      throw new Error("GitHub service not initialized");
    }

    // First ensure we have the correct username from GitHub
    await this.verifyGitHubAccess();

    // Check if GitHub repo is accessible
    this.githubAvailable = await this.ensureRepoExists();

    // If GitHub is not available, use local storage instead
    if (!this.githubAvailable) {
      console.log("Using local storage for journal entries");
      return this.getLocalJournalEntries();
    }

    console.log(
      `Fetching entries from repository ${this.repoName} owned by ${this.username}`
    );
    try {
      const entries: JournalEntry[] = [];

      // Simplified: Only scan root directory
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.username,
        repo: this.repoName,
        path: "",
      });

      if (!Array.isArray(data)) return [];

      const mdFiles = data.filter((file) => {
        if (file.type !== "file" || !file.name.endsWith(".md")) return false;
        if (file.name.toLowerCase() === "readme.md") return false;
        return /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*\.md$/.test(file.name);
      });

      for (const file of mdFiles) {
        const fileId = file.name.replace(".md", "");
        console.log(`Processing file: ${file.path} as entry ID: ${fileId}`);

        try {
          const { data: fileData } = await this.octokit.rest.repos.getContent({
            owner: this.username,
            repo: this.repoName,
            path: file.path,
          });

          if ("content" in fileData) {
            const base64Content = fileData.content.replace(/\n/g, "");
            const decodedContent = decodeURIComponent(escape(atob(base64Content)));

            const frontMatterMatch = decodedContent.match(
              /---\n([\s\S]*?)\n---\n\n([\s\S]*)/
            );

            if (frontMatterMatch) {
              const [, frontMatter, entryContent] = frontMatterMatch;
              const titleMatch = frontMatter.match(/title: (.*)/);
              const createdAtMatch = frontMatter.match(/createdAt: (.*)/);
              const updatedAtMatch = frontMatter.match(/updatedAt: (.*)/);
              const folderIdMatch = frontMatter.match(/folderId: (.*)/);

              const entry: JournalEntry = {
                id: fileId,
                title: titleMatch ? titleMatch[1] : "Untitled",
                content: entryContent.trim(),
                createdAt: createdAtMatch ? createdAtMatch[1] : new Date().toISOString(),
                updatedAt: updatedAtMatch ? updatedAtMatch[1] : new Date().toISOString(),
                folderId: folderIdMatch ? folderIdMatch[1] : undefined,
              };

              entries.push(entry);
              console.log(`Successfully parsed ${fileId} as a journal entry with title: ${entry.title}`);
            }
          }
        } catch (error) {
          console.error(`Error processing file ${file.path}:`, error);
        }
      }

      console.log(`Successfully loaded ${entries.length} journal entries`);
      return entries.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error(
        `Error fetching entries from GitHub: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      this.githubAvailable = false;
      return this.getLocalJournalEntries();
    }
  }

  // Add a method to retry GitHub connection with a guaranteed unique name
  async retryGitHubConnection(): Promise<boolean> {
    if (!this.octokit || !this.username) {
      console.error("Cannot retry - GitHub service not initialized");
      return false;
    }

    // Generate a completely unique repository name with timestamp
    const timestamp = new Date().getTime();
    this.repoName = `privacy-journal-${this.username.replace(
      /[^a-zA-Z0-9-]/g,
      "-"
    )}-${timestamp}`;
    console.log(
      `Retrying with guaranteed unique repository name: ${this.repoName}`
    );

    try {
      await this.createRepo();
      this.githubAvailable = true;
      console.log("Successfully created repository on retry");

      // If we have local entries, migrate them to GitHub
      const localEntries = this.getLocalJournalEntries();
      if (localEntries.length > 0) {
        console.log(`Migrating ${localEntries.length} local entries to GitHub`);
        for (const entry of localEntries) {
          const fileName = `${entry.id}.md`;
          const frontMatter = `---
title: ${entry.title}
createdAt: ${entry.createdAt}
updatedAt: ${entry.updatedAt}
---

${entry.content}`;

          await this.octokit.rest.repos.createOrUpdateFileContents({
            owner: this.username,
            repo: this.repoName,
            path: fileName,
            message: `Migrate journal entry: ${entry.title}`,
            content: btoa(unescape(encodeURIComponent(frontMatter))),
          });
        }
        console.log("Local entries migration complete");
      }

      return true;
    } catch (error) {
      console.error("Retry failed:", error);
      this.githubAvailable = false;
      return false;
    }
  }

  async getJournalEntryById(id: string): Promise<JournalEntry | null> {
    if (!this.octokit || !this.username) {
      throw new Error("GitHub service not initialized");
    }

    // First ensure we have the correct username from GitHub
    await this.verifyGitHubAccess();

    // If GitHub is not available, use local storage instead
    if (!this.githubAvailable) {
      console.log("Using local storage to get entry");
      const entries = this.getLocalJournalEntries();
      return entries.find((entry) => entry.id === id) || null;
    }

    try {
      console.log(
        `Fetching entry ${id} from repository ${this.repoName} owned by ${this.username}`
      );

      // Skip README.md files as they're not journal entries
      if (id.toLowerCase() === "readme") {
        console.log("Skipping README.md as it's not a journal entry");
        return null;
      }

      // Simplified: Only look in root directory
      try {
        const { data } = await this.octokit.rest.repos.getContent({
          owner: this.username,
          repo: this.repoName,
          path: `${id}.md`,
        });

        if ("content" in data) {
          const base64Content = data.content.replace(/\n/g, "");
          const decodedContent = decodeURIComponent(escape(atob(base64Content)));

          const frontMatterMatch = decodedContent.match(
            /---\n([\s\S]*?)\n---\n\n([\s\S]*)/
          );

          if (frontMatterMatch) {
            const [, frontMatter, entryContent] = frontMatterMatch;
            const titleMatch = frontMatter.match(/title: (.*)/);
            const createdAtMatch = frontMatter.match(/createdAt: (.*)/);
            const updatedAtMatch = frontMatter.match(/updatedAt: (.*)/);
            const folderIdMatch = frontMatter.match(/folderId: (.*)/);

            return {
              id,
              title: titleMatch ? titleMatch[1] : "Untitled",
              content: entryContent.trim(),
              createdAt: createdAtMatch ? createdAtMatch[1] : new Date().toISOString(),
              updatedAt: updatedAtMatch ? updatedAtMatch[1] : new Date().toISOString(),
              folderId: folderIdMatch ? folderIdMatch[1] : undefined,
            };
          }
        }
      } catch {
        console.log(`Entry ${id} not found`);
        return null;
      }

      return null;
    } catch (error) {
      console.error(`Error getting journal entry ${id}:`, error);
      return null;
    }
  }

  async updateJournalEntry(
    id: string,
    title: string,
    content: string,
    folderId?: string
  ): Promise<JournalEntry | null> {
    if (!this.octokit || !this.username) {
      throw new Error("GitHub service not initialized");
    }

    // First ensure we have the correct username from GitHub
    await this.verifyGitHubAccess();

    // Make sure we have access to the repository
    this.githubAvailable = await this.ensureRepoExists();

    // If GitHub is not available, use local storage instead
    if (!this.githubAvailable) {
      console.log("Using local storage to update entry");
      const entries = this.getLocalJournalEntries();
      const entryIndex = entries.findIndex((entry) => entry.id === id);

      if (entryIndex === -1) {
        return null;
      }

      const now = new Date().toISOString();
      const updatedEntry = {
        ...entries[entryIndex],
        title,
        content,
        folderId,
        updatedAt: now,
      };

      entries[entryIndex] = updatedEntry;
      this.saveLocalJournalEntries(entries);
      return updatedEntry;
    }

    try {
      console.log(
        `Updating entry ${id} in repository ${this.repoName} owned by ${this.username}`
      );
      const existingEntry = await this.getJournalEntryById(id);
      if (!existingEntry) {
        return null;
      }

      const now = new Date().toISOString();

      const frontMatter = `---
title: ${title}
createdAt: ${existingEntry.createdAt}
updatedAt: ${now}${folderId ? `\nfolderId: ${folderId}` : ""}
---

${content}`;

      const { data: fileData } = await this.octokit.rest.repos.getContent({
        owner: this.username,
        repo: this.repoName,
        path: `${id}.md`,
      });

      if (!("sha" in fileData)) {
        throw new Error("Could not get file SHA");
      }

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.username,
        repo: this.repoName,
        path: `${id}.md`,
        message: `Update journal entry: ${title}`,
        content: btoa(unescape(encodeURIComponent(frontMatter))),
        sha: fileData.sha,
      });

      // Update embedding
      try {
        await this.upsertEntryEmbedding(id, `${title}\n\n${content}`);
      } catch (err) {
        console.error("Failed to update embedding:", err);
      }

      return {
        id,
        title,
        content,
        folderId,
        createdAt: existingEntry.createdAt,
        updatedAt: now,
      };
    } catch (error) {
      console.error(`Error updating journal entry ${id}:`, error);
      return null;
    }
  }

  async deleteJournalEntry(id: string): Promise<boolean> {
    if (!this.octokit || !this.username) {
      throw new Error("GitHub service not initialized");
    }

    // First ensure we have the correct username from GitHub
    await this.verifyGitHubAccess();

    // Make sure we have access to the repository
    this.githubAvailable = await this.ensureRepoExists();

    // If GitHub is not available, use local storage instead
    if (!this.githubAvailable) {
      console.log("Using local storage to delete entry");
      const entries = this.getLocalJournalEntries();
      const filteredEntries = entries.filter((entry) => entry.id !== id);

      if (filteredEntries.length === entries.length) {
        // No entry was deleted
        return false;
      }

      this.saveLocalJournalEntries(filteredEntries);
      return true;
    }

    try {
      console.log(
        `Deleting entry ${id} from repository ${this.repoName} owned by ${this.username}`
      );
      const { data: fileData } = await this.octokit.rest.repos.getContent({
        owner: this.username,
        repo: this.repoName,
        path: `${id}.md`,
      });

      if (!("sha" in fileData)) {
        throw new Error("Could not get file SHA");
      }

      await this.octokit.rest.repos.deleteFile({
        owner: this.username,
        repo: this.repoName,
        path: `${id}.md`,
        message: `Delete journal entry: ${id}`,
        sha: fileData.sha,
      });

      // Remove from vector DB
      try {
        await this.removeEntryEmbedding(id);
      } catch (err) {
        console.error("Failed to remove embedding:", err);
      }

      return true;
    } catch (error) {
      console.error(`Error deleting journal entry ${id}:`, error);
      return false;
    }
  }

  // Improve local storage functionality with better error handling
  private getLocalJournalEntries(): JournalEntry[] {
    try {
      const entriesJson = localStorage.getItem("journal-entries");
      if (entriesJson) {
        return JSON.parse(entriesJson);
      }
    } catch (error) {
      console.error("Error reading from local storage:", error);
    }
    return [];
  }

  private saveLocalJournalEntries(entries: JournalEntry[]): void {
    try {
      localStorage.setItem("journal-entries", JSON.stringify(entries));
    } catch (error) {
      console.error("Error saving to local storage:", error);
      // Show a user-friendly error message if local storage fails
      alert(
        "Failed to save journal entries. Local storage might be full or unavailable."
      );
    }
  }

  // Folder management methods
  async getAllFolders(): Promise<Folder[]> {
    if (!this.octokit || !this.username) {
      throw new Error("GitHub service not initialized");
    }

    // First ensure we have the correct username from GitHub
    await this.verifyGitHubAccess();

    // Make sure we have access to the repository
    this.githubAvailable = await this.ensureRepoExists();

    // If GitHub is not available, use local storage instead
    if (!this.githubAvailable) {
      console.log("Using local storage for folders");
      return this.getLocalFolders();
    }

    try {
      console.log(
        `Getting folders from repository ${this.repoName} owned by ${this.username}`
      );
      const { data: contents } = await this.octokit.rest.repos.getContent({
        owner: this.username,
        repo: this.repoName,
        path: "folders",
      });

      if (!Array.isArray(contents)) {
        return [];
      }

      const folders: Folder[] = [];
      for (const item of contents) {
        if (item.type === "file" && item.name.endsWith(".json")) {
          try {
            const { data: fileData } = await this.octokit.rest.repos.getContent(
              {
                owner: this.username,
                repo: this.repoName,
                path: item.path,
              }
            );

            if ("content" in fileData) {
              const decodedContent = decodeURIComponent(
                escape(atob(fileData.content))
              );
              const folderData = JSON.parse(decodedContent);
              folders.push(folderData);
            }
          } catch (error) {
            console.error(`Error parsing folder ${item.name}:`, error);
          }
        }
      }

      return folders;
    } catch (error) {
      console.error("Error getting folders:", error);
      // Fallback to local storage if GitHub fails
      return this.getLocalFolders();
    }
  }

  async createFolder(
    name: string,
    description?: string,
    parentId?: string,
    color?: string
  ): Promise<Folder> {
    if (!this.octokit || !this.username) {
      throw new Error("GitHub service not initialized");
    }

    // First ensure we have the correct username from GitHub
    await this.verifyGitHubAccess();

    // Make sure we have access to the repository
    this.githubAvailable = await this.ensureRepoExists();

    const now = new Date().toISOString();
    const id = `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const folder: Folder = {
      id,
      name,
      description,
      createdAt: now,
      updatedAt: now,
      parentId,
      color,
    };

    // If GitHub is not available, use local storage instead
    if (!this.githubAvailable) {
      console.log("Using local storage to create folder");
      const folders = this.getLocalFolders();
      folders.push(folder);
      this.saveLocalFolders(folders);
      return folder;
    }

    try {
      console.log(
        `Creating folder in repository ${this.repoName} owned by ${this.username}`
      );

      // Simplified: Only create folder metadata file, no actual directories
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.username,
        repo: this.repoName,
        path: `folders/${id}.json`,
        message: `Create folder: ${name}`,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(folder, null, 2)))),
      });

      return folder;
    } catch (error) {
      console.error("Error creating folder:", error);
      throw error;
    }
  }

  async updateFolder(
    id: string,
    name: string,
    description?: string,
    color?: string
  ): Promise<Folder | null> {
    if (!this.octokit || !this.username) {
      throw new Error("GitHub service not initialized");
    }

    // First ensure we have the correct username from GitHub
    await this.verifyGitHubAccess();

    // Make sure we have access to the repository
    this.githubAvailable = await this.ensureRepoExists();

    // If GitHub is not available, use local storage instead
    if (!this.githubAvailable) {
      console.log("Using local storage to update folder");
      const folders = this.getLocalFolders();
      const folderIndex = folders.findIndex((folder) => folder.id === id);

      if (folderIndex === -1) {
        return null;
      }

      const now = new Date().toISOString();
      const updatedFolder = {
        ...folders[folderIndex],
        name,
        description,
        color,
        updatedAt: now,
      };

      folders[folderIndex] = updatedFolder;
      this.saveLocalFolders(folders);
      return updatedFolder;
    }

    try {
      console.log(
        `Updating folder ${id} in repository ${this.repoName} owned by ${this.username}`
      );

      // Get the existing folder
      const { data: fileData } = await this.octokit.rest.repos.getContent({
        owner: this.username,
        repo: this.repoName,
        path: `folders/${id}.json`,
      });

      if (!("content" in fileData)) {
        throw new Error("Could not get folder content");
      }

      const decodedContent = decodeURIComponent(escape(atob(fileData.content)));
      const existingFolder = JSON.parse(decodedContent);

      const now = new Date().toISOString();
      const updatedFolder: Folder = {
        ...existingFolder,
        name,
        description,
        color,
        updatedAt: now,
      };

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.username,
        repo: this.repoName,
        path: `folders/${id}.json`,
        message: `Update folder: ${name}`,
        content: btoa(
          unescape(encodeURIComponent(JSON.stringify(updatedFolder, null, 2)))
        ),
        sha: fileData.sha,
      });

      return updatedFolder;
    } catch (error) {
      console.error(`Error updating folder ${id}:`, error);
      return null;
    }
  }

  async deleteFolder(id: string): Promise<boolean> {
    if (!this.octokit || !this.username) {
      throw new Error("GitHub service not initialized");
    }

    // First ensure we have the correct username from GitHub
    await this.verifyGitHubAccess();

    // Make sure we have access to the repository
    this.githubAvailable = await this.ensureRepoExists();

    // If GitHub is not available, use local storage instead
    if (!this.githubAvailable) {
      console.log("Using local storage to delete folder");
      const folders = this.getLocalFolders();
      const filteredFolders = folders.filter((folder) => folder.id !== id);

      if (filteredFolders.length === folders.length) {
        // No folder was deleted
        return false;
      }

      this.saveLocalFolders(filteredFolders);
      return true;
    }

    try {
      console.log(
        `Deleting folder ${id} from repository ${this.repoName} owned by ${this.username}`
      );
      const { data: fileData } = await this.octokit.rest.repos.getContent({
        owner: this.username,
        repo: this.repoName,
        path: `folders/${id}.json`,
      });

      if (!("sha" in fileData)) {
        throw new Error("Could not get file SHA");
      }

      await this.octokit.rest.repos.deleteFile({
        owner: this.username,
        repo: this.repoName,
        path: `folders/${id}.json`,
        message: `Delete folder: ${id}`,
        sha: fileData.sha,
      });

      return true;
    } catch (error) {
      console.error(`Error deleting folder ${id}:`, error);
      return false;
    }
  }

  async moveFolder(
    folderId: string,
    newParentId?: string
  ): Promise<Folder | null> {
    if (!this.octokit || !this.username) {
      throw new Error("GitHub service not initialized");
    }

    // First ensure we have the correct username from GitHub
    await this.verifyGitHubAccess();

    // Make sure we have access to the repository
    this.githubAvailable = await this.ensureRepoExists();

    // If GitHub is not available, use local storage instead
    if (!this.githubAvailable) {
      console.log("Using local storage to move folder");
      const folders = this.getLocalFolders();
      const folderIndex = folders.findIndex((folder) => folder.id === folderId);

      if (folderIndex === -1) {
        return null;
      }

      const now = new Date().toISOString();
      const movedFolder = {
        ...folders[folderIndex],
        parentId: newParentId,
        updatedAt: now,
      };

      folders[folderIndex] = movedFolder;
      this.saveLocalFolders(folders);
      return movedFolder;
    }

    try {
      console.log(
        `Moving folder ${folderId} in repository ${this.repoName} owned by ${this.username}`
      );

      // Get the existing folder
      const { data: fileData } = await this.octokit.rest.repos.getContent({
        owner: this.username,
        repo: this.repoName,
        path: `folders/${folderId}.json`,
      });

      if (!("content" in fileData)) {
        throw new Error("Could not get folder content");
      }

      const decodedContent = decodeURIComponent(escape(atob(fileData.content)));
      const existingFolder = JSON.parse(decodedContent);

      const now = new Date().toISOString();
      const movedFolder: Folder = {
        ...existingFolder,
        parentId: newParentId,
        updatedAt: now,
      };

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.username,
        repo: this.repoName,
        path: `folders/${folderId}.json`,
        message: `Move folder: ${existingFolder.name}`,
        content: btoa(
          unescape(encodeURIComponent(JSON.stringify(movedFolder, null, 2)))
        ),
        sha: fileData.sha,
      });

      return movedFolder;
    } catch (error) {
      console.error(`Error moving folder ${folderId}:`, error);
      return null;
    }
  }

  async getFolderById(folderId: string): Promise<Folder | null> {
    if (!this.octokit || !this.username) {
      throw new Error("GitHub service not initialized");
    }

    // First ensure we have the correct username from GitHub
    await this.verifyGitHubAccess();

    // Make sure we have access to the repository
    this.githubAvailable = await this.ensureRepoExists();

    // If GitHub is not available, use local storage instead
    if (!this.githubAvailable) {
      console.log("Using local storage to get folder");
      const folders = this.getLocalFolders();
      return folders.find((folder) => folder.id === folderId) || null;
    }

    try {
      console.log(
        `Getting folder ${folderId} from repository ${this.repoName} owned by ${this.username}`
      );

      const { data: fileData } = await this.octokit.rest.repos.getContent({
        owner: this.username,
        repo: this.repoName,
        path: `folders/${folderId}.json`,
      });

      if (!("content" in fileData)) {
        throw new Error("Could not get folder content");
      }

      const decodedContent = decodeURIComponent(escape(atob(fileData.content)));
      const folderData = JSON.parse(decodedContent);
      return folderData;
    } catch (error) {
      console.error(`Error getting folder ${folderId}:`, error);
      return null;
    }
  }

  // Local storage methods for folders
  private getLocalFolders(): Folder[] {
    try {
      const foldersJson = localStorage.getItem("journal-folders");
      if (foldersJson) {
        return JSON.parse(foldersJson);
      }
    } catch (error) {
      console.error("Error reading folders from local storage:", error);
    }
    return [];
  }

  private saveLocalFolders(folders: Folder[]): void {
    try {
      localStorage.setItem("journal-folders", JSON.stringify(folders));
    } catch (error) {
      console.error("Error saving folders to local storage:", error);
      alert(
        "Failed to save folders. Local storage might be full or unavailable."
      );
    }
  }

  async moveEntryToFolder(entryId: string, newFolderId?: string): Promise<JournalEntry | null> {
    if (!this.octokit || !this.username) {
      throw new Error("GitHub service not initialized");
    }

    // First ensure we have the correct username from GitHub
    await this.verifyGitHubAccess();

    // Make sure we have access to the repository
    this.githubAvailable = await this.ensureRepoExists();

    // If GitHub is not available, use local storage instead
    if (!this.githubAvailable) {
      console.log("Using local storage to move entry");
      const entries = this.getLocalJournalEntries();
      const entryIndex = entries.findIndex((entry) => entry.id === entryId);

      if (entryIndex === -1) {
        return null;
      }

      const now = new Date().toISOString();
      const updatedEntry = {
        ...entries[entryIndex],
        folderId: newFolderId,
        updatedAt: now,
      };

      entries[entryIndex] = updatedEntry;
      this.saveLocalJournalEntries(entries);
      return updatedEntry;
    }

    try {
      console.log(
        `Moving entry ${entryId} to folder ${newFolderId || 'root'} in repository ${this.repoName}`
      );

      // Get the existing entry
      const existingEntry = await this.getJournalEntryById(entryId);
      if (!existingEntry) {
        return null;
      }

      const now = new Date().toISOString();

      const frontMatter = `---
title: ${existingEntry.title}
createdAt: ${existingEntry.createdAt}
updatedAt: ${now}${newFolderId ? `\nfolderId: ${newFolderId}` : ''}
---

${existingEntry.content}`;

      const { data: fileData } = await this.octokit.rest.repos.getContent({
        owner: this.username,
        repo: this.repoName,
        path: `${entryId}.md`,
      });

      if (!("sha" in fileData)) {
        throw new Error("Could not get file SHA");
      }

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.username,
        repo: this.repoName,
        path: `${entryId}.md`,
        message: `Move entry to ${newFolderId ? 'folder' : 'root'}: ${existingEntry.title}`,
        content: btoa(unescape(encodeURIComponent(frontMatter))),
        sha: fileData.sha,
      });

      return {
        ...existingEntry,
        folderId: newFolderId,
        updatedAt: now,
      };
    } catch (error) {
      console.error(`Error moving entry ${entryId}:`, error);
      return null;
    }
  }

  /****************************
   * Vector DB Helper Methods *
   ****************************/

  /**
   * Load the vector database (mapping of entry id → embedding)
   */
  private async loadVectorDB(): Promise<Record<string, number[]>> {
    // Local fallback if GitHub unavailable
    if (!this.githubAvailable || !this.octokit || !this.username) {
      return this.getLocalVectorDB();
    }

    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.username,
        repo: this.repoName,
        path: this.vectorDbFileName,
      });

      if (!("content" in data)) {
        throw new Error("Vector DB file has no content");
      }

      const decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
      return JSON.parse(decoded);
    } catch (error: unknown) {
      // If file not found (404) treat as empty
      if (
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        (error as { status?: number }).status === 404
      ) {
        return {};
      }
      console.error("Failed to load vector DB:", error);
      return {};
    }
  }

  /**
   * Persist the vector DB back to GitHub (or local storage if GitHub unavailable)
   */
  private async saveVectorDB(db: Record<string, number[]>): Promise<void> {
    // Save to local storage in all cases for quick access
    this.saveLocalVectorDB(db);

    if (!this.githubAvailable || !this.octokit || !this.username) {
      return;
    }

    try {
      // Attempt to fetch existing SHA (required for updates)
      let sha: string | undefined;
      try {
        const { data } = await this.octokit.rest.repos.getContent({
          owner: this.username,
          repo: this.repoName,
          path: this.vectorDbFileName,
        });
        if ("sha" in data) {
          sha = data.sha;
        }
      } catch (err: unknown) {
        // File might not exist – that's fine
        if (
          typeof err === "object" &&
          err !== null &&
          "status" in err &&
          (err as { status?: number }).status !== 404
        ) {
          throw err;
        }
      }

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.username,
        repo: this.repoName,
        path: this.vectorDbFileName,
        message: "Update vector database",
        content: btoa(unescape(encodeURIComponent(JSON.stringify(db)))),
        sha,
      });
    } catch (error) {
      console.error("Failed to save vector DB:", error);
    }
  }

  /** Local storage helpers for vector DB */
  private getLocalVectorDB(): Record<string, number[]> {
    try {
      const json = localStorage.getItem("journal-vector-db");
      return json ? JSON.parse(json) : {};
    } catch (err: unknown) {
      console.error("Failed to read vector DB from local storage:", err);
      return {};
    }
  }

  private saveLocalVectorDB(db: Record<string, number[]>): void {
    try {
      localStorage.setItem("journal-vector-db", JSON.stringify(db));
    } catch (err: unknown) {
      console.error("Failed to save vector DB to local storage:", err);
    }
  }

  /**
   * Add or update the embedding for a single entry
   */
  private async upsertEntryEmbedding(entryId: string, text: string): Promise<void> {
    const embedding = await openAIService.generateEmbedding(text);
    if (!embedding) return;

    const db = await this.loadVectorDB();
    db[entryId] = embedding;
    await this.saveVectorDB(db);
  }

  /**
   * Remove an entry from the vector DB
   */
  private async removeEntryEmbedding(entryId: string): Promise<void> {
    const db = await this.loadVectorDB();
    if (entryId in db) {
      delete db[entryId];
      await this.saveVectorDB(db);
    }
  }

  /**
   * Compute cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, idx) => sum + val * b[idx], 0);
    const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  /**
   * Semantic search through all journal entries.
   * Returns up to topK entries ordered by similarity (highest first).
   */
  public async semanticSearch(query: string, topK = 5): Promise<JournalEntry[]> {
    // Generate embedding for query
    const queryEmbedding = await openAIService.generateEmbedding(query);
    if (!queryEmbedding) {
      console.warn("Unable to generate query embedding – returning empty results");
      return [];
    }

    const vectorDb = await this.loadVectorDB();
    const allEntries = await this.getAllJournalEntries();

    // Map entry → similarity
    const similarities: Array<{ entry: JournalEntry; score: number }> = [];
    for (const entry of allEntries) {
      const emb = vectorDb[entry.id];
      if (!emb) continue; // Skip if no embedding yet
      const score = this.cosineSimilarity(queryEmbedding, emb);
      similarities.push({ entry, score });
    }

    similarities.sort((a, b) => b.score - a.score);

    return similarities.slice(0, topK).map((s) => s.entry);
  }

  /**
   * Rebuild the vector database by generating embeddings for all journal entries.
   * This can be used to index existing entries that don't have embeddings yet.
   * @param {(processed: number, total: number) => void} onProgress - Optional progress callback
   * @returns {Promise<{ processed: number; errors: number }>} Summary of indexing results
   */
  public async rebuildVectorIndex(onProgress?: (processed: number, total: number) => void): Promise<{ processed: number; errors: number }> {
    const allEntries = await this.getAllJournalEntries();
    let processed = 0;
    let errors = 0;

    // Load existing vector DB to avoid regenerating embeddings unnecessarily
    const existingDb = await this.loadVectorDB();
    const newDb: Record<string, number[]> = { ...existingDb };

    for (const entry of allEntries) {
      try {
        // Only generate embedding if we don't already have one
        if (!newDb[entry.id]) {
          const embedding = await openAIService.generateEmbedding(`${entry.title}\n\n${entry.content}`);
          if (embedding) {
            newDb[entry.id] = embedding;
          } else {
            errors++;
          }
        }
        processed++;
        if (onProgress) {
          onProgress(processed, allEntries.length);
        }
      } catch (err) {
        console.error(`Failed to generate embedding for entry ${entry.id}:`, err);
        errors++;
        processed++;
        if (onProgress) {
          onProgress(processed, allEntries.length);
        }
      }
    }

    // Save the updated vector DB
    await this.saveVectorDB(newDb);

    return { processed, errors };
  }
}

export const githubService = new GithubService();
