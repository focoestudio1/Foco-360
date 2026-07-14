'use client';

// ============================================================
// Boton para generar y descargar un QR del tour publico.
//
// Al hacer click:
//  1. Abre un modal con el QR renderizado en canvas.
//  2. Muestra el nombre del proyecto y el link.
//  3. Boton "Descargar PNG" que guarda el QR + info al escritorio.
//
// El QR apunta directo al tour publico. El agente lo imprime y
// lo pega en avisos fisicos, carteles del inmueble, cotizaciones,
// tarjetas — el cliente escanea con el celu y entra al tour.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';

export function QRCodeButton({
  projectName,
  tourUrl,
  brandColor,
}: {
  projectName: string;
  tourUrl: string;
  brandColor?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const color = brandColor || '#d4af37';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-gold hover:text-gold-light"
        title="Generar QR imprimible del tour"
      >
        QR ⇩
      </button>
      {open && (
        <QRModal
          projectName={projectName}
          tourUrl={tourUrl}
          brandColor={color}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function QRModal({
  projectName,
  tourUrl,
  brandColor,
  onClose,
}: {
  projectName: string;
  tourUrl: string;
  brandColor: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  // Renderiza el QR + branding en el canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Tamano final del canvas exportable: 1000x1400 (formato tarjeta imprimible).
    const W = 1000;
    const H = 1400;
    const QR_SIZE = 720;
    const QR_MARGIN = 40;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fondo blanco (mejor lectura del QR + imprimible)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Barra dorada superior (branding)
    ctx.fillStyle = brandColor;
    ctx.fillRect(0, 0, W, 12);
    ctx.fillRect(0, H - 12, W, 12);

    // Texto: FOCO 360 arriba
    ctx.fillStyle = '#0a0a0a';
    ctx.textAlign = 'center';
    ctx.font = '600 32px Inter, Arial, sans-serif';
    ctx.fillText('FOCO 360°', W / 2, 90);
    ctx.font = '400 18px Inter, Arial, sans-serif';
    ctx.fillStyle = '#707070';
    ctx.fillText('TOURS INMOBILIARIOS 360°', W / 2, 125);

    // Generar el QR en un canvas temporal y copiarlo al final.
    QRCode.toDataURL(tourUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: QR_SIZE,
      color: {
        dark: '#0a0a0a',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        const img = new Image();
        img.onload = () => {
          const x = (W - QR_SIZE) / 2;
          const y = 180;

          // Borde suave alrededor del QR
          ctx.fillStyle = '#f5f5f5';
          ctx.fillRect(x - QR_MARGIN, y - QR_MARGIN, QR_SIZE + QR_MARGIN * 2, QR_SIZE + QR_MARGIN * 2);
          ctx.drawImage(img, x, y, QR_SIZE, QR_SIZE);

          // Nombre del proyecto (grande, negrita)
          const nameY = y + QR_SIZE + QR_MARGIN + 90;
          ctx.fillStyle = '#0a0a0a';
          ctx.font = '600 44px Georgia, "Times New Roman", serif';
          const name = truncate(projectName.toUpperCase(), 30);
          ctx.fillText(name, W / 2, nameY);

          // Sub-texto: "Escanea para ver el tour"
          ctx.font = '400 20px Inter, Arial, sans-serif';
          ctx.fillStyle = '#707070';
          ctx.fillText(
            'Escanea el codigo con la camara de tu celular',
            W / 2,
            nameY + 50
          );
          ctx.fillText(
            'para explorar el inmueble en 360°',
            W / 2,
            nameY + 78
          );

          setReady(true);
        };
        img.src = dataUrl;
      })
      .catch(() => {
        showToast('error', 'No se pudo generar el QR');
      });
  }, [projectName, tourUrl, brandColor]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast('error', 'No se pudo generar el archivo');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      a.download = `qr-tour-${safeName}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('success', 'QR descargado');
    }, 'image/png');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-lg border border-border bg-bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/80"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wider text-text-muted">
          QR del tour
        </h3>
        <p className="mb-4 text-xs text-text-subtle">
          Descarga la tarjeta imprimible con el QR. Pegala en el aviso del inmueble,
          carteles, tarjetas o cotizaciones — el cliente escanea con la camara y
          entra al tour en 3 segundos.
        </p>

        {/* Preview del canvas (escalado) */}
        <div className="mb-4 flex justify-center rounded-md border border-border bg-white p-2">
          <canvas
            ref={canvasRef}
            className="h-auto max-h-[400px] w-full max-w-full"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={download} disabled={!ready} className="flex-1">
            {ready ? '⇩ Descargar PNG' : 'Generando…'}
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cerrar
          </Button>
        </div>

        <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-text-subtle">
          Alta resolucion — 1000×1400 px
        </p>
      </div>
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
