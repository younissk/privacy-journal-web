import {
  Box,
  Container,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import APIKeySettings from './APIKeySettings';
import RepositorySelector from './RepositorySelector';

export default function Settings() {
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg">Settings</Heading>
        <Text color="gray.500">
          Manage your application settings and integrations
        </Text>

        <Box bg={bgColor} borderRadius="lg" overflow="hidden">
          <Tabs variant="enclosed" colorScheme="blue">
            <TabList>
              <Tab>API Keys</Tab>
              <Tab>Repository</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <APIKeySettings />
              </TabPanel>
              <TabPanel>
                <VStack spacing={4} align="stretch">
                  <Text fontSize="md" fontWeight="medium">
                    GitHub Repository Settings
                  </Text>
                  <Text fontSize="sm" color="gray.500">
                    Choose which repository to use for storing your journal entries.
                  </Text>
                  <RepositorySelector />
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>
    </Container>
  );
} 