'use client'

import { useState } from 'react'
import { useTheme } from '@/lib/theme/theme-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Palette, Check } from 'lucide-react'

export function ThemeSwitcher() {
  const { theme, setTheme, availableThemes } = useTheme()
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
        <DropdownMenuLabel>Choose Theme</DropdownMenuLabel>
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
