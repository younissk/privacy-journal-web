import { useNavigate } from "react-router-dom";
import {
  Box,
  Flex,
  Button,
  useColorMode,
  IconButton,
  useColorModeValue,
  Text,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Show,
  Hide,
} from "@chakra-ui/react";
import { MoonIcon, SunIcon, HamburgerIcon } from "@chakra-ui/icons";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { colorMode, toggleColorMode } = useColorMode();
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  return (
    <Box
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      px={4}
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Flex
        h={16}
        alignItems="center"
        justifyContent="space-between"
        maxW="1200px"
        mx="auto"
      >
        <Text
          fontSize="xl"
          fontWeight="bold"
          cursor="pointer"
          onClick={() => navigate("/journals")}
        >
          Privacy Journal
        </Text>

        <HStack spacing={4}>
          <IconButton
            aria-label="Toggle color mode"
            icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
            onClick={toggleColorMode}
            variant="ghost"
          />

          {currentUser && (
            <>
              <Show above="md">
                <Button variant="ghost" onClick={() => navigate("/journals")}>
                  Journals
                </Button>
                <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
                <Button variant="ghost" onClick={() => navigate("/settings")}>
                  Settings
                </Button>
                <Button variant="logout" onClick={handleLogout}>
                  Logout
                </Button>
              </Show>
              <Hide above="md">
                <Menu>
                  <MenuButton
                    as={IconButton}
                    icon={<HamburgerIcon />}
                    variant="ghost"
                    aria-label="Menu"
                  />
                  <MenuList>
                    <MenuItem onClick={() => navigate("/journals")}>
                      Journals
                    </MenuItem>
                    <MenuItem onClick={() => navigate("/dashboard")}>
                      Dashboard
                    </MenuItem>
                    <MenuItem onClick={() => navigate("/settings")}>
                      Settings
                    </MenuItem>
                    <MenuItem onClick={handleLogout} color="red.500">
                      Logout
                    </MenuItem>
                  </MenuList>
                </Menu>
              </Hide>
            </>
          )}
        </HStack>
      </Flex>
    </Box>
  );
}
