import React, { useState } from "react";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const UserFiles = () => {
  const [files, setFiles] = useState([]);
  const [open, setOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user"));

  const fetchUserFiles = () => {
    setOpen(!open);

    if (!open) {
      const q = query(
        collection(db, "uploadfile"),
        where("customerUserId", "==", user.uid)
      );

      onSnapshot(q, (snapshot) => {
        let arr = [];

        snapshot.docs.forEach((docItem) => {
          const data = docItem.data();

          if (Array.isArray(data.files)) {
            data.files
              // ✔ User files = NO downloadURL + status is pending
              .filter((f) => f.status === "pending" && !f.downloadURL)
              .forEach((file) => {
                arr.push({
                  parentDocId: docItem.id,
                  folder: data.uploadId,
                  ...file,
                });
              });
          }
        });

        setFiles(arr);
      });
    }
  };

  return (
    <div className="p-5 bg-white rounded-xl shadow mb-6">

      {/* Folder icon LEFT */}
      <div
        onClick={fetchUserFiles}
        className="flex items-center gap-2 cursor-pointer mb-4"
      >
        <span className="text-3xl">📂</span>
        <h2 className="text-xl font-bold">Your Uploads</h2>
      </div>

      {/* File list after clicking */}
      {open && (
        <div>
          {files.length === 0 ? (
            <p>No user files found.</p>
          ) : (
            files.map((file) => (
              <div key={file.fileId} className="mb-3 p-3 border rounded-lg">
                <p className="text-xs text-gray-600">
                  Folder: /uploadfile/{file.folder}
                </p>

                <p className="font-semibold">{file.originalName}</p>

                {/* USER FILES NEVER HAVE downloadURL */}
                <p className="text-red-600 text-sm">
                  No download URL available (User file)
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default UserFiles;
