import { useState, useRef, useEffect } from "react";
import {
  Box,
  IconButton,
  Text,
  useToast,
  useColorModeValue,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  VStack,
  HStack,
  Button,
  Portal,
} from "@chakra-ui/react";
import { DeleteIcon, CheckIcon } from "@chakra-ui/icons";
import { FiMic, FiMicOff } from "react-icons/fi";
import Loader from "./Loader";
import { useAudioTranscription } from "../hooks/useAudioTranscription";
import { useOpenAIKey } from "../hooks/useOpenAIKey";

interface FloatingVoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
}

interface AudioVisualizationProps {
  isRecording: boolean;
  audioStream?: MediaStream;
}

function AudioVisualization({
  isRecording,
  audioStream,
}: AudioVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!isRecording || !audioStream || !canvasRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up audio analysis
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(audioStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      const currentAnalyser = analyserRef.current;
      if (!currentAnalyser || !ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      currentAnalyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * height;

        const r = barHeight + 25 * (i / bufferLength);
        const g = 250 * (i / bufferLength);
        const b = 50;

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioContext.close();
    };
  }, [isRecording, audioStream]);

  if (!isRecording) return null;

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={80}
      style={{
        borderRadius: "8px",
        backgroundColor: "rgba(0, 0, 0, 0.05)",
        marginTop: "8px",
      }}
    />
  );
}

export default function FloatingVoiceRecorder({
  onTranscriptionComplete,
}: FloatingVoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream>();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const toast = useToast();

  const { apiKey } = useOpenAIKey();
  const { transcribeAudio, isTranscribing } = useAudioTranscription();

  const shadowColor = useColorModeValue(
    "rgba(0, 0, 0, 0.1)",
    "rgba(0, 0, 0, 0.3)"
  );

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
      setAudioStream(stream);

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
        setAudioStream(undefined);
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
    <Popover placement="top-end" isLazy>
      <PopoverTrigger>
        <IconButton
          aria-label="Voice to text"
          icon={isRecording ? <FiMicOff size={24} /> : <FiMic size={24} />}
          size="lg"
          colorScheme={isRecording ? "red" : "blue"}
          variant={isRecording ? "solid" : "solid"}
          isRound
          position="fixed"
          bottom={6}
          right={6}
          boxShadow={`0 4px 20px ${shadowColor}`}
          _hover={{
            transform: "scale(1.05)",
            boxShadow: `0 6px 25px ${shadowColor}`,
          }}
          transition="all 0.2s"
          zIndex={1000}
          onClick={isRecording ? stopRecording : startRecording}
        />
      </PopoverTrigger>
      <Portal>
        <PopoverContent maxWidth="250px" mr={4} mb={2}>
          <PopoverBody>
            {isTranscribing ? (
              <Box textAlign="center" p={2}>
                <Loader size="sm" text="Transcribing..." />
              </Box>
            ) : (
              <VStack spacing={3} align="stretch">
                <Text fontWeight="medium" fontSize="sm">
                  Voice to Text
                </Text>

                {isRecording ? (
                  <VStack spacing={2}>
                    <Text color="red.500" fontSize="lg" fontWeight="mono">
                      {formatTime(recordingTime)}
                    </Text>
                    <AudioVisualization
                      isRecording={isRecording}
                      audioStream={audioStream}
                    />
                    <Text fontSize="xs" color="gray.500" textAlign="center">
                      Speak clearly for better results
                    </Text>
                  </VStack>
                ) : audioBlob ? (
                  <VStack spacing={2}>
                    <Text fontSize="sm" color="gray.500" textAlign="center">
                      Recording complete. Ready to transcribe.
                    </Text>
                    <HStack spacing={2} width="100%">
                      <IconButton
                        aria-label="Delete recording"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={cancelRecording}
                        flex={1}
                      />
                      <Button
                        size="sm"
                        colorScheme="green"
                        leftIcon={<CheckIcon />}
                        onClick={handleTranscribe}
                        flex={2}
                      >
                        Transcribe
                      </Button>
                    </HStack>
                  </VStack>
                ) : (
                  <Text fontSize="sm" color="gray.500" textAlign="center">
                    Click the microphone to start recording
                  </Text>
                )}
              </VStack>
            )}
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  );
}
