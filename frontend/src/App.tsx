import { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import {
  useGetIsLoggedIn,
  useGetAccountInfo,
} from "@multiversx/sdk-dapp/hooks";
import { logout } from "@multiversx/sdk-dapp/utils";
import { ExtensionLoginButton } from "@multiversx/sdk-dapp/UI/extension/ExtensionLoginButton";
import { WebWalletLoginButton } from "@multiversx/sdk-dapp/UI/webWallet/WebWalletLoginButton";
import { WalletConnectLoginButton } from "@multiversx/sdk-dapp/UI/walletConnect/WalletConnectLoginButton";
import { GenerateForm } from "./components/GenerateForm";
import { GenerationsList } from "./components/GenerationsList";
import { GenerationStudio } from "./components/GenerationStudio";
import "./App.css";

function App() {
  const isLoggedIn = useGetIsLoggedIn();
  const { address } = useGetAccountInfo();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLogout = () => {
    logout(window.location.origin);
  };

  const handleStartGeneration = (
    sessionId: string,
    description: string,
    category: string
  ) => {
    navigate(`/studio/${sessionId}`, { state: { description, category } });
  };

  const handleLoginRequired = () => {
    setShowLoginModal(true);
  };

  return (
    <Routes>
      <Route path="/" element={
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#0a0a0a",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <header
            style={{
              backgroundColor: "rgba(20, 20, 20, 0.8)",
              backdropFilter: "blur(10px)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "1rem 2rem",
              position: "sticky",
              top: 0,
              zIndex: 100,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                maxWidth: "1400px",
                margin: "0 auto",
              }}
            >
              <h1
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  margin: 0,
                  color: "#ffffff",
                  letterSpacing: "-0.02em",
                  cursor: "pointer"
                }}
                onClick={() => navigate('/')}
              >
                Contract Generator
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={() => navigate('/history')}
                      style={{
                        padding: "0.5rem 1rem",
                        fontSize: "0.875rem",
                        color: "#ffffff",
                        background: "rgba(255, 255, 255, 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                        fontWeight: "500",
                        transition: "all 0.2s",
                      }}
                    >
                      History
                    </button>
                    <span
                      style={{
                        fontSize: "0.875rem",
                        color: "rgba(255, 255, 255, 0.6)",
                        fontFamily: "monospace",
                      }}
                    >
                      {address.substring(0, 6)}...
                      {address.substring(address.length - 4)}
                    </span>
                    <button
                      onClick={handleLogout}
                      style={{
                        padding: "0.5rem 1rem",
                        fontSize: "0.875rem",
                        color: "#ffffff",
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "0.5rem",
                        cursor: "pointer",
                        fontWeight: "500",
                        transition: "all 0.2s",
                      }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    style={{
                      padding: "0.5rem 1.5rem",
                      fontSize: "0.875rem",
                      color: "#ffffff",
                      background:
                        "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                      border: "none",
                      borderRadius: "0.5rem",
                      cursor: "pointer",
                      fontWeight: "600",
                      transition: "all 0.2s",
                      boxShadow: "0 4px 12px rgba(6, 182, 212, 0.3)",
                    }}
                  >
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Main */}
          <main
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Gradient Background */}
            <div
              style={{
                position: "absolute",
                bottom: "-50%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "150%",
                height: "150%",
                background:
                  "radial-gradient(ellipse at center, rgba(6, 182, 212, 0.15) 0%, transparent 60%)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 1,
                width: "100%",
                maxWidth: "1200px",
                padding: "2rem",
              }}
            >
              <GenerateForm
                onStartGeneration={handleStartGeneration}
                onLoginRequired={handleLoginRequired}
                isLoggedIn={isLoggedIn}
              />
            </div>
          </main>

          {/* Login Modal */}
          {showLoginModal && !isLoggedIn && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
              }}
              onClick={() => setShowLoginModal(false)}
            >
              <div
                style={{
                  backgroundColor: "rgba(30, 30, 30, 0.95)",
                  backdropFilter: "blur(20px)",
                  borderRadius: "1rem",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  padding: "2.5rem",
                  maxWidth: "500px",
                  width: "90%",
                  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <h3
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#ffffff",
                    textAlign: "center",
                  }}
                >
                  Connect Wallet
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "rgba(255, 255, 255, 0.6)",
                    marginBottom: "2rem",
                    textAlign: "center",
                  }}
                >
                  Sign in to generate smart contracts
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <ExtensionLoginButton
                    callbackRoute="/"
                    loginButtonText="DeFi Wallet"
                    className="custom-login-btn"
                  />
                  <WebWalletLoginButton
                    callbackRoute="/"
                    loginButtonText="Web Wallet"
                    className="custom-login-btn"
                  />
                  <WalletConnectLoginButton
                    callbackRoute="/"
                    loginButtonText="xPortal"
                    className="custom-login-btn"
                  />
                </div>
                <button
                  onClick={() => setShowLoginModal(false)}
                  style={{
                    marginTop: "1.5rem",
                    width: "100%",
                    padding: "0.75rem",
                    fontSize: "0.875rem",
                    color: "rgba(255, 255, 255, 0.6)",
                    background: "transparent",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      } />

      <Route path="/history" element={<GenerationsList />} />
      
      <Route path="/studio/:sessionId" element={<GenerationStudio />} />
    </Routes>
  );
}

export default App;
