import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  doc,
  getDoc
} from "firebase/firestore";

const FileDownloads = () => {
  const [fileDocs, setFileDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // 🔥 FETCH ALL DOCUMENTS
  useEffect(() => {
    const q = collection(db, "uploadfile");

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFileDocs(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore Fetch Error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Flatten files
  const allFiles = fileDocs.flatMap((doc) =>
    (doc.files || []).map((file) => ({
      ...file,
      parentDocId: doc.id,
    }))
  );

  // Search filter
  const filteredFiles = allFiles.filter((file) => {
    const s = searchTerm.toLowerCase();
    return (
      (file.originalName || "").toLowerCase().includes(s) ||
      (file.status || "").toLowerCase().includes(s)
    );
  });

  // 🔥 Download function
  const handleFetchDownload = async (parentDocId, fileId) => {
    try {
      const docRef = doc(db, "uploadfile", parentDocId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) return alert("Document not found!");

      const data = snap.data();
      const file = (data.files || []).find((f) => f.fileId === fileId);

      if (!file) return alert("File not found!");
      if (!file.downloadURL) return alert("Download URL missing!");

      const link = document.createElement("a");
      link.href = file.downloadURL;
      link.download = file.originalName || "download";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download error:", err);
      alert("Error downloading file.");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin border-4 border-blue-600 border-t-transparent rounded-full h-10 w-10"></div>
        <p className="ml-3 text-gray-700">Loading files...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Your Uploaded Files</h1>

       

        {filteredFiles.length === 0 ? (
          <div className="bg-white p-20 text-center rounded-xl border-2 border-dashed">
            <p className="text-gray-500 text-lg">No files found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredFiles.map((file, index) => (
              <div
                key={`${file.fileId}-${index}`}
                className="bg-white p-6 rounded-xl shadow border"
              >
                <h3 className="font-bold text-lg">{file.originalName}</h3>

                <p className="text-xs text-gray-600 mt-1">
                  Type: {file.fileType}
                </p>

                {/* STATUS + DOWNLOAD */}
                <div className="mt-4 flex justify-between items-center">
                  <span className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                    {file.status?.replace("_", " ") || "unknown"}
                  </span>

                  <button
                    onClick={() =>
                      handleFetchDownload(file.parentDocId, file.fileId)
                    }
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg"
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
