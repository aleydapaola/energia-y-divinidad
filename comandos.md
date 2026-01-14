# Comandos del Proyecto

## Matar todos los servidores y arrancar ambos proyectos

Eliminar procesos en puertos 3000 y 3001, y arrancar ambos proyectos:

```bash
lsof -ti:3000,3001 | xargs kill -9 2>/dev/null; cd ~/Projects/energia-y-divinidad && npm run dev & cd ~/Projects/amor-sanacion-alquimia && npm run dev -- -p 3001
```

## Arrancar ambos proyectos (sin matar)

```bash
cd ~/Projects/energia-y-divinidad && npm run dev & cd ~/Projects/amor-sanacion-alquimia && npm run dev -- -p 3001
```

## Matar todos los servidores

```bash
lsof -ti:3000,3001 | xargs kill -9 2>/dev/null
```

---

## Comandos individuales

### Energia y Divinidad (puerto 3000)

Matar y arrancar:
```bash
lsof -ti:3000 | xargs kill -9 2>/dev/null; cd ~/Projects/energia-y-divinidad && npm run dev
```

Solo arrancar:
```bash
cd ~/Projects/energia-y-divinidad && npm run dev
```

### Amor Sanacion Alquimia (puerto 3001)

Matar y arrancar:
```bash
lsof -ti:3001 | xargs kill -9 2>/dev/null; cd ~/Projects/amor-sanacion-alquimia && npm run dev -- -p 3001
```

Solo arrancar:
```bash
cd ~/Projects/amor-sanacion-alquimia && npm run dev -- -p 3001
```

---

## URLs de desarrollo

- **Energia y Divinidad**: http://localhost:3000
- **Amor Sanacion Alquimia**: http://localhost:3001
