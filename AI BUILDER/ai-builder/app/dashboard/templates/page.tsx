"use client"

import { useState } from "react"
import Link from "next/link"
import { X } from "lucide-react"

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState("all")
  const [previewTemplate, setPreviewTemplate] = useState<any>(null)

  const categories = [
    { id: "all", name: "All Templates", icon: "📚" },
    { id: "ecommerce", name: "E-Commerce", icon: "🛒" },
    { id: "business", name: "Business & Merchant", icon: "💼" },
    { id: "general", name: "General", icon: "🚀" },
  ]

  const templates = {
    ecommerce: [
      { id: "online-store", name: "Online Store", icon: "🏪", description: "Full-featured online store with product catalog, shopping cart, and checkout", preview: "/templates/online-store.jpg" },
      { id: "fashion-store", name: "Fashion Store", icon: "👗", description: "Elegant fashion e-commerce with lookbook gallery and size guides", preview: "/templates/fashion-store.jpg" },
      { id: "electronics-shop", name: "Electronics Shop", icon: "📱", description: "Tech store with product comparisons, specifications, and reviews", preview: "/templates/electronics-shop.jpg" },
      { id: "marketplace", name: "Marketplace", icon: "🌐", description: "Multi-vendor marketplace with seller profiles and commission system", preview: "/templates/marketplace.jpg" },
      { id: "digital-products", name: "Digital Products", icon: "💾", description: "Sell digital downloads, courses, and software with instant delivery", preview: "/templates/digital-products.jpg" },
      { id: "subscription-box", name: "Subscription Box", icon: "📦", description: "Recurring subscription service with membership tiers and plans", preview: "/templates/subscription-box.jpg" },
      { id: "grocery-store", name: "Grocery Store", icon: "🛒", description: "Online grocery with categories, fresh produce, and home delivery", preview: "/templates/grocery-store.jpg" },
      { id: "jewelry-shop", name: "Jewelry Shop", icon: "💍", description: "Luxury jewelry store with high-res galleries and custom orders", preview: "/templates/jewelry-shop.jpg" },
      { id: "bookstore", name: "Bookstore", icon: "📚", description: "Online bookstore with author pages, reviews, and recommendations", preview: "/templates/bookstore.jpg" },
      { id: "furniture-store", name: "Furniture Store", icon: "🛋️", description: "Furniture e-commerce with 3D previews and room planners", preview: "/templates/furniture-store.jpg" },
      { id: "pet-store", name: "Pet Store", icon: "🐾", description: "Pet supplies shop with product categories and care guides", preview: "/templates/pet-store.jpg" },
      { id: "toy-store", name: "Toy Store", icon: "🧸", description: "Children's toy shop with age categories and gift guides", preview: "/templates/toy-store.jpg" },
    ],
    business: [
      { id: "restaurant", name: "Restaurant", icon: "🍽️", description: "Restaurant website with menu, online ordering, and reservations", preview: "/templates/restaurant.jpg" },
      { id: "salon-spa", name: "Salon & Spa", icon: "💇", description: "Beauty salon with service booking, staff profiles, and gallery", preview: "/templates/salon-spa.jpg" },
      { id: "real-estate", name: "Real Estate", icon: "🏡", description: "Property listings with search filters, virtual tours, and agent contact", preview: "/templates/real-estate.jpg" },
      { id: "gym-fitness", name: "Gym & Fitness", icon: "💪", description: "Fitness center with class schedules, membership plans, and trainers", preview: "/templates/gym-fitness.jpg" },
      { id: "medical-clinic", name: "Medical Clinic", icon: "🏥", description: "Healthcare website with appointment booking and doctor profiles", preview: "/templates/medical-clinic.jpg" },
      { id: "law-firm", name: "Law Firm", icon: "⚖️", description: "Professional law firm with practice areas, case studies, and consultation", preview: "/templates/law-firm.jpg" },
      { id: "construction", name: "Construction Company", icon: "🏗️", description: "Construction and contracting with project portfolios, services, and quotes", preview: "/templates/construction.jpg" },
      { id: "dental-clinic", name: "Dental Clinic", icon: "🦷", description: "Dental practice with services, team bios, and online booking", preview: "/templates/dental-clinic.jpg" },
      { id: "auto-repair", name: "Auto Repair", icon: "🔧", description: "Auto service shop with maintenance schedules and repair quotes", preview: "/templates/auto-repair.jpg" },
      { id: "photography", name: "Photography Studio", icon: "📸", description: "Photographer portfolio with booking calendar and pricing packages", preview: "/templates/photography.jpg" },
      { id: "accounting", name: "Accounting Firm", icon: "💼", description: "Professional accounting services with client portal and resources", preview: "/templates/accounting.jpg" },
      { id: "hotel", name: "Hotel & Resort", icon: "🏨", description: "Hotel booking with room listings, amenities, and reservations", preview: "/templates/hotel.jpg" },
      { id: "consulting", name: "Business Consulting", icon: "📊", description: "Consulting firm with expertise areas, case studies, and contact", preview: "/templates/consulting.jpg" },
      { id: "cleaning-service", name: "Cleaning Service", icon: "🧹", description: "Professional cleaning with service packages and online booking", preview: "/templates/cleaning-service.jpg" },
      { id: "catering", name: "Catering Service", icon: "🍱", description: "Event catering with menu options, packages, and inquiry forms", preview: "/templates/catering.jpg" },
      { id: "moving-company", name: "Moving Company", icon: "🚚", description: "Moving services with quotes calculator and service areas", preview: "/templates/moving-company.jpg" },
    ],
    general: [
      { id: "landing-page", name: "Landing Page", icon: "📄", description: "Clean landing page with hero, features, and call-to-action", preview: "/templates/landing-page.jpg" },
      { id: "portfolio", name: "Portfolio", icon: "🎨", description: "Creative portfolio with project gallery and about section", preview: "/templates/portfolio.jpg" },
      { id: "blog", name: "Blog", icon: "📝", description: "Personal or company blog with articles, categories, and comments", preview: "/templates/blog.jpg" },
      { id: "agency", name: "Digital Agency", icon: "🎯", description: "Creative agency with services, team, and portfolio", preview: "/templates/agency.jpg" },
      { id: "saas", name: "SaaS Landing", icon: "☁️", description: "Software product landing page with pricing and features", preview: "/templates/saas.jpg" },
      { id: "event", name: "Event", icon: "🎉", description: "Event website with schedule, speakers, and ticket registration", preview: "/templates/event.jpg" },
      { id: "nonprofit", name: "Non-Profit", icon: "❤️", description: "Charity organization with donation forms and impact stories", preview: "/templates/nonprofit.jpg" },
      { id: "education", name: "Online Learning", icon: "🎓", description: "Educational platform with courses, instructors, and enrollment", preview: "/templates/education.jpg" },
      { id: "podcast", name: "Podcast", icon: "🎙️", description: "Podcast website with episodes, player, and subscription options", preview: "/templates/podcast.jpg" },
      { id: "resume", name: "Resume/CV", icon: "📋", description: "Professional resume with experience, skills, and contact info", preview: "/templates/resume.jpg" },
      { id: "wedding", name: "Wedding", icon: "💒", description: "Wedding website with RSVP, registry, and event details", preview: "/templates/wedding.jpg" },
      { id: "news", name: "News Portal", icon: "📰", description: "News website with articles, categories, and breaking news", preview: "/templates/news.jpg" },
      { id: "magazine", name: "Online Magazine", icon: "📖", description: "Digital magazine with featured articles and subscriptions", preview: "/templates/magazine.jpg" },
      { id: "community", name: "Community Forum", icon: "👥", description: "Community platform with discussions, members, and events", preview: "/templates/community.jpg" },
      { id: "directory", name: "Business Directory", icon: "📍", description: "Local business directory with listings and reviews", preview: "/templates/directory.jpg" },
      { id: "coming-soon", name: "Coming Soon", icon: "⏰", description: "Launch page with countdown timer and email signup", preview: "/templates/coming-soon.jpg" },
    ],
  }

  const getTemplatesByCategory = (category: string) => {
    if (category === "all") {
      return [...templates.ecommerce, ...templates.business, ...templates.general]
    }
    return templates[category as keyof typeof templates] || []
  }

  const TemplateCard = ({ template, gradient }: { template: any; gradient: string }) => (
    <div className={`border border-[#333] rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-[#1a1a1a]`}>
      {/* Preview Image */}
      <div 
        className="h-48 bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center cursor-pointer relative group"
        onClick={() => setPreviewTemplate(template)}
      >
        <div className="text-6xl">{template.icon}</div>
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
          <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
            Click to Preview
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2 text-white">{template.name}</h3>
        <p className="text-gray-400 mb-4 text-sm">{template.description}</p>
        <Link
          href={`/dashboard/projects/new?template=${template.id}`}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          Use This Template →
        </Link>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">Templates & Themes</h1>
        <p className="text-gray-400 mb-6 sm:mb-8">
          Browse and use pre-built templates for your projects
        </p>

        {/* Category Navigation */}
        <div className="mb-8 border-b border-[#333]">
          <div className="flex space-x-1 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeCategory === category.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600"
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* E-Commerce Templates */}
        {(activeCategory === "all" || activeCategory === "ecommerce") && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 flex items-center text-white">
              <span className="text-3xl mr-2">🛒</span>
              E-Commerce Templates
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {templates.ecommerce.map((template) => (
                <TemplateCard 
                  key={template.id} 
                  template={template} 
                  gradient=""
                />
              ))}
            </div>
          </div>
        )}

        {/* Business & Merchant Templates */}
        {(activeCategory === "all" || activeCategory === "business") && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center text-white">
            <span className="text-3xl mr-2">💼</span>
            Business & Merchant Templates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {templates.business.map((template) => (
              <TemplateCard 
                key={template.id} 
                template={template} 
                gradient=""
              />
            ))}
          </div>
        </div>
        )}

        {/* General Templates */}
        {(activeCategory === "all" || activeCategory === "general") && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 flex items-center text-white">
            <span className="text-3xl mr-2">🚀</span>
            General Templates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {templates.general.map((template) => (
              <TemplateCard 
                key={template.id} 
                template={template} 
                gradient=""
              />
            ))}
          </div>
        </div>
        )}

        {/* Preview Modal */}
        {previewTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-[#1a1a1a] border-b border-[#333] p-4 flex flex-wrap items-start sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center space-x-3">
                  <span className="text-4xl">{previewTemplate.icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{previewTemplate.name}</h3>
                    <p className="text-gray-400">{previewTemplate.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 hover:bg-[#2a2a2a] rounded-lg"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>
              
              <div className="p-6">
                {/* Preview Image Placeholder */}
                <div className="bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a] rounded-lg h-96 flex items-center justify-center mb-6">
                  <div className="text-center">
                    <div className="text-8xl mb-4">{previewTemplate.icon}</div>
                    <p className="text-gray-400">Template Preview</p>
                    <p className="text-sm text-gray-500 mt-2">Full preview coming soon</p>
                  </div>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3 text-white">Features</h4>
                  <ul className="grid grid-cols-2 gap-2">
                    <li className="flex items-center text-sm text-gray-300">
                      <span className="text-green-500 mr-2">✓</span>
                      Responsive Design
                    </li>
                    <li className="flex items-center text-sm text-gray-300">
                      <span className="text-green-500 mr-2">✓</span>
                      Modern UI
                    </li>
                    <li className="flex items-center text-sm text-gray-300">
                      <span className="text-green-500 mr-2">✓</span>
                      SEO Optimized
                    </li>
                    <li className="flex items-center text-sm text-gray-300">
                      <span className="text-green-500 mr-2">✓</span>
                      Fast Loading
                    </li>
                    <li className="flex items-center text-sm text-gray-300">
                      <span className="text-green-500 mr-2">✓</span>
                      Cross-browser Compatible
                    </li>
                    <li className="flex items-center text-sm text-gray-300">
                      <span className="text-green-500 mr-2">✓</span>
                      Easy to Customize
                    </li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href={`/dashboard/projects/new?template=${previewTemplate.id}`}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center font-medium"
                  >
                    Use This Template
                  </Link>
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="px-6 py-3 border border-[#333] rounded-lg hover:bg-[#2a2a2a] text-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
