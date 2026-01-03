"use client"

import { useState } from "react"
import Sidebar from "@/components/sidebar"
import DashboardContent from "@/components/dashboard-content"

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar open={sidebarOpen} />
      <div className="flex-1 overflow-auto">
        <DashboardContent onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>
    </div>
  )
}
