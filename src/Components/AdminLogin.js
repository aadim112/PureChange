import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AdminLogin.module.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [userPass, setUserPass] = useState("");
  const [error, setError] = useState("");

  const ADMIN_USERID = "darshak";
  const ADMIN_PASS = "darshak@123";

  const handleLogin = (e) => {
    e.preventDefault();
    if (userId === ADMIN_USERID && userPass === ADMIN_PASS) {
      localStorage.setItem("isAdminLoggedIn", "true");
      navigate("/admin-controls");
    } else {
      setError("Invalid Admin Credentials");
    }
  };

  return (
    <div className={styles["admin-login-container"]}>
      <div className={styles["admin-card"]}>
        <h2>Admin Login</h2>
        <form onSubmit={handleLogin}>
          <div className={styles["input-group"]}>
            <label>Admin ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
          </div>

          <div className={styles["input-group"]}>
            <label>Password</label>
            <input
              type="password"
              value={userPass}
              onChange={(e) => setUserPass(e.target.value)}
              required
            />
          </div>

          {error && <p className={styles["error"]}>{error}</p>}

          <button type="submit" className={styles["login-btn"]}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
