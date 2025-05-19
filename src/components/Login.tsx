import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
} from "@chakra-ui/react";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginWithGithub, currentUser, githubAccessToken, githubUsername } =
    useAuth();
  const navigate = useNavigate();

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // Effect to navigate to journals when GitHub auth is complete
  useEffect(() => {
    if (currentUser && githubAccessToken) {
      console.log("GitHub auth complete with data:", {
        user: currentUser?.email,
        githubToken: githubAccessToken
          ? githubAccessToken.substring(0, 10) + "..."
          : "Missing",
        githubUsername: githubUsername || "Not set",
      });
      // Small delay to allow GitHub service to initialize properly
      const timer = setTimeout(() => {
        navigate("/journals");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentUser, githubAccessToken, githubUsername, navigate]);

  async function handleGithubLogin() {
    try {
      setError("");
      setLoading(true);
      await loginWithGithub();
    } catch (err) {
      console.error("Login error:", err);
      setError(
        `Failed to sign in with GitHub: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxW="md" py={10}>
      <Box
        p={8}
        borderWidth={1}
        borderRadius="lg"
        boxShadow="lg"
        bg={bgColor}
        borderColor={borderColor}
      >
        <VStack spacing={6}>
          <Heading size="lg">Welcome to Privacy Journal</Heading>

          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <AlertTitle>Open Source & Secure</AlertTitle>
            <AlertDescription>
              This application is open source and you can review the code on
              GitHub. We do not store any API keys on our servers - they are
              encrypted and stored locally in your browser.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <VStack spacing={3} align="stretch" w="full">
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

          <Button
            variant="github"
            onClick={handleGithubLogin}
            isLoading={loading}
            loadingText="Logging in..."
            w="full"
            size="lg"
          >
            Login with GitHub
          </Button>
        </VStack>
      </Box>
    </Container>
  );
}
