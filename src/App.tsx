import { Box } from "@chakra-ui/react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import JournalList from "./components/JournalList";
import JournalEditor from "./components/JournalEditor";
import SearchPage from "./components/SearchPage";
import Settings from "./components/Settings";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Chat from "./components/Chat";
import FlowList from "./components/FlowList";
import FlowEditor from "./components/FlowEditor";
import FlowRunner from "./components/FlowRunner";

// Wrapper component to conditionally show navbar
function AppContent() {
  const location = useLocation();
  const isEditorPage = location.pathname.includes("/journal/");

  return (
    <Box>
      {!isEditorPage && <Navbar />}
      <Routes>
        <Route path="/" element={<Login />} />
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
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
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
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/flows"
          element={
            <ProtectedRoute>
              <FlowList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/flows/new"
          element={
            <ProtectedRoute>
              <FlowEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/flows/edit/:id"
          element={
            <ProtectedRoute>
              <FlowEditor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/flow/:id"
          element={
            <ProtectedRoute>
              <FlowRunner />
            </ProtectedRoute>
          }
        />
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
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Login />;
  }

  return <>{children}</>;
}

export default App;
