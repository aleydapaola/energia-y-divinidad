import Image from "next/image"
import Link from "next/link"

import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { auth } from "@/lib/auth"

export const metadata = {
  title: "Sobre Mí - Aleyda Paola | Energía y Divinidad",
  description: "Conoce la historia de Aleyda Paola, canalizadora espiritual. Un camino de despertar, sanación y conexión con la conciencia universal.",
}

export default async function SobreMiPage() {
  const session = await auth()

  return (
    <div className="min-h-screen bg-white">
      <Header session={session} />

      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-[#f8f0f5] to-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#8A4BAF]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#654177]/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-gazeta text-4xl sm:text-5xl lg:text-6xl text-[#4b316c] mb-6">
              Sobre Mí
            </h1>
            <p className="font-gazeta text-xl sm:text-2xl text-[#8A4BAF] italic">
              Así nació mi apertura a la Conciencia
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">

            {/* Intro with Image */}
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-16">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-[#8A4BAF]/20 via-[#654177]/10 to-transparent rounded-3xl blur-2xl" />
                <Image
                  src="/images/AleydaPirineo2-1024x829.jpg.jpeg"
                  alt="Aleyda Paola - Canalizadora espiritual"
                  title="Aleyda Paola - Canalizadora profesional"
                  width={1024}
                  height={829}
                  className="relative rounded-2xl shadow-2xl object-cover w-full h-auto"
                  priority
                />
              </div>

              <div>
                <p className="font-dm-sans text-lg text-[#4A4A4A] leading-relaxed mb-6">
                  Hola, soy <strong className="text-[#8A4BAF]">Aleyda Paola</strong>, canalizadora espiritual. Quiero compartir contigo el camino que me llevó a conectar con la conciencia, la energía y divinidad universal.
                </p>
              </div>
            </div>

            {/* Section: Un Despertar Espiritual */}
            <div className="mb-12">
              <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-6">
                Un Despertar Espiritual a Través del Dolor
              </h2>
              <div className="space-y-4 font-dm-sans text-[#4A4A4A] leading-relaxed">
                <p>
                  Mi viaje espiritual comenzó hace trece años, marcado por un evento trascendental: la muerte de mi abuelo. Lejos de apagar mi luz interior, su partida encendió una chispa en mí. En medio del duelo, sentí una fuerza mayor que me impulsaba a mirar más allá de lo visible. Fue entonces cuando comprendí que la vida continúa en otros planos y que mi abuelo, desde el silencio físico, se había convertido en mi guía. Él me conectó con la Fuente y me mostró el puente entre nuestro mundo y los planos superiores. Comprendí que estaba destinada a caminar sobre ese puente.
                </p>
                <p className="text-[#8A4BAF] font-medium italic text-lg">
                  Pero el despertar espiritual no siempre nace en la luz… A veces, florece desde el dolor más profundo.
                </p>
              </div>
            </div>

            {/* Section: Transformación Personal */}
            <div className="mb-12 bg-gradient-to-r from-[#f8f0f5] to-[#eef1fa] rounded-2xl p-6 sm:p-8">
              <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-6">
                Transformación Personal: De la Crisis a la Sanación
              </h2>
              <div className="space-y-4 font-dm-sans text-[#4A4A4A] leading-relaxed">
                <p>
                  La muerte de mi abuelo marcó el inicio de un año profundamente transformador. Al mismo tiempo, atravesé un proceso de separación, la pérdida de mi empleo y el desafío de ser madre de dos hijos. Todo ocurrió en un mismo periodo, llevándome a una etapa de depresión profunda.
                </p>
                <p>
                  Me sentía estancada, enfrentando bloqueos emocionales, económicos y físicos. Incluso mi cuerpo comenzó a manifestar ese desequilibrio a través de la enfermedad.
                </p>
                <p>
                  Comencé entonces mi proceso de sanación física, ya que padecía fibromialgia, una rosácea muy fuerte y un lipoma en la espalda. Todo esto me llevó a reevaluar profundamente qué estaba ocurriendo con mi vida.
                </p>
                <p>
                  Fue un llamado a detenerme, a mirar hacia adentro y a intentar poner en orden lo que, en ese momento, se había convertido en mi nueva realidad.
                </p>
                <p className="text-[#654177] font-medium">
                  La tristeza por la pérdida de mi abuelo no solo afectó mi mente, fracturó mi alma y dejó en mi corazón un vacío profundo, más allá de toda explicación racional.
                </p>
              </div>
            </div>

            {/* Section: El Inicio de Mi Camino */}
            <div className="mb-12">
              <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-6">
                El Inicio de Mi Camino Espiritual
              </h2>
              <div className="space-y-4 font-dm-sans text-[#4A4A4A] leading-relaxed">
                <p>
                  Fue entonces cuando decidí buscar respuestas. Comencé a leer libros sobre la muerte, a explorar herramientas de sanación emocional y a asistir a encuentros con maestros espirituales.
                </p>
                <p>
                  No podía comprender que mi abuelo simplemente ya no estuviera. Me resultaba imposible asimilar que su cuerpo físico había muerto y que ya no formaba parte de este mundo.
                </p>
                <p>
                  Fue entonces cuando comencé a buscar respuestas. Desde el día en que partió, se manifestaba en mis sueños y, con el tiempo, llegamos incluso a conversar frente a frente. En ese momento, yo aún no sabía que aquello que experimentaba era canalizar.
                </p>
                <p>
                  Lo que comenzó como una búsqueda desesperada, se transformó en un camino profundo de conexión, sabiduría y transformación personal. Y desde ese momento, supe que mi misión era acompañar a otros en su propio proceso de despertar espiritual y sanación del alma.
                </p>
                <p>
                  Luego, tras 3 años de estudio con las enseñanzas del maestro Gerardo Schmedling, me sumergí en un camino con mucha disciplina de aprendizaje: Mesa Radiónica de Saint Germain, numerología, constelaciones familiares, radiestesia, práctica de yoga, meditación, sanación con cristales, tarot evolutivo y Registros Akáshicos.
                </p>
                <p>
                  Cada herramienta fue abriendo más puertas en mi interior, conectando piezas de un rompecabezas espiritual que poco a poco cobraba sentido.
                </p>
              </div>
            </div>

            {/* Section: La Canalización */}
            <div className="mb-12">
              <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-6">
                Aprender a Canalizar
              </h2>
              <div className="space-y-4 font-dm-sans text-[#4A4A4A] leading-relaxed">
                <p>
                  Y entonces llegó a mi vida lo que siempre había esperado: aprender a canalizar. Con profunda admiración y gratitud, reconozco la inspiración y guía de mi gran maestra, a quien seguí durante años, asistiendo a sus encuentros, formaciones y compartires.
                </p>
                <p>
                  Ella encendió en mí el deseo profundo de desarrollar ese don que sentía latente desde siempre. Con paciencia, sabiduría y amor, me instruyó, motivó y acompañó a convertirme en lo que soy hoy: <strong className="text-[#8A4BAF]">una mujer al servicio de la luz</strong>.
                </p>
                <p>
                  Con los años, comprendí que mi destino estaba en la canalización. Al iniciar este camino, me enamoré de la Luz y la Conciencia, no solo como conceptos espirituales, sino como energía viva que se manifiesta en cada encuentro, cada sesión, cada mensaje recibido.
                </p>
                <p>
                  Hoy canalizo desde el corazón, guiada por los Seres de Luz y por supuesto mi abuelo Fernando que, con infinita compasión y amor, me han tomado de la mano en este proceso de sanación de mi propia alma.
                </p>
              </div>
            </div>

            {/* Section: Mis Dones */}
            <div className="mb-12 bg-gradient-to-r from-[#eef1fa] to-[#f8f0f5] rounded-2xl p-6 sm:p-8">
              <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-6">
                Reconociendo Mis Dones
              </h2>
              <div className="space-y-4 font-dm-sans text-[#4A4A4A] leading-relaxed">
                <p>
                  Con el tiempo, reconocí mis dones: la sensibilidad energética, la capacidad de canalizar mensajes, y la fuerza para guiar a otros desde la compasión y la experiencia. Comprendí que todo lo vivido me estaba preparando para algo mayor: acompañar a otras personas en su proceso de sanación, despertar y reconexión con su alma.
                </p>
                <p>
                  Hoy, comparto con el mundo mi labor como canalizadora de Seres de Luz: Ángeles, Arcángeles, Maestros Ascendidos y Guías Espirituales. A través de canalizaciones, sesiones de sanación energética y espacios de contención emocional, facilito procesos que permiten liberar bloqueos, comprender el propósito de vida y recordar el poder interior que habita en cada alma.
                </p>
              </div>
            </div>

            {/* Section: Los Tres Pilares */}
            <div className="mb-12">
              <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-8 text-center">
                Los Tres Pilares de Mi Trabajo
              </h2>
              <div className="grid sm:grid-cols-3 gap-6">
                {/* Pilar 1: Sanación */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#8A4BAF]/10 hover:shadow-xl transition-all">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#8A4BAF] to-[#654177] rounded-full flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <h3 className="font-gazeta text-xl text-[#8A4BAF] mb-3 text-center">Sanación</h3>
                  <p className="font-dm-sans text-sm text-[#4A4A4A] leading-relaxed text-center">
                    Porque no podemos elevarnos sin primero liberar lo que duele. Acompaño procesos energéticos y emocionales donde las heridas son vistas, honradas y transformadas.
                  </p>
                </div>

                {/* Pilar 2: Contención */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#2D4CC7]/10 hover:shadow-xl transition-all">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#2D4CC7] to-[#4944a4] rounded-full flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h3 className="font-gazeta text-xl text-[#2D4CC7] mb-3 text-center">Contención</h3>
                  <p className="font-dm-sans text-sm text-[#4A4A4A] leading-relaxed text-center">
                    Porque el despertar espiritual también confronta. Brindo un espacio seguro, amoroso y respetuoso donde cada persona pueda sentirse sostenida y escuchada.
                  </p>
                </div>

                {/* Pilar 3: Mensajes */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-[#8A4BAF]/10 hover:shadow-xl transition-all">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#654177] to-[#8A4BAF] rounded-full flex items-center justify-center mb-4 mx-auto">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <h3 className="font-gazeta text-xl text-[#654177] mb-3 text-center">Mensajes que Nutren el Alma</h3>
                  <p className="font-dm-sans text-sm text-[#4A4A4A] leading-relaxed text-center">
                    Los Seres de Luz tienen palabras precisas, amorosas y profundas para cada uno. Ser canal de esos mensajes es un acto de humildad y entrega total.
                  </p>
                </div>
              </div>
            </div>

            {/* Section: Mi Misión */}
            <div className="mb-12">
              <h2 className="font-gazeta text-3xl sm:text-4xl md:text-5xl text-[#8A4BAF] mb-6">
                Mi Misión
              </h2>
              <div className="space-y-4 font-dm-sans text-[#4A4A4A] leading-relaxed">
                <p>
                  Mi misión no es darte respuestas externas, sino ayudarte a recordar tu verdad interior. No ofrezco soluciones mágicas, sino guía amorosa para que reconozcas tu poder, tu propósito y la conexión constante que tienes con el universo.
                </p>
                <p>
                  De esta búsqueda nació también el <strong className="text-[#8A4BAF]">Club de Despertar Espiritual</strong>, un espacio que reúne comunidad, enseñanza y expansión. Todo lo que comparto tiene la intención de acompañarte en tu evolución, desde el amor, el respeto y la luz.
                </p>
              </div>
            </div>

            {/* Closing Message */}
            <div className="text-center bg-gradient-to-br from-[#f8f0f5] via-white to-[#eef1fa] rounded-3xl p-8 sm:p-12 shadow-xl border border-[#8A4BAF]/10">
              <p className="font-dm-sans text-lg text-[#4A4A4A] leading-relaxed mb-6">
                Gracias por permitirme compartirte mi historia. Si tu alma te ha traído hasta aquí, confía: <span className="text-[#8A4BAF] font-semibold">no es casualidad, es llamado</span>.
              </p>
              <p className="font-gazeta text-xl text-[#654177] italic mb-2">
                Con amor, luz y propósito,
              </p>
              <p className="font-gazeta text-2xl text-[#4b316c] font-semibold mb-1">
                Aleyda Paola
              </p>
              <p className="font-dm-sans text-[#8A4BAF] text-sm tracking-wide">
                Canalizadora Profesional
              </p>

              {/* CTA */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/sesiones"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#4944a4] text-white rounded-full hover:bg-[#3d3890] transition-all transform hover:scale-105 font-dm-sans text-base font-semibold shadow-xl"
                >
                  Reservar una sesión
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <a
                  href="https://wa.me/573151165921"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-[#8A4BAF] text-[#8A4BAF] rounded-full hover:bg-[#8A4BAF] hover:text-white transition-all font-dm-sans text-base font-semibold"
                >
                  <svg className="w-5 h-5" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Contactar por WhatsApp
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
