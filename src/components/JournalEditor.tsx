import { useParams } from "react-router-dom";
import { Box, useColorModeValue } from "@chakra-ui/react";
import { useState } from "react";
import { DeleteConfirmationDialog } from "./JournalEditor/DeleteConfirmationDialog";
import { SimplifiedJournalForm } from "./JournalEditor/SimplifiedJournalForm";
import { EditorNavbar } from "./EditorNavbar";
import FloatingVoiceRecorder from "./FloatingVoiceRecorder";
import { useJournalEditorState } from "../hooks/useJournalEditorState";
import Loader from "./Loader";

export default function JournalEditor() {
  const { id } = useParams();
  const isNewEntry = id === "new";
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const {
    title,
    content,
    folderId,
    hasUnsavedChanges,
    isLoading,
    isSaving,
    isDeleting,
    entry,
    handleTitleChange,
    handleContentChange,
    handleFolderChange,
    handleVoiceTranscription,
    saveEntry,
    handleDelete,
    goBack,
  } = useJournalEditorState({ id, isNewEntry });

  const bgColor = useColorModeValue("white", "gray.900");
  const textColor = useColorModeValue("gray.800", "gray.100");

  if (isLoading && !isNewEntry) {
    return <Loader fullHeight text="Loading journal entry..." />;
  }

  const onConfirmDelete = async () => {
    await handleDelete();
    setIsDeleteAlertOpen(false);
  };

  return (
    <Box
      height="100vh"
      width="100%"
      bg={bgColor}
      color={textColor}
      position="relative"
    >
      <EditorNavbar
        onBack={goBack}
        onSave={saveEntry}
        onDelete={() => setIsDeleteAlertOpen(true)}
        folderId={folderId}
        onFolderChange={handleFolderChange}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        isNewEntry={isNewEntry}
      />

      <SimplifiedJournalForm
        title={title}
        content={content}
        lastSaved={entry?.updatedAt ? new Date(entry.updatedAt) : null}
        onTitleChange={handleTitleChange}
        onContentChange={handleContentChange}
      />

      <FloatingVoiceRecorder
        onTranscriptionComplete={handleVoiceTranscription}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteAlertOpen}
        onClose={() => setIsDeleteAlertOpen(false)}
        onConfirm={onConfirmDelete}
        isLoading={isDeleting}
      />
    </Box>
  );
}
