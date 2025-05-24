import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Avatar,
  Alert,
  AlertIcon,
  useColorModeValue,
} from "@chakra-ui/react";

export default function Dashboard() {
  const [error, setError] = useState("");
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  async function handleLogout() {
    try {
      setError("");
      await logout();
      navigate("/ ");
    } catch {
      setError("Failed to log out");
    }
  }

  function navigateToJournals() {
    navigate("/journals");
  }

  return (
    <Container maxW="container.md" py={8}>
      <Box
        p={8}
        borderWidth={1}
        borderRadius="lg"
        boxShadow="lg"
        bg={bgColor}
        borderColor={borderColor}
      >
        <VStack spacing={6} align="stretch">
          <Heading size="lg">Dashboard</Heading>

          {currentUser?.photoURL && (
            <Box textAlign="center">
              <Avatar
                size="2xl"
                src={currentUser.photoURL}
                name={currentUser.email || "User"}
                mb={4}
              />
            </Box>
          )}

          <VStack spacing={3} align="stretch">
            <Box>
              <Text fontWeight="bold" display="inline">
                Email:
              </Text>{" "}
              <Text display="inline">
                {currentUser?.email || "No email available"}
              </Text>
            </Box>
            <Box>
              <Text fontWeight="bold" display="inline">
                User ID:
              </Text>{" "}
              <Text display="inline">{currentUser?.uid}</Text>
            </Box>
          </VStack>

          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <HStack spacing={4} justify="center">
            <Button
              colorScheme="blue"
              onClick={navigateToJournals}
              size="lg"
            >
              My Journals
            </Button>
            <Button
              variant="logout"
              onClick={handleLogout}
              size="lg"
            >
              Log Out
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Container>
  );
}
