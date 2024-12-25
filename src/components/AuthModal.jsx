import { useEffect, useState } from "react";
import { signUp, login, googleSignIn } from "../firebase";
import { FcGoogle } from "react-icons/fc";
import { BiSolidInfoCircle } from "react-icons/bi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function AuthModal({ isOpen, closeModal, authType, setAuthType }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isFading, setIsFading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleAuth = async () => {
    setError("");
    if (authType === "signup") {
      try {
        await signUp(username, password);
        closeModal();
      } catch (err) {
        if (err.code === "auth/invalid-email") {
          toast.error("Invalid email address. Please check your email format.");
        } else if (err.code === "auth/email-already-in-use") {
          toast.error("This email is already in use. Try logging in instead.");
        } else if (err.code === "auth/weak-password") {
          toast.error("Password is too weak. Please choose a stronger password.");
        } else {
          toast.error("Oops! Something went wrong. Please try again.");
        }
      }
    } else {
      try {
        await login(username, password);
        closeModal();
      } catch (err) {
        if (err.code === "auth/user-not-found") {
          toast.error("No account found with this email address.");
        } else if (err.code === "auth/wrong-password") {
          toast.error("Incorrect password. Please try again.");
        } else if (err.code === "auth/invalid-email") {
          toast.error("Invalid email address. Please check your email format.");
        } else if (err.code === "auth/popup-closed-by-user") {
          toast.error("Login popup was closed before completing the sign-in.");
        } else {
          toast.error("Oops! Something went wrong. Please try again.");
        }
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await googleSignIn();
      closeModal();
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        toast.error("Login popup was closed before completing the sign-in.");
      } else if (err.code === "auth/network-request-failed") {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        toast.error("Oops! Something went wrong. Please try again.");
      }
    }    
  };

  useEffect(() => {
    if (isOpen) {
      setIsFading(true);
    } else {
      setIsFading(false);
    }
  }, [isOpen]);  

  const switchAuthType = (newType) => {
    setIsFading(false);
    setTimeout(() => {
      setAuthType(newType);
      setIsFading(true);
    }, 300);
  };

  const handleBackgroundClick = () => {
    setIsFading(false);
    setTimeout(() => {
      closeModal();
    }, 300);
  };
  

  useEffect(() => {
    setUsername("");
    setPassword("");
    setError("");
  }, [authType]);


  return isOpen ? (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 ${
      isFading ? "opacity-100" : "opacity-0"
         } transition-opacity duration-500 ease-in-out`} onClick={handleBackgroundClick}>
      <div
        className={`bg-black border border-[#2c2c2c] p-6 rounded shadow-lg w-96 transition-all duration-500 ease-out transform ${
          isFading ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center mb-6 relative">
          <h2 className="text-3xl font-bold">
            {authType === "signup" ? "Sign Up" : "Login"}
          </h2>
          <span
            className="absolute right-0 text-red-600 bg-white rounded-full font-bold cursor-pointer hover:text-white hover:bg-red-600 transition-all duration-300 ease-in-out"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <BiSolidInfoCircle size={25} className="animate-heartbeat" />
          </span>
          {showTooltip && (
            <div
              className={`absolute top-0 ${
                window.innerWidth < 640 ? 'left-[-0.1rem]' : 'left-full'
              } mx-auto ml-8 w-64 bg-black border border-[#2c2c2c] text-white p-2 rounded shadow-lg transform transition-transform duration-300 ease-out animate-pop`}
              style={{
                opacity: showTooltip ? 1 : 0,
                transform: showTooltip ? "translateX(0) scale(1)" : "translateX(-10px) scale(0.9)",
              }}
            >
              <span>Currently, signup/login with custom accounts is disabled. Please use </span>
              <FcGoogle className="inline" />
              <span> instead.</span>
            </div>
          )}
        </div>

        {/* {error && <p className="text-red-500">{error}</p>} */}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 border border-[#2c2c2c] outline-none mb-4 rounded bg-black cursor-not-allowed"
          disabled
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border border-[#2c2c2c] outline-none mb-4 rounded bg-black cursor-not-allowed"
          disabled
        />
        <button
          onClick={handleAuth}
          className="w-full bg-white hover:bg-gray-200 text-black font-bold py-2 rounded mb-4 cursor-not-allowed"
          disabled
        >
          {authType === "signup" ? "Sign Up" : "Login"}
        </button>
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex justify-center border border-[#2c2c2c] hover:border-[#4c4c4c] text-white py-2 rounded mb-4"
        >
          <FcGoogle size={25} />
        </button>
        <p className="text-center">
          {authType === "signup" ? (
            <>
              Already have an account?{" "}
              <span onClick={() => switchAuthType("login")} className="text-blue-500 hover:underline cursor-pointer">
                Login
              </span>
            </>
          ) : (
            <>
              Don’t have an account?{" "}
              <span onClick={() => switchAuthType("signup")} className="text-blue-500 hover:underline cursor-pointer">
                Sign Up
              </span>
            </>
          )}
        </p>
      </div>
      <ToastContainer 
      theme="dark"/>
    </div>
  ) : null;
}

export default AuthModal;
