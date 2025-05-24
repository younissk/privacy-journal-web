import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  useColorModeValue,
  SimpleGrid,
  Alert,
  AlertIcon,
  AlertDescription,
  Progress,
  Badge,
  Divider,
  useToast,
  InputGroup,
  InputLeftElement,
} from "@chakra-ui/react";
import { SearchIcon, RepeatIcon } from "@chakra-ui/icons";
import { useSemanticSearch } from "../hooks/useSemanticSearch";
import { githubService } from "../services/GithubService";
import { useAuth } from "../contexts/AuthContext";
import { useFolders } from "../hooks/useFolders";
import type { JournalEntry } from "../services/GithubService";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState({ processed: 0, total: 0 });
  const { results, loading, error, search } = useSemanticSearch();
  const { githubAccessToken, githubUsername } = useAuth();
  const { folders } = useFolders();
  const navigate = useNavigate();
  const toast = useToast();

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const cardBgColor = useColorModeValue("white", "gray.700");

  const handleSearch = async () => {
    if (!query.trim()) return;
    await search(query.trim());
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  const handleIndexJournals = async () => {
    if (!githubAccessToken || !githubUsername) {
      toast({
        title: "Error",
        description: "GitHub authorization required",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsIndexing(true);
      setIndexingProgress({ processed: 0, total: 0 });

      githubService.initialize(githubAccessToken, githubUsername);
      
      const result = await githubService.rebuildVectorIndex((processed, total) => {
        setIndexingProgress({ processed, total });
      });

      toast({
        title: "Indexing Complete",
        description: `Processed ${result.processed} entries${
          result.errors > 0 ? ` with ${result.errors} errors` : ""
        }`,
        status: result.errors > 0 ? "warning" : "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      console.error("Indexing failed:", err);
      toast({
        title: "Indexing Failed",
        description: err instanceof Error ? err.message : "Unknown error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsIndexing(false);
      setIndexingProgress({ processed: 0, total: 0 });
    }
  };

  const handleEntryClick = (id: string) => {
    navigate(`/journal/${id}`);
  };

  const renderEntryCard = (entry: JournalEntry) => {
    const folder = entry.folderId ? folders.find((f) => f.id === entry.folderId) : null;

    return (
      <Card
        key={`search-result-${entry.id}`}
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
            {folder && (
              <Badge size="sm" colorScheme="blue" flexShrink={0}>
                {folder.name}
              </Badge>
            )}
          </HStack>
        </CardHeader>
        <CardBody>
          <Text noOfLines={3}>
            {entry.content.length > 150
              ? `${entry.content.substring(0, 150)}...`
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
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>
            Search Your Journals
          </Heading>
          <Text color="gray.500">
            Use semantic search to find entries by meaning, not just keywords
          </Text>
        </Box>

        <Card bg={bgColor} borderColor={borderColor} borderWidth={1}>
          <CardBody>
            <VStack spacing={4}>
              <InputGroup size="lg">
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.300" />
                </InputLeftElement>
                <Input
                  placeholder="Search your journal entries (e.g., 'feeling grateful', 'work challenges', 'weekend activities')"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  bg={useColorModeValue("white", "gray.700")}
                />
              </InputGroup>

              <HStack spacing={4} w="full">
                <Button
                  colorScheme="blue"
                  size="lg"
                  onClick={handleSearch}
                  isLoading={loading}
                  loadingText="Searching..."
                  disabled={!query.trim()}
                  flex={1}
                >
                  Search
                </Button>
                
                <Button
                  leftIcon={<RepeatIcon />}
                  onClick={handleIndexJournals}
                  isLoading={isIndexing}
                  loadingText="Indexing..."
                  variant="outline"
                  size="lg"
                >
                  Index Journals
                </Button>
              </HStack>

              {isIndexing && indexingProgress.total > 0 && (
                <Box w="full">
                  <Text fontSize="sm" mb={2}>
                    Indexing journal entries: {indexingProgress.processed} / {indexingProgress.total}
                  </Text>
                  <Progress
                    value={(indexingProgress.processed / indexingProgress.total) * 100}
                    colorScheme="blue"
                    size="sm"
                  />
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <AlertDescription>
              {error.message}
            </AlertDescription>
          </Alert>
        )}

        {results.length > 0 && (
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between" align="center">
              <Heading size="md">Search Results</Heading>
              <Text fontSize="sm" color="gray.500">
                Found {results.length} relevant entries
              </Text>
            </HStack>

            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {results.map(renderEntryCard)}
            </SimpleGrid>
          </VStack>
        )}

        {!loading && !error && query && results.length === 0 && (
          <Box
            p={8}
            textAlign="center"
            borderRadius="md"
            bg={bgColor}
            borderWidth={1}
            borderColor={borderColor}
          >
            <Text fontSize="lg" mb={2} color="gray.500">
              No results found for "{query}"
            </Text>
            <Text fontSize="sm" color="gray.400">
              Try different keywords or make sure your journals are indexed
            </Text>
          </Box>
        )}

        {!query && !loading && (
          <Box
            p={8}
            textAlign="center"
            borderRadius="md"
            bg={bgColor}
            borderWidth={1}
            borderColor={borderColor}
          >
            <Text fontSize="lg" mb={2} color="gray.500">
              Start your semantic search
            </Text>
            <Text fontSize="sm" color="gray.400">
              Enter a query above to find journal entries by meaning and context
            </Text>
          </Box>
        )}
      </VStack>
    </Container>
  );
} 