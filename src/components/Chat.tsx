import { useEffect, useState, useRef } from "react";
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
  Text,
  useColorModeValue,
  IconButton,
  Flex,
  List,
  ListItem,
  Spinner,
} from "@chakra-ui/react";
import { githubService } from "../services/GithubService";
import type { ChatSession, ChatMessage } from "../services/GithubService";
import { openAIService } from "../services/OpenAIService";
import { useAuth } from "../contexts/AuthContext";
import { SearchIcon, AddIcon } from "@chakra-ui/icons";

export default function Chat() {
  const { githubAccessToken, githubUsername } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const bgSidebar = useColorModeValue("gray.50", "gray.900");
  const bgChat = useColorModeValue("white", "gray.800");
  const borderClr = useColorModeValue("gray.200", "gray.700");

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [currentSession?.messages.length]);

  useEffect(() => {
    async function load() {
      if (!githubAccessToken || !githubUsername) return;
      githubService.initialize(githubAccessToken, githubUsername);
      const sess = await githubService.getAllChatSessions();
      setSessions(sess);
      if (sess.length > 0) {
        setCurrentSession(sess[0]);
      }
    }
    load();
  }, [githubAccessToken, githubUsername]);

  const handleCreateSession = async () => {
    const title = `Chat ${new Date().toLocaleString()}`;
    const session = await githubService.createChatSession(title);
    setSessions((prev) => [session, ...prev]);
    setCurrentSession(session);
  };

  const handleSend = async () => {
    if (!input.trim() || !currentSession) return;
    setLoading(true);
    const userMsg: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    // Append user message locally and save
    const updatedSession = await githubService.appendMessageToSession(
      currentSession.id,
      userMsg
    );
    if (!updatedSession) {
      setLoading(false);
      return;
    }
    setCurrentSession(updatedSession);
    setInput("");

    try {
      // Gather context: user profile & relevant journals
      const profile = await githubService.getUserProfile();
      const relevant = await githubService.semanticSearch(userMsg.content, 3);
      const contextText = [
        profile ? `User profile: ${JSON.stringify(profile)}` : "",
        ...relevant.map(
          (e, i) =>
            `Entry ${i + 1}: Title: ${e.title}\nContent:\n${e.content.slice(0, 500)}`
        ),
      ]
        .filter(Boolean)
        .join("\n---\n");

      const messagesForAI = [
        {
          role: "system" as const,
          content:
            "You are the user's personal journal assistant. Use the provided context to answer the user's questions thoughtfully.",
        },
        {
          role: "system" as const,
          content: contextText,
        },
        ...updatedSession.messages.map(({ role, content }) => ({ role, content })),
      ];

      const assistantText = await openAIService.getChatCompletion(messagesForAI);
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: assistantText,
        timestamp: new Date().toISOString(),
      };
      const updatedWithAssistant = await githubService.appendMessageToSession(
        currentSession.id,
        assistantMsg
      );
      if (updatedWithAssistant) {
        setCurrentSession(updatedWithAssistant);
      }
    } catch (err) {
      console.error("Failed to get assistant response", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex h="calc(100vh - 4rem)">
      <Box w={{ base: "0", md: "300px" }} bg={bgSidebar} overflowY="auto" p={4} display={{ base: "none", md: "block" }}>
        <HStack justify="space-between" mb={4}>
          <Text fontWeight="bold">Sessions</Text>
          <IconButton aria-label="New chat" icon={<AddIcon />} size="sm" onClick={handleCreateSession} />
        </HStack>
        <List spacing={2}>
          {sessions.map((s) => (
            <ListItem
              key={s.id}
              p={2}
              borderRadius="md"
              cursor="pointer"
              bg={currentSession?.id === s.id ? "blue.500" : "transparent"}
              color={currentSession?.id === s.id ? "white" : "inherit"}
              _hover={{ bg: currentSession?.id === s.id ? "blue.600" : "gray.100" }}
              onClick={() => setCurrentSession(s)}
            >
              {s.title}
            </ListItem>
          ))}
        </List>
      </Box>

      <VStack flex={1} spacing={0} bg={bgChat} h="full" overflow="hidden">
        <Box flex={1} w="full" p={4} overflowY="auto">
          {currentSession ? (
            <VStack align="stretch" spacing={4}>
              {currentSession.messages.map((m, idx) => (
                <Box key={idx} alignSelf={m.role === "user" ? "flex-end" : "flex-start"} maxW="80%">
                  <Box
                    bg={m.role === "user" ? "blue.500" : "gray.200"}
                    color={m.role === "user" ? "white" : "black"}
                    p={3}
                    borderRadius="md"
                  >
                    <Text whiteSpace="pre-wrap">{m.content}</Text>
                  </Box>
                </Box>
              ))}
              {loading && (
                <Box alignSelf="flex-start">
                  <Spinner size="sm" />
                </Box>
              )}
              <div ref={messagesEndRef} />
            </VStack>
          ) : (
            <VStack h="full" justify="center">
              <Text color="gray.500">Select or create a chat session</Text>
              <Button leftIcon={<AddIcon />} onClick={handleCreateSession}>
                New Chat
              </Button>
            </VStack>
          )}
        </Box>
        {currentSession && (
          <Box w="full" p={4} borderTop="1px" borderColor={borderClr}>
            <HStack>
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <IconButton
                aria-label="Send"
                icon={<SearchIcon />}
                onClick={handleSend}
                isLoading={loading}
              />
            </HStack>
          </Box>
        )}
      </VStack>
    </Flex>
  );
} 