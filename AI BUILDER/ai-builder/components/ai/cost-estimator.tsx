'use client'

import { AlertCircle, Sparkles } from 'lucide-react'

interface CostEstimate {
  provider: string
  model: string
  credits: number
  cost: number
}

interface CostEstimatorProps {
  estimates: CostEstimate[]
}

export function CostEstimator({ estimates }: CostEstimatorProps) {
  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div className="space-y-2 flex-1">
          <p className="text-blue-300 font-medium">Estimated Cost</p>
          <div className="space-y-1">
            {estimates.map((est, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-blue-200">{est.provider} ({est.model})</span>
                <span className="text-blue-100 font-medium">
                  ~{est.credits} credit{est.credits !== 1 ? 's' : ''}
                  <span className="text-blue-300 ml-1">(${est.cost.toFixed(4)})</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-blue-300/80 text-xs mt-2">
            <Sparkles className="w-3 h-3 inline mr-1" />
            Actual cost may vary based on response length
          </p>
        </div>
      </div>
    </div>
  )
}
