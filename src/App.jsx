// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import Register from "./components/Register";
import Purchases from "./components/PurchaseForm";
import Sales from "./components/SaleForm";
import Customers from "./components/CustomerPage";
import Suppliers from "./components/Suppliers";
import Stocks from "./components/StockReport";
import Products from "./components/Products";
import Reports from "./components/Reports";
import Users from "./components/Users";
import PurchaseSummary from "./components/PurchaseSummary";
import SaleSummary from "./components/SaleSummary";
import PrivateRoute from "./components/PrivateRoute";
import { CustomerLedgerPage, SupplierLedgerPage } from "./components/LedgerPages";
import SalesInvoicePage from "./components/SalesInvoicePage";
import PurchaseInvoicePage from "./components/PurchaseInvoicePage";

import { SidebarProvider } from "./components/SidebarContext";
import ProfitAndLoss from "./components/ProfitAndLoss";
import BalanceSheet from "./components/BalanceSheet";

export default function App() {
  const [user, setUser] = useState(() => localStorage.getItem("token"));

  const handleLogin = (token) => {
    localStorage.setItem("token", token);
    setUser(token);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <SidebarProvider>
      <Router>
        {/* Top navigation is sticky; hamburger toggles the mobile drawer via SidebarContext */}
        <Navbar />

        {/* Page layout below the navbar */}
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex gap-0 lg:gap-6">
            {/* Sidebar (drawer on mobile, static on desktop) – only when authenticated */}
            {user && <Sidebar handleLogout={handleLogout} />}

            {/* Main content */}
            <main className="flex-1 py-4 lg:py-6">
              <Routes>
                {/* Landing → dashboard if logged in, otherwise login */}
                <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />

                {/* Public routes */}
                <Route path="/login" element={<Login onLogin={handleLogin} />} />
                <Route path="/register" element={<Register />} />

                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  }
                />

                {/* Core app pages */}
                <Route
                  path="/purchases/*"
                  element={
                    <PrivateRoute>
                      <Purchases />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/sales/*"
                  element={
                    <PrivateRoute>
                      <Sales />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/customers"
                  element={
                    <PrivateRoute>
                      <Customers />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/suppliers"
                  element={
                    <PrivateRoute>
                      <Suppliers />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/stocks"
                  element={
                    <PrivateRoute>
                      <Stocks />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/products"
                  element={
                    <PrivateRoute>
                      <Products />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/reports/*"
                  element={
                    <PrivateRoute>
                      <Reports />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <PrivateRoute>
                      <Users />
                    </PrivateRoute>
                  }
                />

                {/* Summaries */}
                <Route
                  path="/purchases/summary"
                  element={
                    <PrivateRoute>
                      <PurchaseSummary />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/sales/summary"
                  element={
                    <PrivateRoute>
                      <SaleSummary />
                    </PrivateRoute>
                  }
                />

                {/* Ledgers */}
                <Route
                  path="/ledger/customers"
                  element={
                    <PrivateRoute>
                      <CustomerLedgerPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/ledger/suppliers"
                  element={
                    <PrivateRoute>
                      <SupplierLedgerPage />
                    </PrivateRoute>
                  }
                />

                {/* Invoice pages */}
                <Route
                  path="/sales/invoice"
                  element={
                    <PrivateRoute>
                      <SalesInvoicePage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/purchases/invoice"
                  element={
                    <PrivateRoute>
                      <PurchaseInvoicePage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/reports/pnl"
                  element={
                    <PrivateRoute>
                      <ProfitAndLoss />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/reports/balance-sheet"
                  element={
                    <PrivateRoute>
                      <BalanceSheet />
                    </PrivateRoute>
                  }
/>

                {/* --- Friendly redirects to match Sidebar links --- */}
                <Route path="/invoices/purchase" element={<Navigate to="/purchases" replace />} />
                <Route path="/invoices/sales" element={<Navigate to="/sales" replace />} />
                <Route path="/reports/stock" element={<Navigate to="/stocks" replace />} />

                {/* Fallback: unknown routes → dashboard or login */}
                <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
                <Route path="/reports/pnl" element={<ProfitAndLoss />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </SidebarProvider>
  );
}
