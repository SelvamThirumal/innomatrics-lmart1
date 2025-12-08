import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";

const FileDownloads = () => {
  const [fileDocs, setFileDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "null");

  // 🔥 FETCH FILE DOCUMENTS
  useEffect(() => {
    if (!user || !user.uid) {
      console.log("No User UID found!");
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "uploadfile"),
      where("customerUserId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFileDocs(docList);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore Fetch Error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // 🔥 FLATTEN FILE ARRAY
  const allFiles = fileDocs.flatMap((doc) =>
    (doc.files || []).map((file) => ({
      ...file,
      parentDocId: doc.id,
    }))
  );

  // 🔥 SEARCH FILTER
  const filteredFiles = allFiles.filter((file) => {
    const s = searchTerm.toLowerCase();
    return (
      (file.originalName || "").toLowerCase().includes(s) ||
      (file.status || "").toLowerCase().includes(s)
    );
  });

  // 🔥 FETCH downloadURL FROM FIRESTORE
  const handleFetchDownload = async (parentDocId, fileId) => {
    try {
      const docRef = doc(db, "uploadfile", parentDocId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        alert("Document not found!");
        return;
      }

      const data = docSnap.data();
      const file = (data.files || []).find((f) => f.fileId === fileId);

      if (!file) {
        alert("File not found in database!");
        return;
      }

      if (!file.downloadURL) {
        alert("Download link not available yet!");
        return;
      }

      // 🔥 OPEN URL (starts download)
      window.open(file.downloadURL, "_blank");
    } catch (error) {
      console.error("Error fetching download:", error);
      alert("Error fetching download link.");
    }
  };

  // 🔥 LOADING UI
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        <p className="ml-3 font-semibold">Loading your downloads...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Available Downloads
        </h1>

        <input
          type="text"
          placeholder="Search by filename or status..."
          className="w-full p-4 border border-gray-200 rounded-xl mb-8 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {filteredFiles.length === 0 ? (
          <div className="bg-white p-20 text-center rounded-2xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400 text-lg">
              No correction downloads available right now.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Check your document list in Admin or re-login.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredFiles.map((file, index) => (
              <div
                key={`${file.fileId}-${index}`}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg line-clamp-1">
                      {file.originalName || "New File"}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 uppercase">
                      Type: {file.fileType}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-1 text-[10px] font-bold rounded ${
                      file.fileType.includes("image")
                        ? "bg-purple-100 text-purple-600"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {file.fileType.split("/")[1].toUpperCase()}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <span className="block text-xs text-gray-400 mb-1">
                      Status
                    </span>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        file.status === "pending_review"
                          ? "bg-yellow-50 text-yellow-600"
                          : "bg-green-50 text-green-600"
                      }`}
                    >
                      {file.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* 🔥 DOWNLOAD BUTTON (fetches URL first) */}
                  <button
                    onClick={() =>
                      handleFetchDownload(file.parentDocId, file.fileId)
                    }
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileDownloads;
