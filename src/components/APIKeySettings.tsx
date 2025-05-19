import { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Heading,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useColorModeValue,
  Text,
  Spinner,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { openAIService } from '../services/OpenAIService';

export default function APIKeySettings() {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Load existing API key on component mount
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const key = await openAIService.getApiKey();
        if (key) {
          setApiKey(key);
          setHasStoredKey(true);
        }
      } catch (error: unknown) {
        console.error('Error loading API key:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    loadApiKey();
  }, []);

  const handleToggleShow = () => setShowApiKey(!showApiKey);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({
        title: 'Error',
        description: 'API key cannot be empty',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsLoading(true);
      await openAIService.setApiKey(apiKey);
      setHasStoredKey(true);
      toast({
        title: 'Success',
        description: 'Your OpenAI API key has been securely saved.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to save API key. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      setIsLoading(true);
      await openAIService.clearApiKey();
      setApiKey('');
      setHasStoredKey(false);
      setIsKeyValid(null);
      toast({
        title: 'Success',
        description: 'Your OpenAI API key has been removed.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to clear API key. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setIsTesting(true);
      const isValid = await openAIService.testApiKey(apiKey);
      setIsKeyValid(isValid);
      toast({
        title: isValid ? 'API Key Valid' : 'API Key Invalid',
        description: isValid
          ? 'Your API key is valid and working correctly.'
          : 'The API key is invalid or does not have access to the required services.',
        status: isValid ? 'success' : 'error',
        duration: 3000,
        isClosable: true,
      });
    } catch (error: unknown) {
      setIsKeyValid(false);
      toast({
        title: 'Error',
        description: 'Failed to test API key. Please check your internet connection.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isInitializing) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading settings...</Text>
      </Box>
    );
  }

  return (
    <Box
      p={6}
      borderWidth={1}
      borderRadius="lg"
      boxShadow="lg"
      bg={bgColor}
      borderColor={borderColor}
    >
      <VStack spacing={4} align="stretch">
        <Heading size="md">OpenAI API Key</Heading>

        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>Secure Storage</AlertTitle>
            <AlertDescription>
              Your API key is encrypted and stored locally in your browser's IndexedDB. 
              It is tied to your user account and never sent to our servers.
            </AlertDescription>
          </Box>
        </Alert>

        {hasStoredKey && (
          <Alert status="success" borderRadius="md">
            <AlertIcon />
            <AlertTitle>API Key Set</AlertTitle>
            <AlertDescription>
              You currently have an API key stored. You can update it or clear it below.
            </AlertDescription>
          </Alert>
        )}

        {isKeyValid !== null && (
          <Alert status={isKeyValid ? 'success' : 'error'} borderRadius="md">
            <AlertIcon />
            <AlertTitle>{isKeyValid ? 'Valid API Key' : 'Invalid API Key'}</AlertTitle>
            <AlertDescription>
              {isKeyValid
                ? 'This API key is valid and can be used with OpenAI services.'
                : 'This API key is invalid or does not have access to required services.'}
            </AlertDescription>
          </Alert>
        )}

        <FormControl>
          <FormLabel>OpenAI API Key</FormLabel>
          <InputGroup>
            <Input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your OpenAI API key"
              pr="4.5rem"
            />
            <InputRightElement width="4.5rem">
              <Button h="1.75rem" size="sm" onClick={handleToggleShow}>
                {showApiKey ? <ViewOffIcon /> : <ViewIcon />}
              </Button>
            </InputRightElement>
          </InputGroup>
        </FormControl>

        <Button
          colorScheme="blue"
          onClick={handleTest}
          isLoading={isTesting}
          loadingText="Testing..."
          isDisabled={!apiKey.trim() || isLoading}
        >
          Test API Key
        </Button>

        <Button
          colorScheme="green"
          onClick={handleSave}
          isLoading={isLoading}
          loadingText="Saving..."
          isDisabled={!apiKey.trim() || isTesting}
        >
          Save API Key
        </Button>

        {hasStoredKey && (
          <Button
            colorScheme="red"
            variant="outline"
            onClick={handleClear}
            isLoading={isLoading}
            loadingText="Clearing..."
            isDisabled={isTesting}
          >
            Clear API Key
          </Button>
        )}

        <Text fontSize="sm" color="gray.500" mt={2}>
          Don't have an API key? You can get one from the{' '}
          <a 
            href="https://platform.openai.com/api-keys" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ textDecoration: 'underline', color: 'blue' }}
          >
            OpenAI Platform
          </a>
        </Text>
      </VStack>
    </Box>
  );
} 