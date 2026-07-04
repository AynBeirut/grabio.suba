"use client"

import { OptionSelector, OptionItem } from "./option-selector"
import { FileText } from "lucide-react"

// Content Sections Options
const CONTENT_SECTIONS: OptionItem[] = [
  { 
    id: "hero", 
    label: "Hero Section", 
    description: "Eye-catching banner with main message and call-to-action", 
    icon: "🚀",
    recommended: true 
  },
  { 
    id: "about", 
    label: "About Us", 
    description: "Company story, mission, and team information", 
    icon: "👥" 
  },
  { 
    id: "services", 
    label: "Services/Products", 
    description: "Showcase your main offerings and features", 
    icon: "⚡",
    recommended: true 
  },
  { 
    id: "portfolio", 
    label: "Portfolio/Gallery", 
    description: "Visual showcase of work, projects, or products", 
    icon: "🖼️" 
  },
  { 
    id: "testimonials", 
    label: "Testimonials", 
    description: "Customer reviews and success stories", 
    icon: "💬" 
  },
  { 
    id: "contact", 
    label: "Contact Form", 
    description: "Contact information and inquiry form", 
    icon: "📧",
    recommended: true 
  },
  { 
    id: "blog", 
    label: "Blog/News", 
    description: "Articles, updates, and company news", 
    icon: "📝" 
  },
  { 
    id: "pricing", 
    label: "Pricing Plans", 
    description: "Service packages and pricing information", 
    icon: "💰" 
  },
  { 
    id: "team", 
    label: "Team Members", 
    description: "Staff profiles and expertise", 
    icon: "👨‍💼" 
  },
  { 
    id: "faq", 
    label: "FAQ Section", 
    description: "Frequently asked questions", 
    icon: "❓" 
  }
]

// Content Tone Options
const CONTENT_TONES: OptionItem[] = [
  { 
    id: "professional", 
    label: "Professional", 
    description: "Formal, authoritative, and business-focused tone", 
    icon: "💼",
    recommended: true 
  },
  { 
    id: "friendly", 
    label: "Friendly & Approachable", 
    description: "Warm, conversational, and welcoming tone", 
    icon: "😊" 
  },
  { 
    id: "creative", 
    label: "Creative & Inspiring", 
    description: "Innovative, artistic, and motivational tone", 
    icon: "🎨" 
  },
  { 
    id: "technical", 
    label: "Technical & Expert", 
    description: "Data-driven, precise, and expertise-focused", 
    icon: "🔬" 
  },
  { 
    id: "casual", 
    label: "Casual & Relaxed", 
    description: "Laid-back, informal, and easy-going tone", 
    icon: "🌊" 
  }
]

// Special Features Options
const SPECIAL_FEATURES: OptionItem[] = [
  { 
    id: "animations", 
    label: "Scroll Animations", 
    description: "Elements animate as you scroll down the page", 
    icon: "✨" 
  },
  { 
    id: "contact-form", 
    label: "Advanced Contact Form", 
    description: "Multi-step form with validation and email notifications", 
    icon: "📋" 
  },
  { 
    id: "booking", 
    label: "Appointment Booking", 
    description: "Calendar integration for scheduling appointments", 
    icon: "📅" 
  },
  { 
    id: "ecommerce", 
    label: "E-commerce Features", 
    description: "Shopping cart, product pages, and checkout", 
    icon: "🛒" 
  },
  { 
    id: "gallery", 
    label: "Image Gallery", 
    description: "Lightbox gallery with image categories", 
    icon: "🖼️" 
  },
  { 
    id: "video", 
    label: "Video Integration", 
    description: "Embedded videos and background video sections", 
    icon: "🎥" 
  },
  { 
    id: "social", 
    label: "Social Media Feed", 
    description: "Live feeds from social media platforms", 
    icon: "📱" 
  },
  { 
    id: "newsletter", 
    label: "Newsletter Signup", 
    description: "Email subscription forms and mailchimp integration", 
    icon: "📧" 
  },
  { 
    id: "search", 
    label: "Site Search", 
    description: "Search functionality for content and products", 
    icon: "🔍" 
  }
]

interface ContentPreferencesProps {
  selectedSections: string[]
  selectedTone: string
  selectedFeatures: string[]
  onSectionsChange: (sections: string[]) => void
  onToneChange: (tone: string) => void
  onFeaturesChange: (features: string[]) => void
  showTone?: boolean
  className?: string
}

export function ContentPreferences({
  selectedSections,
  selectedTone,
  selectedFeatures,
  onSectionsChange,
  onToneChange,
  onFeaturesChange,
  showTone = true,
  className
}: ContentPreferencesProps) {
  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Content & Features</h2>
        <p className="text-gray-600">
          Customize what content sections and features to include in your website
        </p>
      </div>

      {/* Content Sections */}
      <div className="mb-8">
        <OptionSelector
          title="📄 Content Sections"
          options={CONTENT_SECTIONS}
          selectedOptions={selectedSections}
          onSelectionChange={onSectionsChange}
          multiSelect={true}
          maxSelection={8}
          className="mb-8"
        />
        <p className="text-sm text-gray-500 mt-2">
          Select the sections you want on your website. Recommended sections are pre-selected.
        </p>
      </div>

      {/* Content Tone */}
      {showTone && (
        <div className="mb-8">
          <OptionSelector
            title="🎯 Content Tone & Style"
            options={CONTENT_TONES}
            selectedOptions={selectedTone ? [selectedTone] : []}
            onSelectionChange={(tones) => onToneChange(tones[0] || '')}
            multiSelect={false}
            className="mb-8"
          />
          <p className="text-sm text-gray-500 mt-2">
            Choose the writing style and tone for your website content.
          </p>
        </div>
      )}

      {/* Special Features */}
      <div className="mb-8">
        <OptionSelector
          title="🚀 Special Features"
          options={SPECIAL_FEATURES}
          selectedOptions={selectedFeatures}
          onSelectionChange={onFeaturesChange}
          multiSelect={true}
          maxSelection={5}
          className="mb-8"
        />
        <p className="text-sm text-gray-500 mt-2">
          Add advanced features to enhance your website functionality (max 5).
        </p>
      </div>

      {/* Selection Summary */}
      {(selectedSections.length > 0 || selectedTone || selectedFeatures.length > 0) && (
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Content Summary
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-blue-800 mb-2">Sections ({selectedSections.length})</h5>
              <ul className="space-y-1">
                {selectedSections.slice(0, 4).map(sectionId => {
                  const section = CONTENT_SECTIONS.find(s => s.id === sectionId)
                  return (
                    <li key={sectionId} className="text-blue-700 flex items-center">
                      <span className="mr-2">{section?.icon}</span>
                      {section?.label}
                    </li>
                  )
                })}
                {selectedSections.length > 4 && (
                  <li className="text-blue-600">+ {selectedSections.length - 4} more</li>
                )}
              </ul>
            </div>

            <div>
              <h5 className="font-medium text-blue-800 mb-2">Content Tone</h5>
              {selectedTone && (
                <p className="text-blue-700 flex items-center">
                  <span className="mr-2">{CONTENT_TONES.find(t => t.id === selectedTone)?.icon}</span>
                  {CONTENT_TONES.find(t => t.id === selectedTone)?.label}
                </p>
              )}
            </div>

            <div>
              <h5 className="font-medium text-blue-800 mb-2">Features ({selectedFeatures.length})</h5>
              <ul className="space-y-1">
                {selectedFeatures.slice(0, 3).map(featureId => {
                  const feature = SPECIAL_FEATURES.find(f => f.id === featureId)
                  return (
                    <li key={featureId} className="text-blue-700 flex items-center">
                      <span className="mr-2">{feature?.icon}</span>
                      {feature?.label}
                    </li>
                  )
                })}
                {selectedFeatures.length > 3 && (
                  <li className="text-blue-600">+ {selectedFeatures.length - 3} more</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { CONTENT_SECTIONS, CONTENT_TONES, SPECIAL_FEATURES }