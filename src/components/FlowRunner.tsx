import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  VStack,
  Heading,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  Input,
  NumberInput,
  NumberInputField,
  Textarea,
  HStack,
} from "@chakra-ui/react";
import { useFlows } from "../hooks/useFlows";
import { useAuth } from "../contexts/AuthContext";
import { githubService } from "../services/GithubService";
import type { FlowStep } from "../services/GithubService";
import Loader from "./Loader";

export default function FlowRunner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { flows, isLoading } = useFlows();
  const flow = flows.find((f) => f.id === id);
  const { githubAccessToken, githubUsername } = useAuth();

  const [current, setCurrent] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [answers, setAnswers] = useState<Record<string, any>>({});

  if (isLoading || !flow) return <Loader text="Loading flow..." />;

  const step = flow.steps[current];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAnswerChange = (value: any) => {
    setAnswers((prev) => ({ ...prev, [step.id]: value }));
  };

  const goNext = () => {
    if (current < flow.steps.length - 1) {
      setCurrent((idx) => idx + 1);
    } else {
      handleSubmit();
    }
  };

  const goPrev = () => {
    if (current > 0) setCurrent((idx) => idx - 1);
  };

  const handleSubmit = async () => {
    if (!githubAccessToken || !githubUsername) return;
    githubService.initialize(githubAccessToken, githubUsername);

    const now = new Date();
    let content = `Flow: ${flow.title}\nDate: ${now.toISOString()}\n\n`;
    flow.steps.forEach((s, idx) => {
      const ans = answers[s.id];
      content += `## ${idx + 1}. ${s.prompt}\n`;
      if (s.description) content += `${s.description}\n`;
      content += `Answer: ${ans === undefined ? "" : ans}\n\n`;
    });

    await githubService.createJournalEntry(`${flow.title} - ${now.toLocaleDateString()}`, content);
    navigate("/journals");
  };

  const renderInput = (s: FlowStep) => {
    const value = answers[s.id];
    switch (s.type) {
      case "boolean":
        return (
          <HStack>
            <Text>No</Text>
            <Switch
              isChecked={!!value}
              onChange={(e) => handleAnswerChange(e.target.checked)}
              size="lg"
            />
            <Text>Yes</Text>
          </HStack>
        );
      case "range":
        return (
          <VStack w="full">
            <Slider
              aria-label="slider"
              min={s.min ?? 0}
              max={s.max ?? 10}
              step={s.step ?? 1}
              value={typeof value === "number" ? value : (s.min ?? 0)}
              onChange={(val) => handleAnswerChange(val)}
            >
              <SliderTrack>
                <SliderFilledTrack />
              </SliderTrack>
              <SliderThumb />
            </Slider>
            <Text>{value ?? s.min ?? 0}</Text>
          </VStack>
        );
      case "number":
        return (
          <NumberInput value={value ?? ""} onChange={(v) => handleAnswerChange(Number(v))}>
            <NumberInputField placeholder="Enter number" />
          </NumberInput>
        );
      case "text":
        return (
          <Input value={value ?? ""} onChange={(e) => handleAnswerChange(e.target.value)} placeholder="Answer" />
        );
      case "journal":
        return (
          <Textarea value={value ?? ""} onChange={(e) => handleAnswerChange(e.target.value)} placeholder="Write your thoughts..." rows={8} />
        );
      default:
        return null;
    }
  };

  return (
    <Container maxW="container.md" py={8}>
      <VStack spacing={8} align="stretch">
        <Heading size="lg">
          {flow.title} ({current + 1}/{flow.steps.length})
        </Heading>

        <Box>
          <Heading size="md" mb={4}>
            {step.prompt}
          </Heading>
          {step.description && <Text mb={4}>{step.description}</Text>}
          {renderInput(step)}
        </Box>

        <HStack justify="space-between">
          <Button onClick={goPrev} isDisabled={current === 0} variant="outline">
            Back
          </Button>
          <Button colorScheme="green" onClick={goNext}>
            {current === flow.steps.length - 1 ? "Submit" : "Next"}
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
} 