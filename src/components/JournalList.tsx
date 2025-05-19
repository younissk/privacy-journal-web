import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { githubService } from "../services/GithubService";
import type { JournalEntry } from "../services/GithubService";
import { useNavigate } from "react-router-dom";

export default function JournalList() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { githubAccessToken, githubUsername, currentUser } = useAuth();
  const navigate = useNavigate();

  async function loadEntries() {
    if (!githubAccessToken || !githubUsername) {
      setError(
        `GitHub authorization required. Token: ${
          githubAccessToken ? "Present" : "Missing"
        }, Username: ${githubUsername || "Missing"}`
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Initialize service if needed
      githubService.initialize(githubAccessToken, githubUsername);

      // Load all entries
      const journalEntries = await githubService.getAllJournalEntries();
      console.log(`Got ${journalEntries.length} journal entries from service`);
      setEntries(journalEntries);
    } catch (error) {
      console.error("Error loading journal entries:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Handle specific error cases
      if (errorMessage.includes("Not Found")) {
        setError(
          "Repository not found. Please try creating a new journal entry or use the retry button below."
        );
      } else if (errorMessage.includes("already exists")) {
        // If repository exists but we can't access it, suggest a fix
        setError(
          "Repository exists but cannot be accessed. Click 'Retry with New Repository' to create a new one."
        );
      } else {
        setError(`Failed to load journal entries: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
      setRetrying(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, [githubAccessToken, githubUsername]);

  async function handleRetryWithUniqueRepo() {
    try {
      setRetrying(true);
      setError("Creating a new repository with a unique name...");

      // Use the special retry method that creates a guaranteed unique repo
      const success = await githubService.retryGitHubConnection();

      if (success) {
        setError("");
        // Load entries from the new repository
        const journalEntries = await githubService.getAllJournalEntries();
        setEntries(journalEntries);
      } else {
        setError(
          "Failed to create a new repository. Try again or create a new entry."
        );
      }
    } catch (error) {
      console.error("Error during retry:", error);
      setError(
        `Retry failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setRetrying(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadEntries();
    } finally {
      setRefreshing(false);
    }
  }

  function handleCreateNew() {
    navigate("/journal/new");
  }

  function handleEntryClick(id: string) {
    navigate(`/journal/${id}`);
  }

  if (loading) {
    return <div className="loading">Loading journals...</div>;
  }

  return (
    <div className="journal-list-container">
      <h2>Your Journal Entries</h2>

      {error && (
        <div className="error-container">
          <div className="error-message">{error}</div>
          <div className="error-actions">
            <button
              onClick={handleRetryWithUniqueRepo}
              disabled={retrying || refreshing}
              className="retry-button"
            >
              {retrying
                ? "Creating New Repository..."
                : "Retry with New Repository"}
            </button>
            <button
              onClick={loadEntries}
              disabled={loading || retrying || refreshing}
              className="retry-button"
            >
              Retry Current Repository
            </button>
          </div>
        </div>
      )}

      <div className="auth-info">
        <p>Current user: {currentUser?.email || "Not logged in"}</p>
        <p>GitHub username: {githubUsername || "Not set"}</p>
        <p>GitHub token: {githubAccessToken ? "Present" : "Missing"}</p>
      </div>

      <div className="journal-actions">
        <button onClick={handleCreateNew} className="create-journal-button">
          Create New Entry
        </button>
        <button 
          onClick={handleRefresh} 
          disabled={loading || refreshing || retrying}
          className="refresh-button"
        >
          {refreshing ? "Refreshing..." : "Refresh Entries"}
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading journals...</div>
      ) : entries.length === 0 ? (
        <div className="no-entries">
          <p>No journal entries yet. Create your first one!</p>
          {!error && (
            <p className="entries-hint">
              After creating an entry, you might need to click "Refresh Entries" to see it in the list.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="entries-count">
            Found {entries.length} journal entries
          </div>
          <div className="entries-list">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="entry-item"
                onClick={() => handleEntryClick(entry.id)}
              >
                <h3>{entry.title}</h3>
                <div className="entry-meta">
                  <span>
                    Created: {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    Updated: {new Date(entry.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="entry-preview">
                  {entry.content.length > 100
                    ? `${entry.content.substring(0, 100)}...`
                    : entry.content}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
