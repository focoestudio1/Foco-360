# 🎵 Música de fondo

Esta carpeta contiene 12 pistas instrumentales de [Pixabay Music](https://pixabay.com/music/)
(uso comercial libre, sin atribución obligatoria) que el admin puede asignar
a cada tour 360°.

## Cómo poblar esta carpeta

Corre desde la raíz del proyecto:

```powershell
pwsh ./scripts/download-music.ps1
```

El script:
1. Crea la carpeta `public/music/` si no existe.
2. Lista cuáles archivos faltan.
3. Te abre las pestañas de búsqueda de Pixabay (una por mood pendiente).
4. Descargas → renombras al nombre exacto que el script te indicó → mueves acá.

## Por qué descarga manual

Pixabay tiene anti-scrape: bloquea `curl`/`Invoke-WebRequest` con 403. El
flujo más rápido y honesto es 12 clicks en el navegador (~3 min).

## Archivos esperados

El manifest está en [`src/lib/musicLibrary.ts`](../../src/lib/musicLibrary.ts).
Los nombres de archivo deben coincidir exactamente — el código los busca por
nombre.

## Reemplazar una pista

1. Borra el `.mp3` viejo.
2. Baja otro de Pixabay con el mismo nombre.
3. Listo — los proyectos que tenían esa pista asignada cargan la nueva
   automáticamente.

## Tamaño

~30 MB total (12 pistas × ~2.5 MB). Cabe holgadamente en el deploy de Vercel.
Si subes pistas más pesadas, considera comprimir a 96-128 kbps mono — para
ambient/lofi de fondo es suficiente.
