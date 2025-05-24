import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { githubService } from "../services/GithubService";
import { useAuth } from "../contexts/AuthContext";

export function useRepositories() {
  const { githubAccessToken, githubUsername } = useAuth();
  const queryClient = useQueryClient();

  // State for currently selected repository
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);

  // Initialize GitHub service when auth changes
  useEffect(() => {
    if (githubAccessToken && githubUsername) {
      githubService.initialize(githubAccessToken, githubUsername);
    }
  }, [githubAccessToken, githubUsername]);

  // Query to fetch all repositories
  const repositoriesQuery = useQuery({
    queryKey: ["repositories", githubAccessToken, githubUsername],
    queryFn: async () => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      return githubService.getUserRepositories();
    },
    enabled: !!githubAccessToken && !!githubUsername,
  });

  // Query to fetch journal-specific repositories
  const journalRepositoriesQuery = useQuery({
    queryKey: ["journalRepositories", githubAccessToken, githubUsername],
    queryFn: async () => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      return githubService.getJournalRepositories();
    },
    enabled: !!githubAccessToken && !!githubUsername,
  });

  // Mutation to create a new journal repository
  const createRepository = useMutation({
    mutationFn: async (customName?: string) => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      return githubService.createJournalRepository(customName);
    },
    onSuccess: (newRepoName) => {
      // Invalidate and refetch repository queries
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      queryClient.invalidateQueries({ queryKey: ["journalRepositories"] });

      // Set the newly created repository as selected
      setSelectedRepo(newRepoName);
      githubService.setCurrentRepo(newRepoName);
    },
  });

  // Function to select a repository
  const selectRepository = (repoName: string) => {
    setSelectedRepo(repoName);
    githubService.setCurrentRepo(repoName);

    // Invalidate journal entries to force refetch with new repo
    queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
  };

  // Get current repository name
  const getCurrentRepo = () => {
    return selectedRepo || githubService.getCurrentRepoName();
  };

  // Initialize selected repo with default if not set
  useEffect(() => {
    if (!selectedRepo && githubAccessToken && githubUsername) {
      const defaultRepo = githubService.getCurrentRepoName();
      setSelectedRepo(defaultRepo);
    }
  }, [githubAccessToken, githubUsername, selectedRepo]);

  return {
    repositories: repositoriesQuery.data || [],
    journalRepositories: journalRepositoriesQuery.data || [],
    isLoadingRepositories:
      repositoriesQuery.isLoading || journalRepositoriesQuery.isLoading,
    repositoriesError:
      repositoriesQuery.error || journalRepositoriesQuery.error,
    selectedRepo: getCurrentRepo(),
    selectRepository,
    createRepository,
    refetchRepositories: () => {
      repositoriesQuery.refetch();
      journalRepositoriesQuery.refetch();
    },
  };
}
