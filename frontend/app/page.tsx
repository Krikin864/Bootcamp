"use client"

import Sidebar from "@/components/sidebar"
import DashboardContent from "@/components/dashboard-content"
import { useSidebarState } from "@/hooks/use-sidebar-state"

export default function Page() {
  const { isOpen: sidebarOpen } = useSidebarState(true)

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#d1d8e6] via-[#eef2f7] to-[#e2e8f0] text-foreground">
      <Sidebar open={sidebarOpen} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <DashboardContent />
        </div>
      </div>
    </div>
  )
}
