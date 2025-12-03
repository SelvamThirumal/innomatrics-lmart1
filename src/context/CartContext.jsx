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

// Generate unique key for each cart item
const getLineItemKey = (item) => {
    const customFields = [
        item.selectedColor,
        item.selectedSize,
        item.selectedMaterial,
        item.selectedRam,
    ].filter(Boolean);
    return `${item.id}_${customFields.join("_")}`;
};

// REDUCER
const reducer = (state, action) => {
    switch (action.type) {
        case ACTIONS.ADD: {
            const newItem = { ...action.payload, quantity: action.payload.quantity || 1, selected: true };
            const newLineKey = getLineItemKey(newItem);

            const exist = state.items.find((x) => getLineItemKey(x) === newLineKey);

            if (exist) {
                const updatedItems = state.items.map((x) =>
                    getLineItemKey(x) === newLineKey ? { ...x, quantity: x.quantity + newItem.quantity } : x
                );
                
                return {
                    ...state,
                    items: updatedItems,
                    notification: { 
                        show: true, 
                        message: `"${newItem.name}" quantity updated in cart!`,
                        type: "success"
                    },
                };
            }

            return {
                ...state,
                items: [...state.items, { ...newItem, lineItemKey: newLineKey }],
                notification: { 
                    show: true, 
                    message: `"${newItem.name}" added to cart successfully!`,
                    type: "success"
                },
            };
        }

        case ACTIONS.REMOVE:
            const removedItem = state.items.find(x => (x.lineItemKey || x.id) === action.payload.lineItemKey);
            return {
                ...state,
                items: state.items.filter((x) => (x.lineItemKey || x.id) !== action.payload.lineItemKey),
                notification: { 
                    show: true, 
                    message: `"${removedItem?.name || 'Item'}" removed from cart`,
                    type: "info"
                },
            };

        case ACTIONS.UPDATE_QTY:
            return {
                ...state,
                items: state.items
                    .map((x) =>
                        (x.lineItemKey || x.id) === action.payload.lineItemKey
                            ? { ...x, quantity: action.payload.quantity }
                            : x
                    )
                    .filter((x) => x.quantity > 0),
            };

        case ACTIONS.UPDATE_CUSTOMIZATION: {
            const { lineItemKey: oldKey, ...custom } = action.payload;
            const item = state.items.find((x) => x.lineItemKey === oldKey);
            if (!item) return state;

            const updated = { ...item, ...custom };
            const newKey = getLineItemKey(updated);
            const exist = state.items.find((x) => getLineItemKey(x) === newKey && x.lineItemKey !== oldKey);

            if (exist) {
                return {
                    ...state,
                    items: state.items
                        .filter((x) => x.lineItemKey !== oldKey)
                        .map((x) =>
                            getLineItemKey(x) === newKey ? { ...x, quantity: x.quantity + updated.quantity } : x
                        ),
                };
            }

            return {
                ...state,
                items: state.items.map((x) =>
                    x.lineItemKey === oldKey ? { ...updated, lineItemKey: newKey } : x
                ),
            };
        }

        case ACTIONS.TOGGLE_SELECT:
            return {
                ...state,
                items: state.items.map((x) =>
                    (x.lineItemKey || x.id) === action.payload ? { ...x, selected: !x.selected } : x
                ),
            };

        case ACTIONS.SELECT_ALL:
            return { ...state, items: state.items.map((x) => ({ ...x, selected: true })) };

        case ACTIONS.DESELECT_ALL:
            return { ...state, items: state.items.map((x) => ({ ...x, selected: false })) };

        case ACTIONS.CLEAR:
            return { 
                ...state, 
                items: [], 
                notification: { 
                    show: true, 
                    message: "Cart cleared successfully",
                    type: "info"
                } 
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

// Sanitize item before adding
const sanitizeItem = (raw) => {
    const id = raw.id ?? raw._id ?? `item_unspecified`;

    const sanitized = {
        id,
        name: raw.name ?? raw.title ?? "Unnamed Product",
        price: Math.max(0, Number(raw.price) || 0),
        quantity: Math.max(1, Math.min(99, Number(raw.quantity) || 1)),
        selected: typeof raw.selected === "boolean" ? raw.selected : true,
        image: raw.image ?? raw.img ?? raw.mainImage ?? "/default-product-image.png",
        description: raw.description ?? "",
        selectedColor: raw.selectedColor ?? raw.color ?? "",
        selectedSize: raw.selectedSize ?? raw.size ?? "",
        selectedMaterial: raw.selectedMaterial ?? raw.material ?? "",
        selectedRam: raw.selectedRam ?? raw.ram ?? "",
        originalPrice: raw.originalPrice ?? raw.price ?? 0,
    };

    sanitized.lineItemKey = getLineItemKey(sanitized);
    return sanitized;
};

// PROVIDER
export const CartProvider = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);

    // Load from storage
    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem("cartItems"));
            if (Array.isArray(saved)) {
                const items = saved.map((i) => sanitizeItem(i));
                dispatch({ type: ACTIONS.LOAD, payload: items });
            }
        } catch {
            localStorage.removeItem("cartItems");
        }
    }, []);

    // Save to storage
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem("cartItems", JSON.stringify(state.items));
        }, 50);
        return () => clearTimeout(timer);
    }, [state.items]);

    // Auto hide toast
    useEffect(() => {
        if (state.notification.show) {
            const timer = setTimeout(() => dispatch({ type: ACTIONS.HIDE_NOTIFICATION }), 3000);
            return () => clearTimeout(timer);
        }
    }, [state.notification.show]);

    // ACTION FUNCTIONS
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

    // GETTERS
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
            {/* Enhanced Notification Component */}
            {state.notification.show && (
                <div className={`fixed top-4 right-4 z-50 animate-slide-in`}>
                    <div className={`px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 ${
                        state.notification.type === "success" ? "bg-green-500 text-white" :
                        state.notification.type === "error" ? "bg-red-500 text-white" :
                        "bg-blue-500 text-white"
                    }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {state.notification.type === "success" ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : state.notification.type === "error" ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                        </svg>
                        <span className="font-medium">{state.notification.message}</span>
                        <button 
                            onClick={hideNotification}
                            className="ml-2 hover:opacity-70"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </CartContext.Provider>
    );
};

// Custom hook
export const useCart = () => useContext(CartContext);
export default CartContext;