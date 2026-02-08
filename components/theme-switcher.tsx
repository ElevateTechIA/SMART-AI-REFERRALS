'use client'

import { useState } from 'react'
import { useTheme, type Mode } from '@/lib/theme/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Palette, Check, Sun, Moon, Monitor } from 'lucide-react'

const modeOptions: { value: Mode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Auto', icon: Monitor },
]

export function ThemeSwitcher() {
  const { theme, setTheme, mode, setMode, availableThemes } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Switch theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Mode Section */}
        <DropdownMenuLabel>Mode</DropdownMenuLabel>
        <div className="flex gap-1 px-2 pb-2">
          {modeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <DropdownMenuSeparator />

        {/* Color Theme Section */}
        <DropdownMenuLabel>Color Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(availableThemes).map(([key, themeData]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => {
              setTheme(key as keyof typeof availableThemes)
              setIsOpen(false)
            }}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full border-2 border-white/20"
                style={{
                  background: `linear-gradient(135deg, ${themeData.colors.gradientFrom}, ${themeData.colors.primary})`
                }}
              />
              <span>{themeData.name}</span>
            </div>
            {theme === key && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
