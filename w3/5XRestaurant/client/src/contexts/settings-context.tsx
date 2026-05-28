"use client"

import { createContext, useContext, useEffect, useState } from "react"

export interface UserSettings {
  avatar: string
  name: string
  email: string
  mobile: string
  timezone: string
  language: string
  currency: string
  dateFormat: string
  fontSize: number
  theme: "light" | "dark" | "system"
  layout: "default" | "compact" | "expanded"
}

const defaultSettings: UserSettings = {
  avatar: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/38184074.jpg-M4vCjTSSWVw5RwWvvmrxXBcNVU8MBU.jpeg",
  name: "Dollar Singh",
  email: "dollar.singh@example.com",
  mobile: "+1 (555) 123-4567",
  timezone: "utc-8",
  language: "en",
  currency: "usd",
  dateFormat: "mm-dd-yyyy",
  fontSize: 16,
  theme: "system",
  layout: "default",
}

interface SettingsContextType {
  settings: UserSettings | null
  isLoading: boolean
  updateSettings: (newSettings: Partial<UserSettings>) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    // Load settings from localStorage after mount
    const loadSettings = () => {
      try {
        if (typeof window !== "undefined") {
          const savedSettings = localStorage.getItem("userSettings");
          if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
          } else {
            setSettings(defaultSettings);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (settings) {
      localStorage.setItem("userSettings", JSON.stringify(settings));
    }
  }, [settings]);

  const value = {
    settings,
    isLoading,
    updateSettings: (newSettings: Partial<UserSettings>) => {
      setSettings(prev => ({
        ...(prev || defaultSettings),
        ...newSettings
      }));
    },
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
