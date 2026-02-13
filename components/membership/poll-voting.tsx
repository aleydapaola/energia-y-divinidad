'use client'

import { CheckCircle, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'

interface PollVotingProps {
  postId: string
  postSlug: string
  pollOptions: string[]
  pollEndsAt?: string
}

interface PollResults {
  options: {
    option: string
    votes: number
    percentage: number
  }[]
  totalVotes: number
}

export function PollVoting({ postId, postSlug, pollOptions, pollEndsAt }: PollVotingProps) {
  const [hasVoted, setHasVoted] = useState(false)
  const [userVote, setUserVote] = useState<number | null>(null)
  const [results, setResults] = useState<PollResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isClosed = pollEndsAt ? new Date(pollEndsAt) < new Date() : false

  useEffect(() => {
    async function fetchPollData() {
      try {
        const response = await fetch(`/api/membership/posts/${postSlug}/vote`)

        if (!response.ok) {
          throw new Error('Error al cargar encuesta')
        }

        const data = await response.json()
        setHasVoted(data.hasVoted)
        setUserVote(data.userVote)
        setResults(data.results)
      } catch (err: any) {
        console.error('Error fetching poll data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPollData()
  }, [postSlug])

  const handleVote = async (optionIndex: number) => {
    if (hasVoted || isClosed || voting) {return}

    setVoting(true)
    setError(null)

    try {
      const response = await fetch(`/api/membership/posts/${postSlug}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndex }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al votar')
      }

      const data = await response.json()
      setHasVoted(true)
      setUserVote(optionIndex)
      setResults(data.results)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setVoting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand mx-auto" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  const showResults = hasVoted || isClosed

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
        Encuesta
      </h2>

      {isClosed && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
          Esta encuesta ha cerrado
        </p>
      )}

      {hasVoted && !isClosed && (
        <p className="text-sm text-green-600 dark:text-green-400 mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Ya has votado en esta encuesta
        </p>
      )}

      <div className="space-y-3">
        {pollOptions.map((option, index) => {
          const result = results?.options[index]
          const percentage = result?.percentage || 0
          const votes = result?.votes || 0
          const isUserChoice = userVote === index

          return (
            <div key={index}>
              {showResults ? (
                // Mostrar resultados
                <div
                  className={`relative overflow-hidden rounded-lg border-2 p-4 ${
                    isUserChoice
                      ? 'border-brand bg-brand/5'
                      : 'border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {/* Barra de progreso */}
                  <div
                    className="absolute inset-y-0 left-0 bg-brand/10 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />

                  {/* Contenido */}
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isUserChoice && (
                        <CheckCircle className="w-5 h-5 text-brand flex-shrink-0" />
                      )}
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {option}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-brand">{percentage.toFixed(1)}%</div>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400">
                        {votes} {votes === 1 ? 'voto' : 'votos'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Botón para votar
                <button
                  onClick={() => handleVote(index)}
                  disabled={voting}
                  className="w-full text-left p-4 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 hover:border-brand hover:bg-brand/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {option}
                  </span>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {results && (
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-4 text-center">
          Total: {results.totalVotes} {results.totalVotes === 1 ? 'voto' : 'votos'}
        </p>
      )}

      {pollEndsAt && !isClosed && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-4 text-center">
          Cierra el{' '}
          {new Date(pollEndsAt).toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}
    </div>
  )
}
