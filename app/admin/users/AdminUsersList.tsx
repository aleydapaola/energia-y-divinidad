'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Search,
  Filter,
  Eye,
  Shield,
  ShieldOff,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  User,
} from 'lucide-react'

interface UserData {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  createdAt: string
  ordersCount: number
  bookingsCount: number
  subscriptionsCount: number
  activeMembership: string | null
}

interface AdminUsersListProps {
  initialUsers: UserData[]
}

type RoleFilter = 'ALL' | 'USER' | 'ADMIN'

export function AdminUsersList({ initialUsers }: AdminUsersListProps) {
  const router = useRouter()
  const [users] = useState(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL')
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [showRoleModal, setShowRoleModal] = useState<string | null>(null)
  const [roleReason, setRoleReason] = useState('')
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)

  // Filter users
  const filteredUsers = users.filter((user) => {
    const searchMatch =
      searchTerm === '' ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase())

    const roleMatch = roleFilter === 'ALL' || user.role === roleFilter

    return searchMatch && roleMatch
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      ADMIN: 'bg-blue-100 text-blue-700',
      USER: 'bg-gray-100 text-gray-700',
    }
    const labels: Record<string, string> = {
      ADMIN: 'Admin',
      USER: 'Usuario',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[role] || 'bg-gray-100 text-gray-700'}`}>
        {labels[role] || role}
      </span>
    )
  }

  const getMembershipBadge = (tierName: string | null) => {
    if (!tierName) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-400">
          Sin membresía
        </span>
      )
    }

    const lowerName = tierName.toLowerCase()
    let style = 'bg-violet-100 text-violet-700'

    if (lowerName.includes('esencia')) {
      style = 'bg-pink-100 text-pink-700'
    } else if (lowerName.includes('armonía') || lowerName.includes('armonia')) {
      style = 'bg-violet-100 text-violet-700'
    } else if (lowerName.includes('divinidad')) {
      style = 'bg-indigo-100 text-indigo-700'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
        {tierName}
      </span>
    )
  }

  const handleChangeRole = async () => {
    if (!showRoleModal) return

    const targetUser = users.find((u) => u.id === showRoleModal)
    if (!targetUser) return

    const newRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN'

    setChangingRoleId(showRoleModal)
    try {
      const response = await fetch(`/api/admin/users/${showRoleModal}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: newRole,
          reason: roleReason,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Error al cambiar rol')
        return
      }

      alert(data.message || 'Rol actualizado exitosamente')
      setShowRoleModal(null)
      setRoleReason('')
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al cambiar rol')
    } finally {
      setChangingRoleId(null)
    }
  }

  const getUserToChange = () => {
    return users.find((u) => u.id === showRoleModal)
  }

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por email o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] font-dm-sans"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] font-dm-sans"
          >
            <option value="ALL">Todos los roles</option>
            <option value="USER">Usuarios</option>
            <option value="ADMIN">Administradores</option>
          </select>
        </div>

        <div className="mt-3 text-sm text-gray-500 font-dm-sans">
          Mostrando {filteredUsers.length} de {users.length} usuarios
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Membresía
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Órdenes
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sesiones
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registro
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <>
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {expandedUser === user.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        {user.image ? (
                          <Image
                            src={user.image}
                            alt={user.name || 'Usuario'}
                            width={36}
                            height={36}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#f8f0f5] flex items-center justify-center">
                            <User className="w-4 h-4 text-[#8A4BAF]" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 font-dm-sans">
                            {user.name || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-gray-500 font-dm-sans">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-4 py-4">
                      {getMembershipBadge(user.activeMembership)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900 font-dm-sans">
                        {user.ordersCount}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900 font-dm-sans">
                        {user.bookingsCount}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900 font-dm-sans">
                        {formatDate(user.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="p-2 text-gray-500 hover:text-[#8A4BAF] hover:bg-[#f8f0f5] rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setShowRoleModal(user.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.role === 'ADMIN'
                              ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                          title={user.role === 'ADMIN' ? 'Quitar admin' : 'Hacer admin'}
                        >
                          {user.role === 'ADMIN' ? (
                            <ShieldOff className="w-4 h-4" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedUser === user.id && (
                    <tr key={`${user.id}-expanded`}>
                      <td colSpan={7} className="px-4 py-4 bg-gray-50">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500 font-dm-sans">ID de Usuario</p>
                            <p className="font-mono text-xs text-gray-900">{user.id}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-dm-sans">Total Suscripciones</p>
                            <p className="font-medium text-gray-900 font-dm-sans">
                              {user.subscriptionsCount}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-dm-sans">Fecha Registro</p>
                            <p className="font-medium text-gray-900 font-dm-sans">
                              {formatDate(user.createdAt)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-dm-sans">Acciones</p>
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="text-[#8A4BAF] hover:underline font-dm-sans flex items-center gap-1"
                            >
                              Ver perfil completo
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-dm-sans">No se encontraron usuarios con los filtros aplicados</p>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="font-gazeta text-xl text-[#654177] mb-4">
              {getUserToChange()?.role === 'ADMIN' ? 'Quitar Rol de Admin' : 'Asignar Rol de Admin'}
            </h3>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 font-dm-sans">Usuario:</p>
              <p className="font-medium text-gray-900 font-dm-sans">
                {getUserToChange()?.name || 'Sin nombre'}
              </p>
              <p className="text-sm text-gray-500 font-dm-sans">
                {getUserToChange()?.email}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 font-dm-sans mb-1">
                  Motivo del cambio (opcional)
                </label>
                <textarea
                  value={roleReason}
                  onChange={(e) => setRoleReason(e.target.value)}
                  placeholder="Ingresa el motivo del cambio de rol..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF] font-dm-sans"
                  rows={3}
                />
              </div>

              {getUserToChange()?.role === 'USER' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-dm-sans">
                    <strong>Advertencia:</strong> Al asignar rol de administrador, este usuario tendrá acceso completo al panel de administración.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRoleModal(null)
                  setRoleReason('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-dm-sans transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangeRole}
                disabled={changingRoleId === showRoleModal}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-dm-sans transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  getUserToChange()?.role === 'ADMIN'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {changingRoleId === showRoleModal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : getUserToChange()?.role === 'ADMIN' ? (
                  'Quitar Admin'
                ) : (
                  'Hacer Admin'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
