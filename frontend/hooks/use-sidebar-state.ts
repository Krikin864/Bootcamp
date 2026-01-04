import { useState, useEffect } from 'react'

const SIDEBAR_STATE_KEY = 'linkops-sidebar-open'

/**
 * Hook personalizado para persistir el estado del sidebar usando localStorage
 */
export function useSidebarState(defaultValue: boolean = true) {
  const [isOpen, setIsOpen] = useState<boolean>(defaultValue)
  const [isLoaded, setIsLoaded] = useState(false)

  // Cargar estado desde localStorage al montar
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(SIDEBAR_STATE_KEY)
      if (savedState !== null) {
        setIsOpen(savedState === 'true')
      }
    } catch (error) {
      console.warn('Error loading sidebar state from localStorage:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Guardar estado en localStorage cuando cambie
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(SIDEBAR_STATE_KEY, String(isOpen))
      } catch (error) {
        console.warn('Error saving sidebar state to localStorage:', error)
      }
    }
  }, [isOpen, isLoaded])

  const toggle = () => setIsOpen(prev => !prev)
  const setOpen = (open: boolean) => setIsOpen(open)

  return { isOpen, toggle, setOpen }
}

