/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage";
import LoginRegister from "./components/LoginRegister";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  const [page, setPage] = useState<string>("landing");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Persistence: Check if the user is already signed in upon load
  useEffect(() => {
    const saved = localStorage.getItem("portoify_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          setCurrentUser(parsed);
          setPage(parsed.role === "admin" ? "admin-dashboard" : "user-dashboard");
        }
      } catch (e) {
        console.error("Failed to restore portoify session", e);
      }
    }

    // Also detect if we have reset-password queries in url. If so, immediately route they to reset mode
    const params = new URLSearchParams(window.location.search);
    const hasToken = params.get("token");
    if (hasToken) {
      setPage("login");
    }
  }, []);

  const handleRoleRouting = (user: any) => {
    setCurrentUser(user);
    // Persist in localStorage
    localStorage.setItem("portoify_session", JSON.stringify(user));
    
    // Choose route
    if (user.role === "admin") {
      setPage("admin-dashboard");
    } else {
      setPage("user-dashboard");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("portoify_session");
    setPage("landing");
  };

  // Nav routing dispatcher
  const handleNavigate = (targetPage: string) => {
    setPage(targetPage);
  };

  // Render correct view based on page state
  return (
    <div className="w-full h-full min-h-screen">
      {page === "landing" && (
        <LandingPage onNavigate={handleNavigate} currentUser={currentUser} />
      )}
      
      {page === "login" && (
        <LoginRegister 
          initialMode="login" 
          onNavigate={handleNavigate} 
          onLoginSuccess={handleRoleRouting} 
        />
      )}

      {page === "register" && (
        <LoginRegister 
          initialMode="register" 
          onNavigate={handleNavigate} 
          onLoginSuccess={handleRoleRouting} 
        />
      )}

      {page === "forgot" && (
        <LoginRegister 
          initialMode="forgot" 
          onNavigate={handleNavigate} 
          onLoginSuccess={handleRoleRouting} 
        />
      )}

      {page === "user-dashboard" && currentUser && (
        <UserDashboard currentUser={currentUser} onLogout={handleLogout} />
      )}

      {page === "admin-dashboard" && currentUser && (
        <AdminDashboard currentUser={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}
