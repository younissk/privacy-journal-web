import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { githubService } from "../services/GithubService";
import { useAuth } from "../contexts/AuthContext";

export function useJournalEntries() {
  const { githubAccessToken, githubUsername } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [
      "journalEntries",
      githubAccessToken,
      githubUsername,
      githubService.getCurrentRepoName(),
    ],
    queryFn: async () => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.getAllJournalEntries();
    },
    enabled: !!githubAccessToken && !!githubUsername,
  });

  const createEntry = useMutation({
    mutationFn: async (entry: { title: string; content: string; folderId?: string }) => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.createJournalEntry(entry.title, entry.content, entry.folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({
      id,
      title,
      content,
      folderId,
    }: {
      id: string;
      title: string;
      content: string;
      folderId?: string;
    }) => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.updateJournalEntry(id, title, content, folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.deleteJournalEntry(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
    },
  });

  // Helper function to filter entries by folder
  const getEntriesByFolder = (folderId: string | null) => {
    const entries = query.data || [];
    return folderId 
      ? entries.filter(entry => entry.folderId === folderId)
      : entries;
  };

  return {
    entries: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createEntry,
    updateEntry,
    deleteEntry,
    getEntriesByFolder,
  };
}
