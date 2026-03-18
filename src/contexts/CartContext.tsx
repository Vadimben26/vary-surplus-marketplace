import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface CartContextType {
  cartItems: string[];
  addToCart: (id: string) => void;
  removeFromCart: (id: string) => void;
  isInCart: (id: string) => boolean;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<string[]>(() => {
    const stored = localStorage.getItem("vary_cart");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem("vary_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (id: string) => {
    setCartItems((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item !== id));
  };

  const isInCart = (id: string) => cartItems.includes(id);
  const clearCart = () => setCartItems([]);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, isInCart, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
