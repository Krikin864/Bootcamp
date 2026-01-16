"use client"

import { LayoutDashboard, ListTodo, Users, Settings, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  open: boolean
}

export default function Sidebar({ open }: SidebarProps) {
  const pathname = usePathname()

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: ListTodo, label: "Opportunities", href: "/opportunities" },
    { icon: Users, label: "Team Management", href: "/team" },
  ]

  return (
    <aside
      className={`${open ? "w-64" : "w-20"}
      mt-4 mx-4 mb-4 rounded-[2rem] bg-white/70 backdrop-blur-md border border-white/40 shadow-sm transition-all duration-300 flex flex-col`}
    >
      <div className="h-16 border-b border-white/30 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
            L
          </div>
          {open && <span className="font-bold text-slate-800">LinkOps</span>}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.label} href={item.href}>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 transition-all ${
                  isActive
                    ? "bg-white/30 text-slate-800 shadow-md"
                    : "text-slate-700 hover:bg-white/20 hover:text-slate-800"
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "drop-shadow-sm" : ""}`} />
                {open && <span>{item.label}</span>}
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/30 space-y-2">
        <Button variant="ghost" className="w-full justify-start gap-3 text-slate-700 hover:bg-white/20 hover:text-slate-800">
          <Settings className="h-5 w-5" />
          {open && <span>Settings</span>}
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-slate-700 hover:bg-white/20 hover:text-slate-800">
          <LogOut className="h-5 w-5" />
          {open && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  )
}
