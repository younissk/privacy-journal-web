import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Center,
  Spinner,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { useState } from "react";
import { EditorHeader } from "./JournalEditor/EditorHeader";
import { DeleteConfirmationDialog } from "./JournalEditor/DeleteConfirmationDialog";
import { JournalForm } from "./JournalEditor/JournalForm";
import { useJournalOperations } from "../hooks/useJournalOperations";

export default function JournalEditor() {
  const { id } = useParams();
  const isNewEntry = id === "new";
  const navigate = useNavigate();
  const { isOpen: isControlsVisible, onToggle: toggleControls } = useDisclosure(
    {
      defaultIsOpen: true,
    }
  );
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const {
    title,
    setTitle,
    content,
    setContent,
    loading,
    saving,
    lastSaved,
    handleSave,
    handleDelete,
  } = useJournalOperations({ id, isNewEntry });

  const bgColor = useColorModeValue("white", "gray.900");
  const textColor = useColorModeValue("gray.800", "gray.100");

  if (loading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Box
      height="100vh"
      width="100%"
      bg={bgColor}
      color={textColor}
      position="relative"
      onClick={() => {
        if (!isControlsVisible) toggleControls();
      }}
    >
      <EditorHeader
        isNewEntry={isNewEntry}
        isControlsVisible={isControlsVisible}
        saving={saving}
        onBack={() => navigate("/journals")}
        onSave={handleSave}
        onDelete={() => setIsDeleteAlertOpen(true)}
      />

      <JournalForm
        title={title}
        content={content}
        lastSaved={lastSaved}
        onTitleChange={setTitle}
        onContentChange={setContent}
      />

      <DeleteConfirmationDialog
        isOpen={isDeleteAlertOpen}
        onClose={() => setIsDeleteAlertOpen(false)}
        onConfirm={handleDelete}
        isLoading={saving}
      />
    </Box>
  );
}
