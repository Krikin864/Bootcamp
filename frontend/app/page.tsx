"use client"

import Sidebar from "@/components/sidebar"
import DashboardContent from "@/components/dashboard-content"
import { useSidebarState } from "@/hooks/use-sidebar-state"

export default function Page() {
  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebarState(true)

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar open={sidebarOpen} />
      <div className="flex-1 overflow-auto">
        <DashboardContent onSidebarToggle={toggleSidebar} />
      </div>
    </div>
  )
}
