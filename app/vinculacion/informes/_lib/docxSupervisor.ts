import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  ImageRun,
  HeadingLevel,
} from 'docx';

interface DatosSupervisor {
  periodo: { desde: string; hasta: string; etiqueta: string };
  general: {
    proyecto_nombre: string;
    unidad_academica: string;
    carrera: string;
    codigo_documento: string;
    revision_documento: string;
    supervisor_nombre: string;
    supervisor_email: string;
    mes: string;
    total_pasantes: number;
    total_beneficiarios: number;
    total_sesiones: number;
    zona: string;
    espacios: string[];
  };
  tareas: {
    actividad_descripcion: string;
    espacio_nombre: string;
    sesiones_aprobadas: number;
    beneficiarios_atendidos: number;
    horas_acreditadas: number;
    pasantes_count: number;
    comentarios: string[];
  }[];
  no_previstas: {
    espacio_nombre: string;
    fecha: string;
    beneficiarios_atendidos: number;
    horas_acreditadas: number;
    observaciones: string;
  }[];
  participacion: {
    pasantes: { id: number; nombre: string; horas_mes: number; horas_acumuladas: number }[];
    genero: Record<string, number>;
    edad: Record<string, number>;
  };
  obstaculos: { descripcion: string; impacto: string; recomendacion: string }[];
  fotos: { url: string; fecha: string; espacio_nombre: string; num_beneficiarios: number; num_pasantes: number }[];
}

const BLUE = '003366';
const LIGHT_BG = 'F0F4F8';
const BORDER_GRAY = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const CELL_BORDER = { top: BORDER_GRAY, bottom: BORDER_GRAY, left: BORDER_GRAY, right: BORDER_GRAY };

async function descargarImagen(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

export async function generarDocxSupervisor(datos: DatosSupervisor, graficos: {
  pasantes?: Buffer | null;
  espacios?: Buffer | null;
  genero?: Buffer | null;
  edad?: Buffer | null;
}): Promise<Buffer> {
  const g = datos.general;

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            borders: CELL_BORDER,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'UNIVERSIDAD LAICA ELOY ALFARO DE MANABÍ', bold: true, size: 20, color: BLUE }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'INFORME DE SEGUIMIENTO DE TAREAS (SUPERVISOR)', bold: true, size: 18 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `PROCEDIMIENTO: VINCULACIÓN CON LA SOCIEDAD | PERÍODO: ${g.mes}`, size: 16, color: '555555' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: CELL_BORDER,
            shading: { fill: LIGHT_BG },
            children: [
              new Paragraph({ children: [new TextRun({ text: `Código: ${g.codigo_documento || 'PINE-INF-SUP'}`, size: 16, bold: true })] }),
              new Paragraph({ children: [new TextRun({ text: `Revisión: ${g.revision_documento || '01'}`, size: 16 })] }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Página ', size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
                  new TextRun({ text: ' de ', size: 16 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const children: any[] = [];

  children.push(
    new Paragraph({
      text: '1. INFORMACIÓN GENERAL',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  const tablaGeneral = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, shading: { fill: LIGHT_BG }, children: [new Paragraph({ children: [new TextRun({ text: 'Proyecto:', bold: true })] })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, children: [new Paragraph({ text: g.proyecto_nombre })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, shading: { fill: LIGHT_BG }, children: [new Paragraph({ children: [new TextRun({ text: 'Unidad Académica / Carrera:', bold: true })] })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, children: [new Paragraph({ text: `${g.unidad_academica} - ${g.carrera}` })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, shading: { fill: LIGHT_BG }, children: [new Paragraph({ children: [new TextRun({ text: 'Supervisor Responsable:', bold: true })] })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, children: [new Paragraph({ text: `${g.supervisor_nombre} (${g.supervisor_email})` })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, shading: { fill: LIGHT_BG }, children: [new Paragraph({ children: [new TextRun({ text: 'Mes de Informe:', bold: true })] })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, children: [new Paragraph({ text: g.mes })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, shading: { fill: LIGHT_BG }, children: [new Paragraph({ children: [new TextRun({ text: 'Pasantes Supervisados:', bold: true })] })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, children: [new Paragraph({ text: `${g.total_pasantes} estudiantes` })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, shading: { fill: LIGHT_BG }, children: [new Paragraph({ children: [new TextRun({ text: 'Beneficiarios Atendidos:', bold: true })] })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, children: [new Paragraph({ text: `${g.total_beneficiarios} personas en ${g.espacios.length} espacios` })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, shading: { fill: LIGHT_BG }, children: [new Paragraph({ children: [new TextRun({ text: 'Zona / Cobertura:', bold: true })] })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, children: [new Paragraph({ text: `${g.zona} (${g.espacios.join(', ') || 'Sin espacios'})` })] }),
        ],
      }),
    ],
  });
  children.push(tablaGeneral);

  children.push(
    new Paragraph({
      text: '2. TAREAS REALIZADAS EN EL PERÍODO (PLANIFICADAS)',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    })
  );

  const rowsTareas = [
    new TableRow({
      children: [
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'N.º', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Actividad / Espacio', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Sesiones', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Beneficiarios', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Horas Acred.', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Observaciones', bold: true, color: 'FFFFFF' })] })] }),
      ],
    }),
  ];

  if (datos.tareas.length === 0) {
    rowsTareas.push(
      new TableRow({
        children: [
          new TableCell({
            borders: CELL_BORDER,
            columnSpan: 6,
            children: [new Paragraph({ text: 'No se registran sesiones aprobadas en este período.', alignment: AlignmentType.CENTER })],
          }),
        ],
      })
    );
  } else {
    datos.tareas.forEach((t, idx) => {
      rowsTareas.push(
        new TableRow({
          children: [
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: String(idx + 1) })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: `${t.actividad_descripcion}\n(${t.espacio_nombre})` })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: String(t.sesiones_aprobadas) })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: String(t.beneficiarios_atendidos) })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: `${t.horas_acreditadas} h` })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: t.comentarios.join('; ') || 'Sin observaciones' })] }),
          ],
        })
      );
    });
  }

  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsTareas }));

  if (datos.no_previstas.length > 0) {
    children.push(
      new Paragraph({
        text: '3. ACTIVIDADES NO PREVISTAS',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
      })
    );
    const rowsNoPrev = [
      new TableRow({
        children: [
          new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Espacio', bold: true, color: 'FFFFFF' })] })] }),
          new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Fecha', bold: true, color: 'FFFFFF' })] })] }),
          new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Beneficiarios', bold: true, color: 'FFFFFF' })] })] }),
          new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Horas', bold: true, color: 'FFFFFF' })] })] }),
          new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Observación', bold: true, color: 'FFFFFF' })] })] }),
        ],
      }),
    ];
    datos.no_previstas.forEach((np) => {
      rowsNoPrev.push(
        new TableRow({
          children: [
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: np.espacio_nombre })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: np.fecha })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: String(np.beneficiarios_atendidos) })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: `${np.horas_acreditadas} h` })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: np.observaciones || '-' })] }),
          ],
        })
      );
    });
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsNoPrev }));
  }

  children.push(
    new Paragraph({
      text: '4. PARTICIPACIÓN DE PASANTES Y BENEFICIARIOS',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    })
  );

  const rowsPasantes = [
    new TableRow({
      children: [
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Pasante', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Horas Mes', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Horas Acumuladas', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: '% Cumplimiento (96h)', bold: true, color: 'FFFFFF' })] })] }),
      ],
    }),
  ];

  datos.participacion.pasantes.forEach((p) => {
    const porcentaje = Math.min(100, Math.round((p.horas_acumuladas / 96) * 100));
    rowsPasantes.push(
      new TableRow({
        children: [
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: p.nombre })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: `${p.horas_mes} h` })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: `${p.horas_acumuladas} h` })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: `${porcentaje}%` })] }),
        ],
      })
    );
  });

  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsPasantes }));

  if (graficos.pasantes) {
    children.push(new Paragraph({ spacing: { before: 150 } }));
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: graficos.pasantes,
            transformation: { width: 500, height: 250 },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
  }

  if (graficos.espacios) {
    children.push(new Paragraph({ spacing: { before: 150 } }));
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: graficos.espacios,
            transformation: { width: 500, height: 250 },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
  }

  if (graficos.genero || graficos.edad) {
    const imgRuns: ImageRun[] = [];
    if (graficos.genero) {
      imgRuns.push(new ImageRun({ data: graficos.genero, transformation: { width: 250, height: 180 }, type: 'png' }));
    }
    if (graficos.edad) {
      imgRuns.push(new ImageRun({ data: graficos.edad, transformation: { width: 250, height: 180 }, type: 'png' }));
    }
    children.push(new Paragraph({ children: imgRuns, alignment: AlignmentType.CENTER, spacing: { before: 150 } }));
  }

  children.push(
    new Paragraph({
      text: '5. OBSTÁCULOS Y DIFICULTADES ENCONTRADAS',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    })
  );

  const rowsObs = [
    new TableRow({
      children: [
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Descripción del Obstáculo', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Nivel de Impacto', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Medida Correctiva / Recomendación', bold: true, color: 'FFFFFF' })] })] }),
      ],
    }),
  ];

  if (datos.obstaculos.length === 0) {
    rowsObs.push(
      new TableRow({
        children: [
          new TableCell({
            borders: CELL_BORDER,
            columnSpan: 3,
            children: [new Paragraph({ text: 'No se reportaron obstáculos relevantes durante este período.', alignment: AlignmentType.CENTER })],
          }),
        ],
      })
    );
  } else {
    datos.obstaculos.forEach((o) => {
      rowsObs.push(
        new TableRow({
          children: [
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: o.descripcion })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: o.impacto })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: o.recomendacion })] }),
          ],
        })
      );
    });
  }
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsObs }));

  children.push(
    new Paragraph({
      text: '6. EVIDENCIAS FOTOGRÁFICAS DE SESIONES APROBADAS',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    })
  );

  if (datos.fotos.length === 0) {
    children.push(new Paragraph({ text: 'No se adjuntaron fotografías seleccionadas en este período.' }));
  } else {
    const fotosLimites = datos.fotos.slice(0, 12);
    for (const f of fotosLimites) {
      const imgBuffer = await descargarImagen(f.url);
      if (imgBuffer) {
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imgBuffer,
                transformation: { width: 350, height: 220 },
                type: 'jpg',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 50 },
          })
        );
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Evidencia: ${f.espacio_nombre} - ${f.fecha} (${f.num_beneficiarios} beneficiarios, ${f.num_pasantes} pasantes)`,
                italics: true,
                size: 16,
                color: '555555',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 150 },
          })
        );
      }
    }
  }

  children.push(
    new Paragraph({
      text: '7. FIRMA DE RESPONSABILIDAD',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    })
  );

  const tablaFirma = new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: CELL_BORDER,
            children: [
              new Paragraph({ text: '\n\n________________________________________', alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: g.supervisor_nombre, bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ text: 'Supervisor de Vinculación', alignment: AlignmentType.CENTER }),
              new Paragraph({ text: `ULEAM - ${g.carrera}`, alignment: AlignmentType.CENTER }),
            ],
          }),
        ],
      }),
    ],
  });
  children.push(tablaFirma);

  const doc = new Document({
    sections: [
      {
        headers: { default: new Header({ children: [headerTable] }) },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'ULEAM | Sistema PINE - Informe de Seguimiento de Tareas de Vinculación', size: 14, color: '888888' }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
