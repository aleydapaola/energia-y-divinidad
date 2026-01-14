# Secciones Parallax - Backup

Este documento guarda el código de las secciones parallax que fueron eliminadas de la home por razones de accesibilidad y compatibilidad móvil. Se pueden recuperar si es necesario.

## Razones de eliminación (Enero 2026)

1. **Accesibilidad**: Hasta 35% de personas mayores de 40 pueden experimentar náuseas/mareos con efectos parallax
2. **Mobile**: Incompatible con dispositivos móviles (más del 50% del tráfico web)
3. **Rendimiento**: Puede ralentizar la carga de la página
4. **Redundancia**: Los CTAs ya estaban presentes en otras secciones

---

## Sección 1: Parallax "Reserva tu sesión"

**Imagen de fondo**: `/images/medio-ambiente-natural-etereo-scaled.jpg.jpeg`

```tsx
{/* Parallax Section - Reserva tu sesión */}
<section className="relative h-[150px] sm:h-[170px] md:h-[200px] w-full overflow-hidden">
  <div
    className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
    style={{ backgroundImage: 'url(/images/medio-ambiente-natural-etereo-scaled.jpg.jpeg)' }}
  />

  {/* Content */}
  <div className="relative h-full flex flex-col items-center justify-center px-4 gap-1.5 sm:gap-2">
    <h2 className="font-sans text-2xl sm:text-2xl md:text-3xl text-[#a87819] font-semibold text-center leading-tight">
      Reserva tu sesión
    </h2>
    <p className="font-sans text-sm sm:text-sm md:text-base text-[#a87819] font-normal text-center uppercase tracking-wider">
      RECIBE APOYO DE LOS SERES DE LUZ
    </p>
    <Link
      href="/sesiones"
      className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[#ede6dc] text-[#ad7f28] rounded-lg hover:bg-[#e5ddd0] transition-all transform hover:scale-105 font-sans text-sm sm:text-sm md:text-base font-semibold shadow-xl uppercase tracking-wide"
    >
      RESERVA TU SESIÓN
    </Link>
  </div>
</section>
```

---

## Sección 2: Parallax Newsletter

**Imagen de fondo**: `/images/fondo2-home.png`

```tsx
{/* Newsletter Section - Parallax */}
<section className="relative h-[400px] sm:h-[450px] md:h-[500px] w-full overflow-hidden">
  <div
    className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed brightness-110"
    style={{ backgroundImage: 'url(/images/fondo2-home.png)' }}
  />

  {/* Content - Newsletter Form */}
  <div className="relative h-full flex items-center justify-center px-4 py-8 sm:py-9 md:py-10">
    <div className="bg-[#F5F0E8]/90 backdrop-blur-sm rounded-lg p-5 sm:p-6 md:p-7 w-full max-w-[580px] shadow-2xl">
      {/* Icon */}
      <div className="flex justify-center mb-2 sm:mb-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
          <svg className="w-full h-full text-[#a87819]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h2 className="font-sans text-lg sm:text-xl md:text-2xl text-[#a87819] font-semibold text-center leading-tight mb-2 sm:mb-3 uppercase tracking-wide">
        Suscríbete a nuestra newsletter y recibe tres meditaciones gratis
      </h2>

      {/* Form */}
      <form className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
        <div>
          <label htmlFor="newsletter-email" className="block font-sans text-sm sm:text-base text-gray-700 mb-1.5 sm:mb-2 font-normal">
            Escribe tu email aquí: <span className="text-red-600">*</span>
          </label>
          <input
            type="email"
            id="newsletter-email"
            name="email"
            required
            className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border-b-2 border-[#a87819] bg-transparent focus:outline-none focus:border-[#8b6414] transition-colors font-sans text-sm sm:text-base text-gray-700"
            placeholder=""
          />
        </div>

        <div className="pt-1 sm:pt-2">
          <button
            type="submit"
            className="w-full sm:w-auto mx-auto block px-8 sm:px-10 py-2 sm:py-2.5 bg-[#e5ddd0] text-[#a87819] rounded-lg hover:bg-[#d4c9b8] transition-all transform hover:scale-105 font-sans text-sm sm:text-base font-semibold shadow-lg uppercase tracking-wide"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  </div>
</section>
```

---

## Notas para recuperación

Si se desea recuperar estos componentes con los nuevos colores de marca:

### Paleta de colores actual (2026):
- Violeta principal: `#8A4BAF`
- Violeta oscuro: `#654177`
- Azul rey: `#2D4CC7`
- Rosa claro fondo: `#f8f0f5`
- Azul claro fondo: `#eef1fa`

### Consideraciones si se reactivan:
1. Usar `prefers-reduced-motion` media query para desactivar en usuarios sensibles
2. Desactivar parallax en móviles (usar imagen estática)
3. Optimizar imágenes para mejor rendimiento
4. Actualizar colores de `#a87819` (dorado) a los violetas/azules de la nueva marca
