import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { githubService } from "../services/GithubService";
import type { JournalEntry } from "../services/GithubService";
import {
  Box,
  Flex,
  IconButton,
  Input,
  Textarea,
  useColorModeValue,
  Spinner,
  Center,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  Text,
  useDisclosure,
  Fade,
} from "@chakra-ui/react";
import { ChevronLeftIcon, DeleteIcon, CheckIcon } from "@chakra-ui/icons";

export default function JournalEditor() {
  const { id } = useParams();
  const isNewEntry = id === "new";
  const navigate = useNavigate();
  const { githubAccessToken, githubUsername } = useAuth();
  const toast = useToast();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const { isOpen: isControlsVisible, onToggle: toggleControls } = useDisclosure(
    { defaultIsOpen: true }
  );
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const bgColor = useColorModeValue("white", "gray.900");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const placeholderColor = useColorModeValue("gray.400", "gray.500");
  const subtleColor = useColorModeValue("gray.500", "gray.400");
  const borderColor = useColorModeValue("gray.100", "gray.800");

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

  async function handleSave() {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your journal entry",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!githubAccessToken || !githubUsername) {
      toast({
        title: "Authentication Required",
        description: "GitHub authorization is required",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
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

        if (isNewEntry) {
          navigate(`/journal/${savedEntry.id}`);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to save journal entry",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error saving journal entry:", error);
      toast({
        title: "Error saving",
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "bottom-right",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!githubAccessToken || !githubUsername) {
      toast({
        title: "Authentication Required",
        description: "GitHub authorization is required",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
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
          navigate("/journals");
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
    } catch (error) {
      console.error("Error deleting journal entry:", error);
      toast({
        title: "Error",
        description: "Failed to delete journal entry",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
      setIsDeleteAlertOpen(false);
    }
  }

  function handleCancel() {
    navigate("/journals");
  }

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
      <Fade in={isControlsVisible} unmountOnExit={false}>
        <Flex
          position="absolute"
          top={0}
          left={0}
          right={0}
          p={4}
          alignItems="center"
          bg={bgColor}
          borderBottomWidth="1px"
          borderColor={borderColor}
          zIndex={10}
        >
          <IconButton
            aria-label="Back to journals"
            icon={<ChevronLeftIcon boxSize={6} />}
            onClick={handleCancel}
            variant="ghost"
            mr={4}
            size="sm"
          />

          <Flex flex={1} justifyContent="flex-end">
            {!isNewEntry && (
              <IconButton
                aria-label="Delete entry"
                icon={<DeleteIcon />}
                onClick={() => setIsDeleteAlertOpen(true)}
                isDisabled={saving}
                variant="ghost"
                colorScheme="red"
                mr={2}
                size="sm"
              />
            )}
            <IconButton
              aria-label="Save entry"
              icon={<CheckIcon />}
              onClick={handleSave}
              isLoading={saving}
              colorScheme="blue"
              variant="ghost"
              size="sm"
            />
          </Flex>
        </Flex>
      </Fade>

      <Box
        pt={16}
        px={{ base: 4, md: 8, lg: 16, xl: 32 }}
        maxWidth="900px"
        mx="auto"
        height="calc(100vh - 16px)"
        overflowY="auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
          onChange={(e) => setContent(e.target.value)}
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

      <AlertDialog
        isOpen={isDeleteAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDeleteAlertOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Journal Entry
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? This cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                onClick={() => setIsDeleteAlertOpen(false)}
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDelete}
                ml={3}
                isLoading={saving}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
