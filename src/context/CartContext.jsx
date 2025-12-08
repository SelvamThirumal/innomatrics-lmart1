import React, { createContext, useContext, useReducer, useEffect } from "react";

const CartContext = createContext();

// ACTION TYPES
const ACTIONS = {
    ADD: "ADD",
    REMOVE: "REMOVE",
    UPDATE_QTY: "UPDATE_QTY",
    CLEAR: "CLEAR",
    LOAD: "LOAD",
    TOGGLE_SELECT: "TOGGLE_SELECT",
    SELECT_ALL: "SELECT_ALL",
    DESELECT_ALL: "DESELECT_ALL",
    SHOW_NOTIFICATION: "SHOW_NOTIFICATION",
    HIDE_NOTIFICATION: "HIDE_NOTIFICATION",
    UPDATE_CUSTOMIZATION: "UPDATE_CUSTOMIZATION",
};

// Generate unique key for each cart item based on ID and customizations
const getLineItemKey = (item) => {
    // Collect all relevant customization fields
    const customFields = [
        item.selectedColor,
        item.selectedSize,
        item.selectedMaterial,
        item.selectedRam,
    ].filter(Boolean);
    
    // Create a unique key using the base product ID and its customizations
    return `${item.id}_${customFields.join("_")}`;
};

// REDUCER
const reducer = (state, action) => {
    switch (action.type) {
        case ACTIONS.ADD: {
            // New item is sanitized before being passed to the reducer
            const newItem = { ...action.payload, quantity: action.payload.quantity || 1, selected: true };
            const newLineKey = getLineItemKey(newItem);

            // Check if an item with the same ID and customization already exists
            const exist = state.items.find((x) => getLineItemKey(x) === newLineKey);

            if (exist) {
                // If it exists, update the quantity
                const updatedItems = state.items.map((x) =>
                    getLineItemKey(x) === newLineKey ? { ...x, quantity: x.quantity + newItem.quantity } : x
                );
                
                return {
                    ...state,
                    items: updatedItems,
                };
            }

            // If it's a new item (or new customization), add it to the cart
            return {
                ...state,
                items: [...state.items, { ...newItem, lineItemKey: newLineKey }],
            };
        }

        case ACTIONS.REMOVE:
            return {
                ...state,
                // Filter out the item to be removed
                items: state.items.filter((x) => (x.lineItemKey || x.id) !== action.payload.lineItemKey),
            };

        case ACTIONS.UPDATE_QTY:
            return {
                ...state,
                items: state.items
                    .map((x) =>
                        (x.lineItemKey || x.id) === action.payload.lineItemKey
                            ? { ...x, quantity: action.payload.quantity } // Update the quantity
                            : x
                    )
                    // Remove items if quantity drops to 0 or less
                    .filter((x) => x.quantity > 0), 
            };

        case ACTIONS.UPDATE_CUSTOMIZATION: {
            const { lineItemKey: oldKey, ...custom } = action.payload;
            const item = state.items.find((x) => x.lineItemKey === oldKey);
            if (!item) return state;

            const updated = { ...item, ...custom };
            const newKey = getLineItemKey(updated);
            // Check for a mergeable item (same item type, new customization)
            const exist = state.items.find((x) => getLineItemKey(x) === newKey && x.lineItemKey !== oldKey);

            if (exist) {
                // If a merge is necessary (e.g., changing RAM option that already exists)
                return {
                    ...state,
                    items: state.items
                        .filter((x) => x.lineItemKey !== oldKey) // Remove old item
                        .map((x) =>
                            getLineItemKey(x) === newKey ? { ...x, quantity: x.quantity + updated.quantity } : x
                        ), // Update quantity of existing item
                };
            }

            // Otherwise, update the customization and key of the existing item
            return {
                ...state,
                items: state.items.map((x) =>
                    x.lineItemKey === oldKey ? { ...updated, lineItemKey: newKey } : x
                ),
            };
        }

        case ACTIONS.TOGGLE_SELECT:
            // Toggle the selected status for checkout
            return {
                ...state,
                items: state.items.map((x) =>
                    (x.lineItemKey || x.id) === action.payload ? { ...x, selected: !x.selected } : x
                ),
            };

        case ACTIONS.SELECT_ALL:
            // Mark all items as selected for checkout
            return { ...state, items: state.items.map((x) => ({ ...x, selected: true })) };

        case ACTIONS.DESELECT_ALL:
            // Mark all items as deselected
            return { ...state, items: state.items.map((x) => ({ ...x, selected: false })) };

        case ACTIONS.CLEAR:
            // Empty the cart
            return { 
                ...state, 
                items: [], 
            };

        case ACTIONS.LOAD:
            return {
                ...state,
                items: action.payload.map((item) => ({
                    ...item,
                    lineItemKey: getLineItemKey(item),
                    selected: typeof item.selected === "boolean" ? item.selected : true,
                })),
            };

        case ACTIONS.SHOW_NOTIFICATION:
            return { 
                ...state, 
                notification: { 
                    show: true, 
                    message: action.payload.message,
                    type: action.payload.type || "success"
                } 
            };

        case ACTIONS.HIDE_NOTIFICATION:
            return { ...state, notification: { show: false, message: "", type: "success" } };

        default:
            return state;
    }
};

const initialState = { 
    items: [], 
    notification: { 
        show: false, 
        message: "", 
        type: "success" 
    } 
};

// Sanitize item before adding to ensure required fields are present and valid
const sanitizeItem = (raw) => {
    const id = raw.id ?? raw._id ?? `item_unspecified`;
    
    const sanitizedPrice = Math.max(0, Number(raw.price) || 0);

    // CRITICAL FIX: 2. Add a console warning for missing price data (for developer debugging)
    if (sanitizedPrice === 0 && raw.price !== 0 && raw.price !== undefined && raw.price !== null) {
        console.warn(`Product "${raw.name ?? id}" added with a price of 0. Original value was:`, raw.price);
        console.warn("FIX: The original product object is missing a valid 'price' field or it is an empty string/NaN. Please check the component calling 'addToCart'.");
    }

    const sanitized = {
        id,
        name: raw.name ?? raw.title ?? "Unnamed Product",
        price: sanitizedPrice, // Use the calculated and sanitized price
        quantity: Math.max(1, Math.min(99, Number(raw.quantity) || 1)),
        selected: typeof raw.selected === "boolean" ? raw.selected : true,
        image: raw.image ?? raw.img ?? raw.mainImage ?? "/default-product-image.png",
        description: raw.description ?? "",
        selectedColor: raw.selectedColor ?? raw.color ?? "",
        selectedSize: raw.selectedSize ?? raw.size ?? "",
        selectedMaterial: raw.selectedMaterial ?? raw.material ?? "",
        selectedRam: raw.selectedRam ?? raw.ram ?? "",
        // Use the sanitized price as a fallback for originalPrice
        originalPrice: raw.originalPrice ?? sanitizedPrice,
    };

    sanitized.lineItemKey = getLineItemKey(sanitized);
    return sanitized;
};

// PROVIDER
export const CartProvider = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);

    // Load cart items from local storage on component mount
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem("cartItems")); 
            if (Array.isArray(saved)) {
                // Sanitize items again upon loading to ensure consistency
                const items = saved.map((i) => sanitizeItem(i));
                dispatch({ type: ACTIONS.LOAD, payload: items });
            }
        } catch {
            localStorage.removeItem("cartItems"); // Clear corrupted storage
        }
    }, []);

    // Save cart items to local storage whenever state.items changes
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem("cartItems", JSON.stringify(state.items));
        }, 50); // Debounce storage write
        return () => clearTimeout(timer);
    }, [state.items]);

    // ACTION FUNCTIONS - Wrapper functions for dispatching actions
    const addToCart = (product) => dispatch({ type: ACTIONS.ADD, payload: sanitizeItem(product) });
    const removeFromCart = (lineItemKey) => dispatch({ type: ACTIONS.REMOVE, payload: { lineItemKey } });
    const updateQuantity = (lineItemKey, quantity) =>
        dispatch({ type: ACTIONS.UPDATE_QTY, payload: { lineItemKey, quantity } });
    const updateCustomization = (lineItemKey, customization) =>
        dispatch({ type: ACTIONS.UPDATE_CUSTOMIZATION, payload: { lineItemKey, ...customization } });
    const toggleSelect = (lineItemKey) => dispatch({ type: ACTIONS.TOGGLE_SELECT, payload: lineItemKey });
    const selectAll = () => dispatch({ type: ACTIONS.SELECT_ALL });
    const deselectAll = () => dispatch({ type: ACTIONS.DESELECT_ALL });
    const clearCart = () => dispatch({ type: ACTIONS.CLEAR });
    const showNotification = (message, type = "success") => 
        dispatch({ type: ACTIONS.SHOW_NOTIFICATION, payload: { message, type } });
    const hideNotification = () => dispatch({ type: ACTIONS.HIDE_NOTIFICATION });

    // GETTERS - Helper functions to retrieve calculated data
    const getSelectedItems = () => state.items.filter((x) => x.selected);
    const getSelectedTotal = () => getSelectedItems().reduce((t, x) => t + x.price * x.quantity, 0);
    const getCartItemsCount = () => state.items.reduce((t, x) => t + x.quantity, 0);
    const getCartTotal = () => state.items.reduce((t, x) => t + x.price * x.quantity, 0);

    const value = {
        items: state.items,
        notification: state.notification,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateCustomization,
        clearCart,
        toggleSelect,
        selectAll,
        deselectAll,
        getSelectedItems,
        getSelectedTotal,
        getCartItemsCount,
        getCartTotal,
        showNotification,
        hideNotification,
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};

// Custom hook to consume the cart context
export const useCart = () => useContext(CartContext);
export default CartContext;