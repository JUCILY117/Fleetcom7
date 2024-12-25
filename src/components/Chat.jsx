import { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { IoSend } from "react-icons/io5";
import { format, isToday, isYesterday, formatDistanceToNowStrict } from "date-fns";

// Function to detect URLs in text
const extractLinks = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex);
};

// Function to handle external link clicks
const handleLinkClick = (url) => {
  if (window.confirm(`Ready to visit external site: ${url}?`)) {
    window.open(url, "_blank");
  }
};

// Fetch metadata for external links
const fetchLinkMetadata = async (url) => {
  try {
    const response = await fetch(`https://api.openai.com/v1/og?url=${url}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching link metadata:', error);
    return null;
  }
};

function Chat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState("Anonymous");
  const [userProfilePic, setUserProfilePic] = useState(null);
  const [linkMetadata, setLinkMetadata] = useState({});
  const user = useAuth(); // Get the authenticated user
  const messagesEndRef = useRef(null); // For auto-scroll

  // Fetch the username and profile picture from Firestore when the user is authenticated
  useEffect(() => {
    if (user) {
      const fetchUserDetails = async () => {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const { username, profilePic } = userDoc.data();
          setUsername(username || user.displayName || "Anonymous");
          setUserProfilePic(profilePic || null);
        } else {
          setUsername(user.displayName || "Anonymous");
          setUserProfilePic(null);
        }        
      };
      fetchUserDetails();
    }
  }, [user]);

  // Fetch messages in real-time
  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    });
    return unsubscribe;
  }, []);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // get device info
  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent.toLowerCase();
  
    if (userAgent.includes("iphone")) return "Sent from iPhone";
    else if (userAgent.includes("ipad")) return "Sent from iPad";
    else if (userAgent.includes("android")) return "Sent from Android";
    else if (userAgent.includes("mac") && !userAgent.includes("iphone")) return "Sent from Mac";
    else if (userAgent.includes("windows")) return "Sent from Windows";
    return "Sent from Web";
  };

  // Send a new message to Firestore
  const sendMessage = async () => {
    if (newMessage.trim()) {
      // Get the actual device info
      let deviceInfo = getDeviceInfo();
  
      // Spoof the device info if the user is you
      if (user && user.uid === import.meta.env.VITE_SP_USER_ID) {
        deviceInfo = "Sent from iPhone";
      }              
  
      // Generate the readable timestamp
      const now = new Date();
      const readableTimestamp = now
        .toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true, // Ensures AM/PM format
        })
        .toUpperCase(); // Force AM/PM to be uppercase
  
      await addDoc(collection(db, "messages"), {
        text: newMessage,
        username: username, // Use the username from Firestore or Auth
        profilePic: userProfilePic || null, // Store the profile pic URL
        timestamp: serverTimestamp(),
        readableTimestamp, // Use normalized timestamp with uppercase AM/PM
        deviceInfo, // Use spoofed or actual device info
      });
  
      setNewMessage("");
    }
  };

  // Handle "Enter" key for sending messages
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      sendMessage();
      e.preventDefault(); // Prevent new line on "Enter"
    }
  };

  // Helper function to format the date headers
  const formatDateHeader = (timestamp) => {
    if (!timestamp?.seconds) return "Invalid Date";
    const date = new Date(timestamp.seconds * 1000);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM dd, yyyy");
  };

  return (
    <div className="w-[90%] h-[75vh] max-w-full mx-auto bg-[#0a0a0a] border border-[#2c2c2c] text-white p-3 shadow-lg rounded-lg">
      <div className="h-full overflow-y-auto mb-6 bg-black border border-[#2c2c2c] p-4 rounded-lg space-y-4">
        {messages.filter((msg) => msg.timestamp).map((msg, index) => {
          const showDateHeader =
            index === 0 ||
            formatDateHeader(messages[index - 1].timestamp) !== formatDateHeader(msg.timestamp);

          // Detect links in message text
          const links = extractLinks(msg.text);

          return (
            <div key={msg.id}>
              {showDateHeader && (
                <div className="text-center text-gray-400 text-sm mb-2">
                  {formatDateHeader(msg.timestamp)}
                </div>
              )}
              <div
                className={`flex ${msg.username === username ? "justify-end" : "justify-start"} animate-pop`}
              >
                <div className="flex items-start space-x-3">
                  {msg.profilePic ? (
                    <img
                      src={msg.profilePic}
                      alt="Profile"
                      className="w-12 h-12 rounded-full object-cover shadow-md"
                      onError={(e) => (e.target.src = "/default-profile-pic.png")}
                      onContextMenu={(e) => e.preventDefault()}
                      draggable="false"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center shadow-md">
                      <span className="text-lg text-gray-700">{msg.username[0]}</span>
                    </div>
                  )}
                  <div className="flex flex-col justify-start">
                    <div
                      className={`text-md font-bold ${msg.username === username ? "text-white" : "text-white"}`}
                    >
                      {msg.username}
                    </div>
                    <div
                      className={`p-2 rounded-lg max-w-[11.5rem] md:max-w-full ${
                        msg.username === username ? "bg-white text-black" : "bg-[#27272A] text-white"
                      }`}
                    >
                      <p className="text-md message-text break-words">
                        {/* Render the message text, converting links to clickable anchor tags */}
                        {msg.text.split(' ').map((word, index) =>
                            /(https?:\/\/[^\s]+)/.test(word) ? (
                              <a key={index} href={word} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                                {word}
                              </a>
                            ) : (
                              <span key={index}>{word} </span>
                            )
                          )}
                      </p>
                    </div>
                    <span className="text-xs text-right text-gray-300">
                      {msg.timestamp ? msg.readableTimestamp : "Sending..."} •{" "}
                      <span className="text-red-600"> {msg.deviceInfo}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex items-center mt-4 space-x-4 p-2 bg-black border border-[#2c2c2c] rounded-lg shadow-lg">
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          className="w-full p-3 rounded-lg border bg-black border-[#2c2c2c] focus:outline-none focus:ring-2 focus:ring-gray-600"
        />
        <button onClick={sendMessage} className="bg-white text-black py-3 px-3 rounded-lg focus:outline-none hover:bg-gray-200">
          <IoSend size={25} />
        </button>
      </div>
    </div>
  );
}

export default Chat;
