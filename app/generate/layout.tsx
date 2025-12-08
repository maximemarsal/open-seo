"use client";

import { motion } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import { SidebarProvider, useSidebar } from "../../contexts/SidebarContext";

function GenerateContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <motion.main
        animate={{
          marginLeft: isCollapsed ? 80 : 280,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="flex-1"
      >
        {children}
      </motion.main>
    </div>
  );
}

export default function GenerateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <GenerateContent>{children}</GenerateContent>
    </SidebarProvider>
  );
}
