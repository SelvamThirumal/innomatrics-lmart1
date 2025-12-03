
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../../firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";

const FileDownloads = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState([]);

  const storage = getStorage();

  useEffect(() => {
    fetchFiles();
  }, []);

  //  ---------- FETCH FILES FROM FIRESTORE ----------
  const fetchFiles = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "files"));
      const fetchedFiles = [];

      for (let snap of querySnapshot.docs) {
        const fileData = snap.data();

        // Attach Firebase Storage download URL
        const downloadURL = await getDownloadURL(
          ref(storage, fileData.storagePath)
        );

        fetchedFiles.push({
          id: snap.id,
          ...fileData,
          downloadURL: downloadURL,
        });
      }

      setFiles(fetchedFiles);

      // Extract unique categories
      const uniqueCats = [
        ...new Set(fetchedFiles.map((file) => file.category)),
      ];
      setCategories(uniqueCats);
    } catch (err) {
      console.error("Error loading files:", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------- HANDLE DOWNLOAD ----------
  const handleDownload = async (file) => {
    try {
      // Trigger browser download
      const a = document.createElement("a");
      a.href = file.downloadURL;
      a.download = file.originalName;
      a.click();

      // Update download count in Firestore
      const fileRef = doc(db, "files", file.id);
      await updateDoc(fileRef, {
        downloadCount: (file.downloadCount || 0) + 1,
      });

      // Refresh UI count
      fetchFiles();
    } catch (error) {
      console.error("Download error:", error);
      alert("Error downloading file");
    }
  };

  // ---------- FORMAT SIZE ----------
  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // ---------- FILE ICON ----------
  const getFileIcon = (fileType) => {
    if (fileType.includes("image")) return "M4 16l4.586-4.586...";
    if (fileType.includes("pdf")) return "M9 12h6m-6 4...";
    return "M9 12h6m-6 4h6...";
  };

  // ---------- COLOR TAG ----------
  const getFileTypeColor = (fileType) => {
    if (fileType.includes("image"))
      return "bg-green-100 text-green-800";
    if (fileType.includes("pdf"))
      return "bg-red-100 text-red-800";
    if (fileType.includes("word"))
      return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  // ---------- FILTER ----------
  const filteredFiles = files.filter((file) => {
    const searchMatch =
      file.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const categoryMatch =
      selectedCategory === "all" || file.category === selectedCategory;

    return searchMatch && categoryMatch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-b-2 border-purple-600 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">

      {/* HEADER */}
      <div className="bg-white shadow border-b">
        <div className="max-w-7xl mx-auto py-8 text-center">
          <h1 className="text-4xl font-bold">File Downloads</h1>
          <p className="text-gray-600">
            Browse and download files directly from Firebase.
          </p>
        </div>
      </div>

      {/* MAIN */}
      <div className="max-w-7xl mx-auto py-8 px-4">

        {/* SEARCH + CATEGORY */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex flex-col md:flex-row gap-4">

            <input
              type="text"
              placeholder="Search files..."
              className="flex-1 border rounded-lg p-3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              className="md:w-64 border rounded-lg p-3"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

          </div>
        </div>

        {/* FILE GRID */}
        {filteredFiles.length === 0 ? (
          <div className="text-center py-10">
            <h3 className="text-lg font-medium text-gray-900">
              No files found
            </h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white border shadow p-6 rounded-lg"
              >
                {/* FILE THUMBNAIL */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-600 text-white flex items-center justify-center rounded-lg">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={getFileIcon(file.fileType)}
                      />
                    </svg>
                  </div>

                  <span
                    className={`px-2 py-1 text-xs rounded-full ${getFileTypeColor(
                      file.fileType
                    )}`}
                  >
                    {file.fileType.split("/")[1]?.toUpperCase()}
                  </span>
                </div>

                {/* NAME */}
                <h3 className="text-lg font-semibold mb-1">
                  {file.originalName}
                </h3>

                {/* DESCRIPTION */}
                <p className="text-sm text-gray-600 mb-2">
                  {file.description}
                </p>

                {/* META */}
                <div className="flex justify-between text-sm text-gray-500 mb-4">
                  <span>{formatFileSize(file.fileSize)}</span>
                  <span>{file.downloadCount} downloads</span>
                </div>

                {/* DOWNLOAD BUTTON */}
                <button
                  onClick={() => handleDownload(file)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}

        {/* BACK BTN */}
        <div className="text-center mt-12">
          <Link
            to="/"
            className="px-6 py-3 bg-gray-600 text-white rounded-lg shadow"
          >
            Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
};

export default FileDownloads;
