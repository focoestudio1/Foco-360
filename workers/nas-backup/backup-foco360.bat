@echo off
REM ============================================================
REM FOCO 360 - Backup automatico R2 -> NAS
REM ============================================================
REM Sincroniza el bucket foco360 de Cloudflare R2 al NAS
REM (unidad Z: mapeada a \\192.168.100.24\backups-foco360).
REM
REM Usa "copy" en vez de "sync" para NUNCA borrar archivos del
REM backup, aunque se hayan eliminado del bucket original.
REM
REM El log se guarda en Z:\_backup-log.txt (se sobreescribe
REM cada corrida — solo interesa el ultimo estado).
REM ============================================================

echo Iniciando backup FOCO 360 - R2 -> NAS
echo Hora: %DATE% %TIME%
echo.

"C:\rclone\rclone.exe" copy r2:foco360 "Z:\" ^
  --log-file="Z:\_backup-log.txt" ^
  --log-level=INFO ^
  --transfers=4 ^
  --checkers=8

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Backup completado con exito.
    echo Log detallado en: Z:\_backup-log.txt
) else (
    echo.
    echo ERROR: Backup fallo con codigo %ERRORLEVEL%.
    echo Revisar el log en: Z:\_backup-log.txt
)

echo.
echo Presiona una tecla para cerrar...
pause > nul
