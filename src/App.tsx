import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import JournalList from "./components/JournalList";
import JournalEditor from "./components/JournalEditor";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Box minH="100vh" bg="gray.50">
          <Box maxW="1200px" mx="auto" px={4} py={8}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/journals"
                element={
                  <ProtectedRoute>
                    <JournalList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/journal/:id"
                element={
                  <ProtectedRoute>
                    <JournalEditor />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/journals" />} />
            </Routes>
          </Box>
        </Box>
      </AuthProvider>
    </Router>
  );
}

export default App;
