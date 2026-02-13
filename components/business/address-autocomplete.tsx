'use client'

import { useRef, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { useGoogleMaps } from '@/lib/google-maps/provider'
import { cn } from '@/lib/utils'
import { MapPin } from 'lucide-react'

interface Suggestion {
  placeId: string
  text: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  error?: string
  className?: string
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  required,
  error,
  className,
}: AddressAutocompleteProps) {
  const { isLoaded } = useGoogleMaps()
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!isLoaded || input.length < 3) {
        setSuggestions([])
        setIsOpen(false)
        return
      }

      try {
        const { suggestions: results } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          includedPrimaryTypes: ['street_address', 'premise', 'subpremise', 'route'],
        })

        if (results && results.length > 0) {
          const mapped: Suggestion[] = results
            .filter((s) => s.placePrediction)
            .map((s) => ({
              placeId: s.placePrediction!.placeId,
              text: s.placePrediction!.text.text,
            }))
          setSuggestions(mapped)
          setIsOpen(mapped.length > 0)
          setActiveIndex(-1)
        } else {
          setSuggestions([])
          setIsOpen(false)
        }
      } catch (err) {
        console.warn('Places AutocompleteSuggestion error:', err)
        setSuggestions([])
        setIsOpen(false)
      }
    },
    [isLoaded]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val)

    // Debounce API calls
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300)
  }

  const selectSuggestion = (text: string) => {
    onChange(text)
    setSuggestions([])
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[activeIndex].text)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  const handleBlur = () => {
    // Delay to allow mousedown on suggestions to fire
    setTimeout(() => setIsOpen(false), 200)
  }

  // Fallback to plain input if Google Maps not loaded
  if (!isLoaded) {
    return (
      <div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={cn(error && 'border-red-500', className)}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className={cn(error && 'border-red-500', className)}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.placeId}
              onMouseDown={() => selectSuggestion(suggestion.text)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer',
                index === activeIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              )}
            >
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{suggestion.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
