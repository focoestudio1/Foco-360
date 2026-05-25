// Genera Cotizacion-Servicios-Tours.docx
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
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
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

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 200 },
    children: [
      new TextRun({ text, bold: true, color: DARK, size: 32, font: 'Arial' }),
    ],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 160 },
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

// ============= PLANES TABLE =============
const planRows = [
  // Header
  new TableRow({
    tableHeader: true,
    children: [
      cell({ text: 'PLAN', bold: true, color: 'FFFFFF', fill: DARK, width: 1800 }),
      cell({ text: 'IDEAL PARA', bold: true, color: 'FFFFFF', fill: DARK, width: 2800 }),
      cell({ text: 'INCLUYE', bold: true, color: 'FFFFFF', fill: DARK, width: 3160 }),
      cell({ text: 'INVERSIÓN', bold: true, color: 'FFFFFF', fill: DARK, align: AlignmentType.RIGHT, width: 1600 }),
    ],
  }),
  new TableRow({
    children: [
      cell({ text: 'BÁSICO', bold: true, color: GOLD, fill: LIGHT_BG, width: 1800 }),
      cell({ text: 'Apartamentos, locales pequeños, consultorios', width: 2800 }),
      cell({
        text: '5 escenas 360° · Hotspots de navegación · Link público o privado · Logo FOCO',
        width: 3160,
      }),
      cell({
        text: '$400.000 – $600.000',
        bold: true,
        align: AlignmentType.RIGHT,
        width: 1600,
      }),
    ],
  }),
  new TableRow({
    children: [
      cell({ text: 'ESTÁNDAR', bold: true, color: GOLD, fill: LIGHT_BG, width: 1800 }),
      cell({ text: 'Casas medianas, oficinas, restaurantes', width: 2800 }),
      cell({
        text: '10 escenas · Hotspots + Info · Portada custom · Logo cliente · Color de marca · Descripción por escena',
        width: 3160,
      }),
      cell({
        text: '$800.000 – $1.200.000',
        bold: true,
        align: AlignmentType.RIGHT,
        width: 1600,
      }),
    ],
  }),
  new TableRow({
    children: [
      cell({ text: 'PREMIUM', bold: true, color: GOLD, fill: LIGHT_BG, width: 1800 }),
      cell({ text: 'Casas grandes, hoteles, fincas, locales comerciales', width: 2800 }),
      cell({
        text: '20 escenas · Todo lo anterior + Plano 2D interactivo · Audio narración · Botón WhatsApp · Código embebido · Soporte 30 días',
        width: 3160,
      }),
      cell({
        text: '$1.500.000 – $2.500.000',
        bold: true,
        align: AlignmentType.RIGHT,
        width: 1600,
      }),
    ],
  }),
  new TableRow({
    children: [
      cell({ text: 'EMPRESARIAL', bold: true, color: GOLD, fill: LIGHT_BG, width: 1800 }),
      cell({ text: 'Hoteles, edificios, centros comerciales', width: 2800 }),
      cell({
        text: 'Escenas ilimitadas · Múltiples pisos · Stats avanzadas · Hosting 1 año · Branding 100% custom',
        width: 3160,
      }),
      cell({
        text: '$3.000.000 – $6.000.000+',
        bold: true,
        align: AlignmentType.RIGHT,
        width: 1600,
      }),
    ],
  }),
];

// ============= ADD-ONS TABLE =============
const addonRows = [
  new TableRow({
    tableHeader: true,
    children: [
      cell({ text: 'ADICIONAL', bold: true, color: 'FFFFFF', fill: DARK, width: 6680 }),
      cell({ text: 'PRECIO', bold: true, color: 'FFFFFF', fill: DARK, align: AlignmentType.RIGHT, width: 2680 }),
    ],
  }),
  ['Audio narración profesional por escena', '$50.000 – $100.000'],
  ['Escena 360° adicional fuera del plan', '$80.000 – $120.000'],
  ['Hotspot informativo extra (texto + foto)', '$20.000'],
  ['Cambios o ajustes después de entrega', '$80.000 / hora'],
  ['Hosting y mantenimiento anual', '$200.000 – $400.000'],
  ['Soporte prioritario mensual', '$150.000 / mes'],
].map((row, i) =>
  i === 0
    ? row
    : new TableRow({
        children: [
          cell({ text: row[0], width: 6680 }),
          cell({ text: row[1], bold: true, align: AlignmentType.RIGHT, width: 2680 }),
        ],
      })
);
addonRows[0] = addonRows[0]; // header already TableRow

// ============= DOC =============
const doc = new Document({
  creator: 'FOCO Vídeo y Fotografía',
  title: 'Cotización Tours Virtuales 360°',
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
        // Title
        new Paragraph({
          alignment: AlignmentType.LEFT,
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
              text: 'Tours Virtuales 360°',
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
              text: 'Servicios profesionales para inmobiliarias, hoteles y comercios',
              color: GRAY,
              size: 22,
              italics: true,
              font: 'Arial',
            }),
          ],
        }),

        // Intro
        h2('¿Qué entregamos?'),
        p(
          'Un tour virtual 360° interactivo es la mejor forma de mostrar un inmueble. Tus clientes lo recorren desde el celular o computador, navegando entre habitaciones con un solo click — como si estuvieran ahí. Aumenta el interés, reduce visitas innecesarias y proyecta una imagen profesional.'
        ),
        p(
          'Cada tour queda alojado en un link privado (con contraseña opcional), funciona en cualquier dispositivo y puede embebido en la web del cliente con un código.'
        ),

        // Planes
        h2('Nuestros planes'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1800, 2800, 3160, 1600],
          rows: planRows,
        }),
        new Paragraph({
          spacing: { before: 120, after: 240 },
          children: [
            new TextRun({
              text: 'Todos los planes incluyen captura con cámara 360° profesional, edición, hosting en la nube y entrega de link público.',
              color: GRAY,
              italics: true,
              size: 18,
              font: 'Arial',
            }),
          ],
        }),

        // Add-ons
        h2('Servicios adicionales'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [6680, 2680],
          rows: addonRows,
        }),

        // Que incluye
        h2('Qué incluye cada tour'),
        bullet('Sesión fotográfica con cámara 360° profesional en el inmueble.'),
        bullet('Edición y optimización de cada escena (corrección de color, exposición).'),
        bullet('Configuración de hotspots de navegación entre habitaciones.'),
        bullet('Hosting en infraestructura profesional (Cloudflare R2 + Vercel).'),
        bullet('Link único del tour para compartir por WhatsApp, redes o web.'),
        bullet('Portada personalizada y descripción del proyecto.'),
        bullet('Acceso opcional con contraseña para máxima privacidad.'),
        bullet('Visor responsive: funciona en celular, tablet y computador.'),

        // Proceso
        h2('Cómo trabajamos'),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: 'Reunión inicial: ',
              bold: true,
              color: DARK,
              size: 22,
              font: 'Arial',
            }),
            new TextRun({
              text: 'definimos espacios a capturar, contraseña, branding.',
              color: DARK,
              size: 22,
              font: 'Arial',
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: 'Anticipo del 50%: ',
              bold: true,
              color: DARK,
              size: 22,
              font: 'Arial',
            }),
            new TextRun({
              text: 'para confirmar la fecha de captura.',
              color: DARK,
              size: 22,
              font: 'Arial',
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: 'Captura: ',
              bold: true,
              color: DARK,
              size: 22,
              font: 'Arial',
            }),
            new TextRun({
              text: '1–3 horas en sitio según tamaño del inmueble.',
              color: DARK,
              size: 22,
              font: 'Arial',
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: 'Edición y montaje: ',
              bold: true,
              color: DARK,
              size: 22,
              font: 'Arial',
            }),
            new TextRun({
              text: '3–10 días según plan.',
              color: DARK,
              size: 22,
              font: 'Arial',
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: 'Revisión: ',
              bold: true,
              color: DARK,
              size: 22,
              font: 'Arial',
            }),
            new TextRun({
              text: 'enviamos vista previa para tu aprobación.',
              color: DARK,
              size: 22,
              font: 'Arial',
            }),
          ],
        }),
        new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { after: 240 },
          children: [
            new TextRun({
              text: 'Entrega: ',
              bold: true,
              color: DARK,
              size: 22,
              font: 'Arial',
            }),
            new TextRun({
              text: 'link final + saldo del 50%.',
              color: DARK,
              size: 22,
              font: 'Arial',
            }),
          ],
        }),

        // Condiciones
        h2('Condiciones'),
        bullet('Vigencia de la cotización: 30 días.'),
        bullet('Forma de pago: 50% anticipo, 50% contra entrega.'),
        bullet('Métodos de pago: transferencia, Nequi, Bancolombia.'),
        bullet('Desplazamiento incluido dentro del perímetro urbano de la ciudad. Fuera se cotiza aparte.'),
        bullet('Una ronda de ajustes incluida. Cambios mayores después de entrega se cotizan por hora.'),
        bullet('El cliente conserva derechos sobre las imágenes; FOCO mantiene derecho de uso para portafolio.'),

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
  fs.writeFileSync('Cotizacion-Servicios-Tours.docx', buf);
  console.log('✓ Cotizacion-Servicios-Tours.docx creado');
});
