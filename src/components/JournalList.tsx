import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { githubService } from "../services/GithubService";
import type { JournalEntry } from "../services/GithubService";
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
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  useColorModeValue,
  Spinner,
  Center,
  Divider,
} from "@chakra-ui/react";

export default function JournalList() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { githubAccessToken, githubUsername, currentUser } = useAuth();
  const navigate = useNavigate();

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const cardBgColor = useColorModeValue("white", "gray.700");

  async function loadEntries() {
    if (!githubAccessToken || !githubUsername) {
      setError(
        `GitHub authorization required. Token: ${
          githubAccessToken ? "Present" : "Missing"
        }, Username: ${githubUsername || "Missing"}`
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      githubService.initialize(githubAccessToken, githubUsername);
      const journalEntries = await githubService.getAllJournalEntries();
      console.log(`Got ${journalEntries.length} journal entries from service`);
      setEntries(journalEntries);
    } catch (error) {
      console.error("Error loading journal entries:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (errorMessage.includes("Not Found")) {
        setError(
          "Repository not found. Please try creating a new journal entry or use the retry button below."
        );
      } else if (errorMessage.includes("already exists")) {
        setError(
          "Repository exists but cannot be accessed. Click 'Retry with New Repository' to create a new one."
        );
      } else {
        setError(`Failed to load journal entries: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
      setRetrying(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, [githubAccessToken, githubUsername]);

  async function handleRetryWithUniqueRepo() {
    try {
      setRetrying(true);
      setError("Creating a new repository with a unique name...");

      const success = await githubService.retryGitHubConnection();

      if (success) {
        setError("");
        const journalEntries = await githubService.getAllJournalEntries();
        setEntries(journalEntries);
      } else {
        setError(
          "Failed to create a new repository. Try again or create a new entry."
        );
      }
    } catch (error) {
      console.error("Error during retry:", error);
      setError(
        `Retry failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setRetrying(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadEntries();
    } finally {
      setRefreshing(false);
    }
  }

  function handleCreateNew() {
    navigate("/journal/new");
  }

  function handleEntryClick(id: string) {
    navigate(`/journal/${id}`);
  }

  if (loading) {
    return (
      <Center h="50vh">
        <Spinner size="xl" />
      </Center>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg">Your Journal Entries</Heading>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
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
                onClick={loadEntries}
                isLoading={loading || retrying || refreshing}
                size="sm"
              >
                Retry Current Repository
              </Button>
            </HStack>
          </Alert>
        )}

        <Box
          p={4}
          borderRadius="md"
          bg={bgColor}
          borderWidth={1}
          borderColor={borderColor}
        >
          <VStack spacing={2} align="stretch">
            <Text fontSize="sm" color="gray.500">
              Current user: {currentUser?.email || "Not logged in"}
            </Text>
            <Text fontSize="sm" color="gray.500">
              GitHub username: {githubUsername || "Not set"}
            </Text>
            <Text fontSize="sm" color="gray.500">
              GitHub token: {githubAccessToken ? "Present" : "Missing"}
            </Text>
          </VStack>
        </Box>

        <HStack spacing={4}>
          <Button colorScheme="blue" onClick={handleCreateNew} size="lg">
            Create New Entry
          </Button>
          <Button
            onClick={handleRefresh}
            isLoading={refreshing}
            loadingText="Refreshing..."
            size="lg"
          >
            Refresh Entries
          </Button>
        </HStack>

        {entries.length === 0 ? (
          <Box
            p={8}
            textAlign="center"
            borderRadius="md"
            bg={bgColor}
            borderWidth={1}
            borderColor={borderColor}
          >
            <Text fontSize="lg" mb={2}>
              No journal entries yet. Create your first one!
            </Text>
            {!error && (
              <Text fontSize="sm" color="gray.500">
                After creating an entry, you might need to click "Refresh
                Entries" to see it in the list.
              </Text>
            )}
          </Box>
        ) : (
          <>
            <Text fontSize="sm" color="gray.500">
              Found {entries.length} journal entries
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {entries.map((entry) => (
                <Card
                  key={entry.id}
                  bg={cardBgColor}
                  cursor="pointer"
                  onClick={() => handleEntryClick(entry.id)}
                  _hover={{ transform: "translateY(-2px)", shadow: "lg" }}
                  transition="all 0.2s"
                >
                  <CardHeader>
                    <Heading size="md">{entry.title}</Heading>
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
                        Created:{" "}
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </Text>
                      <Text fontSize="sm" color="gray.500">
                        Updated:{" "}
                        {new Date(entry.updatedAt).toLocaleDateString()}
                      </Text>
                    </VStack>
                  </CardFooter>
                </Card>
              ))}
            </SimpleGrid>
          </>
        )}
      </VStack>
    </Container>
  );
}
