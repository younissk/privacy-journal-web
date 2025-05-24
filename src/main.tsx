import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChakraProvider, extendTheme, ColorModeScript } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App.tsx";

const theme = extendTheme({
  config: {
    initialColorMode: "light",
    useSystemColorMode: true,
  },
  styles: {
    global: {
      body: {
        fontFamily: "system-ui, Avenir, Helvetica, Arial, sans-serif",
        lineHeight: 1.5,
        fontWeight: 400,
        minHeight: "100vh",
        margin: 0,
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: "8px",
        fontWeight: 500,
        transition: "all 0.25s",
      },
      variants: {
        github: {
          bg: "#24292e",
          color: "white",
          _hover: {
            bg: "#2f363d",
          },
          _disabled: {
            bg: "#6e7681",
            cursor: "not-allowed",
          },
        },
        logout: {
          bg: "#f44336",
          color: "white",
          _hover: {
            bg: "#d32f2f",
          },
        },
      },
    },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <App />
      </ChakraProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
