"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { User, Mail, Lock, Loader2, Check, AlertCircle } from "lucide-react"

export default function ConfiguracionPage() {
  const { data: session, update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [profileData, setProfileData] = useState({
    name: session?.user?.name || "",
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setMessage(null)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setPasswordMessage(null)
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileData.name }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar perfil")
      }

      // Actualizar sesión
      await update({ name: profileData.name })

      setMessage({ type: "success", text: "Perfil actualizado correctamente" })
    } catch (error: any) {
      setMessage({ type: "error", text: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "La nueva contraseña debe tener al menos 8 caracteres" })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: "error", text: "Las contraseñas no coinciden" })
      return
    }

    setIsPasswordLoading(true)
    setPasswordMessage(null)

    try {
      const response = await fetch("/api/users/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al cambiar contraseña")
      }

      setPasswordMessage({ type: "success", text: "Contraseña actualizada correctamente" })
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (error: any) {
      setPasswordMessage({ type: "error", text: error.message })
    } finally {
      setIsPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="font-gazeta text-3xl text-[#654177] mb-2">Configuración</h1>
        <p className="text-gray-600 font-dm-sans">
          Administra tu información personal y seguridad
        </p>
      </div>

      {/* Perfil */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-[#8A4BAF]" />
          </div>
          <h2 className="font-gazeta text-xl text-[#654177]">Información Personal</h2>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-[#654177] mb-2 font-dm-sans"
            >
              Nombre completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={profileData.name}
              onChange={handleProfileChange}
              disabled={isLoading}
              className="w-full max-w-md px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF] font-dm-sans transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#654177] mb-2 font-dm-sans">
              Email
            </label>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600 font-dm-sans">{session?.user?.email}</span>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                Verificado
              </span>
            </div>
          </div>

          {message && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-dm-sans ${
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {message.type === "success" ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-[#4944a4] text-white rounded-lg font-dm-sans font-semibold hover:bg-[#3d3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            Guardar Cambios
          </button>
        </form>
      </div>

      {/* Cambiar Contraseña */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#8A4BAF]/10 rounded-full flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#8A4BAF]" />
          </div>
          <h2 className="font-gazeta text-xl text-[#654177]">Cambiar Contraseña</h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-[#654177] mb-2 font-dm-sans"
            >
              Contraseña actual
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              disabled={isPasswordLoading}
              className="w-full max-w-md px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF] font-dm-sans transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-[#654177] mb-2 font-dm-sans"
            >
              Nueva contraseña
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={handlePasswordChange}
              disabled={isPasswordLoading}
              placeholder="Mínimo 8 caracteres"
              className="w-full max-w-md px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF] font-dm-sans transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-[#654177] mb-2 font-dm-sans"
            >
              Confirmar nueva contraseña
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={handlePasswordChange}
              disabled={isPasswordLoading}
              className="w-full max-w-md px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8A4BAF]/20 focus:border-[#8A4BAF] font-dm-sans transition-colors disabled:opacity-50"
            />
          </div>

          {passwordMessage && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-dm-sans max-w-md ${
                passwordMessage.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {passwordMessage.type === "success" ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              {passwordMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isPasswordLoading || !passwordData.currentPassword || !passwordData.newPassword}
            className="px-6 py-3 bg-[#4944a4] text-white rounded-lg font-dm-sans font-semibold hover:bg-[#3d3a8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPasswordLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            Cambiar Contraseña
          </button>
        </form>
      </div>
    </div>
  )
}
