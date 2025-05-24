import { useMutation } from "@tanstack/react-query";
import { openAIService } from "../services/OpenAIService";

export function useAudioTranscription() {
  const transcribeAudio = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const transcription = await openAIService.transcribeAudio(audioBlob);
      if (!transcription) {
        throw new Error("No text was returned from the transcription service.");
      }
      return transcription;
    },
  });

  return {
    transcribeAudio,
    isTranscribing: transcribeAudio.isPending,
    transcriptionError: transcribeAudio.error,
  };
} 