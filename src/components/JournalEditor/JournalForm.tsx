import {
  Box,
  Input,
  Textarea,
  Text,
  useColorModeValue,
  VStack,
  Select,
} from "@chakra-ui/react";
import VoiceRecorder from "../VoiceRecorder";
import { useFolders } from "../../hooks/useFolders";

interface JournalFormProps {
  title: string;
  content: string;
  folderId?: string;
  lastSaved: Date | null;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onFolderChange: (folderId: string | undefined) => void;
}

export function JournalForm({
  title,
  content,
  folderId,
  lastSaved,
  onTitleChange,
  onContentChange,
  onFolderChange,
}: JournalFormProps) {
  const placeholderColor = useColorModeValue("gray.400", "gray.500");
  const subtleColor = useColorModeValue("gray.500", "gray.400");
  const { folders } = useFolders();

  const handleTranscription = (text: string) => {
    // Append the transcribed text to the current content
    onContentChange(content ? `${content}\n\n${text}` : text);
  };

  return (
    <Box
      pt={16}
      px={{ base: 4, md: 8, lg: 16, xl: 32 }}
      maxWidth="900px"
      mx="auto"
      height="calc(100vh - 16px)"
      overflowY="auto"
    >
      <Input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Title"
        border="none"
        fontSize={{ base: "2xl", md: "3xl" }}
        fontWeight="bold"
        p={0}
        my={4}
        _focus={{ boxShadow: "none" }}
        _placeholder={{ color: placeholderColor }}
        spellCheck={true}
      />

      <Box mb={4}>
        <Select
          value={folderId || ""}
          onChange={(e) => onFolderChange(e.target.value || undefined)}
          placeholder="Select folder (optional)"
          size="sm"
          maxWidth="300px"
          variant="filled"
        >
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </Select>
      </Box>

      <VStack spacing={4} align="stretch" mb={4}>
        <VoiceRecorder onTranscriptionComplete={handleTranscription} />
      </VStack>

      <Textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="Write your thoughts here..."
        border="none"
        fontSize={{ base: "md", md: "lg" }}
        lineHeight="tall"
        resize="none"
        p={0}
        height="calc(100vh - 300px)"
        _focus={{ boxShadow: "none" }}
        _placeholder={{ color: placeholderColor }}
        spellCheck={true}
      />

      {lastSaved && (
        <Text fontSize="xs" color={subtleColor} textAlign="right" mt={2}>
          Last saved: {lastSaved.toLocaleTimeString()}
        </Text>
      )}
    </Box>
  );
}
