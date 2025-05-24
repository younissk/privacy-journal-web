import { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Input,
  Textarea,
  VStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  HStack,
  Box,
  SimpleGrid,
  useToast,
} from "@chakra-ui/react";
import { useFolders } from "../hooks/useFolders";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string;
}

const FOLDER_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#6B7280", // gray
  "#059669", // emerald
];

export default function CreateFolderModal({
  isOpen,
  onClose,
  parentId,
}: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createFolder } = useFolders();
  const toast = useToast();

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a folder name",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await createFolder.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        parentId,
        color: selectedColor,
      });

      toast({
        title: "Folder created",
        description: `"${name}" has been created successfully.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      setName("");
      setDescription("");
      setSelectedColor(FOLDER_COLORS[0]);
      onClose();
    } catch (error) {
      toast({
        title: "Error creating folder",
        description: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setSelectedColor(FOLDER_COLORS[0]);
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {parentId ? "Create Subfolder" : "Create New Folder"}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isInvalid={!!errors.name}>
              <FormLabel>Folder Name</FormLabel>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) {
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
                placeholder="Enter folder name"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <FormErrorMessage>{errors.name}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel>Description (optional)</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter folder description"
                rows={2}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Color</FormLabel>
              <SimpleGrid columns={5} spacing={2}>
                {FOLDER_COLORS.map((color) => (
                  <Box
                    key={color}
                    w={8}
                    h={8}
                    bg={color}
                    borderRadius="md"
                    cursor="pointer"
                    border={selectedColor === color ? "3px solid" : "2px solid"}
                    borderColor={selectedColor === color ? "blue.500" : "transparent"}
                    _hover={{ transform: "scale(1.1)" }}
                    transition="all 0.2s"
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </SimpleGrid>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={2}>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              loadingText="Creating..."
            >
              Create Folder
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 