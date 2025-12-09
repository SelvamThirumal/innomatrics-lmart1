import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as fbLimit,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import OldeeProductDetails from "./OldeeProductDetails";

/* ------------ constants ------------- */
const MAX_FILES = 5;
const MAX_MB = 5;
const CUSTOMER_COLLECTION = "customers";
const USERS_COLLECTION_MIRROR = "users";
const COLLECTION = "oldee";

// ✅ Add your admin emails here
const ADMIN_EMAILS = ["admin@example.com", "iammoulahussain@gmail.com"];

const SellProductForm = ({
  user,
  onCancel,
  onSave,
  initialSummaryOpen = false,
  editDoc = null, // { id, ...fields } when editing
}) => {
  const isEdit = !!editDoc;

  const [formData, setFormData] = useState({
    name: editDoc?.name || "",
    price: editDoc?.price?.toString?.() || "",
    offerPrice:
      editDoc?.offerPrice !== undefined && editDoc?.offerPrice !== null
        ? String(editDoc.offerPrice)
        : "",
    description: editDoc?.description || "",
    contactNumber: editDoc?.contactNumber || editDoc?.seller?.contactNumber || "",
    address: editDoc?.address || editDoc?.seller?.address || "",
    negotiation: editDoc?.negotiation || "flexible",
  });

  const [images, setImages] = useState([]); // new files
  const [existingImages, setExistingImages] = useState(editDoc?.imageURLs || []); // urls
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSummaryPanelOpen, setIsSummaryPanelOpen] = useState(initialSummaryOpen);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerDoc, setCustomerDoc] = useState(null);

  const sellerId = user?.uid || "TEMP_USER_ID";

  useEffect(() => {
    const prefill = async () => {
      if (!user?.uid) return;
      if (formData.contactNumber || formData.address) return;
      try {
        const custRef = doc(db, CUSTOMER_COLLECTION, user.uid);
        let snap = await getDoc(custRef);
        if (!snap.exists()) {
          const mirrorRef = doc(db, USERS_COLLECTION_MIRROR, user.uid);
          const mirrorSnap = await getDoc(mirrorRef);
          if (mirrorSnap.exists()) snap = mirrorSnap;
        }
        if (snap.exists()) {
          const d = snap.data();
          setCustomerDoc(d);
          setFormData((prev) => ({
            ...prev,
            contactNumber: d.contactNumber || prev.contactNumber,
            address: d.address || prev.address,
          }));
        }
      } catch (e) {
        console.error("Prefill error:", e);
      }
    };
    prefill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if ((name === "price" || name === "offerPrice") && Number(value) < 0) return;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const total = existingImages.length + images.length + files.length;
    if (total > MAX_FILES) {
      alert(`Maximum ${MAX_FILES} images allowed`);
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) {
      alert(`Each image must be ≤ ${MAX_MB}MB`);
      return;
    }
    const newOnes = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...newOnes]);
  };

  const removeNewImage = (i) => setImages((prev) => prev.filter((_, idx) => idx !== i));
  const removeExistingImage = (url) =>
    setExistingImages((prev) => prev.filter((u) => u !== url));

  // 🚩 NEW HANDLER: Set an image URL as primary (move to start)
  const setAsPrimary = (url, isExisting = true) => {
    if (isExisting) {
        const temp = [...existingImages];
        const index = temp.indexOf(url);
        if (index > -1) {
            const [moved] = temp.splice(index, 1);
            setExistingImages([moved, ...temp]);
        }
    } else {
        const temp = [...images];
        const index = temp.findIndex(img => img.preview === url);
        if (index > -1) {
            const [moved] = temp.splice(index, 1);
            // Move it to the start of new images, but this should only happen if there are no existing images left
            // For simplicity and user expectation, let's move it to the start of the `images` array.
            const [movedNew] = temp.splice(index, 1);
            setImages([movedNew, ...temp]);
        }
    }
  };

  const saveCustomerDetails = async () => {
    if (!user?.uid) {
      alert("Please log in to save customer details.");
      return;
    }
    setSavingCustomer(true);
    try {
      const base = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || customerDoc?.displayName || "",
        contactNumber: formData.contactNumber || "",
        address: formData.address || "",
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, CUSTOMER_COLLECTION, user.uid), base, { merge: true });
      await setDoc(doc(db, USERS_COLLECTION_MIRROR, user.uid), base, { merge: true });
      setCustomerDoc(base);
      alert("✅ Customer details saved.");
    } catch (e) {
      console.error("saveCustomerDetails error:", e);
      alert("Failed to save customer details: " + e.message);
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (step < 3) {
      if (step === 1) {
        if (!formData.name || !formData.price || !formData.description) {
          alert("Please fill Product Name, Price and Description.");
          return;
        }
        const price = Number(formData.price);
        const offerPrice = formData.offerPrice !== "" ? Number(formData.offerPrice) : null;
        if (offerPrice !== null && offerPrice > price) {
          alert("Offer Price should be less than or equal to Price.");
          return;
        }
      }
      if (step === 2 && existingImages.length + images.length === 0) {
        alert("Please keep or upload at least one image in Step 2.");
        return;
      }
      setStep((s) => s + 1);
      return;
    }

    if (!formData.contactNumber || !formData.address) {
      alert("Please fill in Contact Number and Address.");
      return;
    }
    if (!user?.uid) {
      alert("Authentication error: Please log in to submit your listing.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      await saveCustomerDetails();

      const price = Number(formData.price);
      const offerPrice = formData.offerPrice !== "" ? Number(formData.offerPrice) : null;

      const sellerSnapshot = {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || customerDoc?.displayName || "",
        contactNumber: formData.contactNumber || customerDoc?.contactNumber || "",
        address: formData.address || customerDoc?.address || "",
        savedAt: serverTimestamp(),
      };

      // Upload NEW images
      const newUrls = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const ext = (img.file.name.split(".").pop() || "jpg").toLowerCase();
        const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
        const path = `${COLLECTION}/${user.uid || "anon"}/products/${isEdit ? editDoc.id : "new"}/${Date.now()}_${i}.${safeExt}`;
        const storageRef = ref(storage, path);
        const snap = await uploadBytes(storageRef, img.file);
        const url = await getDownloadURL(snap.ref);
        newUrls.push(url);
        setUploadProgress(Math.round(((i + 1) / images.length) * 100));
      }

      // The key change: finalURLs array order is what determines the primary image
      const finalURLs = [...existingImages, ...newUrls];

      if (isEdit) {
        const updatePayload = {
          name: formData.name,
          price: Number(formData.price),
          offerPrice: formData.offerPrice === "" ? null : Number(formData.offerPrice),
          description: formData.description,
          contactNumber: formData.contactNumber,
          address: formData.address,
          negotiation: formData.negotiation,
          imageURLs: finalURLs,
          sellerId: user.uid,
          seller: sellerSnapshot,
          // keep previous approval unless admin toggles elsewhere
          approved: editDoc.approved ?? false,
          status: editDoc.status || (editDoc.approved ? "active" : "pending"),
          marketplace: "oldee",
          updatedAt: serverTimestamp(),
        };
        await updateDoc(doc(db, COLLECTION, editDoc.id), updatePayload);
        onSave({ id: editDoc.id, ...updatePayload });
      } else {
        const baseData = {
          ...formData,
          price: Number(formData.price),
          offerPrice: formData.offerPrice === "" ? null : Number(formData.offerPrice),
          imageURLs: [],
          isSold: false,
          createdAt: serverTimestamp(),
          sellerId: user.uid,
          seller: sellerSnapshot,
          // ⛳ new items start pending/unapproved
          approved: false,
          status: "pending",
          marketplace: "oldee",
        };
        const colRef = collection(db, COLLECTION);
        const docRef = await addDoc(colRef, baseData);

        await updateDoc(doc(db, COLLECTION, docRef.id), {
          imageURLs: finalURLs,
          publishedAt: serverTimestamp(),
        });

        onSave({ ...baseData, imageURLs: finalURLs, id: docRef.id });
      }
    } catch (error) {
      console.error("Submit listing error:", error);
      alert(`Listing failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const steps = [
    { number: 1, title: isEdit ? "Edit: Basic" : "Basic Info" },
    { number: 2, title: "Details" },
    { number: 3, title: "Contact & Final" },
  ];

  if (!user) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-300 w-full max-w-md text-center">
        <h3 className="text-xl font-bold text-red-600 mb-4">🔐 Login Required</h3>
        <p className="text-gray-600 mb-6">Please log in or sign up to access the Sell Product Form.</p>
        <button onClick={onCancel} className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold">
          Close
        </button>
      </div>
    );
  }

  const priceNum = Number(formData.price || 0);
  const offerPriceNum = formData.offerPrice !== "" ? Number(formData.offerPrice) : null;
  const hasDiscount = offerPriceNum !== null && offerPriceNum < priceNum;
  const discountPct = hasDiscount ? Math.round(((priceNum - offerPriceNum) / priceNum) * 100) : 0;
  
  // Combine all images for Step 2 display
  const allImages = [
      ...existingImages.map(url => ({ url, isExisting: true, isPrimary: url === existingImages[0] })),
      ...images.map(img => ({ url: img.preview, isExisting: false, isPrimary: existingImages.length === 0 && img.preview === images[0]?.preview })),
  ];
  const totalImageCount = existingImages.length + images.length;
  const showPrimaryButton = totalImageCount > 1;


  return (
    <div className="flex relative w-full max-w-4xl mx-auto">
      {/* MAIN FORM */}
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200 w-full">
        <div className="mb-1 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isEdit ? "Edit Listing" : "List Your Vintage Item"}
          </h2>
          <button
            type="button"
            onClick={() => setIsSummaryPanelOpen((p) => !p)}
            className={`relative w-10 h-10 rounded-full shadow-md transition-all duration-300 ${
              isSummaryPanelOpen ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
            } text-white flex items-center justify-center -mt-2`}
            title={isSummaryPanelOpen ? "Close Summary" : "View Listing Summary"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isSummaryPanelOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </>
              )}
            </svg>
          </button>
        </div>

        {isEdit && (
          <p className="text-xs text-gray-500 -mt-2 mb-4">
            Editing listing: <span className="font-mono">{editDoc.id}</span>
          </p>
        )}

        <p className="text-sm text-gray-600 -mt-1 mb-6">
          {isEdit ? "Update your listing details" : "Fill in the details to list your item for sale"}
        </p>

        {/* steps */}
        <div className="flex justify-between mb-8 relative">
          <div className="absolute top-4 left-0 w-full h-1 bg-gray-200 -z-10">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: "0%" }}
              animate={{ width: `${((step - 1) / 2) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {steps.map((s) => (
            <div key={s.number} className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s.number ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {s.number}
              </div>
              <span className="text-xs mt-2 text-gray-600">{s.title}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {/* Step 1 */}
            {step === 1 && (
              <motion.div key="step1" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-4">
                <div>
                  <label className="block text-left text-sm font-semibold text-gray-800 mb-1">Product Name *</label>
                  <input
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Vintage 90s Band T-shirt"
                    required
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* PRICE */}
                <div>
                  <label className="block text-left text-sm font-semibold text-gray-800 mb-1">Price (₹) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      name="price"
                      type="number"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="1999"
                      min="0"
                      step="1"
                      required
                      className="w-full pl-8 pr-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* OFFER PRICE */}
                <div>
                  <label className="block text-left text-sm font-semibold text-gray-800 mb-1">
                    Offer Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      name="offerPrice"
                      type="number"
                      value={formData.offerPrice}
                      onChange={handleChange}
                      placeholder={formData.price ? String(formData.price) : "e.g. 1799"}
                      min="0"
                      step="1"
                      className="w-full pl-8 pr-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {hasDiscount && (
                    <p className="mt-1 text-xs text-emerald-600">
                      Discount: ₹{priceNum - offerPriceNum} ({discountPct}%)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-left text-sm font-semibold text-gray-800 mb-1">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Condition, history, size, material, etc."
                    rows="3"
                    required
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <motion.div key="step2" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-4">
                <div>
                  <label className="block text-left text-sm font-semibold text-gray-800 mb-1">
                    Images (Max {MAX_FILES})
                  </label>
                  
                  {/* Image Gallery Display */}
                  {totalImageCount > 0 && (
                      <div className="mb-4 p-4 border border-dashed border-blue-300 rounded-xl">
                          <p className="text-sm font-medium text-gray-700 mb-3">
                              Current Images ({totalImageCount}/{MAX_FILES})
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                              {allImages.map((img, idx) => (
                                  <motion.div 
                                      key={img.url + idx} 
                                      initial={{ scale: 0.8, opacity: 0 }} 
                                      animate={{ scale: 1, opacity: 1 }} 
                                      exit={{ scale: 0.8, opacity: 0 }}
                                      className="relative rounded-lg overflow-hidden border-2"
                                      // 🚩 Added border to highlight primary image
                                      style={{ borderColor: img.isPrimary ? '#3b82f6' : '#e5e7eb' }}
                                  >
                                      <img src={img.url} alt={`Product ${idx + 1}`} className="w-full h-20 object-cover" />
                                      
                                      {/* Primary Tag */}
                                      {img.isPrimary ? (
                                          <div className="absolute top-0 left-0 bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-br-lg">
                                              Primary
                                          </div>
                                      ) : showPrimaryButton ? (
                                          // Set as Primary Button
                                          <button
                                              type="button"
                                              onClick={() => setAsPrimary(img.url, img.isExisting)}
                                              className="absolute top-0 left-0 bg-black/50 text-white text-xs font-bold px-2 py-0.5 hover:bg-black/70 transition-colors"
                                              title="Set as cover image"
                                          >
                                              Set Primary
                                          </button>
                                      ) : null}

                                      {/* Remove Button */}
                                      <button
                                          type="button"
                                          onClick={() => img.isExisting ? removeExistingImage(img.url) : removeNewImage(images.findIndex(i => i.preview === img.url))}
                                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-md hover:bg-red-600"
                                          title="Remove"
                                      >
                                          ×
                                      </button>
                                  </motion.div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* Upload Dropzone */}
                  {totalImageCount < MAX_FILES && (
                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors duration-200">
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                        // Disable if max files reached (though already checked in handler)
                        disabled={totalImageCount >= MAX_FILES}
                      />
                      <label htmlFor="image-upload" className="cursor-pointer block">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                            Click to upload {MAX_FILES - totalImageCount} more images
                        </p>
                        <p className="text-xs text-gray-400">PNG, JPG, WEBP up to {MAX_MB}MB each</p>
                      </label>
                    </div>
                  )}

                  {/* Negotiation Options */}
                  <div className="mt-4">
                    <label className="block text-left text-sm font-semibold text-gray-800 mb-1">Price Negotiation</label>
                    <div className="flex space-x-2">
                      {["fixed", "flexible", "negotiable"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setFormData((p) => ({ ...p, negotiation: option }))}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                            formData.negotiation === option ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <motion.div key="step3" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-4">
                <div>
                  <label className="block text-left text-sm font-semibold text-gray-800 mb-1">Contact Number *</label>
                  <input
                    name="contactNumber"
                    type="tel"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    required
                    pattern="^[0-9+ -]*$"
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-left text-sm font-semibold text-gray-800 mb-1">Address *</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter your full address for delivery"
                    rows="3"
                    required
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
                {isSubmitting && uploadProgress !== null && (
                  <div className="mt-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-2 bg-blue-600 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Uploading images… {uploadProgress}%</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* nav buttons */}
          <div className="flex justify-between mt-8 space-x-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="px-6 py-3 text-sm border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200 flex items-center"
                disabled={isSubmitting}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 text-sm border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all duration-300 shadow-md flex items-center justify-center min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEdit ? "Updating..." : "Listing..."}
                </>
              ) : step === 3 ? (isEdit ? "Update Listing" : "Submit Listing") : "Next Step"}
            </button>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">Step {step} of 3</p>
        </form>
      </div>
    </div>
  );
};

const ProductsViewer = ({ user, isAdmin, onClose, onEdit }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const load = async () => {
    setLoading(true);
    // 🚩 ADDED: Exit early if no user is available
    if (!user) {
        setLoading(false);
        return;
    }
    try {
      // Logic: If admin, show all products. If not admin, show only products where sellerId matches user.uid.
      const qRef = isAdmin
        ? query(collection(db, COLLECTION), orderBy("createdAt", "desc"), fbLimit(50))
        : query(
            collection(db, COLLECTION),
            where("sellerId", "==", user?.uid || "__"), // This filters the products to match the logged-in customer's ID
            orderBy("createdAt", "desc"),
            fbLimit(50)
          );
      const snap = await getDocs(qRef);
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(arr);
    } catch (e) {
      console.error("Viewer load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Re-run load when user/isAdmin changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  const approveItem = async (id, approved) => {
    try {
      await updateDoc(doc(db, COLLECTION, id), {
        approved,
        status: approved ? "active" : "pending",
        updatedAt: serverTimestamp(),
      });
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, approved, status: approved ? "active" : "pending" } : it)));
    } catch (e) {
      alert("Failed to update approval: " + e.message);
    }
  };

  const removeItem = async (id) => {
    if (!window.confirm("Delete this listing?")) return;
    try {
      await deleteDoc(doc(db, COLLECTION, id));
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert("Failed to delete: " + e.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 p-4 md:p-8 overflow-auto"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">{isAdmin ? "All Products" : "My Products"}</h3>
          <div className="flex gap-2">
            <button onClick={load} className="px-3 py-2 rounded-lg border">Refresh</button>
            <button onClick={onClose} className="px-3 py-2 rounded-lg bg-black text-white">Close</button>
          </div>
        </div>

        {/* 🚩 ADDED: Display Login Required message if no user */}
        {!user ? (
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-300 w-full max-w-md mx-auto text-center mt-20">
                <h3 className="text-xl font-bold text-red-600 mb-4">🔐 Login Required</h3>
                <p className="text-gray-600 mb-6">Please log in or sign up to view your product listings.</p>
                <button onClick={onClose} className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold">
                    Close Viewer
                </button>
            </div>
        ) : loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-600">No products found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p) => (
              <div key={p.id} className="border rounded-xl p-4 bg-white shadow-sm">
                {Array.isArray(p.imageURLs) && p.imageURLs[0] && (
                  <img src={p.imageURLs[0]} alt={p.name} className="w-full h-40 object-cover rounded-lg mb-3" />
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{p.name}</h4>
                    <div className="text-sm text-gray-700">
                      ₹{p.price}
                      {p.offerPrice != null && (
                        <>
                          {"  "}
                          <span className="line-through text-gray-400">₹{p.price}</span>{" "}
                          <span className="font-semibold text-emerald-700">₹{p.offerPrice}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-1 text-xs">
                      <span className={`px-2 py-1 rounded-full ${p.approved ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {p.approved ? "Approved" : "Pending"}
                      </span>
                      <span className="ml-2 px-2 py-1 rounded-full bg-gray-100 text-gray-700">{p.negotiation}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-600 mt-2 line-clamp-2">{p.description}</p>

                <div className="flex gap-2 mt-4">
                  <button onClick={() => onEdit(p)} className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">
                    Edit
                  </button>
                  <button onClick={() => removeItem(p.id)} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm">
                    Delete
                  </button>
                </div>

                {isAdmin && (
                  <div className="mt-2 flex gap-2">
                    {p.approved ? (
                      <button onClick={() => approveItem(p.id, false)} className="flex-1 py-2 rounded-lg border text-sm">
                        Mark Pending
                      </button>
                    ) : (
                      <button onClick={() => approveItem(p.id, true)} className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm">
                        Approve
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};


/* ============================================
   Oldee (Main Component)
============================================ */
const Oldee = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // overlays
  const [showUpload, setShowUpload] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  // NEW STATE for product details
  const [selectedProduct, setSelectedProduct] = useState(null);

  // approved items for main page
  const [approvedItems, setApprovedItems] = useState([]);
  const [loadingApproved, setLoadingApproved] = useState(true);

  const isAdmin = useMemo(
    () => !!currentUser && ADMIN_EMAILS.includes(currentUser.email || ""),
    [currentUser]
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u || null);
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  // Load approved products for main page
  const loadApproved = async () => {
    setLoadingApproved(true);
    try {
      const qRef = query(
        collection(db, COLLECTION),
        where("status", "==", "active"), // Filter by status: "active" as per previous request
        orderBy("createdAt", "desc"),
        fbLimit(30)
      );
      const snap = await getDocs(qRef);
      setApprovedItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("approved load error:", e);
    } finally {
      setLoadingApproved(false);
    }
  };

  // 🚩 MODIFIED: Load approved items even when logged out.
  // The list will reload when the user logs in/out due to the [currentUser] dependency.
  useEffect(() => {
    loadApproved();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // --- Handlers ---
  const openCreate = () => {
    // These guards prevent non-logged-in users from opening the modal directly
    if (!currentUser) {
      return;
    }
    setEditingDoc(null);
    setSelectedProduct(null); // Close details if open
    setShowUpload(true);
  };

  const openViewer = () => {
    // These guards prevent non-logged-in users from opening the modal directly
    if (!currentUser) {
      return;
    }
    setSelectedProduct(null); // Close details if open
    setShowViewer(true);
  }

  const handleSave = () => {
    setShowUpload(false);
    setEditingDoc(null);
    // After create/update, refresh both lists
    loadApproved();
  };

  const handleEditFromViewer = (docData) => {
    setEditingDoc(docData);
    setShowViewer(false);
    setShowUpload(true);
  };

  // NEW Handlers for product details
  const viewProductDetails = (product) => {
    setSelectedProduct(product);
  }

  const closeProductDetails = () => {
    setSelectedProduct(null);
  }

  // Determine what to render
  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Authenticating…</p>
      </div>
    );
  }

  // RENDER THE NEW DETAILS PAGE if a product is selected
  if (selectedProduct) {
    return (
      <OldeeProductDetails
        product={selectedProduct}
        onBack={closeProductDetails}
        // Only allow editing if the current user is the seller or an admin
        onEdit={
          currentUser?.uid === selectedProduct.sellerId || isAdmin
            ? (p) => {
                closeProductDetails(); // Close details view
                setEditingDoc(p);
                setShowUpload(true);
              }
            : null
        }
      />
    );
  }

  // 🚩 REMOVED: Full "Access Restricted" block. Marketplace is now public.


  // --- Main Marketplace View (Always shown, buttons are conditional) ---
  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Top-right corner buttons */}
      <div className="max-w-6xl mx-auto px-4 pt-6 flex justify-end gap-3">
        {/* 🔑 ONLY SHOW UPLOAD and VIEW BUTTONS IF currentUser IS PRESENT */}
        {currentUser && (
          <>
            <button
              onClick={openCreate}
              className="px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition-all duration-300"
            >
              Upload
            </button>
            <button
              onClick={openViewer}
              className="px-6 py-2 rounded-full bg-gray-900 hover:bg-black text-white font-semibold shadow-md transition-all duration-300"
            >
              View My Listings
            </button>
          </>
        )}
      </div>


      {/* Main approved grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Oldee Marketplace</h1>
        <p className="text-gray-600 mb-8">
          Only <span className="font-semibold">active</span> products are visible here.
        </p>

        {loadingApproved ? (
          <p className="text-sm text-gray-600">Loading products…</p>
        ) : approvedItems.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-gray-600">
            No active products yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {approvedItems.map((p) => (
              <div
                key={p.id}
                className="bg-white border rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300"
                onClick={() => viewProductDetails(p)} // CLICK HANDLER ADDED
              >
                {Array.isArray(p.imageURLs) && p.imageURLs[0] && (
                  <img src={p.imageURLs[0]} alt={p.name} className="w-full h-44 object-cover" />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <div className="text-sm text-gray-700 mt-1">
                    ₹{p.price}
                    {p.offerPrice != null && (
                      <>
                        {" "}
                        <span className="line-through text-gray-400">₹{p.price}</span>{" "}
                        <span className="font-semibold text-emerald-700">₹{p.offerPrice}</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">{p.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full-screen Upload modal (access controlled inside SellProductForm) */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 overflow-auto p-4 md:p-8"
          >
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setShowUpload(false);
                  setEditingDoc(null);
                }}
                className="px-3 py-2 rounded-lg border"
              >
                Close
              </button>
            </div>
            <SellProductForm
              user={currentUser}
              onCancel={() => {
                setShowUpload(false);
                setEditingDoc(null);
              }}
              onSave={handleSave}
              initialSummaryOpen={!!editingDoc}
              editDoc={editingDoc}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen Viewer modal (access controlled inside ProductsViewer) */}
      <AnimatePresence>
        {showViewer && (
          <ProductsViewer
            user={currentUser}
            isAdmin={isAdmin}
            onClose={() => setShowViewer(false)}
            onEdit={handleEditFromViewer}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Oldee;