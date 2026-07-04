'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

interface Question {
  id: string
  question: string
  category: string
}

interface InteractivePlannerProps {
  projectData: any
  onComplete: (answers: Record<string, string>) => void
}

export function InteractivePlanner({ projectData, onComplete }: InteractivePlannerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentAnswer, setCurrentAnswer] = useState('')
  
  const templateCategory = projectData?.template || 'general'
  const brandName = projectData?.title || 'your project'

  // Define questions based on template category
  const questions: Question[] = getQuestionsForTemplate(templateCategory, brandName)

  useEffect(() => {
    // Load saved answer if exists
    const currentQuestionId = questions[currentQuestionIndex]?.id
    if (currentQuestionId && answers[currentQuestionId]) {
      setCurrentAnswer(answers[currentQuestionId])
    } else {
      setCurrentAnswer('')
    }
  }, [currentQuestionIndex])

  const handleNext = () => {
    // Save current answer
    const currentQuestionId = questions[currentQuestionIndex].id
    setAnswers(prev => ({ ...prev, [currentQuestionId]: currentAnswer }))

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    } else {
      // All questions answered, complete
      onComplete({ ...answers, [currentQuestionId]: currentAnswer })
    }
  }

  const handlePrevious = () => {
    // Save current answer
    const currentQuestionId = questions[currentQuestionIndex].id
    setAnswers(prev => ({ ...prev, [currentQuestionId]: currentAnswer }))
    
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="flex flex-col h-full">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-purple-400">
            {currentQuestion.category}
          </span>
          <span className="text-sm text-gray-400">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 mb-6">
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <Sparkles className="h-6 w-6 text-purple-400 flex-shrink-0 mt-1" />
            <h3 className="text-xl font-semibold text-white">
              {currentQuestion.question}
            </h3>
          </div>
          
          <Textarea
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder="Type your answer here..."
            className="min-h-[150px] bg-[#0d0d0d] border-[#333] text-white resize-none"
            autoFocus
          />
        </div>

        {/* Helper Text */}
        <p className="text-sm text-gray-400 italic">
          💡 Tip: The more detail you provide, the better your website will be!
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <Button
          onClick={handleNext}
          disabled={!currentAnswer.trim()}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {currentQuestionIndex === questions.length - 1 ? (
            <>
              Complete Planning
              <Sparkles className="h-4 w-4" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* Skip Option */}
      {currentQuestionIndex < questions.length - 1 && (
        <div className="text-center mt-4">
          <button
            onClick={handleNext}
            className="text-sm text-gray-500 hover:text-gray-400 underline"
          >
            Skip this question
          </button>
        </div>
      )}
    </div>
  )
}

function getQuestionsForTemplate(template: string, brandName: string): Question[] {
  const baseQuestions: Question[] = [
    {
      id: 'value-proposition',
      category: 'Core Identity',
      question: `What makes ${brandName} unique? What's your special talent, skill, or perspective?`
    },
    {
      id: 'target-audience',
      category: 'Audience',
      question: 'Who are you trying to reach? Describe your ideal visitor or customer.'
    },
    {
      id: 'primary-action',
      category: 'Goals',
      question: 'What\'s the primary action you want visitors to take? (e.g., contact you, make a purchase, sign up, etc.)'
    },
  ]

  if (template === 'business') {
    return [
      ...baseQuestions,
      {
        id: 'business-model',
        category: 'Business Details',
        question: 'What\'s your primary revenue source? How do you make money?'
      },
      {
        id: 'competitive-edge',
        category: 'Competitive Advantage',
        question: 'What makes you different from competitors? Why should customers choose you?'
      },
      {
        id: 'services',
        category: 'Offerings',
        question: 'What specific services or products do you offer? Describe your main offerings.'
      },
      {
        id: 'social-proof',
        category: 'Credibility',
        question: 'What credibility elements do you have? (testimonials, certifications, case studies, awards, etc.)'
      },
    ]
  } else if (template === 'ecommerce') {
    return [
      ...baseQuestions,
      {
        id: 'products',
        category: 'Product Catalog',
        question: 'What are you selling? Describe your products and categories.'
      },
      {
        id: 'pricing-strategy',
        category: 'Sales Strategy',
        question: 'What\'s your pricing approach? Any special offers or promotions?'
      },
      {
        id: 'shipping',
        category: 'Fulfillment',
        question: 'How do you handle shipping, delivery, and returns?'
      },
      {
        id: 'payment-methods',
        category: 'Payments',
        question: 'What payment methods do you accept?'
      },
    ]
  } else {
    // General/Portfolio
    return [
      ...baseQuestions,
      {
        id: 'content-tone',
        category: 'Brand Voice',
        question: 'What personality should your content have? (Professional, friendly, creative, technical, personal, etc.)'
      },
      {
        id: 'achievements',
        category: 'Showcase',
        question: 'What specific projects, accomplishments, or experiences should be prominently featured?'
      },
      {
        id: 'existing-content',
        category: 'Resources',
        question: 'What content do you already have? (photos, project descriptions, resume, testimonials, etc.)'
      },
      {
        id: 'visual-style',
        category: 'Design Preferences',
        question: 'Do you have any websites you admire? What design elements appeal to you?'
      },
    ]
  }
}
