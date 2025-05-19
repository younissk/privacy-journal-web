import { useState, useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import { useAuth } from "../contexts/AuthContext";
import { githubService } from "../services/GithubService";
import type { JournalEntry } from "../services/GithubService";

interface UseJournalOperationsProps {
  id?: string;
  isNewEntry: boolean;
}

export function useJournalOperations({ id, isNewEntry }: UseJournalOperationsProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const toast = useToast();
  const { githubAccessToken, githubUsername } = useAuth();

  useEffect(() => {
    async function loadEntry() {
      if (!githubAccessToken || !githubUsername) {
        toast({
          title: "Authentication Required",
          description: "GitHub authorization is required",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        setLoading(false);
        return;
      }

      if (isNewEntry) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        githubService.initialize(githubAccessToken, githubUsername);

        if (id) {
          const entry = await githubService.getJournalEntryById(id);
          if (entry) {
            setTitle(entry.title);
            setContent(entry.content);
          } else {
            toast({
              title: "Not Found",
              description: "Journal entry not found",
              status: "error",
              duration: 3000,
              isClosable: true,
            });
          }
        }
      } catch (error) {
        console.error("Error loading journal entry:", error);
        toast({
          title: "Error",
          description: "Failed to load journal entry",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    }

    loadEntry();
  }, [id, isNewEntry, githubAccessToken, githubUsername, toast]);

  const handleSave = async (): Promise<JournalEntry | null> => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your journal entry",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return null;
    }

    if (!githubAccessToken || !githubUsername) {
      toast({
        title: "Authentication Required",
        description: "GitHub authorization is required",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return null;
    }

    try {
      setSaving(true);
      githubService.initialize(githubAccessToken, githubUsername);

      let savedEntry: JournalEntry | null = null;

      if (isNewEntry) {
        savedEntry = await githubService.createJournalEntry(title, content);
      } else if (id) {
        savedEntry = await githubService.updateJournalEntry(id, title, content);
      }

      if (savedEntry) {
        setLastSaved(new Date());
        toast({
          title: "Saved",
          status: "success",
          duration: 2000,
          isClosable: true,
          position: "bottom-right",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save journal entry",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }

      return savedEntry;
    } catch (error) {
      console.error("Error saving journal entry:", error);
      toast({
        title: "Error saving",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom-right",
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<boolean> => {
    if (!githubAccessToken || !githubUsername) {
      toast({
        title: "Authentication Required",
        description: "GitHub authorization is required",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return false;
    }

    try {
      setSaving(true);
      githubService.initialize(githubAccessToken, githubUsername);

      if (id) {
        const success = await githubService.deleteJournalEntry(id);
        if (success) {
          toast({
            title: "Deleted",
            status: "info",
            duration: 2000,
            isClosable: true,
          });
          return true;
        } else {
          toast({
            title: "Error",
            description: "Failed to delete journal entry",
            status: "error",
            duration: 3000,
            isClosable: true,
          });
        }
      }
      return false;
    } catch (error) {
      console.error("Error deleting journal entry:", error);
      toast({
        title: "Error",
        description: "Failed to delete journal entry",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    title,
    setTitle,
    content,
    setContent,
    loading,
    saving,
    lastSaved,
    handleSave,
    handleDelete,
  };
} 