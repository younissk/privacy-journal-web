import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Dashboard() {
  const [error, setError] = useState("");
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      setError("");
      await logout();
      navigate("/login");
    } catch {
      setError("Failed to log out");
    }
  }

  function navigateToJournals() {
    navigate("/journals");
  }

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>
      <div>
        <strong>Email:</strong> {currentUser?.email || "No email available"}
      </div>
      <div>
        <strong>User ID:</strong> {currentUser?.uid}
      </div>
      {currentUser?.photoURL && (
        <div className="profile-image">
          <img src={currentUser.photoURL} alt="Profile" />
        </div>
      )}
      {error && <div className="error-message">{error}</div>}

      <div className="dashboard-actions">
        <button onClick={navigateToJournals} className="journal-button">
          My Journals
        </button>
        <button onClick={handleLogout} className="logout-button">
          Log Out
        </button>
      </div>
    </div>
  );
}
