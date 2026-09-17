# dsh-smart-reminder: Asistente de Recordatorios y Calendario

Plugin universal de recordatorios inteligentes, calendario lunar y lista de tareas para DSH Web GUI.

[English Documentation](./README.en.md) | [中文说明文档](./README.md)

## Vista Previa de la Interfaz (UI Preview)

### 1. Panel de Calendario y Flujo de Tareas (Calendar Dashboard)
![Vista previa del calendario](./docs/screenshot.svg)

### 2. Arquitectura de Funcionalidades (Feature Overview)
![Esquema de funcionalidades](./docs/features.svg)

---

## Características Principales

1. **Barra de Entrada Rápida en Lenguaje Natural (Quick Add)**:
   - ⚡ Entrada superior fija de una sola línea. Escriba de forma natural (ej. "Reunión mañana 10am", "Enviar reporte viernes 5pm", "Horno en 30 mins") y presione Enter para crear una tarea al instante con título y hora detectados.
2. **Tareas Periódicas y Recurrentes Automáticas**:
   - 🔂 Compatible con repetición Diaria, Semanal y Mensual. Marcar una tarea como completada calcula y programa automáticamente la siguiente instancia sin entrada manual.
3. **Acceso Rápido en la Barra Lateral**: Se ubica en la fila "Espacios de trabajo", justo a la izquierda del icono de búsqueda y alineado con los botones oficiales de búsqueda / vista / añadir; respeta las especificaciones oficiales de icono circular de 28px (barra ancha) y 36px (barra contraída), con tooltip estilizado al pasar el cursor.
4. **Notificaciones Nativas del Sistema**:
   - 🔔 Integración nativa con los banners del Centro de Notificaciones de macOS junto con el sonido cristalino 'Glass'.
   - 🪟 Compatibilidad total con notificaciones Toast de Windows 10/11 (`scenario="reminder"` + `Priority=High`), con banners flotantes y alertas sonoras incluso con el Asistente de Concentración activo.
3. **Reprogramación Arrastrar y Soltar (Drag & Drop)**:
   - 🖱️ Arrastre cualquier tarjeta de recordatorio de la lista derecha y suéltela en cualquier celda de fecha para reprogramarla al instante.
4. **Edición Rápida (In-Place Edit)**:
   - ✏️ Cada tarjeta incluye un botón de edición para modificar título, hora, canales de notificación, prioridad y notas.
5. **Sincronización Automática de Idioma (Español / Inglés / Chino)**:
   - Sincronización reactiva en tiempo real con el idioma seleccionado en DSH Web sin pérdida de configuración.
6. **Lista de Tareas Interactivas y Filtros**:
   - Casillas de verificación con tachado automático de completado.
   - Filtros rápidos (`Todos` / `Pendientes` / `Completados`) y buscador instantáneo de texto.
7. **Integración con Message Gateway**:
   - Detección y enlace automático con [`dsh-message-gateway`](https://www.npmjs.com/package/dsh-message-gateway) para enviar notificaciones a **WeCom AI Bot**, **Telegram**, **Discord** o **Email**.
   - Indicadores de prioridad: 🔴 Alta (Urgente) / 🟡 Media / 🟢 Baja.
8. **Pospuesto Rápido (Snooze) y Deshacer (Undo)**:
   - Botones rápidos `+15m` y `+1h` para posponer avisos.
   - Deshacer en 5 segundos tras eliminar un recordatorio para evitar pérdidas accidentales.
9. **Recuperación de Recordatorios Perdidos (Catch-up)**:
   - Detección de recordatorios vencidos durante el modo reposo o desconexión.
10. **Exportación Estándar iCal (.ics)**:
    - Descarga en formato `.ics` compatible directamente con Apple Calendar, Google Calendar y Outlook.
11. **Atajos de Teclado**:
    - `Esc`: Cerrar panel o ventana modal;
    - `Cmd/Ctrl + K`: Abrir formulario para nuevo recordatorio;
    - `← / →`: Navegar entre meses.

## Herramientas para Agentes (Tools)

- `set_reminder(title, dueTime, description?, repeat?, pushPlatform?, pushTarget?)`: Programar avisos.
- `list_reminders(type?: "upcoming" | "history" | "all")`: Consultar recordatorios pendientes o archivados.
- `complete_reminder(id)`: Marcar tareas como realizadas o restaurarlas.
- `snooze_reminder(id, minutes?)`: Posponer recordatorios.
- `cancel_reminder(id)`: Cancelar y eliminar recordatorios.

## Licencia

MIT
