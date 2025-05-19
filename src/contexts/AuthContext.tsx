import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GithubAuthProvider,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, githubProvider } from "../firebase";
import { githubService } from "../services/GithubService";

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  loginWithGithub: () => Promise<void>;
  logout: () => Promise<void>;
  githubAccessToken: string | null;
  githubUsername: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [githubAccessToken, setGithubAccessToken] = useState<string | null>(null);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);

  async function loginWithGithub() {
    try {
      // Add scopes to access private repositories
      githubProvider.addScope("repo");
      const result = await signInWithPopup(auth, githubProvider);

      // Get GitHub access token from the credential
      const credential = GithubAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        setGithubAccessToken(token);
        console.log("GitHub token received:", token.substring(0, 10) + "...");

        // Get GitHub username from user profile
        // For GitHub auth, the username should be in the providerData[0].login (GitHub-specific)
        const providerData = result.user?.providerData[0];
        const username = providerData?.uid || providerData?.displayName;
        console.log("GitHub username from provider:", username);

        if (username) {
          setGithubUsername(username);
          console.log("Setting GitHub username:", username);

          // Initialize GitHub service with token and username
          githubService.initialize(token, username);
        } else {
          // If displayName is not available, try to get username from email
          const email = result.user?.email;
          console.log("No username found, trying email:", email);
          
          if (email) {
            // Extract username from email (everything before @)
            const usernameFromEmail = email.split('@')[0];
            setGithubUsername(usernameFromEmail);
            console.log("Setting GitHub username from email:", usernameFromEmail);
            githubService.initialize(token, usernameFromEmail);
          } else {
            console.error("Could not get GitHub username from user profile or email");
          }
        }
      } else {
        console.error("Could not get GitHub access token");
      }
    } catch (error) {
      console.error("Error logging in with GitHub:", error);
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      setGithubAccessToken(null);
      setGithubUsername(null);
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);

      // Reset GitHub service state on auth change
      if (!user) {
        setGithubAccessToken(null);
        setGithubUsername(null);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    loginWithGithub,
    logout,
    githubAccessToken,
    githubUsername,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
