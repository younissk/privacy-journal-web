import { Box } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import JournalList from "./components/JournalList";
import JournalEditor from "./components/JournalEditor";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";

// Wrapper component to conditionally show navbar
function AppContent() {
  const location = useLocation();
  const isEditorPage = location.pathname.includes('/journal/');
  
  return (
    <Box>
      {!isEditorPage && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/journals" element={<ProtectedRoute><JournalList /></ProtectedRoute>} />
        <Route path="/journal/:id" element={<ProtectedRoute><JournalEditor /></ProtectedRoute>} />
      </Routes>
    </Box>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { githubAccessToken } = useAuth();

  if (!githubAccessToken) {
    return <Login />;
  }

  return <>{children}</>;
}

export default App;
