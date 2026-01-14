# Guía de Tipografía - Energía y Divinidad

## 🎨 Sistema Tipográfico

### Jerarquía de Fuentes

**Open Sans** (Sans-serif) - Fuente principal
- Uso: Cuerpo de texto, navegación, botones, contenido general
- Peso: 300 (Light), 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold)
- Legibilidad óptima para lectura digital
- Moderna, limpia y profesional

**Roboto Slab** (Serif)
- Uso: Títulos principales (H1), headers destacados
- Peso: 300 (Light), 400 (Regular), 700 (Bold)
- Aporta elegancia y distinción
- Uso limitado para máximo impacto

**Paciencia** (Serif decorativa)
- Uso: Logo y marca únicamente
- Carácter artístico y espiritual
- NO usar en contenido general

---

## 📐 Escala Tipográfica Responsive

### Desktop (lg: 1024px+)
```
H1 Display:   48-56px / 3rem-3.5rem   | font-serif (Roboto Slab) | font-light
H1 Standard:  40-48px / 2.5rem-3rem   | font-sans (Open Sans) | font-semibold
H2:           32-40px / 2rem-2.5rem   | font-sans | font-semibold
H3:           24-28px / 1.5rem-1.75rem| font-sans | font-semibold
H4:           20-24px / 1.25rem-1.5rem| font-sans | font-medium
H5:           18-20px / 1.125rem-1.25rem | font-sans | font-medium
Body Large:   18-20px / 1.125rem-1.25rem | font-sans | font-regular
Body:         16-18px / 1rem-1.125rem | font-sans | font-regular
Body Small:   14-16px / 0.875rem-1rem | font-sans | font-regular
Caption:      12-14px / 0.75rem-0.875rem | font-sans | font-regular
```

### Tablet (md: 768px)
```
H1 Display:   40-48px
H1 Standard:  32-40px
H2:           28-32px
H3:           20-24px
H4:           18-20px
Body:         16px
```

### Mobile (sm: 640px)
```
H1 Display:   32-40px
H1 Standard:  28-32px
H2:           24-28px
H3:           18-20px
H4:           16-18px
Body:         15-16px
```

---

## 🎯 Aplicación por Sección

### Header & Navegación
- Logo marca: `font-paciencia text-2xl`
- Enlaces navegación: `font-sans text-sm font-medium uppercase tracking-wide`
- Botones sesión: `font-sans text-sm font-medium`

### Hero Section
- Título principal: `font-sans text-4xl lg:text-5xl font-semibold leading-tight`
- Subtítulo/descripción: `font-sans text-base lg:text-lg font-regular leading-relaxed`
- CTA Button: `font-sans text-base font-semibold uppercase tracking-wide`

### Secciones de Contenido
- Títulos de sección: `font-sans text-3xl lg:text-4xl font-semibold uppercase tracking-wide`
- Subtítulos: `font-sans text-xl lg:text-2xl font-medium`
- Cuerpo de texto: `font-sans text-base lg:text-lg font-regular leading-relaxed`
- Énfasis/destacados: `font-sans text-lg lg:text-xl font-medium italic`

### Cards y Componentes
- Título card: `font-sans text-xl font-semibold`
- Texto card: `font-sans text-base font-regular`
- Metadata/fechas: `font-sans text-sm font-medium text-gray-600`

### Footer
- Enlaces: `font-sans text-sm font-regular`
- Títulos sección: `font-sans text-sm font-medium uppercase`
- Copyright: `font-sans text-xs font-regular`

### Botones
- Primary: `font-sans text-base font-semibold uppercase tracking-wide`
- Secondary: `font-sans text-base font-medium`
- Small: `font-sans text-sm font-medium uppercase`

---

## 📏 Line Height (Interlineado)

```css
leading-none:     line-height: 1
leading-tight:    line-height: 1.25
leading-snug:     line-height: 1.375
leading-normal:   line-height: 1.5
leading-relaxed:  line-height: 1.625
leading-loose:    line-height: 2
```

**Aplicación:**
- Títulos grandes (H1-H2): `leading-tight` o `leading-snug`
- Títulos pequeños (H3-H5): `leading-snug`
- Cuerpo de texto: `leading-relaxed` (óptimo para lectura)
- Texto compacto (listas, cards): `leading-normal`

---

## 🎨 Letter Spacing (Tracking)

```css
tracking-tighter:  -0.05em
tracking-tight:    -0.025em
tracking-normal:   0em
tracking-wide:     0.025em
tracking-wider:    0.05em
tracking-widest:   0.1em
```

**Aplicación:**
- Títulos en mayúsculas: `tracking-wide` o `tracking-wider`
- Texto normal: `tracking-normal`
- Títulos grandes: `tracking-tight` (opcional para elegancia)

---

## ✅ Mejores Prácticas

### 1. Contraste y Legibilidad
- Mínimo contraste 4.5:1 para texto normal
- Mínimo contraste 3:1 para texto grande (18px+)
- Usar colores de marca (#A8781A) solo en títulos y énfasis

### 2. Jerarquía Visual
- Máximo 3 niveles de jerarquía por sección
- Diferencia mínima de 4px entre niveles consecutivos
- Usar peso, tamaño y espaciado para crear jerarquía

### 3. Longitud de Línea
- Óptimo: 50-75 caracteres (10-12 palabras)
- Máximo: 90 caracteres
- Usar `max-w-prose` (65ch) para textos largos

### 4. Espaciado
- Títulos: `mb-4` a `mb-6`
- Párrafos: `mb-4` entre párrafos
- Secciones: `mb-8` a `mb-12` entre secciones

### 5. Responsive
- Usar escala modular (ratio 1.2-1.25)
- Reducir tamaño 20-30% en móvil
- Mantener legibilidad mínima 16px en móvil

---

## 🚫 Evitar

❌ NO usar más de 2 familias tipográficas diferentes
❌ NO usar Roboto Slab para texto largo
❌ NO usar Paciencia fuera del logo
❌ NO usar `tracking-wider` en texto normal
❌ NO usar menos de 14px en móvil
❌ NO combinar múltiples pesos en una misma línea
❌ NO usar ALL CAPS en textos largos

---

## 🎯 Checklist de Implementación

- [ ] Títulos principales usan escala consistente
- [ ] Body text es legible (16-18px)
- [ ] Contraste cumple WCAG AA
- [ ] Jerarquía visual clara en cada sección
- [ ] Espaciado consistente entre elementos
- [ ] Responsive funciona en todos los dispositivos
- [ ] Botones tienen texto legible y accesible
- [ ] No hay mezcla innecesaria de fuentes

---

Última actualización: Enero 2026
