import { Center, Spinner, Text, VStack } from "@chakra-ui/react";

interface LoaderProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  text?: string;
  fullHeight?: boolean;
}

export default function Loader({
  size = "xl",
  text,
  fullHeight = false,
}: LoaderProps) {
  return (
    <Center h={fullHeight ? "100vh" : "auto"} py={fullHeight ? 0 : 10}>
      <VStack spacing={4}>
        <Spinner size={size} />
        {text && <Text>{text}</Text>}
      </VStack>
    </Center>
  );
}
