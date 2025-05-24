import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Heading,
  VStack,
  HStack,
  Input,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  IconButton,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import { useFlows } from "../hooks/useFlows";
import type { FlowStep, Flow } from "../services/GithubService";

export default function FlowEditor() {
  const navigate = useNavigate();
  const { id } = useParams(); // may be undefined for new
  const { createFlow, updateFlow, getFlowById } = useFlows();

  const existing = id ? getFlowById(id) : undefined;

  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [steps, setSteps] = useState<FlowStep[]>(existing?.steps || []);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description || "");
      setSteps(existing.steps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  const addStep = () => {
    const newStep: FlowStep = {
      id: Date.now().toString(),
      prompt: "",
      type: "text",
    };
    setSteps((prev) => [...prev, newStep]);
  };

  const updateStep = (index: number, updated: Partial<FlowStep>) => {
    setSteps((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updated } as FlowStep;
      return copy;
    });
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const sanitizedSteps = steps.map((s) => ({
      ...s,
      id: s.id || Date.now().toString(),
    }));
    if (existing) {
      const updated: Flow = {
        ...existing,
        title,
        description,
        steps: sanitizedSteps,
      };
      await updateFlow.mutateAsync(updated);
    } else {
      await createFlow.mutateAsync({
        title,
        description,
        steps: sanitizedSteps,
      });
    }
    navigate("/flows");
  };

  return (
    <Container maxW="container.lg" py={8}>
      <VStack align="stretch" spacing={6}>
        <Heading size="lg">
          {existing ? "Edit Flow" : "Create New Flow"}
        </Heading>

        <VStack align="stretch" spacing={4}>
          <Input
            placeholder="Flow Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </VStack>

        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between">
            <Heading size="md">Steps</Heading>
            <Button
              leftIcon={<AddIcon />}
              onClick={addStep}
              size="sm"
              colorScheme="blue"
            >
              Add Step
            </Button>
          </HStack>

          {steps.length === 0 && <Text>No steps yet.</Text>}

          {steps.map((step, idx) => (
            <Box key={step.id} borderWidth={1} borderRadius="md" p={4}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Input
                  placeholder="Prompt"
                  value={step.prompt}
                  onChange={(e) => updateStep(idx, { prompt: e.target.value })}
                />
                <Select
                  value={step.type}
                  onChange={(e) =>
                    updateStep(idx, {
                      type: e.target.value as FlowStep["type"],
                    })
                  }
                >
                  <option value="boolean">Boolean</option>
                  <option value="range">Range</option>
                  <option value="number">Number</option>
                  <option value="text">Short Text</option>
                  <option value="journal">Long Text</option>
                </Select>
              </SimpleGrid>

              <Textarea
                mt={2}
                placeholder="Step description (optional)"
                value={step.description || ""}
                onChange={(e) =>
                  updateStep(idx, { description: e.target.value })
                }
              />

              {(step.type === "range" || step.type === "number") && (
                <HStack mt={2} spacing={4}>
                  <NumberInput
                    value={step.min ?? ""}
                    onChange={(valString) => updateStep(idx, { min: Number(valString) })}
                    w="100px"
                  >
                    <NumberInputField placeholder="Min" />
                  </NumberInput>
                  <NumberInput
                    value={step.max ?? ""}
                    onChange={(valString) => updateStep(idx, { max: Number(valString) })}
                    w="100px"
                  >
                    <NumberInputField placeholder="Max" />
                  </NumberInput>
                </HStack>
              )}

              <IconButton
                mt={3}
                aria-label="Delete step"
                icon={<DeleteIcon />}
                size="sm"
                colorScheme="red"
                variant="ghost"
                onClick={() => removeStep(idx)}
              />
            </Box>
          ))}
        </VStack>

        <HStack spacing={4} justify="flex-end">
          <Button variant="ghost" onClick={() => navigate("/flows")}>
            Cancel
          </Button>
          <Button
            colorScheme="green"
            onClick={handleSave}
            isLoading={createFlow.isPending || updateFlow.isPending}
          >
            Save
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
}
