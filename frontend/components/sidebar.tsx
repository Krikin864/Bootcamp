"use client"

import { LayoutDashboard, ListTodo, Users, Settings, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

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
      mt-4 mx-4 mb-4 rounded-[2rem] bg-white/70 backdrop-blur-md border border-white/40 shadow-sm transition-all duration-300 flex flex-col h-[calc(100vh-2rem)]`}
    >
      <div className="h-16 border-b border-white/30 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-400 flex items-center justify-center text-white font-bold shadow-lg">
            F
          </div>
          {open && <span className="font-bold text-slate-800">flowOPS</span>}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 relative">
        <motion.div layout className="space-y-2">
          {navItems.map((item, index) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
              <div
                key={item.label}
                className="relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r-full z-0"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Link href={item.href} className="relative group block">
              <Button
                    variant="ghost"
                    className={`w-full justify-start gap-3 transition-all duration-200 relative z-10 ${
                  isActive
                        ? "bg-indigo-500/20 text-slate-800 hover:bg-indigo-500/20 hover:text-slate-800"
                        : "text-slate-700"
                    }`}
                  >
                    <motion.div
                      whileHover={{ rotate: 5, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                      <Icon className={`h-5 w-5 flex-shrink-0 transition-colors ${isActive ? "text-indigo-500" : "text-slate-600 group-hover:text-indigo-500"}`} />
                    </motion.div>
                    {open && <span className={`transition-colors ${isActive ? "font-medium text-slate-800" : "text-slate-700 group-hover:text-indigo-600"}`}>{item.label}</span>}
              </Button>
            </Link>
              </div>
          )
        })}
        </motion.div>
      </nav>

      <div className="p-4 border-t border-white/30 space-y-2">
        <Button variant="ghost" className="w-full justify-start gap-3 text-slate-700 transition-all duration-200 group">
          <motion.div
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Settings className="h-5 w-5 transition-colors text-slate-600 group-hover:text-indigo-500" />
          </motion.div>
          {open && <span className="transition-colors group-hover:text-indigo-600">Settings</span>}
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-slate-700 transition-all duration-200 group">
          <motion.div
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <LogOut className="h-5 w-5 transition-colors text-slate-600 group-hover:text-indigo-500" />
          </motion.div>
          {open && <span className="transition-colors group-hover:text-indigo-600">Logout</span>}
        </Button>
      </div>
    </aside>
  )
}
