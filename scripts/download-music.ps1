# ============================================================
# FOCO 360 — Descarga de música de fondo (Pixabay)
# ============================================================
# Pixabay bloquea descargas automatizadas (anti-scrape), así
# que este script abre las búsquedas en tu navegador para que
# bajes manualmente las 12 pistas y las guardes con el nombre
# correcto. Total: ~3 minutos.
#
# Uso:
#   pwsh ./scripts/download-music.ps1
#   (o) powershell -ExecutionPolicy Bypass -File ./scripts/download-music.ps1
# ============================================================

$ErrorActionPreference = 'Stop'

# Carpeta destino
$musicDir = Join-Path $PSScriptRoot '..\public\music'
if (-not (Test-Path $musicDir)) {
    New-Item -ItemType Directory -Path $musicDir -Force | Out-Null
}
$musicDir = (Resolve-Path $musicDir).Path

Write-Host ''
Write-Host '🎵 FOCO 360 — Descarga música de fondo' -ForegroundColor Yellow
Write-Host '====================================' -ForegroundColor DarkGray
Write-Host ''
Write-Host "Carpeta destino: $musicDir" -ForegroundColor Gray
Write-Host ''

# Las 12 pistas que espera el manifest (src/lib/musicLibrary.ts)
$tracks = @(
    @{ File = 'soft-ambient.mp3';   Mood = '🌊 Relajante';       Search = 'soft%20ambient' }
    @{ File = 'gentle-flow.mp3';    Mood = '🌊 Relajante';       Search = 'gentle%20flow%20instrumental' }
    @{ File = 'sunday-morning.mp3'; Mood = '🌊 Relajante';       Search = 'relaxing%20instrumental' }

    @{ File = 'inspiring-tour.mp3'; Mood = '🎬 Cinematográfico'; Search = 'inspiring%20cinematic' }
    @{ File = 'epic-home.mp3';      Mood = '🎬 Cinematográfico'; Search = 'epic%20cinematic' }
    @{ File = 'modern-luxury.mp3';  Mood = '🎬 Cinematográfico'; Search = 'modern%20cinematic' }

    @{ File = 'lofi-cafe.mp3';      Mood = '☕ Lo-Fi';           Search = 'lofi%20chill' }
    @{ File = 'lofi-study.mp3';     Mood = '☕ Lo-Fi';           Search = 'lofi%20study' }

    @{ File = 'piano-warm.mp3';     Mood = '🎹 Piano';          Search = 'warm%20piano' }
    @{ File = 'piano-elegant.mp3';  Mood = '🎹 Piano';          Search = 'elegant%20piano' }

    @{ File = 'ambient-space.mp3';  Mood = '✨ Ambient';        Search = 'ambient%20space' }
    @{ File = 'ambient-warmth.mp3'; Mood = '✨ Ambient';        Search = 'ambient%20warm' }
)

# Lista pendientes (que faltan en public/music/)
$pending = $tracks | Where-Object { -not (Test-Path (Join-Path $musicDir $_.File)) }

if ($pending.Count -eq 0) {
    Write-Host '✅ Las 12 pistas ya están descargadas. Nada que hacer.' -ForegroundColor Green
    Write-Host ''
    exit 0
}

Write-Host "Faltan $($pending.Count) de $($tracks.Count) pistas." -ForegroundColor Cyan
Write-Host ''
Write-Host 'Cómo proceder:' -ForegroundColor White
Write-Host '  1) Voy a abrir Pixabay en tu navegador (una pestaña por mood pendiente).'
Write-Host '  2) En cada pestaña, escucha y elige UNA pista instrumental que te guste.'
Write-Host '  3) Click "Free Download" → MP3.'
Write-Host '  4) Mueve el archivo a:' -NoNewline
Write-Host " $musicDir" -ForegroundColor Yellow
Write-Host '  5) RENÓMBRALO al nombre exacto que te indico abajo.'
Write-Host ''
Write-Host '⚠ El nombre del archivo es lo que importa — el código lo busca por nombre.' -ForegroundColor DarkYellow
Write-Host ''
Write-Host 'Pistas pendientes:' -ForegroundColor White

foreach ($t in $pending) {
    Write-Host ('  ' + $t.Mood + '  →  ') -NoNewline -ForegroundColor Gray
    Write-Host $t.File -ForegroundColor Yellow
}

Write-Host ''
$confirm = Read-Host '¿Abrir las pestañas de búsqueda en Pixabay? [s/N]'
if ($confirm -notmatch '^[sSyY]') {
    Write-Host 'Cancelado. Las pestañas no se abrieron.' -ForegroundColor DarkGray
    exit 0
}

# Agrupa por search para no abrir duplicados
$uniqueSearches = $pending | Select-Object -ExpandProperty Search -Unique
foreach ($s in $uniqueSearches) {
    $url = "https://pixabay.com/music/search/$s/"
    Start-Process $url
    Start-Sleep -Milliseconds 300
}

Write-Host ''
Write-Host '✅ Pestañas abiertas. Cuando termines de descargar y renombrar,' -ForegroundColor Green
Write-Host '   vuelve a correr este script para verificar que estén todas.' -ForegroundColor Green
Write-Host ''
