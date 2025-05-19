import { Box, Input, Textarea, Text, useColorModeValue } from "@chakra-ui/react";

interface JournalFormProps {
  title: string;
  content: string;
  lastSaved: Date | null;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
}

export function JournalForm({
  title,
  content,
  lastSaved,
  onTitleChange,
  onContentChange,
}: JournalFormProps) {
  const placeholderColor = useColorModeValue("gray.400", "gray.500");
  const subtleColor = useColorModeValue("gray.500", "gray.400");

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

      <Textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="Write your thoughts here..."
        border="none"
        fontSize={{ base: "md", md: "lg" }}
        lineHeight="tall"
        resize="none"
        p={0}
        height="calc(100vh - 180px)"
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