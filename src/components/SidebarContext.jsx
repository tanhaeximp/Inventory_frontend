// src/components/SidebarContext.jsx
import { createContext, useContext, useState, useCallback } from "react";

const SidebarCtx = createContext(null);
export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(v => !v), []);
  const close = useCallback(() => setOpen(false), []);
  return <SidebarCtx.Provider value={{ open, toggle, close }}>{children}</SidebarCtx.Provider>;
}
export const useSidebar = () => useContext(SidebarCtx);
