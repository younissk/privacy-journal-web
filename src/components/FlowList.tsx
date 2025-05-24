import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  HStack,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Text,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { AddIcon, HamburgerIcon, RepeatIcon } from "@chakra-ui/icons";
import { useFlows } from "../hooks/useFlows";
import Loader from "./Loader";

export default function FlowList() {
  const navigate = useNavigate();
  const { flows, isLoading, error, refetch, deleteFlow } = useFlows();

  const handleCreate = () => navigate("/flows/new");
  const handleRun = (id: string) => navigate(`/flow/${id}`);
  const handleEdit = (id: string) => navigate(`/flows/edit/${id}`);

  if (isLoading) return <Loader text="Loading flows..." />;

  return (
    <Container maxW="container.xl" py={8}>
      <VStack align="stretch" spacing={6}>
        <HStack justify="space-between">
          <Heading size="lg">Flows</Heading>
          <HStack spacing={3}>
            <Button onClick={handleCreate} leftIcon={<AddIcon />} colorScheme="blue">
              New Flow
            </Button>
            <IconButton aria-label="Refresh" icon={<RepeatIcon />} onClick={() => refetch()} />
          </HStack>
        </HStack>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error instanceof Error ? error.message : String(error)}
          </Alert>
        )}

        {flows.length === 0 ? (
          <Box p={8} textAlign="center" borderWidth={1} borderRadius="md">
            <Text>No flows yet. Create one!</Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {flows.map((flow) => (
              <Card key={flow.id} _hover={{ transform: "translateY(-2px)", shadow: "lg" }} transition="all 0.2s">
                <CardHeader>
                  <HStack justify="space-between" align="start">
                    <Heading size="md" noOfLines={1}>
                      {flow.title}
                    </Heading>
                    <Menu>
                      <MenuButton as={IconButton} variant="ghost" icon={<HamburgerIcon />} aria-label="Options" />
                      <MenuList>
                        <MenuItem onClick={() => handleEdit(flow.id)}>Edit</MenuItem>
                        <MenuItem
                          onClick={() => {
                            if (confirm("Delete this flow?")) {
                              deleteFlow.mutate(flow.id);
                            }
                          }}
                          color="red.500"
                        >
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>
                </CardHeader>
                <CardBody>
                  <Text noOfLines={3}>{flow.description}</Text>
                </CardBody>
                <CardFooter>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" color="gray.500">
                      {flow.steps.length} steps
                    </Text>
                    <Button size="sm" colorScheme="green" onClick={() => handleRun(flow.id)}>
                      Start
                    </Button>
                  </HStack>
                </CardFooter>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </Container>
  );
} 