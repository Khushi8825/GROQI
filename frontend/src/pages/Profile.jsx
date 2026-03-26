import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [image, setImage] = useState(null);
  const navigate = useNavigate();
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef(null); // ✅ FIXED

  // 🔹 Load user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        const data = await res.json();
        setUser(data);
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    };

    fetchUser();
  }, []);

  // 🔹 Camera
  const handleCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      setTimeout(() => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0);

        const imageData = canvas.toDataURL("image/png");

        localStorage.setItem("profile_image", imageData);
        setImage(imageData);

        stream.getTracks().forEach((track) => track.stop());
        setShowOptions(false); // ✅ close dropdown
      }, 2000);
    } catch (err) {
      alert("Camera access denied");
    }
  };

  // 🔹 Gallery
  const handleGallery = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      localStorage.setItem("profile_image", reader.result);
      setImage(reader.result);
      setShowOptions(false); // ✅ close dropdown
    };

    reader.readAsDataURL(file);
  };

  // 🔹 Remove
  const handleRemove = (e) => {
    e.stopPropagation();
    localStorage.removeItem("profile_image");
    setImage(null);
    setShowOptions(false); // ✅ close dropdown
  };

  // 🔹 Close dropdown on outside click
  useEffect(() => {
    const close = () => setShowOptions(false);
    window.addEventListener("click", close);

    return () => window.removeEventListener("click", close);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-96 text-center">
        <h2 className="text-2xl font-bold mb-6">Profile</h2>

        {/* Profile Image */}
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200">
            {image || localStorage.getItem("profile_image") ? (
              <img
                src={image || localStorage.getItem("profile_image")}
                alt="profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-3xl">
                👤
              </div>
            )}
          </div>

          {/* 📷 Camera Button */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowOptions((prev) => !prev);
            }}
            className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow cursor-pointer hover:scale-105 transition"
          >
            📷
          </div>

          {/* 🔽 Dropdown */}
          {showOptions && (
            <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-lg w-40 text-left z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCamera();
                }}
                className="block w-full px-4 py-2 hover:bg-gray-100"
              >
                📷 Camera
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current.click();
                }}
                className="block w-full px-4 py-2 hover:bg-gray-100"
              >
                🖼 Gallery
              </button>

              <button
                onClick={handleRemove}
                className="block w-full px-4 py-2 hover:bg-gray-100 text-red-500"
              >
                ❌ Remove
              </button>
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleGallery}
          className="hidden"
        />

        {/* User Info */}
        {user ? (
          <div className="text-left mt-4 space-y-2">
            <div className="bg-gray-100 p-2 rounded">
              <b>Name:</b> {user.name}
            </div>
            <div className="bg-gray-100 p-2 rounded">
              <b>Email:</b> {user.email}
            </div>
            <div className="bg-gray-100 p-2 rounded">
              <b>Contact:</b> {user.contact_no}
            </div>
          </div>
        ) : (
          <p>Loading...</p>
        )}

        <button
          onClick={() => navigate("/")}
          className="mt-6 bg-indigo-500 text-white px-4 py-2 rounded"
        >
          Back
        </button>
      </div>
    </div>
  );
}
