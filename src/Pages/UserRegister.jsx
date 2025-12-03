import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase.js";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

// User storage utility
const storeUserData = (userData, uid) => {
  localStorage.setItem("userData", JSON.stringify(userData));
  localStorage.setItem("user", JSON.stringify(userData));
  localStorage.setItem("token", uid);
  localStorage.setItem("isLoggedIn", "true");
};

const UserRegister = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contactNo: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // 1. New states for password visibility
  const [showPassword, setShowPassword] = useState(false); 
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); 


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ 
      ...formData, 
      [name]: value 
    });
  };

  // 2. Toggle functions
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };


  const generateReferralCode = (name) => {
    const cleanName = name.replace(/\s+/g, ''); // Remove spaces
    const namePart = cleanName.substring(0, 5).toUpperCase();
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return namePart + randomPart;
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return false;
    }

    if (formData.name.length < 2) {
      setError("Please enter a valid name.");
      return false;
    }

    if (formData.contactNo.length < 10) {
      setError("Please enter a valid contact number.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    // Validate form
    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      console.log("Starting registration process...");
      
      // Check if Firebase auth is initialized
      if (!auth) {
        throw new Error("Firebase Authentication is not initialized");
      }

      // Create user in Firebase Auth
      console.log("Creating user with email:", formData.email);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;
      console.log("User created successfully:", user.uid);

      // Update profile with display name
      await updateProfile(user, {
        displayName: formData.name
      });
      console.log("Profile updated with display name");

      // Generate referral code
      const referralCode = generateReferralCode(formData.name);

      // Prepare user data for Firestore
      const userData = {
        customerId: user.uid,
        name: formData.name,
        email: formData.email,
        contactNo: formData.contactNo,
        gender: null,
        profileImage: null,
        referralCode: referralCode,
        referredBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: user.emailVerified,
        role: "customer",
        status: "active"
      };

      // Store in Firestore with user ID as document ID
      console.log("Storing user data in Firestore...");
      await setDoc(doc(db, "users", user.uid), userData);
      console.log("User data stored in Firestore");

      // Store in localStorage
      storeUserData(userData, user.uid);
      console.log("User data stored in localStorage");

      setSuccess("Registration successful! Redirecting to home page...");
      
      // Redirect to home page after 2 seconds
      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (err) {
      console.error("Register Error Details:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      
      // Enhanced error handling
      switch (err.code) {
        case "auth/configuration-not-found":
          setError("Authentication service not configured. Please check Firebase configuration.");
          break;
        case "auth/email-already-in-use":
          setError("Email already registered. Please use a different email or login.");
          break;
        case "auth/weak-password":
          setError("Password must be at least 6 characters long.");
          break;
        case "auth/invalid-email":
          setError("Invalid email address format.");
          break;
        case "auth/network-request-failed":
          setError("Network error. Please check your internet connection.");
          break;
        case "auth/operation-not-allowed":
          setError("Email/password accounts are not enabled. Please contact support.");
          break;
        case "auth/too-many-requests":
          setError("Too many attempts. Please try again later.");
          break;
        default:
          if (err.message.includes("Firebase Authentication is not initialized")) {
            setError("Authentication service error. Please refresh the page and try again.");
          } else {
            setError("Registration failed. Please try again later.");
          }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Create Account
            </h2>
            <p className="text-gray-600">Join our community today</p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {success && (
            <div className="mt-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your full name"
                minLength="2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Number *
              </label>
              <input
                name="contactNo"
                type="tel"
                required
                value={formData.contactNo}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your contact number"
                minLength="10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  name="password"
                  // 3. Toggle input type between 'password' and 'text'
                  type={showPassword ? "text" : "password"} 
                  required
                  value={formData.password}
                  onChange={handleChange}
                  // Add pr-12 to make space for the button
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 pr-12"
                  placeholder="Create a password (min. 6 characters)"
                  minLength="6"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  // Position the button absolutely inside the div
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xl leading-5 text-gray-600" 
                >
                  {/* 4. Toggle emoji icon based on state */}
                  {showPassword ? "👁️" : "🔒"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  name="confirmPassword"
                  // 3. Toggle input type between 'password' and 'text'
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  // Add pr-12 to make space for the button
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 pr-12"
                  placeholder="Confirm your password"
                  minLength="6"
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  // Position the button absolutely inside the div
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xl leading-5 text-gray-600"
                >
                  {/* 4. Toggle emoji icon based on state */}
                  {showConfirmPassword ? "👁️" : "🔒"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition-all duration-200 mt-6 ${
                isLoading 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-purple-600 hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </div>
              ) : (
                "Create Account"
              )}
            </button>

            <div className="text-center text-sm mt-4 pt-4 border-t border-gray-200">
              <p className="text-gray-600">
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-purple-600 hover:text-purple-500 font-semibold"
                  onClick={() => navigate("/login")}
                >
                  Sign in here
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserRegister;