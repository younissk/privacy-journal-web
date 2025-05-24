import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { githubService } from "../services/GithubService";
import type { Flow, FlowStep } from "../services/GithubService";
import { useAuth } from "../contexts/AuthContext";

export function useFlows() {
  const { githubAccessToken, githubUsername } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["flows", githubAccessToken, githubUsername, githubService.getCurrentRepoName()],
    queryFn: async () => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.getAllFlows();
    },
    enabled: !!githubAccessToken && !!githubUsername,
  });

  const createFlow = useMutation({
    mutationFn: async (flow: { title: string; description?: string; steps: FlowStep[] }) => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.createFlow(flow.title, flow.description, flow.steps);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });

  const updateFlow = useMutation({
    mutationFn: async (flow: Flow) => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.updateFlow(flow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });

  const deleteFlow = useMutation({
    mutationFn: async (id: string) => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.deleteFlow(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
    },
  });

  const getFlowById = (id: string): Flow | undefined => {
    return (query.data || []).find((f) => f.id === id);
  };

  return {
    flows: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createFlow,
    updateFlow,
    deleteFlow,
    getFlowById,
  };
} 