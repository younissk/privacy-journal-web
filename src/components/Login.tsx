import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginWithGithub, currentUser, githubAccessToken, githubUsername } =
    useAuth();
  const navigate = useNavigate();

  // Effect to navigate to journals when GitHub auth is complete
  useEffect(() => {
    if (currentUser && githubAccessToken) {
      console.log("GitHub auth complete with data:", {
        user: currentUser?.email,
        githubToken: githubAccessToken ? githubAccessToken.substring(0, 10) + "..." : "Missing",
        githubUsername: githubUsername || "Not set",
      });
      // Small delay to allow GitHub service to initialize properly
      const timer = setTimeout(() => {
        navigate("/journals");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentUser, githubAccessToken, githubUsername, navigate]);

  async function handleGithubLogin() {
    try {
      setError("");
      setLoading(true);
      await loginWithGithub();
      // The status log will now be in the useEffect with more accurate data
    } catch (err) {
      console.error("Login error:", err);
      setError(
        `Failed to sign in with GitHub: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <div className="error-message">{error}</div>}

      <div className="auth-status">
        <p>Current user: {currentUser?.email || "Not logged in"}</p>
        <p>GitHub username: {githubUsername || "Not set"}</p>
        <p>GitHub token: {githubAccessToken ? "Present" : "Missing"}</p>
      </div>

      <button
        onClick={handleGithubLogin}
        disabled={loading}
        className="github-button"
      >
        {loading ? "Logging in..." : "Login with GitHub"}
      </button>
    </div>
  );
}
