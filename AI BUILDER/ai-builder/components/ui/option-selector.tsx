"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface OptionItem {
  id: string
  label: string
  description?: string
  icon?: string
  recommended?: boolean
  preview?: string
}

interface OptionSelectorProps {
  title: string
  options: OptionItem[]
  selectedOptions: string[]
  onSelectionChange: (selected: string[]) => void
  multiSelect?: boolean
  maxSelection?: number
  className?: string
}

export function OptionSelector({
  title,
  options,
  selectedOptions,
  onSelectionChange,
  multiSelect = false,
  maxSelection,
  className
}: OptionSelectorProps) {
  const handleOptionClick = (optionId: string) => {
    if (multiSelect) {
      const isSelected = selectedOptions.includes(optionId)
      let newSelection: string[]

      if (isSelected) {
        // Remove from selection
        newSelection = selectedOptions.filter(id => id !== optionId)
      } else {
        // Add to selection
        if (maxSelection && selectedOptions.length >= maxSelection) {
          // Replace the first selected item if at max
          newSelection = [...selectedOptions.slice(1), optionId]
        } else {
          newSelection = [...selectedOptions, optionId]
        }
      }
      onSelectionChange(newSelection)
    } else {
      // Single select
      onSelectionChange([optionId])
    }
  }

  return (
    <div className={cn("w-full", className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {title}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {options.map((option) => {
          const isSelected = selectedOptions.includes(option.id)
          const isRecommended = option.recommended
          
          return (
            <div
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              className={cn(
                "relative p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 group",
                "hover:shadow-lg hover:border-blue-300 hover:-translate-y-1",
                isSelected 
                  ? "border-blue-500 bg-blue-50 shadow-md" 
                  : "border-gray-200 bg-white hover:bg-gray-50",
                isRecommended && !isSelected && "border-amber-300 bg-amber-50"
              )}
            >
              {/* Recommended Badge */}
              {isRecommended && (
                <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Recommended
                </div>
              )}

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute -top-2 -left-2 bg-blue-500 text-white rounded-full p-1">
                  <Check className="h-3 w-3" />
                </div>
              )}

              {/* Content */}
              <div className="flex items-start space-x-3">
                {/* Icon */}
                {option.icon && (
                  <div className="text-2xl flex-shrink-0">
                    {option.icon}
                  </div>
                )}

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    "text-sm font-medium group-hover:text-blue-600 transition-colors",
                    isSelected ? "text-blue-600" : "text-gray-900"
                  )}>
                    {option.label}
                  </h4>
                  {option.description && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Preview Image */}
              {option.preview && (
                <div className="mt-3 aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  <img 
                    src={option.preview} 
                    alt={`${option.label} preview`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Selection Info */}
      <div className="mt-4 text-sm text-gray-500">
        {multiSelect ? (
          <span>
            {selectedOptions.length} selected
            {maxSelection && ` (max ${maxSelection})`}
          </span>
        ) : (
          selectedOptions.length > 0 && (
            <span>
              Selected: {options.find(opt => opt.id === selectedOptions[0])?.label}
            </span>
          )
        )}
      </div>
    </div>
  )
}