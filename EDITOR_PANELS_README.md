# Sistema de Edición de Archivos con Paneles Flotantes

## 🎨 Características

Esta implementación añade un sistema completo de edición de archivos con paneles flotantes y dinámicos al proyecto.

### ✨ Funcionalidades Principales

1. **Drag & Drop Inteligente**
   - Arrastra cualquier archivo desde el file-grid
   - Suéltalo en la zona de drop (aparece automáticamente)
   - Se abre un panel de edición flotante

2. **Paneles de Edición Flotantes**
   - Completamente redimensionables
   - Movibles por toda la pantalla
   - Minimizables y maximizables
   - Múltiples paneles abiertos simultáneamente
   - Sistema de z-index para traer al frente

3. **Editores Especializados**

   #### 🖼️ Editor de Imágenes
   - Ajuste de brillo, contraste y saturación
   - Rotación en 90°
   - Filtros: Blanco y Negro, Sepia, Desenfoque, Invertir
   - Herramienta de dibujo con color y tamaño personalizables
   - Zoom y escala
   - Guardar cambios localmente

   #### 📄 Visor/Editor de PDF
   - Navegación por páginas
   - Zoom in/out
   - Herramientas de anotación:
     - Dibujar a mano alzada
     - Resaltar texto
     - Añadir anotaciones de texto
   - Selector de color para herramientas

   #### 📝 Editor de Texto
   - Soporte para múltiples lenguajes (JS, Python, HTML, CSS, etc.)
   - Números de línea
   - Ajuste de texto
   - Control de tamaño de fuente
   - Control de interlineado
   - Guardar y descargar
   - Contador de líneas y caracteres

   #### 🎥 Reproductor de Video
   - Controles de reproducción completos
   - Control de velocidad (0.5x - 2x)
   - Control de volumen
   - Barra de progreso con seek
   - Pantalla completa
   - Descarga

   #### 🎵 Reproductor de Audio
   - Interfaz visual atractiva con gradiente
   - Control de velocidad
   - Control de volumen
   - Barra de progreso
   - Visualización de tiempo actual/total

4. **Diseño Glassmorphism**
   - Efectos de vidrio esmerilado (frosted glass)
   - Backdrop blur y saturación
   - Animaciones suaves y fluidas
   - Tema claro y oscuro completo
   - Transiciones CSS modernas

5. **Gestión de Múltiples Paneles**
   - Abrir múltiples archivos a la vez
   - Cada archivo se abre solo una vez (evita duplicados)
   - Click en panel lo trae al frente automáticamente
   - Cerrar paneles individualmente
   - Minimizar paneles a la barra inferior

## 🚀 Uso

### Abrir un Archivo en Panel de Edición

**Método 1: Drag & Drop**
1. Haz clic sostenido sobre cualquier archivo
2. Arrastra hacia el lado derecho
3. Aparecerá una zona de drop azul
4. Suelta el archivo en la zona

**Método 2: Menú Contextual**
1. Click derecho en un archivo (o botón ⋮)
2. Selecciona "Abrir en panel" o "Editar en panel"

### Controles del Panel

- **Mover**: Arrastra desde la barra de título
- **Redimensionar**: Arrastra desde la esquina inferior derecha
- **Minimizar**: Click en botón `-`
- **Maximizar**: Click en botón `⛶`
- **Cerrar**: Click en botón `×`

### Edición

Cada tipo de archivo tiene su propio conjunto de herramientas en la barra superior del panel.

## 📁 Estructura de Archivos

```
src/components/
├── FileEditorPanel.jsx       # Panel flotante principal
├── FileEditorPanel.css        # Estilos del panel
├── UserPanel.jsx              # Integración con sistema existente
├── UserPanel.css              # Estilos actualizados
└── editors/
    ├── ImageEditor.jsx        # Editor de imágenes
    ├── ImageEditor.css
    ├── PDFEditor.jsx          # Visor/Editor de PDF
    ├── PDFEditor.css
    ├── TextEditor.jsx         # Editor de texto/código
    ├── TextEditor.css
    ├── VideoPlayer.jsx        # Reproductor de video
    ├── VideoPlayer.css
    ├── AudioPlayer.jsx        # Reproductor de audio
    └── AudioPlayer.css
```

## 🎨 Tecnologías Utilizadas

- **React 18+** - Framework principal
- **Tailwind CSS** - Utilidades y diseño
- **CSS3** - Animaciones y efectos avanzados
- **Canvas API** - Edición de imágenes
- **HTML5 Media** - Reproductores de audio/video
- **Glassmorphism** - Diseño moderno de UI

## 🔧 Personalización

### Cambiar Colores del Drop Zone

En `UserPanel.css`:
```css
.editor-drop-zone {
  border-color: rgba(59, 130, 246, 0.5); /* Azul */
  background: rgba(59, 130, 246, 0.05);
}
```

### Agregar Nuevo Tipo de Editor

1. Crear nuevo componente en `src/components/editors/`
2. Importar en `FileEditorPanel.jsx`
3. Añadir caso en `renderEditor()`:
```javascript
case 'tu-tipo':
  return <TuEditor fileUrl={fileUrl} file={file} />;
```

### Modificar Tamaño Inicial de Paneles

En `FileEditorPanel.jsx`:
```javascript
const [size, setSize] = useState({ width: 800, height: 600 });
```

## 🐛 Solución de Problemas

**El drag & drop no funciona**
- Verifica que `draggable={true}` esté en los elementos
- Asegúrate de que los handlers están conectados
- Revisa la consola para errores

**Los paneles no se mueven**
- Verifica que no haya elementos que bloqueen los eventos
- Asegúrate de que el cursor está en la barra de título

**Las imágenes no cargan**
- Verifica la autenticación del token
- Revisa la ruta de la API
- Comprueba CORS si es necesario

## 📝 Notas de Implementación

- Todos los paneles usan un sistema de z-index incremental
- El drag & drop solo funciona con archivos (no carpetas)
- Los cambios en archivos son locales hasta guardar
- Se recomienda implementar guardado en backend para persistencia

## 🎯 Próximas Mejoras

- [ ] Guardado automático en servidor
- [ ] Colaboración en tiempo real
- [ ] Más filtros para imágenes
- [ ] Editor de video (recortar, efectos)
- [ ] Historial de cambios (undo/redo)
- [ ] Atajos de teclado
- [ ] Compartir paneles entre usuarios

## 📄 Licencia

Este código es parte del proyecto Base_de_datos_archivos.

---

**Autor**: GitHub Copilot
**Fecha**: Octubre 2025
**Versión**: 1.0.0
