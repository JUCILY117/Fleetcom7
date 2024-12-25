import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useAuth } from "./context/AuthContext";
const Chat = lazy(() => import("./components/Chat"));
import AuthModal from "./components/AuthModal";
import { logout, db } from "./firebase"; 
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { getToken } from 'firebase/messaging';
import { messaging } from './firebase'; // Adjust path if necessary
import './App.css';
import logo from '/logo.png'; // Replace with the actual path to the logo image

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authType, setAuthType] = useState("signup");
  const [menuOpen, setMenuOpen] = useState(false); // State to track menu open/close
  const [username, setUsername] = useState("Anonymous"); // State to store username
  const menuRef = useRef(null);
  const user = useAuth();

  useEffect(() => {
    if (user?.uid) { // Ensure user and UID are present
      const fetchUsername = async () => {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username || user.displayName || "Anonymous");
        } else {
          setUsername(user.displayName || "Anonymous");
        }
      };
      fetchUsername();
    }
       

      // Listen for real-time updates to the username field
      if (user?.uid) {
        const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnapshot) => {
          if (docSnapshot.exists()) {
            const updatedUsername = docSnapshot.data().username || user.displayName || "Anonymous";
            setUsername(updatedUsername);
          }
        });
      
        return () => unsubscribe(); // Cleanup listener if user changes
      }
      
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  const openModal = (type) => {
    setAuthType(type);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center relative">
      <div
        className={`flex w-full justify-center items-center ${user ? "fixed top-8 left-1/2 transform -translate-x-1/2" : "flex-col absolute top-1/2 transform -translate-y-1/2"}`}
      >
        <img
          src={logo}
          alt="Logo"
          className={`${user ? "w-10 h-10 mr-4 md:w-16 md:h-16" : "w-48 h-48 mb-4"} sm:w-96 sm:h-96`}
        />
        <h1 className={`${user ? "text-2xl md:text-6xl" : "text-5xl"} font-bold sm:text-9xl`}>
          FLEETCOM <span className={`${user ? "text-3xl md:text-7xl" : "text-6xl"} text-red-600 sm:text-[10rem]`}>7</span>
        </h1>
      </div>

      <div className="absolute top-4 right-4 md:hidden">
        <button onClick={() => setMenuOpen(!menuOpen)} className="text-white focus:outline-none">
          <div className="w-8 h-1 bg-white mb-1 rounded"></div>
          <div className="w-8 h-1 bg-white mb-1 rounded"></div>
          <div className="w-8 h-1 bg-white rounded"></div>
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center md:hidden" 
        onClick={() => setMenuOpen(false)}>
          {user ? (
            <>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover mb-4"
                  onClick={() => window.open("https://myaccount.google.com/", "_blank")}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-400 flex items-center justify-center mb-4">
                  <span className="text-lg text-white">{user.displayName ? user.displayName[0] : "A"}</span>
                </div>
              )}
              <p className="text-2xl font-bold mb-6">{username}</p>
              <button onClick={logout} className="bg-white text-black font-bold px-4 py-2 rounded hover:bg-gray-200">
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                openModal("signup");
                setMenuOpen(false);
              }}
              className="bg-white text-black font-bold px-4 py-2 rounded"
            >
              Get Started
            </button>
          )}
        </div>
      )}

      <div className="absolute top-10 right-10 hidden md:flex items-center">
        {!user ? (
          <button
            onClick={() => openModal("signup")}
            className="bg-white text-black font-bold px-4 py-2 rounded"
          >
            Get Started
          </button>
        ) : (
          <>
            {user.photoURL ? (
              <div className="relative group">
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover mr-2 cursor-pointer transition-transform duration-300 ease-in-out transform group-hover:scale-110 group-hover:border-2 group-hover:border-white"
                  onClick={() => window.open("https://myaccount.google.com/", "_blank")}
                />
                <div className="absolute left-1/2 -translate-x-1/2 top-14 hidden group-hover:block bg-black text-white border border-[#2c2c2c] text-xs py-1 px-3 rounded-lg shadow-lg">
                  Manage Your Google Account
                </div>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center mr-2">
                <span className="text-sm text-white">{user.displayName ? user.displayName[0] : "*"}</span>
              </div>
            )}
            <p className="text-xl font-bold mr-6">{username}</p>
            <button
              onClick={logout}
              className="bg-white text-black font-bold px-4 py-2 rounded hover:bg-gray-200"
            >
              Logout
            </button>
          </>
        )}
      </div>

      {isModalOpen && (
        <AuthModal
          isOpen={isModalOpen}
          closeModal={() => setIsModalOpen(false)}
          authType={authType}
          setAuthType={setAuthType}
        />
      )}

      {user && (
        <div className="mt-6 w-full mx-auto">
          <Suspense fallback={<div>Loading Chat...</div>}>
             <Chat username={username} />
          </Suspense>
        </div>
      )}
    </div>
  );
}

export default App;
