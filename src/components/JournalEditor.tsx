import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { githubService } from "../services/GithubService";
import type { JournalEntry } from "../services/GithubService";

export default function JournalEditor() {
  const { id } = useParams();
  const isNewEntry = id === "new";
  const navigate = useNavigate();
  const { githubAccessToken, githubUsername } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEntry() {
      if (!githubAccessToken || !githubUsername) {
        setError("GitHub authorization required");
        setLoading(false);
        return;
      }

      if (isNewEntry) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        githubService.initialize(githubAccessToken, githubUsername);

        if (id) {
          const entry = await githubService.getJournalEntryById(id);
          if (entry) {
            setTitle(entry.title);
            setContent(entry.content);
          } else {
            setError("Journal entry not found");
          }
        }
      } catch (error) {
        console.error("Error loading journal entry:", error);
        setError("Failed to load journal entry");
      } finally {
        setLoading(false);
      }
    }

    loadEntry();
  }, [id, isNewEntry, githubAccessToken, githubUsername]);

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!githubAccessToken || !githubUsername) {
      setError("GitHub authorization required");
      return;
    }

    try {
      setSaving(true);
      setError("");

      githubService.initialize(githubAccessToken, githubUsername);

      let savedEntry: JournalEntry | null = null;

      if (isNewEntry) {
        savedEntry = await githubService.createJournalEntry(title, content);
      } else if (id) {
        savedEntry = await githubService.updateJournalEntry(id, title, content);
      }

      if (savedEntry) {
        navigate("/journals");
      } else {
        setError("Failed to save journal entry");
      }
    } catch (error) {
      console.error("Error saving journal entry:", error);
      setError("Failed to save journal entry");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isNewEntry) {
      navigate("/journals");
      return;
    }

    if (!githubAccessToken || !githubUsername) {
      setError("GitHub authorization required");
      return;
    }

    if (
      !window.confirm("Are you sure you want to delete this journal entry?")
    ) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      githubService.initialize(githubAccessToken, githubUsername);

      if (id) {
        const success = await githubService.deleteJournalEntry(id);
        if (success) {
          navigate("/journals");
        } else {
          setError("Failed to delete journal entry");
        }
      }
    } catch (error) {
      console.error("Error deleting journal entry:", error);
      setError("Failed to delete journal entry");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    navigate("/journals");
  }

  if (loading) {
    return <div className="loading">Loading journal...</div>;
  }

  return (
    <div className="journal-editor-container">
      <h2>{isNewEntry ? "Create New Journal Entry" : "Edit Journal Entry"}</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="journal-form">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for your journal"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your journal entry here..."
            rows={15}
          />
        </div>

        <div className="button-group">
          <button
            onClick={handleSave}
            disabled={saving}
            className="save-button"
          >
            {saving ? "Saving..." : "Save"}
          </button>

          <button
            onClick={handleCancel}
            disabled={saving}
            className="cancel-button"
          >
            Cancel
          </button>

          {!isNewEntry && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="delete-button"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
