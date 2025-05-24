import { useState, useRef } from "react";
import {
  Box,
  Button,
  HStack,
  Text,
  useToast,
  IconButton,
  useColorModeValue,
} from "@chakra-ui/react";
import { DeleteIcon, CheckIcon } from "@chakra-ui/icons";
import Loader from "./Loader";
import { useAudioTranscription } from "../hooks/useAudioTranscription";
import { useOpenAIKey } from "../hooks/useOpenAIKey";

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
}

export default function VoiceRecorder({
  onTranscriptionComplete,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const toast = useToast();

  const { apiKey } = useOpenAIKey();
  const { transcribeAudio, isTranscribing } = useAudioTranscription();

  const bgColor = useColorModeValue("white", "gray.700");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const startRecording = async () => {
    try {
      if (!apiKey) {
        toast({
          title: "API Key Missing",
          description:
            "Please add your OpenAI API key in Settings to use voice transcription.",
          status: "warning",
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // Reset state
      audioChunksRef.current = [];
      setAudioBlob(null);
      setRecordingTime(0);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Set up data handling
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Set up recording finished handler
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setAudioBlob(audioBlob);

        // Stop all tracks in the stream
        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Error",
        description:
          "Could not access your microphone. Please check permissions.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Clear timer
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const handleTranscribe = async () => {
    if (!audioBlob) return;

    try {
      const transcription = await transcribeAudio.mutateAsync(audioBlob);
      onTranscriptionComplete(transcription);
      toast({
        title: "Transcription Complete",
        description: "Your recording has been transcribed successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setAudioBlob(null);
      setRecordingTime(0);
    } catch (error) {
      toast({
        title: "Transcription Error",
        description:
          "Failed to transcribe audio. Please check your API key in settings.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      console.error("Transcription error:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <Box
      p={3}
      borderWidth={1}
      borderRadius="md"
      borderColor={borderColor}
      bg={bgColor}
      boxShadow="sm"
      width="100%"
    >
      {isTranscribing ? (
        <Box textAlign="center" p={2}>
          <Loader size="md" text="Transcribing your recording..." />
        </Box>
      ) : (
        <>
          <HStack spacing={4} justify="space-between">
            <Text fontWeight="medium">Voice to Text</Text>

            {isRecording ? (
              <HStack>
                <Text color="red.500">{formatTime(recordingTime)}</Text>
                <Button size="sm" colorScheme="red" onClick={stopRecording}>
                  Stop Recording
                </Button>
              </HStack>
            ) : audioBlob ? (
              <HStack>
                <IconButton
                  aria-label="Delete recording"
                  icon={<DeleteIcon />}
                  size="sm"
                  colorScheme="red"
                  variant="ghost"
                  onClick={cancelRecording}
                />
                <Button
                  size="sm"
                  colorScheme="green"
                  leftIcon={<CheckIcon />}
                  onClick={handleTranscribe}
                >
                  Transcribe
                </Button>
              </HStack>
            ) : (
              <Button size="sm" colorScheme="blue" onClick={startRecording}>
                Record Voice
              </Button>
            )}
          </HStack>

          {isRecording && (
            <Text fontSize="sm" mt={2} color="gray.500">
              Recording... Speak clearly for better results.
            </Text>
          )}

          {audioBlob && !isRecording && (
            <Text fontSize="sm" mt={2} color="gray.500">
              Recording complete. Click Transcribe to convert to text.
            </Text>
          )}
        </>
      )}
    </Box>
  );
}
