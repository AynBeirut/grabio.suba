"use client"

interface CategorySelectorProps {
  selectedCategory: string
  onSelect: (categoryId: string) => void
}

const CATEGORIES = [
  {
    id: "ecommerce",
    icon: "🛒",
    name: "E-Commerce",
    description: "Online stores, marketplaces, and digital product sales",
  },
  {
    id: "business",
    icon: "💼",
    name: "Business & Merchant",
    description: "Restaurants, salons, real estate, clinics, and services",
  },
  {
    id: "general",
    icon: "🚀",
    name: "General",
    description: "Portfolios, blogs, agencies, and landing pages",
  },
]

export function CategorySelector({ selectedCategory, onSelect }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      {CATEGORIES.map((category) => (
        <div
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={`border-2 rounded-lg p-6 cursor-pointer transition-all hover:shadow-lg ${
            selectedCategory === category.id ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="text-5xl mb-4">{category.icon}</div>
          <h3 className="text-xl font-semibold mb-2">{category.name}</h3>
          <p className="text-gray-600 text-sm">{category.description}</p>
        </div>
      ))}
    </div>
  )
}
