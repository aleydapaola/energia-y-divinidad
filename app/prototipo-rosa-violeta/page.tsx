import Link from "next/link"
import Image from "next/image"
import { Sparkles, Heart, Users, Star, Zap } from "lucide-react"

export default async function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-pink-50/30 via-purple-50/20 to-white">
      {/* Header personalizado con tonos suaves rosa-violeta */}
      <header className="bg-gradient-to-r from-pink-50/80 via-purple-50/60 to-violet-50/80 backdrop-blur-sm border-b border-purple-100/50 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="hidden lg:block">
            {/* Logo y Título */}
            <div className="flex justify-center items-center pt-8 pb-2">
              <Link href="/" className="flex flex-col items-center group">
                <h1 className="font-paciencia font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent text-[32px] leading-none tracking-tight mb-2">
                  ENERGIA Y DIVINIDAD
                </h1>
                <div className="flex justify-center w-full">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-300/20 to-purple-300/20 rounded-full blur-xl"></div>
                    <Image
                      src="/images/logo150x204marron.png"
                      alt="Energía y Divinidad"
                      width={118}
                      height={160}
                      className="relative group-hover:scale-105 transition-transform"
                      style={{ filter: 'sepia(0.3) hue-rotate(280deg) saturate(1.2)' }}
                    />
                  </div>
                </div>
              </Link>
            </div>

            {/* Navigation Menu */}
            <nav className="flex justify-center py-3">
              <ul className="flex items-center gap-8">
                <li><Link href="/" className="text-purple-600/80 hover:text-pink-500 transition-colors font-medium text-sm uppercase hover:scale-105 transform">Inicio</Link></li>
                <li><Link href="/sesiones" className="text-purple-600/80 hover:text-pink-500 transition-colors font-medium text-sm uppercase hover:scale-105 transform">Sesiones</Link></li>
                <li><Link href="/sobre-mi" className="text-purple-600/80 hover:text-pink-500 transition-colors font-medium text-sm uppercase hover:scale-105 transform">Sobre Mí</Link></li>
                <li><Link href="/membresia" className="text-purple-600/80 hover:text-pink-500 transition-colors font-medium text-sm uppercase hover:scale-105 transform">Membresía</Link></li>
                <li><Link href="/academia" className="text-purple-600/80 hover:text-pink-500 transition-colors font-medium text-sm uppercase hover:scale-105 transform">Academia</Link></li>
                <li><Link href="/meditaciones" className="text-purple-600/80 hover:text-pink-500 transition-colors font-medium text-sm uppercase hover:scale-105 transform">Meditaciones</Link></li>
                <li><Link href="/blog" className="text-purple-600/80 hover:text-pink-500 transition-colors font-medium text-sm uppercase hover:scale-105 transform">Blog</Link></li>
                <li><Link href="/contacto" className="text-purple-600/80 hover:text-pink-500 transition-colors font-medium text-sm uppercase hover:scale-105 transform">Contacto</Link></li>
              </ul>
            </nav>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden py-4">
            <div className="flex items-center justify-center">
              <Link href="/" className="flex flex-col items-center">
                <Image
                  src="/images/logo150x204marron.png"
                  alt="Energía y Divinidad"
                  width={70}
                  height={95}
                  className="mb-1"
                  style={{ filter: 'sepia(0.3) hue-rotate(280deg) saturate(1.2)' }}
                />
                <h1 className="font-paciencia bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent text-2xl leading-none">
                  ENERGIA Y DIVINIDAD
                </h1>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section con tonos suaves */}
      <section className="relative min-h-[600px] lg:min-h-[700px] w-full overflow-hidden">
        {/* Fondo con gradiente suave */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-100/40 via-purple-100/30 to-violet-100/40">
          <div className="absolute inset-0 bg-[url('/images/Aleyda-home-comprimida.jpeg')] bg-cover bg-center mix-blend-overlay opacity-20"></div>
        </div>

        {/* Efectos de luz suaves */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl"></div>

        {/* Contenido del Hero */}
        <div className="relative h-full flex items-center justify-center px-4 sm:px-6 lg:px-12 py-20">
          <div className="max-w-5xl mx-auto text-center">
            {/* Icono decorativo */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-300/30 to-purple-300/30 rounded-full blur-2xl"></div>
                <div className="relative bg-white/95 backdrop-blur-sm p-6 rounded-full shadow-lg">
                  <Sparkles className="w-16 h-16 text-purple-400" />
                </div>
              </div>
            </div>

            <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl mb-8 leading-tight bg-gradient-to-r from-pink-400 via-purple-400 to-violet-500 bg-clip-text text-transparent font-bold">
              Energía y Divinidad
            </h1>

            <p className="text-xl md:text-2xl lg:text-3xl text-purple-700/70 mb-8 max-w-3xl mx-auto leading-relaxed font-light">
              Encuentra la sanación a través de los seres de Luz
            </p>

            <p className="text-lg md:text-xl text-purple-600/60 mb-12 max-w-2xl mx-auto leading-relaxed">
              En este espacio sagrado, los ángeles y guías espirituales te hablan a través de la
              canalización, trayendo luz, sanación y claridad a tu camino.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/sesiones"
                className="group px-8 py-4 bg-gradient-to-r from-pink-300 via-purple-300 to-violet-400 text-white rounded-full hover:shadow-xl hover:shadow-purple-300/30 transition-all transform hover:scale-105 font-semibold text-lg uppercase tracking-wide"
              >
                <span className="flex items-center gap-2">
                  Reserva tu Sesión
                  <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </span>
              </Link>
              <Link
                href="/membresia"
                className="px-8 py-4 bg-white/95 backdrop-blur-sm text-purple-500 rounded-full hover:bg-white hover:shadow-xl transition-all transform hover:scale-105 font-semibold text-lg border-2 border-purple-200"
              >
                Únete a la Comunidad
              </Link>
            </div>
          </div>
        </div>

        {/* Decoración inferior ondulada */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Sección de Beneficios */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent font-bold mb-4">
              ¿Por qué elegir este camino?
            </h2>
            <p className="text-xl text-purple-600/60 max-w-2xl mx-auto">
              Descubre los beneficios de conectar con tu luz interior
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Card 1 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-200 to-purple-200 rounded-2xl blur-xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all border border-purple-50">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-gradient-to-br from-pink-50 to-purple-50 rounded-full">
                    <Heart className="w-12 h-12 text-purple-400" />
                  </div>
                </div>
                <h3 className="font-serif text-2xl font-bold text-purple-700 mb-4 text-center">
                  Sanación Profunda
                </h3>
                <p className="text-purple-600/70 leading-relaxed text-center">
                  Libera bloqueos emocionales y energéticos que te impiden avanzar en tu camino espiritual.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-200 to-violet-200 rounded-2xl blur-xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all border border-purple-50">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-full">
                    <Sparkles className="w-12 h-12 text-purple-400" />
                  </div>
                </div>
                <h3 className="font-serif text-2xl font-bold text-purple-700 mb-4 text-center">
                  Conexión Divina
                </h3>
                <p className="text-purple-600/70 leading-relaxed text-center">
                  Conecta con tus guías espirituales y ángeles para recibir claridad y dirección.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-200 to-pink-200 rounded-2xl blur-xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all border border-purple-50">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-gradient-to-br from-violet-50 to-pink-50 rounded-full">
                    <Zap className="w-12 h-12 text-purple-400" />
                  </div>
                </div>
                <h3 className="font-serif text-2xl font-bold text-purple-700 mb-4 text-center">
                  Transformación
                </h3>
                <p className="text-purple-600/70 leading-relaxed text-center">
                  Experimenta un despertar de consciencia que transformará tu vida para siempre.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección de Servicios con fondo degradado suave */}
      <section className="py-20 bg-gradient-to-br from-pink-50/50 via-purple-50/30 to-violet-50/50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent font-bold mb-4">
                Nuestros Servicios
              </h2>
            </div>

            {/* Grid de servicios */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sesiones de Canalización */}
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all border border-purple-100/50">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-gradient-to-br from-pink-300 to-purple-400 rounded-2xl">
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-serif text-3xl font-bold text-purple-700">
                    Sesiones de Canalización
                  </h3>
                </div>
                <p className="text-purple-600/70 leading-relaxed mb-6 text-lg">
                  Conecta con tus guías espirituales y recibe mensajes de luz que transformarán tu camino.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 bg-gradient-to-r from-pink-300 to-purple-400 rounded-full"></div>
                    <span className="text-purple-600">Canalización individual personalizada</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 bg-gradient-to-r from-pink-300 to-purple-400 rounded-full"></div>
                    <span className="text-purple-600">Mensajes de tus ángeles y guías</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 bg-gradient-to-r from-pink-300 to-purple-400 rounded-full"></div>
                    <span className="text-purple-600">Sanación energética profunda</span>
                  </li>
                </ul>
                <Link
                  href="/sesiones"
                  className="inline-block px-8 py-3 bg-gradient-to-r from-pink-300 to-purple-400 text-white rounded-full hover:shadow-lg hover:shadow-purple-300/30 transition-all font-semibold"
                >
                  Explorar Sesiones
                </Link>
              </div>

              {/* Membresía */}
              <div className="bg-gradient-to-br from-purple-400 to-violet-500 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all text-white relative overflow-hidden">
                {/* Efectos decorativos suaves */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-pink-300/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-200/10 rounded-full blur-2xl"></div>

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-serif text-3xl font-bold">
                      Membresía Exclusiva
                    </h3>
                  </div>
                  <p className="text-white/90 leading-relaxed mb-6 text-lg">
                    Únete a nuestra comunidad espiritual y recibe contenido exclusivo cada mes.
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start gap-3">
                      <div className="mt-1 w-2 h-2 bg-pink-200 rounded-full"></div>
                      <span>Meditaciones guiadas exclusivas</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 w-2 h-2 bg-pink-200 rounded-full"></div>
                      <span>Sesiones grupales mensuales</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 w-2 h-2 bg-pink-200 rounded-full"></div>
                      <span>Comunidad privada de apoyo</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 w-2 h-2 bg-pink-200 rounded-full"></div>
                      <span>Descuentos en todos los servicios</span>
                    </li>
                  </ul>
                  <Link
                    href="/membresia"
                    className="inline-block px-8 py-3 bg-white text-purple-500 rounded-full hover:shadow-lg transition-all font-semibold"
                  >
                    Únete Ahora
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sobre mí con imagen */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Imagen */}
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-pink-200 to-purple-300 rounded-3xl blur-2xl opacity-20"></div>
                <div className="relative">
                  <Image
                    src="/images/AleydaPirineo2-768x622.jpg.jpeg"
                    alt="Aleyda Paola"
                    width={768}
                    height={622}
                    className="rounded-3xl shadow-xl"
                  />
                </div>
              </div>

              {/* Contenido */}
              <div>
                <h2 className="font-serif text-4xl md:text-5xl bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent font-bold mb-6">
                  Aleyda Paola Vargas
                </h2>
                <div className="space-y-4 text-purple-600/70 text-lg leading-relaxed">
                  <p>
                    Canalizadora y sanadora espiritual dedicada a ayudar a las personas a conectar
                    con su luz interior y propósito divino.
                  </p>
                  <p>
                    Con años de experiencia en canalización angélica y sanación energética, he
                    acompañado a cientos de almas en su proceso de transformación y despertar espiritual.
                  </p>
                  <p className="font-medium text-purple-700 italic border-l-4 border-purple-300 pl-4">
                    "Mi misión es ser un puente entre el mundo físico y el espiritual, trayendo luz,
                    sanación y claridad a quienes buscan evolucionar."
                  </p>
                </div>
                <div className="mt-8">
                  <Link
                    href="/sobre-mi"
                    className="inline-block px-8 py-4 bg-gradient-to-r from-pink-300 to-purple-400 text-white rounded-full hover:shadow-lg hover:shadow-purple-300/30 transition-all font-semibold"
                  >
                    Conoce Mi Historia
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final con gradiente suave */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-300 via-purple-400 to-violet-500"></div>
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-pink-200/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-violet-300/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <Sparkles className="w-16 h-16 text-white mx-auto mb-6 opacity-90" />
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white font-bold mb-6">
              ¿Lista/o para comenzar tu transformación?
            </h2>
            <p className="text-xl md:text-2xl text-white/95 mb-10 leading-relaxed">
              Da el primer paso hacia tu sanación y despertar espiritual
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/sesiones"
                className="px-10 py-4 bg-white text-purple-500 rounded-full hover:shadow-2xl transition-all transform hover:scale-105 font-semibold text-lg"
              >
                Reservar Sesión
              </Link>
              <Link
                href="/contacto"
                className="px-10 py-4 bg-white/20 backdrop-blur-sm text-white border-2 border-white/50 rounded-full hover:bg-white/30 transition-all transform hover:scale-105 font-semibold text-lg"
              >
                Contáctame
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer personalizado con tonos suaves */}
      <footer className="bg-gradient-to-r from-pink-50/80 via-purple-50/60 to-violet-50/80 border-t border-purple-100/50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {/* Logo y descripción */}
              <div className="text-center md:text-left">
                <Link href="/" className="inline-block mb-4">
                  <h3 className="font-paciencia font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent text-2xl">
                    ENERGIA Y DIVINIDAD
                  </h3>
                </Link>
                <p className="text-purple-600/60 text-sm leading-relaxed">
                  Sanación espiritual y canalización con los seres de luz
                </p>
              </div>

              {/* Links */}
              <div className="text-center">
                <h4 className="font-semibold text-purple-700 mb-4">Enlaces</h4>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/sesiones" className="text-purple-600/70 hover:text-pink-400 transition-colors">Sesiones</Link></li>
                  <li><Link href="/membresia" className="text-purple-600/70 hover:text-pink-400 transition-colors">Membresía</Link></li>
                  <li><Link href="/academia" className="text-purple-600/70 hover:text-pink-400 transition-colors">Academia</Link></li>
                  <li><Link href="/blog" className="text-purple-600/70 hover:text-pink-400 transition-colors">Blog</Link></li>
                </ul>
              </div>

              {/* Redes sociales */}
              <div className="text-center md:text-right">
                <h4 className="font-semibold text-purple-700 mb-4">Sígueme</h4>
                <div className="flex gap-4 justify-center md:justify-end">
                  <a href="https://instagram.com" className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-purple-600 hover:scale-110 transition-transform">
                    <span className="sr-only">Instagram</span>
                    IG
                  </a>
                  <a href="https://facebook.com" className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-purple-600 hover:scale-110 transition-transform">
                    <span className="sr-only">Facebook</span>
                    FB
                  </a>
                  <a href="https://youtube.com" className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-purple-600 hover:scale-110 transition-transform">
                    <span className="sr-only">YouTube</span>
                    YT
                  </a>
                </div>
              </div>
            </div>

            <div className="border-t border-purple-100 pt-6 text-center">
              <p className="text-purple-600/50 text-sm">
                © 2025 Energía y Divinidad. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
