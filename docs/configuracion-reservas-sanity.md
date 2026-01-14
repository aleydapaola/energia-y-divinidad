# Configuracion de Reservas en Sanity

Esta guia explica como configurar los detalles de sesiones, dias habiles, festivos y zonas horarias desde Sanity Studio.

## Acceso a Sanity Studio

1. Ir a `https://tu-dominio.com/studio` o `http://localhost:3000/studio` en desarrollo
2. Iniciar sesion con tu cuenta de Sanity

---

## 1. Configuracion de Reservas (bookingSettings)

Este es un documento **singleton** (solo debe existir uno) que controla la configuracion global del sistema de reservas.

### Crear el documento

1. En Sanity Studio, buscar **"Configuracion de Reservas"** en el menu lateral
2. Click en **"Create"** o **"Crear"**
3. Solo necesitas crear este documento una vez

### Campos disponibles

#### Dias Festivos

Aqui se agregan los dias en que NO se aceptan reservas (festivos nacionales, dias especiales, etc.)

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| **Fecha** | Dia del festivo | 2026-01-01 |
| **Nombre del Festivo** | Descripcion | Ano Nuevo |
| **Se repite cada ano** | Si es recurrente | Si (para Navidad, Ano Nuevo, etc.) |

**Festivos colombianos sugeridos para agregar:**

```
2026-01-01 - Ano Nuevo (recurrente: Si)
2026-01-12 - Dia de los Reyes Magos
2026-03-23 - Dia de San Jose
2026-04-02 - Jueves Santo
2026-04-03 - Viernes Santo
2026-05-01 - Dia del Trabajo (recurrente: Si)
2026-05-18 - Ascension del Senor
2026-06-08 - Corpus Christi
2026-06-15 - Sagrado Corazon de Jesus
2026-06-29 - San Pedro y San Pablo
2026-07-20 - Dia de la Independencia (recurrente: Si)
2026-08-07 - Batalla de Boyaca (recurrente: Si)
2026-08-17 - Asuncion de la Virgen
2026-10-12 - Dia de la Raza
2026-11-02 - Todos los Santos
2026-11-16 - Independencia de Cartagena
2026-12-08 - Dia de la Inmaculada Concepcion (recurrente: Si)
2026-12-25 - Navidad (recurrente: Si)
```

> **Nota:** Los festivos marcados como "recurrente" se aplicaran automaticamente cada ano en la misma fecha.

#### Fechas Bloqueadas

Para periodos especificos donde no se aceptan reservas (vacaciones, retiros, cursos intensivos, etc.)

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| **Fecha Inicio** | Primer dia bloqueado | 2026-02-10 |
| **Fecha Fin** | Ultimo dia bloqueado | 2026-02-15 |
| **Motivo** | Razon del bloqueo | Retiro de meditacion |

**Ejemplo de configuracion:**

```
Fecha Inicio: 2026-02-10
Fecha Fin: 2026-02-15
Motivo: Retiro de meditacion en Villa de Leyva

Fecha Inicio: 2026-12-20
Fecha Fin: 2026-01-05
Motivo: Vacaciones de fin de ano
```

#### Husos Horarios Disponibles

Zonas horarias que los usuarios pueden seleccionar para ver los horarios en su hora local.

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| **Etiqueta** | Nombre visible | Colombia |
| **Identificador IANA** | Codigo de zona | America/Bogota |
| **Diferencia con Colombia (horas)** | Offset | 0 |
| **Es la zona por defecto** | Zona inicial | Si |

**Configuracion recomendada:**

| Etiqueta | Identificador IANA | Diferencia (horas) | Por defecto |
|----------|-------------------|-------------------|-------------|
| Colombia | America/Bogota | 0 | Si |
| Mexico | America/Mexico_City | -1 | No |
| Argentina | America/Argentina/Buenos_Aires | +2 | No |
| Espana | Europe/Madrid | +6 | No |

> **Importante:** La diferencia se calcula respecto a Colombia (GMT-5). Por ejemplo:
> - Mexico (GMT-6) esta 1 hora atras de Colombia = -1
> - Argentina (GMT-3) esta 2 horas adelante de Colombia = +2
> - Espana (GMT+1) esta 6 horas adelante de Colombia = +6

#### Configuracion General

| Campo | Descripcion | Valor recomendado |
|-------|-------------|-------------------|
| **Horas minimas de anticipacion** | Tiempo minimo para reservar | 24 |
| **Dias maximos de anticipacion** | Maximo dias en futuro | 60 |
| **Nota de zona horaria** | Mensaje informativo | "La sesion sera en hora de Colombia (GMT-5)" |

---

## 2. Configuracion de Sesiones

Cada sesion tiene su propia configuracion de disponibilidad.

### Editar una sesion existente

1. En Sanity Studio, ir a **"Sesiones 1:1"**
2. Seleccionar la sesion a editar
3. Modificar los campos necesarios

### Campos principales para reservas

#### Informacion basica

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| **Titulo** | Nombre de la sesion | Sesion de Canalizacion |
| **Duracion** | Tiempo en minutos | 60 minutos |
| **Metodo de Entrega** | Como se realiza | Videollamada (Zoom) |
| **Precio (COP)** | Precio en pesos | 150000 |
| **Precio (USD)** | Precio en dolares | 40 |

#### Horarios Disponibles (availabilitySchedule)

Aqui se configuran los horarios de atencion por dia de la semana.

**Estructura:**
```
Lunes:
  - Inicio: 09:00, Fin: 12:00
  - Inicio: 15:00, Fin: 19:00

Martes:
  - Inicio: 09:00, Fin: 19:00

(etc.)
```

**Para configurar "Lunes a Viernes de 9am a 7pm":**

1. En cada dia (Lunes, Martes, Miercoles, Jueves, Viernes):
   - Click en "Add item" o "Agregar"
   - Inicio: `09:00`
   - Fin: `19:00`

2. Dejar Sabado y Domingo vacios (sin items)

**Para configurar horarios partidos (manana y tarde):**

1. Para Lunes:
   - Primer item: Inicio `09:00`, Fin `12:00`
   - Segundo item: Inicio `15:00`, Fin `19:00`

#### Restricciones de reserva

| Campo | Descripcion | Valor |
|-------|-------------|-------|
| **Tiempo Minimo de Reserva (horas)** | Anticipacion minima | 24 |
| **Maximo Tiempo de Reserva Anticipada (dias)** | Dias maximos | 60 |

#### Estado

| Campo | Descripcion |
|-------|-------------|
| **Activa** | Aceptando reservas normalmente |
| **Pausada** | Temporalmente no disponible |
| **Archivada** | Ya no se ofrece |

---

## 3. Como se muestra en la web

### Pagina /sesiones

Los datos se cargan automaticamente:

- **Duracion**: Se muestra "60 minutos" (desde `session.duration`)
- **Modalidad**: Se muestra "Videollamada" (desde `session.deliveryMethod`)
- **Dias**: Se muestra "Lunes a Viernes" (calculado desde `availabilitySchedule`)
- **Precio**: Se muestra "$150.000 COP" y "~40 USD"

### Calendario

- Los dias festivos aparecen **deshabilitados** (gris, no clickeables)
- Los rangos bloqueados aparecen **deshabilitados**
- Los dias sin horarios configurados aparecen **deshabilitados**
- Solo los dias habiles con horarios aparecen **disponibles** (violeta)

### Selector de zona horaria

- Aparece debajo del calendario
- 4 botones: Colombia, Mexico, Argentina, Espana
- Al seleccionar otra zona, los horarios se convierten automaticamente
- Siempre muestra nota: "La sesion sera en hora de Colombia"

---

## 4. Ejemplos de configuracion

### Ejemplo 1: Configuracion basica

**bookingSettings:**
```
Festivos:
- 2026-01-01, Ano Nuevo, recurrente
- 2026-12-25, Navidad, recurrente

Fechas bloqueadas:
(ninguna)

Zonas horarias:
- Colombia, America/Bogota, 0, por defecto

Horas minimas: 24
Dias maximos: 30
```

**Session (Canalizacion):**
```
Duracion: 60 minutos
Metodo: Videollamada
Precio COP: 150000
Precio USD: 40

Horarios:
- Lunes: 09:00 - 19:00
- Martes: 09:00 - 19:00
- Miercoles: 09:00 - 19:00
- Jueves: 09:00 - 19:00
- Viernes: 09:00 - 19:00

Estado: Activa
Destacada: Si
```

### Ejemplo 2: Configuracion avanzada

**bookingSettings:**
```
Festivos:
- (todos los festivos colombianos)

Fechas bloqueadas:
- 2026-02-10 a 2026-02-15, Retiro espiritual
- 2026-07-01 a 2026-07-15, Vacaciones

Zonas horarias:
- Colombia, America/Bogota, 0, por defecto
- Mexico, America/Mexico_City, -1
- Argentina, America/Argentina/Buenos_Aires, +2
- Espana, Europe/Madrid, +6

Horas minimas: 48
Dias maximos: 60
Nota: "Todas las sesiones son en hora Colombia (GMT-5). Recibiras recordatorio 24h antes."
```

**Session (Canalizacion Premium):**
```
Duracion: 90 minutos
Metodo: Hibrido
Precio COP: 250000
Precio USD: 65

Horarios:
- Lunes: 10:00 - 12:00, 16:00 - 19:00
- Martes: 10:00 - 12:00, 16:00 - 19:00
- Miercoles: (cerrado)
- Jueves: 10:00 - 12:00, 16:00 - 19:00
- Viernes: 10:00 - 13:00
- Sabado: 10:00 - 13:00

Tiempo minimo: 48 horas
Maximo anticipacion: 45 dias
Estado: Activa
```

---

## 5. Preguntas frecuentes

### Como agrego un nuevo festivo?

1. Ir a Configuracion de Reservas
2. En "Dias Festivos", click en "Add item"
3. Llenar fecha, nombre y si es recurrente
4. Guardar (Publish)

### Como bloqueo fechas para vacaciones?

1. Ir a Configuracion de Reservas
2. En "Fechas Bloqueadas", click en "Add item"
3. Poner fecha inicio, fecha fin y motivo
4. Guardar (Publish)

### Como cambio los dias de atencion?

1. Ir a Sesiones 1:1 > seleccionar sesion
2. En "Horarios Disponibles", modificar cada dia
3. Para cerrar un dia, eliminar todos los items de ese dia
4. Guardar (Publish)

### Como cambio el precio?

1. Ir a Sesiones 1:1 > seleccionar sesion
2. Modificar "Precio (COP)" y "Precio (USD)"
3. Guardar (Publish)

### Como pauso temporalmente las reservas?

1. Ir a Sesiones 1:1 > seleccionar sesion
2. Cambiar "Estado" a "Pausada"
3. Guardar (Publish)

### Los cambios se ven inmediatamente?

Si, los cambios en Sanity se reflejan en la web en unos segundos (el CDN puede tener cache de hasta 60 segundos).

---

## 6. Troubleshooting

### Los festivos no aparecen bloqueados

- Verificar que el documento "Configuracion de Reservas" este publicado
- Verificar que las fechas esten en formato correcto (YYYY-MM-DD)
- Limpiar cache del navegador

### No aparecen horarios disponibles

- Verificar que la sesion tenga "Horarios Disponibles" configurados
- Verificar que el dia seleccionado tenga al menos un rango de horas
- Verificar que el estado de la sesion sea "Activa"

### El selector de zona horaria no aparece

- Verificar que haya al menos una zona horaria configurada en bookingSettings
- Si no hay ninguna, se usan las 4 zonas por defecto automaticamente
