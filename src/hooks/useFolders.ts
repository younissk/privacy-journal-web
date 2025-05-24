import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { githubService } from "../services/GithubService";
import type { Folder } from "../services/GithubService";
import { useAuth } from "../contexts/AuthContext";

export function useFolders() {
  const { githubAccessToken, githubUsername } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [
      "folders",
      githubAccessToken,
      githubUsername,
      githubService.getCurrentRepoName(),
    ],
    queryFn: async () => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.getAllFolders();
    },
    enabled: !!githubAccessToken && !!githubUsername,
  });

  const createFolder = useMutation({
    mutationFn: async (folder: {
      name: string;
      description?: string;
      parentId?: string;
      color?: string;
    }) => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.createFolder(
        folder.name,
        folder.description,
        folder.parentId,
        folder.color
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });

  const updateFolder = useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      color,
    }: {
      id: string;
      name: string;
      description?: string;
      color?: string;
    }) => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.updateFolder(id, name, description, color);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.deleteFolder(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
    },
  });

  const moveFolder = useMutation({
    mutationFn: async ({
      folderId,
      newParentId,
    }: {
      folderId: string;
      newParentId?: string;
    }) => {
      if (!githubAccessToken || !githubUsername) {
        throw new Error("GitHub authorization required");
      }
      githubService.initialize(githubAccessToken, githubUsername);
      return githubService.moveFolder(folderId, newParentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    },
  });

  // Helper functions for folder organization
  const getRootFolders = () => {
    return (query.data || []).filter((folder) => !folder.parentId);
  };

  const getSubfolders = (parentId: string) => {
    return (query.data || []).filter((folder) => folder.parentId === parentId);
  };

  const getFolderById = (id: string) => {
    return (query.data || []).find((folder) => folder.id === id);
  };

  const getFolderPath = (folderId: string): Folder[] => {
    const path: Folder[] = [];
    let currentFolder = getFolderById(folderId);
    
    while (currentFolder) {
      path.unshift(currentFolder);
      currentFolder = currentFolder.parentId 
        ? getFolderById(currentFolder.parentId)
        : undefined;
    }
    
    return path;
  };

  return {
    folders: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    getRootFolders,
    getSubfolders,
    getFolderById,
    getFolderPath,
  };
} 