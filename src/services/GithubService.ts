import { Octokit } from "octokit";

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
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
    content: string
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
      const fileName = `${id}.md`;
      const frontMatter = `---
title: ${title}
createdAt: ${now}
updatedAt: ${now}
---

${content}`;

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: this.username,
        repo: this.repoName,
        path: fileName,
        message: `Create journal entry: ${title}`,
        content: btoa(unescape(encodeURIComponent(frontMatter))),
      });

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
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.username,
        repo: this.repoName,
        path: "",
      });

      if (!Array.isArray(data)) {
        console.log("No content array returned, repository may be empty");
        return [];
      }

      // Filter files that look like journal entries (exclude README.md and other system files)
      const mdFiles = data.filter((file) => {
        // Skip README and other common repository files
        if (file.type !== "file" || !file.name.endsWith(".md")) return false;
        if (file.name.toLowerCase() === "readme.md") return false;

        // Try to check if filename matches our timestamp-based ID pattern (optional)
        const isLikelyJournal =
          /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*\.md$/.test(file.name);

        return isLikelyJournal || true; // Return true if we decide not to enforce the pattern
      });

      console.log(
        `Found ${mdFiles.length} markdown files that might be journal entries`
      );
      const entries: JournalEntry[] = [];

      for (const file of mdFiles) {
        const fileId = file.name.replace(".md", "");
        console.log(`Processing file: ${file.name} as entry ID: ${fileId}`);

        const content = await this.getJournalEntryById(fileId);
        if (content) {
          console.log(
            `Successfully parsed ${fileId} as a journal entry with title: ${content.title}`
          );
          entries.push(content);
        } else {
          console.log(`Failed to parse ${fileId} as a journal entry`);
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

      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.username,
        repo: this.repoName,
        path: `${id}.md`,
      });

      if ("content" in data) {
        // Use browser-compatible base64 decoding
        const base64Content = data.content.replace(/\n/g, "");
        const decodedContent = decodeURIComponent(escape(atob(base64Content)));

        console.log(
          `Successfully decoded content for ${id}, length: ${decodedContent.length} chars`
        );

        // Check for front matter format
        const frontMatterMatch = decodedContent.match(
          /---\n([\s\S]*?)\n---\n\n([\s\S]*)/
        );

        if (frontMatterMatch) {
          const [, frontMatter, entryContent] = frontMatterMatch;
          const titleMatch = frontMatter.match(/title: (.*)/);
          const createdAtMatch = frontMatter.match(/createdAt: (.*)/);
          const updatedAtMatch = frontMatter.match(/updatedAt: (.*)/);

          return {
            id,
            title: titleMatch ? titleMatch[1] : "Untitled",
            content: entryContent.trim(),
            createdAt: createdAtMatch
              ? createdAtMatch[1]
              : new Date().toISOString(),
            updatedAt: updatedAtMatch
              ? updatedAtMatch[1]
              : new Date().toISOString(),
          };
        } else {
          console.log(
            `Entry ${id} doesn't have expected front matter format, content starts with: ${decodedContent.substring(
              0,
              50
            )}...`
          );

          // For files without proper front matter (like README), create an entry with default values
          if (id.toLowerCase() === "readme") {
            return null; // Skip README files
          } else {
            // Try to extract a title from first line if possible
            const firstLine = decodedContent.split("\n")[0].trim();
            const title = firstLine.startsWith("#")
              ? firstLine.replace(/^#+ /, "")
              : id;

            return {
              id,
              title: title || id,
              content: decodedContent.trim(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }
        }
      } else {
        console.log(
          `Entry ${id} doesn't have content property in the response`
        );
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
    content: string
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
updatedAt: ${now}
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

      return {
        id,
        title,
        content,
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
}

export const githubService = new GithubService();
