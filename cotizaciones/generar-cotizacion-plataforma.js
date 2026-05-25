// Genera Cotizacion-Plataforma-FOCO360.docx
const fs = require('fs');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  ShadingType,
  LevelFormat,
  PageNumber,
  TabStopType,
  TabStopPosition,
} = require('docx');

const GOLD = 'D4AF37';
const DARK = '1A1A1A';
const GRAY = '6B7280';
const LIGHT_GRAY = 'E5E7EB';
const LIGHT_BG = 'F9FAFB';

const today = new Date().toLocaleDateString('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const border = (color = LIGHT_GRAY) => ({
  style: BorderStyle.SINGLE,
  size: 4,
  color,
});
const allBorders = (color = LIGHT_GRAY) => ({
  top: border(color),
  bottom: border(color),
  left: border(color),
  right: border(color),
});

function cell({ text, bold = false, color, fill, align = AlignmentType.LEFT, width }) {
  return new TableCell({
    borders: allBorders(),
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({
            text,
            bold,
            color: color || DARK,
            size: 20,
            font: 'Arial',
          }),
        ],
      }),
    ],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after || 120 },
    alignment: opts.align || AlignmentType.LEFT,
    children: [
      new TextRun({
        text,
        bold: opts.bold,
        color: opts.color || DARK,
        size: opts.size || 22,
        font: 'Arial',
      }),
    ],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [
      new TextRun({ text, bold: true, color: GOLD, size: 26, font: 'Arial' }),
    ],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { after: 80 },
    children: [
      new TextRun({ text, color: DARK, size: 22, font: 'Arial' }),
    ],
  });
}

// ============= OPCIONES TABLE =============
const optionsRows = [
  new TableRow({
    tableHeader: true,
    children: [
      cell({ text: 'OPCIÓN', bold: true, color: 'FFFFFF', fill: DARK, width: 1800 }),
      cell({ text: 'MODALIDAD', bold: true, color: 'FFFFFF', fill: DARK, width: 2800 }),
      cell({ text: 'IDEAL PARA', bold: true, color: 'FFFFFF', fill: DARK, width: 3160 }),
      cell({ text: 'INVERSIÓN', bold: true, color: 'FFFFFF', fill: DARK, align: AlignmentType.RIGHT, width: 1600 }),
    ],
  }),
  new TableRow({
    children: [
      cell({ text: 'A · Licencia única', bold: true, color: GOLD, fill: LIGHT_BG, width: 1800 }),
      cell({ text: 'Pago único · Código fuente completo · Entrega definitiva', width: 2800 }),
      cell({ text: 'Agencias o fotógrafos que quieren su propia plataforma sin dependencias', width: 3160 }),
      cell({ text: '$8.000.000 – $15.000.000', bold: true, align: AlignmentType.RIGHT, width: 1600 }),
    ],
  }),
  new TableRow({
    children: [
      cell({ text: 'B · Licencia anual', bold: true, color: GOLD, fill: LIGHT_BG, width: 1800 }),
      cell({ text: 'Renovación anual · Actualizaciones · Soporte técnico continuo', width: 2800 }),
      cell({ text: 'Empresas que quieren la plataforma con soporte y nuevas features cada año', width: 3160 }),
      cell({ text: '$3.500.000 – $6.000.000 / año', bold: true, align: AlignmentType.RIGHT, width: 1600 }),
    ],
  }),
  new TableRow({
    children: [
      cell({ text: 'C · SaaS hospedado', bold: true, color: GOLD, fill: LIGHT_BG, width: 1800 }),
      cell({ text: 'Pago mensual · Nosotros hospedamos · Tu marca, tu dominio', width: 2800 }),
      cell({ text: 'Productoras o inmobiliarias que no quieren manejar servidores', width: 3160 }),
      cell({ text: 'Desde $80.000 / mes', bold: true, align: AlignmentType.RIGHT, width: 1600 }),
    ],
  }),
];

// ============= SAAS PLANS TABLE =============
const saasRows = [
  new TableRow({
    tableHeader: true,
    children: [
      cell({ text: 'PLAN SaaS', bold: true, color: 'FFFFFF', fill: DARK, width: 2200 }),
      cell({ text: 'PROYECTOS', bold: true, color: 'FFFFFF', fill: DARK, align: AlignmentType.CENTER, width: 2000 }),
      cell({ text: 'INCLUYE', bold: true, color: 'FFFFFF', fill: DARK, width: 3360 }),
      cell({ text: 'PRECIO', bold: true, color: 'FFFFFF', fill: DARK, align: AlignmentType.RIGHT, width: 1800 }),
    ],
  }),
  new TableRow({
    children: [
      cell({ text: 'Mini', bold: true, color: GOLD, fill: LIGHT_BG, width: 2200 }),
      cell({ text: 'Hasta 5 activos', align: AlignmentType.CENTER, width: 2000 }),
      cell({ text: 'Subdominio personalizado, soporte por correo', width: 3360 }),
      cell({ text: '$80.000 / mes', bold: true, align: AlignmentType.RIGHT, width: 1800 }),
    ],
  }),
  new TableRow({
    children: [
      cell({ text: 'Pro', bold: true, color: GOLD, fill: LIGHT_BG, width: 2200 }),
      cell({ text: 'Hasta 25 activos', align: AlignmentType.CENTER, width: 2000 }),
      cell({ text: 'Dominio propio, branding completo, soporte prioritario', width: 3360 }),
      cell({ text: '$200.000 / mes', bold: true, align: AlignmentType.RIGHT, width: 1800 }),
    ],
  }),
  new TableRow({
    children: [
      cell({ text: 'Agency', bold: true, color: GOLD, fill: LIGHT_BG, width: 2200 }),
      cell({ text: 'Ilimitados', align: AlignmentType.CENTER, width: 2000 }),
      cell({ text: 'Multi-usuario, integración con CRM, SLA 99.5%, soporte 24h', width: 3360 }),
      cell({ text: '$500.000 / mes', bold: true, align: AlignmentType.RIGHT, width: 1800 }),
    ],
  }),
];

// ============= FEATURES TABLE =============
const featuresRows = [
  new TableRow({
    tableHeader: true,
    children: [
      cell({ text: 'FUNCIONALIDAD', bold: true, color: 'FFFFFF', fill: DARK, width: 4680 }),
      cell({ text: 'DESCRIPCIÓN', bold: true, color: 'FFFFFF', fill: DARK, width: 4680 }),
    ],
  }),
  ['Panel administrador con login seguro', 'Autenticación Supabase, sesiones con cookies HttpOnly.'],
  ['CRUD completo de proyectos', 'Crear, editar, activar/desactivar, eliminar tours.'],
  ['Subida directa de escenas a la nube', 'Hasta 50 MB por archivo, sin pasar por servidor. Compresión automática a 4K.'],
  ['Visor 360° Pannellum', 'Tours inmersivos en cualquier dispositivo, drag&drop reorder.'],
  ['Hotspots de navegación e información', 'Navegación entre escenas + popups informativos con texto.'],
  ['Audio narración por escena', 'Reproductor automático opcional. Soporta MP3, M4A, OGG.'],
  ['Plano 2D interactivo con pines', 'Mini-mapa flotante con ubicación de cada escena.'],
  ['Branding por proyecto', 'Logo, color, mensaje de WhatsApp personalizables.'],
  ['Acceso público o protegido con contraseña', 'Hash bcrypt, cookies con expiración configurable.'],
  ['Estadísticas por escena', 'Vistas, duración promedio, escena más popular.'],
  ['Embebido en sitios externos (iframe)', 'Código copiable, oculta UI extra para integración limpia.'],
  ['Open Graph para WhatsApp y redes', 'Portada del tour aparece al compartir el link.'],
  ['Optimización de imágenes Vercel', 'Miniaturas instantáneas, lazy load, multi-formato.'],
].map((row, i) =>
  i === 0
    ? row
    : new TableRow({
        children: [
          cell({ text: row[0], bold: true, width: 4680 }),
          cell({ text: row[1], width: 4680 }),
        ],
      })
);

const doc = new Document({
  creator: 'FOCO Vídeo y Fotografía',
  title: 'Cotización Plataforma FOCO 360°',
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '•',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 540, hanging: 270 } } },
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              tabStops: [
                { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
              ],
              children: [
                new TextRun({
                  text: 'FOCO',
                  bold: true,
                  color: DARK,
                  size: 24,
                  font: 'Arial',
                }),
                new TextRun({
                  text: ' VÍDEO Y FOTOGRAFÍA',
                  color: GRAY,
                  size: 18,
                  font: 'Arial',
                }),
                new TextRun({
                  text: `\tCotización · ${today}`,
                  color: GRAY,
                  size: 18,
                  font: 'Arial',
                }),
              ],
              border: {
                bottom: {
                  style: BorderStyle.SINGLE,
                  size: 8,
                  color: GOLD,
                  space: 8,
                },
              },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: 'focoestudio1@gmail.com  ·  WhatsApp +57 312 590 2632  ·  Página ',
                  color: GRAY,
                  size: 16,
                  font: 'Arial',
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  color: GRAY,
                  size: 16,
                  font: 'Arial',
                }),
              ],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({
          spacing: { before: 200, after: 80 },
          children: [
            new TextRun({
              text: 'COTIZACIÓN',
              color: GRAY,
              size: 18,
              font: 'Arial',
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: 'Plataforma FOCO 360°',
              bold: true,
              color: DARK,
              size: 44,
              font: 'Arial',
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 360 },
          children: [
            new TextRun({
              text: 'Software completo de tours virtuales — licencia, alquiler o SaaS',
              color: GRAY,
              size: 22,
              italics: true,
              font: 'Arial',
            }),
          ],
        }),

        // Intro
        h2('¿Qué estás adquiriendo?'),
        p(
          'FOCO 360° es una plataforma web profesional para crear, gestionar y publicar tours virtuales 360° de propiedades inmobiliarias, hoteles y comercios. Incluye panel administrador, visor inmersivo, sistema de hotspots interactivos, plano 2D, estadísticas, contraseñas por proyecto y mucho más.'
        ),
        p(
          'Construida con tecnologías modernas (Next.js 14, Supabase, Cloudflare R2, Vercel), está pensada para escalar a cientos de proyectos sin renta de servidores costosos.'
        ),

        // Opciones
        h2('Modalidades disponibles'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1800, 2800, 3160, 1600],
          rows: optionsRows,
        }),

        // SaaS detalle
        h2('Planes SaaS detallados (Opción C)'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2200, 2000, 3360, 1800],
          rows: saasRows,
        }),

        // Funcionalidades
        h2('Funcionalidades incluidas'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: featuresRows,
        }),

        // Que incluye según opción
        h2('Qué incluye cada modalidad'),

        new Paragraph({
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({
              text: 'Opción A — Licencia única',
              bold: true,
              color: DARK,
              size: 24,
              font: 'Arial',
            }),
          ],
        }),
        bullet('Código fuente completo entregado en repositorio GitHub privado.'),
        bullet('Documentación técnica completa (README + arquitectura).'),
        bullet('30 días de soporte para deploy y configuración inicial.'),
        bullet('Capacitación 2 horas vía videollamada.'),
        bullet('El cliente paga su propia infraestructura (Supabase + R2 + Vercel, ~$0-200.000/mes según volumen).'),
        bullet('Posibilidad de modificar el código libremente.'),

        new Paragraph({
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({
              text: 'Opción B — Licencia anual',
              bold: true,
              color: DARK,
              size: 24,
              font: 'Arial',
            }),
          ],
        }),
        bullet('Todo lo de la Opción A.'),
        bullet('Actualizaciones automáticas con nuevas features durante el año.'),
        bullet('Soporte técnico ilimitado por correo y WhatsApp en horario laboral.'),
        bullet('Hasta 4 horas de personalización/mes incluidas (logos, colores, ajustes menores).'),
        bullet('Migración a nuevas versiones sin costo adicional.'),

        new Paragraph({
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({
              text: 'Opción C — SaaS hospedado',
              bold: true,
              color: DARK,
              size: 24,
              font: 'Arial',
            }),
          ],
        }),
        bullet('Nosotros hospedamos toda la infraestructura (Vercel + Supabase + R2).'),
        bullet('Subdominio incluido (plan Mini) o dominio propio (plan Pro y Agency).'),
        bullet('Branding 100% personalizado: logo, colores, dominio.'),
        bullet('Backups automáticos diarios.'),
        bullet('Actualizaciones sin downtime.'),
        bullet('Soporte por correo (Mini), prioritario (Pro), 24h (Agency).'),

        // Proceso entrega
        h2('Proceso de entrega'),
        bullet('Reunión inicial: revisión de necesidades y demo en vivo.'),
        bullet('Firma de contrato y anticipo (50% para A y B, 1er mes para C).'),
        bullet('Setup inicial: deploy en infraestructura del cliente o nuestra.'),
        bullet('Capacitación + entrega de accesos.'),
        bullet('Soporte post-entrega según modalidad.'),

        // Términos
        h2('Términos comerciales'),
        bullet('Vigencia de la cotización: 30 días.'),
        bullet('Anticipo del 50% para Opciones A y B; pago al iniciar primer mes para Opción C.'),
        bullet('Saldo de la Opción A: contra entrega del repositorio y capacitación.'),
        bullet('Métodos de pago: transferencia bancaria, Nequi, Bancolombia. Para extranjero: USDT, PayPal (con comisión).'),
        bullet('No incluye: dominio personalizado (Opción A y B), costos de servicios de terceros (Vercel Pro, Supabase Pro si los necesita).'),
        bullet('Garantía: 60 días post-entrega para corrección de bugs originales del software.'),
        bullet('Propiedad intelectual: en Opción A el cliente recibe licencia perpetua de uso pero no derechos de reventa salvo acuerdo aparte.'),

        // Por qué FOCO
        h2('¿Por qué elegir FOCO 360°?'),
        bullet('Producto probado: la plataforma ya está en producción y funcionando.'),
        bullet('Stack moderno y escalable: Next.js 14, Supabase, Cloudflare R2 (sin egress fees).'),
        bullet('Costos de operación bajos: la propia FOCO opera la plataforma con costos mínimos.'),
        bullet('Soporte en español: comunicación directa con quien construyó el sistema.'),
        bullet('Mejoras continuas: el producto evoluciona — clientes Opción B reciben nuevas features.'),

        // Contacto
        h2('Contacto'),
        p('FOCO Vídeo y Fotografía', { bold: true }),
        p('focoestudio1@gmail.com'),
        p('WhatsApp: +57 312 590 2632'),
        p('Caquetá, Colombia'),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('Cotizacion-Plataforma-FOCO360.docx', buf);
  console.log('✓ Cotizacion-Plataforma-FOCO360.docx creado');
});
