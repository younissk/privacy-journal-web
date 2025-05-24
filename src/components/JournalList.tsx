import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  useDisclosure,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  IconButton,
} from "@chakra-ui/react";
import { AddIcon, HamburgerIcon } from "@chakra-ui/icons";
import Loader from "./Loader";
import CreateFolderModal from "./CreateFolderModal";
import { useJournalEntries } from "../hooks/useJournalEntries";
import { useFolders } from "../hooks/useFolders";
import type { JournalEntry, Folder } from "../services/GithubService";

export default function JournalList() {
  const [retrying, setRetrying] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const navigate = useNavigate();

  const { entries, isLoading, error, refetch, createEntry } =
    useJournalEntries();
  const { folders, isLoading: foldersLoading, deleteFolder } = useFolders();
  const {
    isOpen: isCreateFolderOpen,
    onOpen: onCreateFolderOpen,
    onClose: onCreateFolderClose,
  } = useDisclosure();

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const cardBgColor = useColorModeValue("white", "gray.700");
  const folderBgColor = useColorModeValue("blue.50", "blue.900");
  const shadowColor = useColorModeValue(
    "rgba(0, 0, 0, 0.1)",
    "rgba(0, 0, 0, 0.3)"
  );

  async function handleRetryWithUniqueRepo() {
    try {
      setRetrying(true);
      const success = await createEntry.mutateAsync({
        title: "Test Entry",
        content: "Testing repository creation...",
      });
      if (success) {
        await refetch();
      }
    } catch (error) {
      console.error("Error during retry:", error);
    } finally {
      setRetrying(false);
    }
  }

  function handleCreateNew() {
    navigate("/journal/new");
  }

  function handleEntryClick(id: string) {
    navigate(`/journal/${id}`);
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this folder? Entries in this folder will not be deleted."
      )
    ) {
      try {
        await deleteFolder.mutateAsync(folderId);
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
        }
      } catch (error) {
        console.error("Error deleting folder:", error);
      }
    }
  };

  if (isLoading || foldersLoading) {
    return <Loader text="Loading journal entries..." />;
  }

  // Filter entries based on selected folder
  const filteredEntries = selectedFolderId
    ? entries.filter((entry) => entry.folderId === selectedFolderId)
    : entries;

  const selectedFolder = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId)
    : null;

  // Group folders by root folders only (no nested display for simplicity)
  const rootFolders = folders.filter((folder) => !folder.parentId);

  const renderFolderCard = (folder: Folder) => (
    <Card
      key={`folder-${folder.id}`}
      bg={selectedFolderId === folder.id ? folderBgColor : cardBgColor}
      borderWidth={1}
      borderColor={selectedFolderId === folder.id ? "blue.300" : borderColor}
      cursor="pointer"
      _hover={{ borderColor: "blue.300", transform: "translateY(-1px)" }}
      transition="all 0.2s"
      onClick={() =>
        setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)
      }
    >
      <CardHeader>
        <HStack justify="space-between" align="center">
          <HStack spacing={3}>
            <Box
              w={4}
              h={4}
              bg={folder.color || "gray.400"}
              borderRadius="sm"
              flexShrink={0}
            />
            <VStack align="start" spacing={0}>
              <Heading size="sm">{folder.name}</Heading>
              {folder.description && (
                <Text fontSize="xs" color="gray.500" noOfLines={1}>
                  {folder.description}
                </Text>
              )}
            </VStack>
          </HStack>

          <HStack spacing={2}>
            <Badge size="sm" colorScheme="blue">
              {entries.filter((e) => e.folderId === folder.id).length} entries
            </Badge>
            <Menu>
              <MenuButton
                as={IconButton}
                size="xs"
                variant="ghost"
                icon={<HamburgerIcon />}
                aria-label="Folder options"
                onClick={(e) => e.stopPropagation()}
              />
              <MenuList>
                <MenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFolder(folder.id);
                  }}
                >
                  Delete Folder
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </HStack>
      </CardHeader>
    </Card>
  );

  const renderEntryCard = (entry: JournalEntry) => (
    <Card
      key={`entry-${entry.id}`}
      bg={cardBgColor}
      cursor="pointer"
      onClick={() => handleEntryClick(entry.id)}
      _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
      transition="all 0.2s"
    >
      <CardHeader>
        <HStack justify="space-between" align="start">
          <Heading size="md" noOfLines={1}>
            {entry.title}
          </Heading>
          {entry.folderId && (
            <Badge size="sm" colorScheme="blue" flexShrink={0}>
              {folders.find((f) => f.id === entry.folderId)?.name || "Unknown"}
            </Badge>
          )}
        </HStack>
      </CardHeader>
      <CardBody>
        <Text noOfLines={3}>
          {entry.content.length > 100
            ? `${entry.content.substring(0, 100)}...`
            : entry.content}
        </Text>
      </CardBody>
      <Divider />
      <CardFooter>
        <VStack align="stretch" spacing={1} w="full">
          <Text fontSize="sm" color="gray.500">
            Created: {new Date(entry.createdAt).toLocaleDateString()}
          </Text>
          <Text fontSize="sm" color="gray.500">
            Updated: {new Date(entry.updatedAt).toLocaleDateString()}
          </Text>
        </VStack>
      </CardFooter>
    </Card>
  );

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" align="center">
          <Heading size="lg">Your Journal</Heading>
          <Button
            size="md"
            leftIcon={<AddIcon />}
            onClick={onCreateFolderOpen}
            variant="outline"
            colorScheme="blue"
          >
            New Folder
          </Button>
        </HStack>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : String(error)}
              </AlertDescription>
            </Box>
            <HStack spacing={2}>
              <Button
                colorScheme="red"
                onClick={handleRetryWithUniqueRepo}
                isLoading={retrying}
                loadingText="Creating..."
                size="sm"
              >
                Retry with New Repository
              </Button>
              <Button
                onClick={() => refetch()}
                isLoading={isLoading || retrying}
                size="sm"
              >
                Retry Current Repository
              </Button>
            </HStack>
          </Alert>
        )}

        {selectedFolder && (
          <Box
            p={4}
            bg={folderBgColor}
            borderWidth={1}
            borderColor="blue.300"
            borderRadius="md"
          >
            <HStack spacing={3}>
              <Box
                w={5}
                h={5}
                bg={selectedFolder.color || "gray.400"}
                borderRadius="sm"
              />
              <VStack align="start" spacing={1}>
                <Heading size="md">{selectedFolder.name}</Heading>
                {selectedFolder.description && (
                  <Text fontSize="sm" color="gray.600">
                    {selectedFolder.description}
                  </Text>
                )}
                <Text fontSize="sm" color="gray.500">
                  {filteredEntries.length} entries in this folder
                </Text>
              </VStack>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedFolderId(null)}
                ml="auto"
              >
                Show All
              </Button>
            </HStack>
          </Box>
        )}

        <HStack justify="space-between" align="center">
          <Text fontSize="sm" color="gray.500">
            {selectedFolderId
              ? `Showing ${filteredEntries.length} entries from "${selectedFolder?.name}"`
              : `${entries.length} total entries • ${rootFolders.length} folders`}
          </Text>
          <Button
            size="sm"
            onClick={() => refetch()}
            isLoading={isLoading}
            loadingText="Refreshing..."
            variant="ghost"
          >
            Refresh
          </Button>
        </HStack>

        {!selectedFolderId && rootFolders.length > 0 && (
          <VStack align="stretch" spacing={4}>
            <Heading size="md">Folders</Heading>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
              {rootFolders.map(renderFolderCard)}
            </SimpleGrid>
          </VStack>
        )}

        <VStack align="stretch" spacing={4}>
          <Heading size="md">
            {selectedFolderId ? "Entries in Folder" : "All Entries"}
          </Heading>

          {filteredEntries.length === 0 ? (
            <Box
              p={8}
              textAlign="center"
              borderRadius="md"
              bg={bgColor}
              borderWidth={1}
              borderColor={borderColor}
            >
              <Text fontSize="lg" mb={2} color="gray.500">
                {selectedFolderId
                  ? "No entries in this folder yet."
                  : "No journal entries yet."}
              </Text>
              <Text fontSize="sm" color="gray.400">
                {selectedFolderId
                  ? "Create a new entry and assign it to this folder."
                  : "Create your first journal entry to get started."}
              </Text>
            </Box>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {filteredEntries.map(renderEntryCard)}
            </SimpleGrid>
          )}
        </VStack>
      </VStack>

      {/* Floating Action Button for New Entry */}
      <IconButton
        aria-label="Create new entry"
        icon={<AddIcon />}
        size="lg"
        colorScheme="blue"
        isRound
        position="fixed"
        bottom={6}
        right={6}
        boxShadow={`0 4px 20px ${shadowColor}`}
        _hover={{
          transform: "scale(1.05)",
          boxShadow: `0 6px 25px ${shadowColor}`,
        }}
        transition="all 0.2s"
        zIndex={1000}
        onClick={handleCreateNew}
      />

      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={onCreateFolderClose}
      />
    </Container>
  );
}
