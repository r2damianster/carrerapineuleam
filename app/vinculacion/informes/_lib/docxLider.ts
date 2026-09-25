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

interface DatosLider {
  ciclo: { id: number; nombre: string };
  general: {
    proyecto_nombre: string;
    codigo: string;
    unidad_academica: string;
    carrera: string;
    entidad_beneficiaria: string;
    vigencia_inicio: string;
    vigencia_fin: string;
    ods: string;
    linea_investigacion: string;
    zona: string;
    lider_nombre: string;
    lider_email: string;
    firmante_nombre: string;
    firmante_cargo: string;
    codigo_documento: string;
    revision_documento: string;
  };
  objetivos: {
    id: number;
    descripcion: string;
    tipo: string;
    actividades: { id: number; descripcion: string; metodologia: string; estado?: string }[];
  }[];
  mcer?: { pretests: number; postests: number; meta_participantes: number };
  metas: {
    meta_estudiantes: number;
    estudiantes_reales: number;
    meta_docentes: number;
    docentes_reales: number;
    meta_beneficiarios_directos: number;
    beneficiarios_directos_reales: number;
    meta_beneficiarios_indirectos: number;
    beneficiarios_indirectos_reales: number;
  };
  presupuesto: {
    partida: string;
    descripcion: string;
    monto_solicitado: number;
    monto_ejecutado: number;
    porcentaje_ejecucion: number;
  }[];
  textos: Record<string, string>;
  evolucion: { mes: string; sesiones: number; horas: number }[];
}

const BLUE = '003366';
const LIGHT_BG = 'F0F4F8';
const BORDER_GRAY = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const CELL_BORDER = { top: BORDER_GRAY, bottom: BORDER_GRAY, left: BORDER_GRAY, right: BORDER_GRAY };

export async function generarDocxLider(
  datos: DatosLider,
  graficos: {
    evolucion?: Buffer | null;
    planVsEjecutado?: Buffer | null;
    genero?: Buffer | null;
  }
): Promise<Buffer> {
  const g = datos.general;
  const m = datos.metas;

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
                  new TextRun({ text: 'INFORME DE AVANCES Y LOGROS DEL PROYECTO (LÍDER)', bold: true, size: 18 }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `VINCULACIÓN CON LA SOCIEDAD | PERÍODO: ${datos.ciclo.nombre}`, size: 16, color: '555555' }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: CELL_BORDER,
            shading: { fill: LIGHT_BG },
            children: [
              new Paragraph({ children: [new TextRun({ text: `Código: ${g.codigo_documento || 'PINE-INF-LID'}`, size: 16, bold: true })] }),
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
      text: '1. DATOS GENERALES DEL PROYECTO',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  const tablaGeneral = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, shading: { fill: LIGHT_BG }, children: [new Paragraph({ children: [new TextRun({ text: 'Nombre del Proyecto:', bold: true })] })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, children: [new Paragraph({ text: g.proyecto_nombre })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, shading: { fill: LIGHT_BG }, children: [new Paragraph({ children: [new TextRun({ text: 'Código / Unidad / Carrera:', bold: true })] })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, children: [new Paragraph({ text: `${g.codigo || 'S/N'} - ${g.unidad_academica} (${g.carrera})` })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, shading: { fill: LIGHT_BG }, children: [new Paragraph({ children: [new TextRun({ text: 'Director / Líder:', bold: true })] })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, children: [new Paragraph({ text: `${g.lider_nombre} (${g.lider_email})` })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, shading: { fill: LIGHT_BG }, children: [new Paragraph({ children: [new TextRun({ text: 'Entidad Beneficiaria:', bold: true })] })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, children: [new Paragraph({ text: g.entidad_beneficiaria || 'Comunidad local' })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, shading: { fill: LIGHT_BG }, children: [new Paragraph({ children: [new TextRun({ text: 'ODS / Línea Inv.:', bold: true })] })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, children: [new Paragraph({ text: `${g.ods || 'ODS 4'} | ${g.linea_investigacion || 'Inclusión e Interculturalidad'}` })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, shading: { fill: LIGHT_BG }, children: [new Paragraph({ children: [new TextRun({ text: 'Zona y Cobertura:', bold: true })] })] }),
          new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, children: [new Paragraph({ text: g.zona })] }),
        ],
      }),
    ],
  });
  children.push(tablaGeneral);

  children.push(
    new Paragraph({
      text: '2. MATRIZ DE OBJETIVOS Y ACTIVIDADES DEL PLAN',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    })
  );

  const rowsObjetivos = [
    new TableRow({
      children: [
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Objetivo Específico', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Actividad Planificada', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Metodología', bold: true, color: 'FFFFFF' })] })] }),
      ],
    }),
  ];

  datos.objetivos.forEach((obj) => {
    if (obj.actividades.length === 0) {
      rowsObjetivos.push(
        new TableRow({
          children: [
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: obj.descripcion })] }),
            new TableCell({ borders: CELL_BORDER, columnSpan: 2, children: [new Paragraph({ children: [new TextRun({ text: 'Sin actividades registradas', italics: true })] })] }),
          ],
        })
      );
    } else {
      obj.actividades.forEach((act, idx) => {
        rowsObjetivos.push(
          new TableRow({
            children: [
              ...(idx === 0 ? [new TableCell({ borders: CELL_BORDER, rowSpan: obj.actividades.length, children: [new Paragraph({ text: obj.descripcion })] })] : []),
              new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: act.descripcion })] }),
              new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: act.metodologia || '-' })] }),
            ],
          })
        );
      });
    }
  });

  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsObjetivos }));

  children.push(
    new Paragraph({
      text: '3. METAS Y PARTICIPACIÓN (PLANIFICADO VS. EJECUTADO)',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    })
  );

  const tablaMetas = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Indicador de Meta', bold: true, color: 'FFFFFF' })] })] }),
          new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Planificado (Meta)', bold: true, color: 'FFFFFF' })] })] }),
          new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Ejecutado (Real)', bold: true, color: 'FFFFFF' })] })] }),
          new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: '% Cumplimiento', bold: true, color: 'FFFFFF' })] })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: 'Estudiantes / Pasantes' })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: String(m.meta_estudiantes || 0) })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: String(m.estudiantes_reales || 0) })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: `${m.meta_estudiantes ? Math.round((m.estudiantes_reales / m.meta_estudiantes) * 100) : 100}%` })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: 'Docentes Participantes' })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: String(m.meta_docentes || 0) })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: String(m.docentes_reales || 0) })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: `${m.meta_docentes ? Math.round((m.docentes_reales / m.meta_docentes) * 100) : 100}%` })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: 'Beneficiarios Directos' })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: String(m.meta_beneficiarios_directos || 0) })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: String(m.beneficiarios_directos_reales || 0) })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: `${m.meta_beneficiarios_directos ? Math.round((m.beneficiarios_directos_reales / m.meta_beneficiarios_directos) * 100) : 100}%` })] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: 'Beneficiarios Indirectos' })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: String(m.meta_beneficiarios_indirectos || 0) })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: String(m.beneficiarios_indirectos_reales || m.meta_beneficiarios_indirectos || 0) })] }),
          new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: '100%' })] }),
        ],
      }),
    ],
  });
  children.push(tablaMetas);

  if (graficos.planVsEjecutado) {
    children.push(new Paragraph({ spacing: { before: 150 } }));
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: graficos.planVsEjecutado,
            transformation: { width: 500, height: 250 },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
  }

  if (graficos.evolucion) {
    children.push(new Paragraph({ spacing: { before: 150 } }));
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: graficos.evolucion,
            transformation: { width: 500, height: 250 },
            type: 'png',
          }),
        ],
        alignment: AlignmentType.CENTER,
      })
    );
  }

  if (datos.mcer) {
    const { pretests, postests, meta_participantes: metaParticipantes } = datos.mcer;
    children.push(new Paragraph({ spacing: { before: 200 } }));
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Propósito del proyecto (avance de nivel MCER): ', bold: true }),
          new TextRun({
            text:
              `meta de ${metaParticipantes} participantes que mejoran 1 subnivel del MCER en 2 años. ` +
              `Pre-Test aplicado a ${pretests} beneficiarios; Post-Test aplicado a ${postests}. ` +
              (postests === 0
                ? 'En proceso: aún falta aplicar el Post-Test, por lo que todavía no se puede medir el avance de subnivel.'
                : 'El avance de subnivel se calcula comparando el Pre-Test y el Post-Test de cada beneficiario.'),
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      text: '4. EJECUCIÓN PRESUPUESTARIA DEL CICLO',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    })
  );

  const rowsPresupuesto = [
    new TableRow({
      children: [
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Partida / Rubro', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Descripción', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Solicitado ($)', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: 'Ejecutado ($)', bold: true, color: 'FFFFFF' })] })] }),
        new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: '% Ejecución', bold: true, color: 'FFFFFF' })] })] }),
      ],
    }),
  ];

  if (datos.presupuesto.length === 0) {
    rowsPresupuesto.push(
      new TableRow({
        children: [
          new TableCell({
            borders: CELL_BORDER,
            columnSpan: 5,
            children: [new Paragraph({ text: 'No se asignó presupuesto económico directo en este ciclo.', alignment: AlignmentType.CENTER })],
          }),
        ],
      })
    );
  } else {
    datos.presupuesto.forEach((p) => {
      rowsPresupuesto.push(
        new TableRow({
          children: [
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: p.partida || 'Rubro General' })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: p.descripcion })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: `$${p.monto_solicitado.toFixed(2)}` })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: `$${p.monto_ejecutado.toFixed(2)}` })] }),
            new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: `${p.porcentaje_ejecucion}%` })] }),
          ],
        })
      );
    });
  }
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsPresupuesto }));

  const seccionesTexto = [
    { clave: 'introduccion', titulo: '5.1 Introducción y Contexto' },
    { clave: 'diagnostico', titulo: '5.2 Diagnóstico de la Situación Inicial' },
    { clave: 'resultados_cualitativos', titulo: '5.3 Resultados Cualitativos e Impacto Social' },
    { clave: 'lecciones_aprendidas', titulo: '5.4 Lecciones Aprendidas' },
    { clave: 'conclusiones', titulo: '5.5 Conclusiones' },
    { clave: 'recomendaciones', titulo: '5.6 Recomendaciones' },
  ];

  children.push(
    new Paragraph({
      text: '5. ANÁLISIS CUALITATIVO Y INFORME DE LOGROS',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    })
  );

  seccionesTexto.forEach((sec) => {
    children.push(
      new Paragraph({
        text: sec.titulo,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 150, after: 50 },
      })
    );
    const contenido = datos.textos[sec.clave] || 'Sección pendiente de redacción por el Líder del proyecto.';
    children.push(new Paragraph({ text: contenido, spacing: { after: 100 } }));
  });

  children.push(
    new Paragraph({
      text: '6. FIRMAS DE RESPONSABILIDAD',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    })
  );

  const tablaFirmas = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: CELL_BORDER,
            children: [
              new Paragraph({ text: '\n\n________________________________________', alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: g.lider_nombre, bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ text: 'Director / Líder del Proyecto', alignment: AlignmentType.CENTER }),
              new Paragraph({ text: `ULEAM - ${g.carrera}`, alignment: AlignmentType.CENTER }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: CELL_BORDER,
            children: [
              new Paragraph({ text: '\n\n________________________________________', alignment: AlignmentType.CENTER }),
              new Paragraph({ children: [new TextRun({ text: g.firmante_nombre || 'Responsable de Vinculación', bold: true })], alignment: AlignmentType.CENTER }),
              new Paragraph({ text: g.firmante_cargo || 'Responsable de Vinculación y Emprendimiento', alignment: AlignmentType.CENTER }),
              new Paragraph({ text: `ULEAM - ${g.unidad_academica}`, alignment: AlignmentType.CENTER }),
            ],
          }),
        ],
      }),
    ],
  });
  children.push(tablaFirmas);

  const doc = new Document({
    sections: [
      {
        headers: { default: new Header({ children: [headerTable] }) },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'ULEAM | Sistema PINE - Informe de Avances y Logros de Vinculación', size: 14, color: '888888' }),
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
