import { Flex, IconButton, Fade } from "@chakra-ui/react";
import { ChevronLeftIcon, DeleteIcon, CheckIcon } from "@chakra-ui/icons";

interface EditorHeaderProps {
  isNewEntry: boolean;
  isControlsVisible: boolean;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
  onDelete: () => void;
}

export function EditorHeader({
  isNewEntry,
  isControlsVisible,
  saving,
  onBack,
  onSave,
  onDelete,
}: EditorHeaderProps) {
  return (
    <Fade in={isControlsVisible} unmountOnExit={false}>
      <Flex
        position="absolute"
        top={0}
        left={0}
        right={0}
        p={4}
        alignItems="center"
        bg="inherit"
        borderBottomWidth="1px"
        borderColor="inherit"
        zIndex={10}
      >
        <IconButton
          aria-label="Back to journals"
          icon={<ChevronLeftIcon boxSize={6} />}
          onClick={onBack}
          variant="ghost"
          mr={4}
          size="sm"
        />

        <Flex flex={1} justifyContent="flex-end">
          {!isNewEntry && (
            <IconButton
              aria-label="Delete entry"
              icon={<DeleteIcon />}
              onClick={onDelete}
              isDisabled={saving}
              variant="ghost"
              colorScheme="red"
              mr={2}
              size="sm"
            />
          )}
          <IconButton
            aria-label="Save entry"
            icon={<CheckIcon />}
            onClick={onSave}
            isLoading={saving}
            colorScheme="blue"
            variant="ghost"
            size="sm"
          />
        </Flex>
      </Flex>
    </Fade>
  );
}
