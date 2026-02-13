'use client'

import {
  Search,
  Filter,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Link as LinkIcon,
  Package,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, Fragment } from 'react'

import { PERK_TYPE_LABELS } from '@/types/events'

import type {
  EventPerk,
  PerkStats,
  PerkAllocationWithUser,
  PerkAllocationStatus,
} from '@/types/events'

interface AdminPerksManagerProps {
  eventId: string
  eventTitle: string
  perks: EventPerk[]
  initialStats: PerkStats[]
  initialAllocations: PerkAllocationWithUser[]
}

type StatusFilter = 'ALL' | PerkAllocationStatus

export function AdminPerksManager({
  eventId,
  eventTitle,
  perks,
  initialStats,
  initialAllocations,
}: AdminPerksManagerProps) {
  const router = useRouter()
  const [stats] = useState(initialStats)
  const [allocations, setAllocations] = useState(initialAllocations)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [perkTypeFilter, setPerkTypeFilter] = useState<string>('ALL')
  const [expandedAllocation, setExpandedAllocation] = useState<string | null>(null)
  const [delivering, setDelivering] = useState<string | null>(null)
  const [bulkDelivering, setBulkDelivering] = useState(false)

  // Modal state
  const [showDeliverModal, setShowDeliverModal] = useState(false)
  const [deliverModalData, setDeliverModalData] = useState<{
    type: 'single' | 'bulk'
    allocationId?: string
    perkType?: string
    perkTitle?: string
  } | null>(null)
  const [deliverUrl, setDeliverUrl] = useState('')

  // Get unique perk types for filter
  const uniquePerkTypes = Array.from(new Set(allocations.map((a) => a.perkType)))

  // Filter allocations
  const filteredAllocations = allocations.filter((allocation) => {
    const searchMatch =
      searchTerm === '' ||
      allocation.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.perkTitle.toLowerCase().includes(searchTerm.toLowerCase())

    const statusMatch = statusFilter === 'ALL' || allocation.status === statusFilter
    const perkTypeMatch = perkTypeFilter === 'ALL' || allocation.perkType === perkTypeFilter

    return searchMatch && statusMatch && perkTypeMatch
  })

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: PerkAllocationStatus) => {
    const configs: Record<PerkAllocationStatus, { icon: typeof Clock; className: string; label: string }> = {
      PENDING: {
        icon: Clock,
        className: 'bg-amber-100 text-amber-700',
        label: 'Pendiente',
      },
      DELIVERED: {
        icon: CheckCircle,
        className: 'bg-green-100 text-green-700',
        label: 'Entregado',
      },
      UNAVAILABLE: {
        icon: XCircle,
        className: 'bg-gray-100 text-gray-500',
        label: 'No disponible',
      },
    }
    const config = configs[status]
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const openDeliverModal = (type: 'single' | 'bulk', data?: { allocationId?: string; perkType?: string; perkTitle?: string }) => {
    setDeliverModalData({ type, ...data })
    setDeliverUrl('')
    setShowDeliverModal(true)
  }

  const handleDeliver = async () => {
    if (!deliverModalData) {return}

    const isBulk = deliverModalData.type === 'bulk'
    const url = deliverUrl.trim()

    if (!url) {
      alert('Por favor ingresa una URL')
      return
    }

    try {
      if (isBulk) {
        setBulkDelivering(true)
      } else {
        setDelivering(deliverModalData.allocationId!)
      }

      const response = await fetch(`/api/admin/events/${eventId}/perks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isBulk ? 'deliver_bulk' : 'deliver_single',
          allocationId: deliverModalData.allocationId,
          perkType: deliverModalData.perkType,
          assetUrl: url,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Error al entregar el perk')
        return
      }

      if (isBulk) {
        alert(`Se entregaron ${data.updated} perks exitosamente`)
      } else {
        alert('Perk entregado exitosamente')
      }

      setShowDeliverModal(false)
      router.refresh()

      // Update local state
      if (isBulk) {
        setAllocations(prev =>
          prev.map(a =>
            a.perkType === deliverModalData.perkType && a.status === 'PENDING'
              ? { ...a, status: 'DELIVERED' as PerkAllocationStatus, assetUrl: url, deliveredAt: new Date() }
              : a
          )
        )
      } else {
        setAllocations(prev =>
          prev.map(a =>
            a.id === deliverModalData.allocationId
              ? { ...a, status: 'DELIVERED' as PerkAllocationStatus, assetUrl: url, deliveredAt: new Date() }
              : a
          )
        )
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al entregar el perk')
    } finally {
      setDelivering(null)
      setBulkDelivering(false)
    }
  }

  // Count pending per perk type
  const pendingByType = stats.reduce((acc, s) => {
    acc[s.perkType] = s.pending
    return acc
  }, {} as Record<string, number>)

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.perkType}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900 truncate">
                {PERK_TYPE_LABELS[stat.perkType as keyof typeof PERK_TYPE_LABELS] || stat.perkTitle}
              </h3>
              {stat.pending > 0 && (
                <button
                  onClick={() => openDeliverModal('bulk', { perkType: stat.perkType, perkTitle: stat.perkTitle })}
                  className="text-xs px-2 py-1 bg-[#4944a4] text-white rounded hover:bg-[#3d3a8a] flex items-center gap-1"
                  disabled={bulkDelivering}
                >
                  <Send className="w-3 h-3" />
                  Entregar todos
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold text-[#8A4BAF]">{stat.delivered}</p>
                <p className="text-xs text-gray-500">Entregados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{stat.pending}</p>
                <p className="text-xs text-gray-500">Pendientes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">{stat.unavailable}</p>
                <p className="text-xs text-gray-500">No disp.</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por email, nombre o perk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] font-dm-sans"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] font-dm-sans"
          >
            <option value="ALL">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="DELIVERED">Entregado</option>
            <option value="UNAVAILABLE">No disponible</option>
          </select>

          {/* Perk Type Filter */}
          <select
            value={perkTypeFilter}
            onChange={(e) => setPerkTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] font-dm-sans"
          >
            <option value="ALL">Todos los perks</option>
            {uniquePerkTypes.map((type) => (
              <option key={type} value={type}>
                {PERK_TYPE_LABELS[type as keyof typeof PERK_TYPE_LABELS] || type}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 text-sm text-gray-500 font-dm-sans">
          Mostrando {filteredAllocations.length} de {allocations.length} asignaciones
        </div>
      </div>

      {/* Allocations Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Perk
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAllocations.map((allocation) => (
                <Fragment key={allocation.id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setExpandedAllocation(
                        expandedAllocation === allocation.id ? null : allocation.id
                      )
                    }
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {expandedAllocation === allocation.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                        <div className="p-2 bg-purple-50 rounded-full">
                          <User className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 font-dm-sans">
                            {allocation.user.name || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-gray-500 font-dm-sans">
                            {allocation.user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-[#8A4BAF]" />
                        <span className="text-sm text-gray-700 font-dm-sans">
                          {allocation.perkTitle}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(allocation.status)}</td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-500 font-dm-sans">
                        {formatDate(allocation.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {allocation.status === 'PENDING' && (
                          <button
                            onClick={() =>
                              openDeliverModal('single', {
                                allocationId: allocation.id,
                                perkTitle: allocation.perkTitle,
                              })
                            }
                            disabled={delivering === allocation.id}
                            className="p-2 text-gray-500 hover:text-[#8A4BAF] hover:bg-[#f8f0f5] rounded-lg transition-colors disabled:opacity-50"
                            title="Entregar perk"
                          >
                            {delivering === allocation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {allocation.status === 'DELIVERED' && allocation.assetUrl && (
                          <a
                            href={allocation.assetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:text-[#4944a4] hover:bg-[#eef1fa] rounded-lg transition-colors"
                            title="Ver recurso"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedAllocation === allocation.id && (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 font-dm-sans">Tipo de Perk</p>
                            <p className="font-medium text-gray-900 font-dm-sans">
                              {PERK_TYPE_LABELS[allocation.perkType as keyof typeof PERK_TYPE_LABELS] || allocation.perkType}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-dm-sans">Booking ID</p>
                            <p className="font-medium text-gray-900 font-dm-sans truncate">
                              {allocation.bookingId}
                            </p>
                          </div>
                          {allocation.deliveredAt && (
                            <div>
                              <p className="text-gray-500 font-dm-sans">Entregado el</p>
                              <p className="font-medium text-gray-900 font-dm-sans">
                                {formatDate(allocation.deliveredAt)}
                              </p>
                            </div>
                          )}
                          {allocation.assetUrl && (
                            <div>
                              <p className="text-gray-500 font-dm-sans">URL del recurso</p>
                              <a
                                href={allocation.assetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-[#4944a4] truncate block hover:underline"
                              >
                                {allocation.assetUrl}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAllocations.length === 0 && (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-dm-sans">
              No se encontraron asignaciones con los filtros aplicados
            </p>
          </div>
        )}
      </div>

      {/* Deliver Modal */}
      {showDeliverModal && deliverModalData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="font-gazeta text-xl text-[#654177] mb-4">
              {deliverModalData.type === 'bulk'
                ? `Entregar todos los "${deliverModalData.perkTitle}"`
                : `Entregar "${deliverModalData.perkTitle}"`}
            </h3>

            {deliverModalData.type === 'bulk' && (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 mb-4">
                Esto entregará el perk a todos los usuarios con estado "Pendiente" para este
                tipo de perk ({pendingByType[deliverModalData.perkType!] || 0} usuarios).
              </p>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL del recurso
              </label>
              <input
                type="url"
                value={deliverUrl}
                onChange={(e) => setDeliverUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL donde los usuarios podrán acceder o descargar el recurso
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeliverModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeliver}
                disabled={delivering !== null || bulkDelivering}
                className="flex-1 px-4 py-2 bg-[#4944a4] text-white rounded-lg hover:bg-[#3d3a8a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {(delivering || bulkDelivering) ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Entregando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Entregar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
