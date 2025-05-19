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
              {/* Add more tabs here as needed */}
            </TabList>

            <TabPanels>
              <TabPanel>
                <APIKeySettings />
              </TabPanel>
              {/* Add more tab panels here as needed */}
            </TabPanels>
          </Tabs>
        </Box>
      </VStack>
    </Container>
  );
} 