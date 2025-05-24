import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { openAIService } from "../services/OpenAIService";

export function useOpenAIKey() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["openAIKey"],
    queryFn: () => openAIService.getApiKey(),
  });

  const setKey = useMutation({
    mutationFn: (key: string) => openAIService.setApiKey(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openAIKey"] });
    },
  });

  const clearKey = useMutation({
    mutationFn: () => openAIService.clearApiKey(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["openAIKey"] });
    },
  });

  const testKey = useMutation({
    mutationFn: (key: string) => openAIService.testApiKey(key),
  });

  return {
    apiKey: query.data,
    isLoading: query.isLoading,
    error: query.error,
    setKey,
    clearKey,
    testKey,
  };
}
