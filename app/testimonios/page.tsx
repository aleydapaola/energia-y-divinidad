import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { auth } from "@/lib/auth";
import { getPublishedTestimonials, type Testimonial } from "@/lib/sanity/queries/testimonials";

export const metadata = {
  title: "Testimonios | Energía y Divinidad",
  description:
    "Conoce las experiencias de quienes han vivido sesiones de canalización, sanación y acompañamiento espiritual con Aleyda Paola Vargas.",
};

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    _id: "fallback-1",
    quote:
      "Aleyda, te escribo con inmensa gratitud por ayudarme en mi proceso de sanación. Ha sido una etapa de acompañamiento y guía donde, con ayuda de los seres de luz, transformaron mi camino de vida. Cada día me empoderaba y hoy soy una persona diferente, llena de optimismo y convencida de que todos necesitamos ayuda. Gracias por transformar vidas.",
    authorName: "Alicia C.M.",
    role: "Proceso de Sanación",
    countryEmoji: "🇪🇨",
    initials: "AC",
    accentColor: "violet",
    published: true,
    displayOrder: 1,
  },
  {
    _id: "fallback-2",
    quote:
      "Es sorprendente la conexión que tiene Aleyda con otras dimensiones, con seres de luz, con guías espirituales. La información que da es precisa y entendible. Ella también le hizo una sesión a mi amiga y a mi hijo y quedaron súper impresionados. Toda esa información nos ha ayudado para ser mejores seres humanos y crecer como espíritus. Muchas gracias Aleyda por ser y por estar.",
    authorName: "Mary Lolita A.",
    role: "Sesión de Canalización",
    countryEmoji: "🇺🇸",
    initials: "ML",
    accentColor: "blue",
    published: true,
    displayOrder: 2,
  },
  {
    _id: "fallback-3",
    quote:
      "Llegué buscando respuestas y encontré mucho más: claridad, paz y un camino. Aleyda tiene un don especial para transmitir los mensajes con amor.",
    authorName: "Andrea R.",
    role: "Sesión de Canalización",
    initials: "AR",
    accentColor: "violet",
    published: true,
    displayOrder: 3,
  },
];

export default async function TestimoniosPage() {
  const session = await auth();

  let testimonials: Testimonial[] = FALLBACK_TESTIMONIALS;
  try {
    const fetched = await getPublishedTestimonials();
    if (fetched && fetched.length > 0) {
      testimonials = fetched;
    }
  } catch (_error) {
    // Sanity no configurado: usar fallback
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header session={session} />

      {/* Hero */}
      <section className="relative py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-[#f8f0f5] to-white overflow-hidden">
        <div className="absolute top-0 left-0 w-72 h-72 bg-[#8A4BAF]/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#654177]/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-gazeta text-4xl sm:text-5xl lg:text-6xl text-[#4b316c] mb-6">
              Testimonios
            </h1>
            <p className="font-dm-sans text-lg sm:text-xl text-[#674c6a] leading-relaxed">
              Estas son las experiencias de quienes han confiado en el proceso y han vivido una
              transformación.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials grid */}
      <section className="relative py-16 sm:py-20 bg-white overflow-hidden flex-1">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#f8f0f5]/50 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#eef1fa]/50 rounded-full blur-3xl" />

        <div className="relative container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {testimonials.map((t, index) => {
                const isBlue = t.accentColor === "blue";
                const isLastOdd =
                  testimonials.length % 3 !== 0 && index === testimonials.length - 1;
                return (
                  <div
                    key={t._id}
                    className={`bg-gradient-to-b ${isBlue ? "from-[#eef1fa]/50 border-[#2D4CC7]/5" : "from-[#f8f0f5]/50 border-[#8A4BAF]/5"} to-white rounded-2xl p-6 sm:p-8 shadow-lg border hover:shadow-xl transition-all ${isLastOdd ? "md:col-span-2 lg:col-span-1" : ""}`}
                  >
                    <div className="mb-4">
                      <svg
                        className={`w-8 h-8 ${isBlue ? "text-[#2D4CC7]/30" : "text-[#8A4BAF]/30"}`}
                        width="32"
                        height="32"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                      </svg>
                    </div>
                    <p className="font-dm-sans text-[#4A4A4A] text-base leading-relaxed mb-6 italic">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 ${isBlue ? "bg-gradient-to-br from-[#2D4CC7] to-[#4944a4]" : "bg-gradient-to-br from-[#8A4BAF] to-[#654177]"} rounded-full flex items-center justify-center text-white font-dm-sans font-semibold text-sm`}
                      >
                        {t.initials}
                      </div>
                      <div>
                        <p
                          className={`font-dm-sans ${isBlue ? "text-[#2D4CC7]" : "text-[#8A4BAF]"} font-semibold text-sm`}
                        >
                          {t.authorName}
                          {t.countryEmoji && <span className="text-xl ml-1">{t.countryEmoji}</span>}
                        </p>
                        <p
                          className={`font-dm-sans ${isBlue ? "text-[#4a5a7a]" : "text-[#674c6a]"} text-xs`}
                        >
                          {t.role}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
