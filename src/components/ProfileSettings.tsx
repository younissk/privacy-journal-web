import { useEffect, useState } from "react";
import {
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { githubService } from "../services/GithubService";
import type { UserProfile } from "../services/GithubService";
import { useAuth } from "../contexts/AuthContext";

export default function ProfileSettings() {
  const toast = useToast();
  const { githubAccessToken, githubUsername } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({});

  useEffect(() => {
    async function load() {
      if (!githubAccessToken || !githubUsername) return;
      githubService.initialize(githubAccessToken, githubUsername);
      const data = await githubService.getUserProfile();
      if (data) setProfile(data);
    }
    load();
  }, [githubAccessToken, githubUsername]);

  const handleChange = (field: keyof UserProfile) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setProfile((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSave = async () => {
    try {
      setLoading(true);
      await githubService.saveUserProfile(profile);
      toast({ title: "Profile saved", status: "success", duration: 3000 });
    } catch (err: unknown) {
      toast({
        title: "Failed to save profile",
        description:
          err instanceof Error ? err.message : "Unknown error occurred",
        status: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack align="stretch" spacing={4} maxW="lg">
      <FormControl>
        <FormLabel>Name</FormLabel>
        <Input value={profile.name || ""} onChange={handleChange("name")} />
      </FormControl>
      <FormControl>
        <FormLabel>Bio</FormLabel>
        <Textarea
          value={profile.bio || ""}
          onChange={handleChange("bio")}
          rows={3}
        />
      </FormControl>
      <FormControl>
        <FormLabel>Additional Info</FormLabel>
        <Textarea
          value={profile.additionalInfo || ""}
          onChange={handleChange("additionalInfo")}
          rows={4}
        />
      </FormControl>
      <Button colorScheme="blue" onClick={handleSave} isLoading={loading}>
        Save Profile
      </Button>
    </VStack>
  );
} 