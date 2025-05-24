import {
  Box,
  Flex,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  useColorModeValue,
  useDisclosure,
  Collapse,
  VStack,
  HStack,
} from "@chakra-ui/react";
import {
  ChevronLeftIcon,
  ChevronDownIcon,
  CheckIcon,
  DeleteIcon,
} from "@chakra-ui/icons";
import { FiFolder } from "react-icons/fi";
import { useFolders } from "../hooks/useFolders";

interface EditorNavbarProps {
  onBack: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  folderId?: string;
  onFolderChange: (folderId: string | undefined) => void;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  isNewEntry?: boolean;
}

export function EditorNavbar({
  onBack,
  onSave,
  onDelete,
  folderId,
  onFolderChange,
  hasUnsavedChanges = false,
  isSaving = false,
  isNewEntry = false,
}: EditorNavbarProps) {
  const { folders } = useFolders();
  const { isOpen, onToggle } = useDisclosure();

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const subtleColor = useColorModeValue("gray.600", "gray.400");

  const selectedFolder = folders.find((folder) => folder.id === folderId);

  return (
    <Box
      bg={bgColor}
      borderBottomWidth="1px"
      borderColor={borderColor}
      px={4}
      py={3}
      position="sticky"
      top={0}
      zIndex={100}
    >
      <Flex alignItems="center" justifyContent="space-between">
        <HStack spacing={3}>
          <IconButton
            aria-label="Back to journals"
            icon={<ChevronLeftIcon boxSize={5} />}
            onClick={onBack}
            variant="ghost"
            size="sm"
          />

          {hasUnsavedChanges && (
            <Text fontSize="xs" color="orange.500">
              Auto-saving...
            </Text>
          )}
        </HStack>

        <HStack spacing={2}>
          {/* Desktop folder selector */}
          <Box display={{ base: "none", md: "block" }}>
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<ChevronDownIcon />}
                leftIcon={<FiFolder />}
                variant="outline"
                size="sm"
                maxWidth="200px"
              >
                <Text isTruncated>
                  {selectedFolder ? selectedFolder.name : "No folder"}
                </Text>
              </MenuButton>
              <MenuList>
                <MenuItem
                  onClick={() => onFolderChange(undefined)}
                  icon={<FiFolder />}
                >
                  No folder
                </MenuItem>
                {folders.map((folder) => (
                  <MenuItem
                    key={folder.id}
                    onClick={() => onFolderChange(folder.id)}
                    icon={<FiFolder />}
                  >
                    {folder.name}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </Box>

          {/* Mobile folder selector */}
          <Box display={{ base: "block", md: "none" }}>
            <IconButton
              aria-label="Select folder"
              icon={<FiFolder />}
              onClick={onToggle}
              variant="outline"
              size="sm"
            />
          </Box>

          {/* Save button */}
          {onSave && (
            <IconButton
              aria-label="Save and return"
              icon={<CheckIcon />}
              onClick={onSave}
              isLoading={isSaving}
              colorScheme="blue"
              variant="solid"
              size="sm"
            />
          )}

          {/* Delete button */}
          {onDelete && !isNewEntry && (
            <IconButton
              aria-label="Delete entry"
              icon={<DeleteIcon />}
              onClick={onDelete}
              colorScheme="red"
              variant="ghost"
              size="sm"
            />
          )}
        </HStack>
      </Flex>

      {/* Mobile folder dropdown */}
      <Collapse in={isOpen} animateOpacity>
        <Box
          mt={3}
          p={3}
          bg={useColorModeValue("gray.50", "gray.700")}
          borderRadius="md"
          display={{ base: "block", md: "none" }}
        >
          <Text fontSize="sm" fontWeight="medium" mb={2} color={subtleColor}>
            Select Folder
          </Text>
          <VStack spacing={1} align="stretch">
            <Button
              variant="ghost"
              size="sm"
              justifyContent="flex-start"
              leftIcon={<FiFolder />}
              onClick={() => {
                onFolderChange(undefined);
                onToggle();
              }}
              isActive={!folderId}
            >
              No folder
            </Button>
            {folders.map((folder) => (
              <Button
                key={folder.id}
                variant="ghost"
                size="sm"
                justifyContent="flex-start"
                leftIcon={<FiFolder />}
                onClick={() => {
                  onFolderChange(folder.id);
                  onToggle();
                }}
                isActive={folderId === folder.id}
              >
                {folder.name}
              </Button>
            ))}
          </VStack>
        </Box>
      </Collapse>
    </Box>
  );
}
