import { useState, useRef } from "react";
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Input,
  useDisclosure,
  useColorModeValue,
  Badge,
  Tooltip,
  InputGroup,
  InputLeftElement,
  List,
  ListItem,
  useOutsideClick,
} from "@chakra-ui/react";
import { AddIcon, RepeatIcon, SearchIcon } from "@chakra-ui/icons";
import { useRepositories } from "../hooks/useRepositories";

export default function RepositorySelector() {
  const {
    repositories,
    journalRepositories,
    isLoadingRepositories,
    repositoriesError,
    selectedRepo,
    selectRepository,
    createRepository,
    refetchRepositories,
  } = useRepositories();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newRepoName, setNewRepoName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useOutsideClick({
    ref: dropdownRef,
    handler: () => setIsDropdownOpen(false),
  });

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const hoverBgColor = useColorModeValue("gray.50", "gray.700");
  const selectedBgColor = useColorModeValue("blue.50", "blue.900");

  const handleRepositoryChange = (repoName: string) => {
    selectRepository(repoName);
    setIsDropdownOpen(false);
    setSearchQuery("");
  };

  const handleCreateRepository = async () => {
    setIsCreating(true);
    try {
      await createRepository.mutateAsync(newRepoName.trim() || undefined);
      setNewRepoName("");
      onClose();
    } catch (error) {
      console.error("Error creating repository:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const getAllRepoOptions = () => {
    // Combine journal repos and all repos, removing duplicates
    const allOptions = [...journalRepositories];

    // Add other repos that might not be classified as journal repos
    repositories.forEach((repo) => {
      if (!allOptions.find((jr) => jr.name === repo.name)) {
        allOptions.push(repo);
      }
    });

    return allOptions.sort((a, b) => a.name.localeCompare(b.name));
  };

  const filteredRepos = getAllRepoOptions().filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (repositoriesError) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <Box>
          <AlertTitle>Repository Error</AlertTitle>
          <AlertDescription>
            {repositoriesError instanceof Error
              ? repositoriesError.message
              : "Failed to load repositories"}
          </AlertDescription>
        </Box>
        <Button ml={4} size="sm" onClick={refetchRepositories}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box
      p={4}
      borderRadius="md"
      bg={bgColor}
      borderWidth={1}
      borderColor={borderColor}
    >
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between" align="center">
          <Text fontWeight="semibold" fontSize="sm">
            Journal Repository
          </Text>
          <Badge colorScheme={selectedRepo ? "green" : "gray"} size="sm">
            {selectedRepo ? "Connected" : "Not Selected"}
          </Badge>
        </HStack>

        <Box position="relative" ref={dropdownRef}>
          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder={
                isLoadingRepositories
                  ? "Loading repositories..."
                  : "Search repositories..."
              }
              disabled={isLoadingRepositories}
            />
          </InputGroup>

          {isDropdownOpen && (
            <List
              position="absolute"
              top="100%"
              left={0}
              right={0}
              mt={1}
              bg={bgColor}
              borderWidth={1}
              borderColor={borderColor}
              borderRadius="md"
              boxShadow="lg"
              maxH="300px"
              overflowY="auto"
              zIndex={10}
            >
              {filteredRepos.length === 0 ? (
                <ListItem p={2} color="gray.500">
                  No repositories found
                </ListItem>
              ) : (
                filteredRepos.map((repo) => (
                  <ListItem
                    key={repo.id}
                    p={2}
                    cursor="pointer"
                    bg={
                      repo.name === selectedRepo
                        ? selectedBgColor
                        : "transparent"
                    }
                    _hover={{ bg: hoverBgColor }}
                    onClick={() => handleRepositoryChange(repo.name)}
                  >
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium">{repo.name}</Text>
                      {repo.description && (
                        <Text fontSize="xs" color="gray.500" noOfLines={1}>
                          {repo.description}
                        </Text>
                      )}
                      <HStack spacing={2}>
                        <Badge
                          size="xs"
                          colorScheme={repo.private ? "purple" : "green"}
                        >
                          {repo.private ? "Private" : "Public"}
                        </Badge>
                        <Text fontSize="xs" color="gray.500">
                          Updated:{" "}
                          {new Date(repo.updated_at).toLocaleDateString()}
                        </Text>
                      </HStack>
                    </VStack>
                  </ListItem>
                ))
              )}
            </List>
          )}
        </Box>

        <HStack spacing={2} justify="flex-end">
          <Tooltip label="Refresh repositories">
            <Button
              size="sm"
              onClick={refetchRepositories}
              isLoading={isLoadingRepositories}
              variant="outline"
            >
              <RepeatIcon />
            </Button>
          </Tooltip>

          <Tooltip label="Create new repository">
            <Button
              size="sm"
              onClick={onOpen}
              colorScheme="blue"
              variant="outline"
            >
              <AddIcon />
            </Button>
          </Tooltip>
        </HStack>

        {selectedRepo && (
          <Text fontSize="xs" color="gray.500">
            Current: {selectedRepo}
          </Text>
        )}

        {journalRepositories.length > 0 && (
          <Text fontSize="xs" color="gray.500">
            Found {journalRepositories.length} journal repositories
          </Text>
        )}
      </VStack>

      {/* Create Repository Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Journal Repository</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                Create a new private repository for your journal entries.
              </Text>
              <Input
                placeholder="Repository name (optional)"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !isCreating) {
                    handleCreateRepository();
                  }
                }}
              />
              <Text fontSize="xs" color="gray.500">
                Leave empty to auto-generate a unique name
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleCreateRepository}
              isLoading={isCreating}
              loadingText="Creating..."
            >
              Create Repository
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
