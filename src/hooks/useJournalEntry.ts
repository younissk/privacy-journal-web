import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { githubService } from "../services/GithubService";
import { useAuth } from "../contexts/AuthContext";

export function useJournalEntry(id: string | undefined) {
  const { githubAccessToken, githubUsername } = useAuth();
  const queryClient = useQueryClient();
  const isNewEntry = !id;

  const query = useQuery({
    queryKey: ["journalEntry", id, githubAccessToken, githubUsername],
    queryFn: async () => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      if (!id) {
        return null;
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.getJournalEntryById(id);
    },
    enabled: !!githubAccessToken && !!githubUsername && !isNewEntry,
  });

  const updateEntry = useMutation({
    mutationFn: async ({
      title,
      content,
      folderId,
    }: {
      title: string;
      content: string;
      folderId?: string;
    }) => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      githubService.initialize(githubAccessToken, githubUsername);

      if (isNewEntry) {
        return githubService.createJournalEntry(title, content, folderId);
      } else if (id) {
        return githubService.updateJournalEntry(id, title, content, folderId);
      }
      throw new Error("Invalid entry state");
    },
    onSuccess: () => {
      if (!isNewEntry) {
        queryClient.invalidateQueries({ queryKey: ["journalEntry", id] });
      }
      queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async () => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      if (!id) {
        throw new Error("Cannot delete a new entry");
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.deleteJournalEntry(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
    },
  });

  return {
    entry: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateEntry,
    deleteEntry,
  };
}
