import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children || <Outlet />}
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <p>FieldOps Platform • Secured with AES-256-GCM & RBAC</p>
      </footer>
    </div>
  );
};

export default Layout;
