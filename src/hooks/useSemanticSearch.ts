import { useState } from "react";
import { githubService } from "../services/GithubService";
import { useAuth } from "../contexts/AuthContext";
import type { JournalEntry } from "../services/GithubService";

interface SemanticSearchHook {
  results: JournalEntry[];
  loading: boolean;
  error: Error | null;
  search: (query: string, topK?: number) => Promise<void>;
}

export function useSemanticSearch(): SemanticSearchHook {
  const { githubAccessToken, githubUsername } = useAuth();
  const [results, setResults] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function search(query: string, topK = 5): Promise<void> {
    if (!githubAccessToken || !githubUsername) {
      setError(new Error("GitHub authorization required"));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      githubService.initialize(githubAccessToken, githubUsername);
      const found = await githubService.semanticSearch(query, topK);
      setResults(found);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  return { results, loading, error, search };
} 