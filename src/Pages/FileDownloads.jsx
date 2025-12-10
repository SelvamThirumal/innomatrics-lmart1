import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { 
  collection, 
  onSnapshot, 
  doc, 
  getDoc, 
  query, 
  where 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const FileDownloads = () => {
  const [fileDocs, setFileDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  // 🔥 GET CURRENT USER FROM FIREBASE AUTH
  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setUserLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 FETCH DOCUMENTS ONLY FOR CURRENT USER
  useEffect(() => {
    if (userLoading) return;
    
    if (!currentUser) {
      setLoading(false);
      setFileDocs([]);
      return;
    }

    const q = query(
      collection(db, "uploadfile"),
      where("customerId", "==", currentUser.uid) // Match current user's UID with customerId
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ 
          id: d.id, 
          ...d.data() 
        }));
        setFileDocs(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore Fetch Error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, userLoading]);

  // Flatten files array from all documents
  const allFiles = fileDocs.flatMap((doc) =>
    (doc.files || []).map((file) => ({
      ...file,
      parentDocId: doc.id,
      uploadDate: doc.createdAt || doc.uploadDate || "Unknown date"
    }))
  );

  // Search filter
  const filteredFiles = allFiles.filter((file) => {
    const s = searchTerm.toLowerCase();
    return (
      (file.originalName || "").toLowerCase().includes(s) ||
      (file.status || "").toLowerCase().includes(s) ||
      (file.fileType || "").toLowerCase().includes(s)
    );
  });

  // 🔥 Download function
  const handleFetchDownload = async (parentDocId, fileId) => {
    try {
      const docRef = doc(db, "uploadfile", parentDocId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        alert("Document not found!");
        return;
      }

      const data = snap.data();
      const file = (data.files || []).find((f) => f.fileId === fileId);

      if (!file) {
        alert("File not found!");
        return;
      }
      
      if (!file.downloadURL) {
        alert("Download URL missing!");
        return;
      }

      // Create download link
      const link = document.createElement("a");
      link.href = file.downloadURL;
      link.download = file.originalName || "download";
      link.target = "_blank";
      link.rel = "noopener noreferrer"; // Security best practice
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Optional: Log download activity
      console.log(`Downloaded: ${file.originalName}`);
    } catch (err) {
      console.error("Download error:", err);
      alert("Error downloading file. Please try again.");
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      return dateString;
    }
  };

  // Show loading state
  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin border-4 border-blue-600 border-t-transparent rounded-full h-12 w-12 mx-auto"></div>
          <p className="ml-3 text-gray-700 mt-3">Loading files...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 md:p-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Your Uploaded Files</h1>
          <div className="bg-white p-20 text-center rounded-xl border-2 border-dashed">
            <p className="text-gray-500 text-lg mb-4">Please login to view your files</p>
            <p className="text-gray-400">You need to be logged in to access your uploaded files</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Your Uploaded Files</h1>
          <p className="text-gray-600 mt-2">
            Welcome back! Here are all the files you've uploaded.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search files by name, type, or status..."
              className="w-full p-4 pl-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-sm text-gray-500">
            <span>
              {filteredFiles.length === 0 ? "No files" : 
               `Showing ${filteredFiles.length} file${filteredFiles.length !== 1 ? 's' : ''}`}
            </span>
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="text-blue-600 hover:text-blue-800"
              >
                Clear search
              </button>
            )}
          </div>
        </div>

        {/* Files Grid or Empty State */}
        {filteredFiles.length === 0 ? (
          <div className="bg-white p-16 text-center rounded-xl border-2 border-dashed border-gray-300">
            <div className="w-20 h-20 mx-auto mb-6 text-gray-300">
              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {searchTerm ? "No files match your search" : "No files uploaded yet"}
            </h3>
            <p className="text-gray-500">
              {searchTerm 
                ? "Try a different search term" 
                : "Upload some files to see them here"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFiles.map((file, index) => (
              <div
                key={`${file.fileId}-${index}`}
                className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300 overflow-hidden"
              >
                {/* File Icon Header */}
                <div className={`p-5 ${getStatusColor(file.status).bg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3">
                        <span className={`text-lg font-bold ${getStatusColor(file.status).text}`}>
                          {getFileIcon(file.fileType)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 truncate" title={file.originalName}>
                          {file.originalName || "Unnamed File"}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {formatDate(file.uploadDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* File Details */}
                <div className="p-5">
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">Type:</span>
                      <span className="font-medium text-gray-800">{file.fileType || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-500">Size:</span>
                      <span className="font-medium text-gray-800">
                        {file.fileSize ? formatFileSize(file.fileSize) : "Unknown"}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge + Download Button */}
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(file.status).badge}`}>
                      {file.status?.replace(/_/g, " ") || "Unknown Status"}
                    </span>

                    <button
                      onClick={() => handleFetchDownload(file.parentDocId, file.fileId)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center"
                      title="Download file"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                      </svg>
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to get file icon based on type
const getFileIcon = (fileType) => {
  if (!fileType) return "📄";
  
  const type = fileType.toLowerCase();
  if (type.includes("pdf")) return "📕";
  if (type.includes("image")) return "🖼️";
  if (type.includes("video")) return "🎬";
  if (type.includes("audio")) return "🎵";
  if (type.includes("word") || type.includes("doc")) return "📝";
  if (type.includes("excel") || type.includes("xls")) return "📊";
  if (type.includes("zip") || type.includes("rar")) return "📦";
  return "📄";
};

// Helper function to get status color
const getStatusColor = (status) => {
  if (!status) return {
    bg: "bg-gray-50",
    text: "text-gray-600",
    badge: "bg-gray-100 text-gray-800"
  };
  
  const s = status.toLowerCase();
  if (s.includes("complete") || s.includes("success") || s.includes("approved")) {
    return {
      bg: "bg-green-50",
      text: "text-green-600",
      badge: "bg-green-100 text-green-800"
    };
  }
  if (s.includes("pending") || s.includes("processing")) {
    return {
      bg: "bg-yellow-50",
      text: "text-yellow-600",
      badge: "bg-yellow-100 text-yellow-800"
    };
  }
  if (s.includes("error") || s.includes("failed") || s.includes("rejected")) {
    return {
      bg: "bg-red-50",
      text: "text-red-600",
      badge: "bg-red-100 text-red-800"
    };
  }
  return {
    bg: "bg-blue-50",
    text: "text-blue-600",
    badge: "bg-blue-100 text-blue-800"
  };
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default FileDownloads;