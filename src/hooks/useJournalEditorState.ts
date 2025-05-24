import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useJournalEntry } from "./useJournalEntry";
import { useAutoSave } from "./useAutoSave";

interface UseJournalEditorStateOptions {
  id: string | undefined;
  isNewEntry: boolean;
}

export function useJournalEditorState({
  id,
  isNewEntry,
}: UseJournalEditorStateOptions) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { entry, isLoading, updateEntry, deleteEntry } = useJournalEntry(
    isNewEntry ? undefined : id
  );

  // Load entry data when it changes
  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
      setFolderId(entry.folderId);
      setHasUnsavedChanges(false);
    }
  }, [entry]);

  // Track changes
  useEffect(() => {
    if (entry) {
      const hasChanges =
        title !== entry.title ||
        content !== entry.content ||
        folderId !== entry.folderId;
      setHasUnsavedChanges(hasChanges);
    } else if (isNewEntry) {
      setHasUnsavedChanges(title.trim() !== "" || content.trim() !== "");
    }
  }, [title, content, folderId, entry, isNewEntry]);

  const saveEntry = useCallback(async () => {
    try {
      await updateEntry.mutateAsync({
        title: title || "Untitled",
        content,
        folderId,
      });
      setHasUnsavedChanges(false);
      // Navigate back to journals after saving
      navigate("/journals");
    } catch (error) {
      console.error("Error saving entry:", error);
      throw error;
    }
  }, [title, content, folderId, updateEntry, navigate]);

  const autoSave = useCallback(async () => {
    try {
      await updateEntry.mutateAsync({
        title: title || "Untitled",
        content,
        folderId,
      });
      setHasUnsavedChanges(false);
      // Don't navigate on auto-save, only on manual save
    } catch (error) {
      console.error("Auto-save failed:", error);
      throw error;
    }
  }, [title, content, folderId, updateEntry]);

  // Auto-save functionality
  const { triggerAutoSave } = useAutoSave({
    onSave: autoSave,
    enabled: hasUnsavedChanges && !updateEntry.isPending,
    delay: 2000,
  });

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  const handleFolderChange = useCallback(
    (newFolderId: string | undefined) => {
      setFolderId(newFolderId);
      triggerAutoSave();
    },
    [triggerAutoSave]
  );

  const handleDelete = useCallback(async () => {
    try {
      await deleteEntry.mutateAsync();
      navigate("/journals");
    } catch (error) {
      console.error("Error deleting entry:", error);
    }
  }, [deleteEntry, navigate]);

  const handleVoiceTranscription = useCallback(
    (text: string) => {
      const newContent = content ? `${content}\n\n${text}` : text;
      setContent(newContent);
      triggerAutoSave();
    },
    [content, triggerAutoSave]
  );

  return {
    // State
    title,
    content,
    folderId,
    hasUnsavedChanges,
    isLoading,
    isSaving: updateEntry.isPending,
    isDeleting: deleteEntry.isPending,
    entry,

    // Actions
    handleTitleChange,
    handleContentChange,
    handleFolderChange,
    handleVoiceTranscription,
    saveEntry,
    handleDelete,

    // Navigation
    goBack: () => navigate("/journals"),
  };
}
