import { createContext, useContext, useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const auth = getAuth();

  const [authUser, setAuthUser] = useState(null);        // Firebase logged user
  const [customerId, setCustomerId] = useState(null);    // Dynamic fetched ID
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  /* -----------------------------------------------------
      STEP 1: Detect logged in Firebase Auth user
  ----------------------------------------------------- */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      console.log("AUTH USER:", user?.uid);
    });

    return () => unsubscribe();
  }, []);


  /* -----------------------------------------------------
      STEP 2: Fetch customerId from Firestore dynamically
      /users/{authUser.uid}
  ----------------------------------------------------- */
  useEffect(() => {
    if (!authUser) {
      setCustomerId(null);
      return;
    }

    const fetchCustomerId = async () => {
      try {
        const ref = doc(db, "users", authUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          console.log("Dynamic customerId:", data.customerId);

          setCustomerId(data.customerId); 
        } else {
          console.warn("User Firestore doc missing");
        }
      } catch (err) {
        console.error("Error fetching customerId", err);
      }
    };

    fetchCustomerId();
  }, [authUser]);


  /* -----------------------------------------------------
      STEP 3: Load wishlist AFTER customerId is ready
      (Fix refresh issue!)
  ----------------------------------------------------- */
  useEffect(() => {
    if (!customerId) {
      console.log("Waiting for customerId...");
      return; // ❗ DO NOT LOAD empty wishlist
    }

    const loadWishlist = async () => {
      try {
        const ref = doc(db, "users", customerId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const list = snap.data().wishlist || [];
          console.log("Loaded wishlist:", list);

          setWishlist(list);
        } else {
          setWishlist([]);
        }
      } catch (err) {
        console.error("Error loading wishlist", err);
      }

      setLoading(false);
    };

    loadWishlist();
  }, [customerId]);


  /* -----------------------------------------------------
      STEP 4: Save wishlist to Firestore
  ----------------------------------------------------- */
  const saveWishlist = async (list) => {
    if (!customerId) return;

    try {
      const ref = doc(db, "users", customerId);
      await setDoc(ref, { wishlist: list }, { merge: true });
      console.log("Wishlist saved:", list);
    } catch (err) {
      console.error("Error saving wishlist", err);
    }
  };


  /* -----------------------------------------------------
      LIKE / UNLIKE PRODUCT
  ----------------------------------------------------- */
  const toggleWishlist = (product) => {
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      const updated = exists
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product];

      saveWishlist(updated);
      return updated;
    });
  };

  const isProductInWishlist = (id) =>
    wishlist.some((p) => p.id === id);


  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        toggleWishlist,
        isProductInWishlist,
        loading
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
