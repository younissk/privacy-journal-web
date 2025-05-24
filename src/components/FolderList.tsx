import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Card,
  CardHeader,
  CardBody,
  useColorModeValue,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Collapse,
  useDisclosure,
} from "@chakra-ui/react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  AddIcon,
  HamburgerIcon,
} from "@chakra-ui/icons";
import { useFolders } from "../hooks/useFolders";
import type { Folder as FolderType } from "../services/GithubService";

interface FolderListProps {
  onFolderSelect?: (folderId: string | null) => void;
  selectedFolderId?: string | null;
  onCreateFolder?: () => void;
}

interface FolderItemProps {
  folder: FolderType;
  level: number;
  onSelect?: (folderId: string) => void;
  onEdit?: (folder: FolderType) => void;
  onDelete?: (folderId: string) => void;
  onCreateSubfolder?: (parentId: string) => void;
  selected?: boolean;
  subfolders: FolderType[];
}

function FolderItem({
  folder,
  level,
  onSelect,
  onEdit,
  onDelete,
  onCreateSubfolder,
  selected,
  subfolders,
}: FolderItemProps) {
  const { isOpen, onToggle } = useDisclosure();
  const cardBgColor = useColorModeValue("white", "gray.700");
  const selectedBgColor = useColorModeValue("blue.50", "blue.900");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  const hasSubfolders = subfolders.length > 0;

  return (
    <VStack align="stretch" spacing={1}>
      <Card
        bg={selected ? selectedBgColor : cardBgColor}
        borderWidth={1}
        borderColor={selected ? "blue.300" : borderColor}
        ml={level * 4}
        cursor="pointer"
        _hover={{ borderColor: "blue.300" }}
        transition="all 0.2s"
        size="sm"
      >
        <CardHeader py={2}>
          <HStack justify="space-between" align="center">
            <HStack
              flex={1}
              onClick={() => onSelect?.(folder.id)}
              spacing={2}
              align="center"
            >
              {hasSubfolders && (
                <IconButton
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                  }}
                  icon={isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  aria-label={isOpen ? "Collapse" : "Expand"}
                />
              )}
              {!hasSubfolders && <Box w={6} />}

              <Box
                w={3}
                h={3}
                borderRadius="sm"
                bg={folder.color || "gray.400"}
                flexShrink={0}
              />

              <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                {folder.name}
              </Text>

              {folder.description && (
                <Text fontSize="xs" color="gray.500" noOfLines={1}>
                  {folder.description}
                </Text>
              )}
            </HStack>

            <Menu>
              <MenuButton
                as={IconButton}
                size="xs"
                variant="ghost"
                icon={<HamburgerIcon />}
                aria-label="Folder options"
                onClick={(e) => e.stopPropagation()}
              />
              <MenuList>
                <MenuItem onClick={() => onEdit?.(folder)}>
                  Edit Folder
                </MenuItem>
                <MenuItem onClick={() => onCreateSubfolder?.(folder.id)}>
                  Create Subfolder
                </MenuItem>
                <MenuItem onClick={() => onDelete?.(folder.id)} color="red.500">
                  Delete Folder
                </MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </CardHeader>
      </Card>

      {hasSubfolders && (
        <Collapse in={isOpen}>
          <VStack align="stretch" spacing={1}>
            {subfolders.map((subfolder) => (
              <FolderItem
                key={subfolder.id}
                folder={subfolder}
                level={level + 1}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                onCreateSubfolder={onCreateSubfolder}
                selected={selected}
                subfolders={[]} // TODO: Implement nested subfolders if needed
              />
            ))}
          </VStack>
        </Collapse>
      )}
    </VStack>
  );
}

export default function FolderList({
  onFolderSelect,
  selectedFolderId,
  onCreateFolder,
}: FolderListProps) {
  const { folders, isLoading, deleteFolder, getSubfolders, getRootFolders } =
    useFolders();
  const bgColor = useColorModeValue("gray.50", "gray.800");

  const handleFolderSelect = (folderId: string) => {
    onFolderSelect?.(folderId);
  };

  const handleEditFolder = (folder: FolderType) => {
    // TODO: Implement edit folder modal
    console.log("Edit folder:", folder);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (confirm("Are you sure you want to delete this folder?")) {
      try {
        await deleteFolder.mutateAsync(folderId);
      } catch (error) {
        console.error("Error deleting folder:", error);
      }
    }
  };

  const handleCreateSubfolder = (parentId: string) => {
    // TODO: Implement create subfolder with parent ID
    console.log("Create subfolder for:", parentId);
    onCreateFolder?.();
  };

  if (isLoading) {
    return (
      <Box p={4} bg={bgColor} borderRadius="md">
        <Text fontSize="sm" color="gray.500">
          Loading folders...
        </Text>
      </Box>
    );
  }

  const rootFolders = getRootFolders();

  return (
    <Box p={4} bg={bgColor} borderRadius="md">
      <HStack justify="space-between" mb={4}>
        <Text fontSize="md" fontWeight="medium">
          Folders
        </Text>
        <Button
          size="sm"
          leftIcon={<AddIcon />}
          onClick={onCreateFolder}
          colorScheme="blue"
          variant="ghost"
        >
          New Folder
        </Button>
      </HStack>

      <VStack align="stretch" spacing={2}>
        {/* All Entries Option */}
        <Card
          bg={selectedFolderId === null ? "blue.50" : "white"}
          borderWidth={1}
          borderColor={selectedFolderId === null ? "blue.300" : "gray.200"}
          cursor="pointer"
          _hover={{ borderColor: "blue.300" }}
          transition="all 0.2s"
          size="sm"
          onClick={() => onFolderSelect?.(null)}
        >
          <CardBody py={2}>
            <HStack spacing={2}>
              <Box w={4} h={4} bg="gray.400" borderRadius="sm" />
              <Text fontSize="sm" fontWeight="medium">
                All Entries
              </Text>
              <Badge size="sm" colorScheme="gray">
                {folders.length > 0 ? "∞" : "0"}
              </Badge>
            </HStack>
          </CardBody>
        </Card>

        {/* Folder Tree */}
        {rootFolders.length === 0 ? (
          <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
            No folders yet. Create your first folder!
          </Text>
        ) : (
          rootFolders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              level={0}
              onSelect={handleFolderSelect}
              onEdit={handleEditFolder}
              onDelete={handleDeleteFolder}
              onCreateSubfolder={handleCreateSubfolder}
              selected={selectedFolderId === folder.id}
              subfolders={getSubfolders(folder.id)}
            />
          ))
        )}
      </VStack>
    </Box>
  );
}
