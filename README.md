# Calificador de Exámenes — Modo Teclado

Aplicación web *single-page* para calificar exámenes de selección múltiple **100% con teclado**, optimizada para velocidad de ingreso masivo (~400 exámenes).

---

## Características

- **Flujo solo teclado**: cero uso de mouse; atajos diseñados para digitación continua
- **Datos locales**: estudiantes y claves en `listas.json` / `respuestas.json` (no se suben a Git)
- **Persistencia automática**: `localStorage` guarda progreso parcial y calificaciones; sobrevive a recargas
- **Exportación Excel**: genera `.xlsx` con detalle completo (SheetJS)
- **UI compacta**: matriz 5 columnas responsive, feedback visual inmediato, stats en tiempo real
- **Dark mode** nativo, sin dependencias de UI externas

---

## Atajos de Teclado

| Tecla | Acción |
|-------|--------|
| `A` `B` `C` `D` | Marcar respuesta y **avanzar auto** a siguiente pregunta |
| `Backspace` | Si la pregunta tiene respuesta → **borra**; si está vacía → **retrocede** |
| `←` `→` | Navegar entre preguntas |
| `Enter` (en última pregunta) | **Guardar y saltar** al siguiente estudiante sin calificar |
| `Ctrl + Enter` | Guardar y siguiente en cualquier momento |
| `Esc` | Cerrar dropdown / volver al buscador de estudiantes |
| `1`–`9` | Saltar directo a pregunta N |
| `↑` `↓` (en buscador) | Navegar lista filtrada |
| `Enter` (en buscador) | Seleccionar estudiante destacado |

---

## Flujo de Trabajo

1. **Abrir** `index.html` vía servidor local (ver abajo)
2. **Seleccionar grado** → dropdown
3. **Filtrar estudiante** → escribir nombre, `Enter` para seleccionar
4. **Calificar**: teclear `A/B/C/D` sin parar; `Backspace` para corregir
5. Al terminar: `Enter` → guarda, limpia matriz, salta al siguiente pendiente
6. Repetir hasta completar el grado
7. **Exportar Excel** cuando se desee

---

## Instalación y Ejecución

```bash
# Clonar
git clone git@github.com:Ludensx/calificador-examenes-teclado.git
cd calificador-examenes-teclado

# Crear archivos de datos locales (no versionados)
cp listas.json.example listas.json     # editar con tus estudiantes
cp respuestas.json.example respuestas.json  # editar con tus claves

# Servir (requerido para fetch() de JSON)
python3 -m http.server 8000
# o: npx serve .
# abre http://localhost:8000
```

> **Nota**: `fetch()` no funciona con `file://`. Usa un servidor estático local.

---

## Estructura de Datos

### `listas.json`
```json
{
  "6A": ["Apellido, Nombre", "..."],
  "6B": ["..."]
}
```

### `respuestas.json`
```json
{
  "6A": { "1": "B", "2": "C", ..., "30": "A" },
  "6B": { "1": "A", ... }
}
```

Ambos archivos se ignoran por `.gitignore`. Crea tus propios `.example` como plantillas.

---

## Exportación Excel

Genera columnas:
- Grado, Estudiante, Aciertos, Total Preguntas, Nota Final (0.0–10.0), Detalle Respuestas (1:A | 2:B …), Fecha

---

## Privacidad

- **Ningún dato sale del navegador**. No hay backend, no hay red.
- `listas.json` y `respuestas.json` se leen localmente vía `fetch()`.
- `localStorage` guarda solo en tu máquina.
- El repo **no contiene datos reales** (historial limpio).

---

## Stack

- HTML / CSS / ES Modules (Vanilla JS)
- [SheetJS (xlsx)](https://sheetjs.com/) via CDN para exportación
- Fuente mono: JetBrains Mono / Fira Code (fallback)

---

## Licencia

MIT — uso libre, modificar y distribuir.