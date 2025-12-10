import { createContext, useContext, useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const auth = getAuth();

  const [authUser, setAuthUser] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);

      if (user) {
        // User is logged in - load their wishlist
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setWishlist(userData.wishlist || []);
          } else {
            // Create user document if it doesn't exist
            await setDoc(userDocRef, { wishlist: [] });
            setWishlist([]);
          }
        } catch (error) {
          console.error("Error loading wishlist:", error);
          setWishlist([]);
        }
      } else {
        // User is logged out - clear wishlist
        setWishlist([]);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Save wishlist to Firestore whenever it changes
  useEffect(() => {
    if (!authUser || loading) return;

    const saveWishlist = async () => {
      try {
        const userDocRef = doc(db, "users", authUser.uid);
        await setDoc(userDocRef, { wishlist }, { merge: true });
      } catch (error) {
        console.error("Error saving wishlist:", error);
      }
    };

    saveWishlist();
  }, [wishlist, authUser, loading]);

  // Toggle wishlist function
  const toggleWishlist = (product) => {
    if (!authUser) {
      return false; // User not logged in
    }

    setWishlist((prevWishlist) => {
      const isAlreadyInWishlist = prevWishlist.some(item => item.id === product.id);
      
      if (isAlreadyInWishlist) {
        // Remove from wishlist
        return prevWishlist.filter(item => item.id !== product.id);
      } else {
        // Add to wishlist
        return [...prevWishlist, {
          id: product.id,
          name: product.name,
          price: product.price || product.finalPrice || 0,
          image: product.image,
          originalPrice: product.originalPrice,
          discount: product.discount,
          rating: product.rating
        }];
      }
    });
    
    return true;
  };

  const isProductInWishlist = (productId) => {
    return authUser ? wishlist.some(item => item.id === productId) : false;
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        toggleWishlist,
        isProductInWishlist,
        loading,
        authUser,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);