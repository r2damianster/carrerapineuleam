// Genera el informe MENSUAL de Vinculación (líder o supervisor) — formato simple, adicional
// al informe semestral (que usa plantillaLider.ts/plantillaSupervisor.ts, plantilla institucional
// con marco lógico). Este reconstruye con docx-js las mismas secciones que el formato en Word
// que el proyecto ya usaba a mano ("INFORME MENSUAL DEL LÍDER/SUPERVISOR DEL PROYECTO DE
// VINCULACIÓN"): información general, actividades del mes, beneficiarios y zona por espacio,
// evidencias fotográficas, observaciones y firmas.
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
  ImageRun,
  HeadingLevel,
} from 'docx';
import type { DatosInformeMensual } from '@/lib/informeMensualTareas';

const BLUE = '003366';
const LIGHT_BG = 'F0F4F8';
const BORDER_GRAY = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const CELL_BORDER = { top: BORDER_GRAY, bottom: BORDER_GRAY, left: BORDER_GRAY, right: BORDER_GRAY };

async function descargarImagen(url: string): Promise<Buffer | null> {
  try {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 8000);
    const respuesta = await fetch(url, { signal: controlador.signal });
    clearTimeout(temporizador);
    if (!respuesta.ok) return null;
    return Buffer.from(await respuesta.arrayBuffer());
  } catch {
    return null;
  }
}

function filaEtiquetaValor(etiqueta: string, valor: string) {
  return new TableRow({
    children: [
      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, shading: { fill: LIGHT_BG }, children: [new Paragraph({ children: [new TextRun({ text: etiqueta, bold: true })] })] }),
      new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: CELL_BORDER, children: [new Paragraph({ text: valor || '—' })] }),
    ],
  });
}

function celdaEncabezado(texto: string) {
  return new TableCell({ borders: CELL_BORDER, shading: { fill: BLUE }, children: [new Paragraph({ children: [new TextRun({ text: texto, bold: true, color: 'FFFFFF' })] })] });
}

function celdaTexto(texto: string, centrado = false) {
  return new TableCell({ borders: CELL_BORDER, children: [new Paragraph({ text: texto, alignment: centrado ? AlignmentType.CENTER : undefined })] });
}

export async function generarDocxMensual(datos: DatosInformeMensual, rol: 'lider' | 'supervisor'): Promise<Buffer> {
  const g = datos.general;
  const titulo = rol === 'lider' ? 'INFORME MENSUAL DEL LÍDER DEL PROYECTO DE VINCULACIÓN' : 'INFORME MENSUAL DEL SUPERVISOR DEL PROYECTO DE VINCULACIÓN';

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: CELL_BORDER,
            shading: { fill: LIGHT_BG },
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'FACULTAD DE EDUCACIÓN Y TURISMO', bold: true, size: 20, color: BLUE })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: titulo, bold: true, size: 20 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: datos.etiquetaMes.toUpperCase(), bold: true, size: 18, color: '555555' })] }),
            ],
          }),
        ],
      }),
    ],
  });

  const children: any[] = [];

  children.push(new Paragraph({ text: '1. Información General', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
  const filasGenerales = [
    filaEtiquetaValor('Unidad Académica:', g.unidad_academica),
    filaEtiquetaValor('Carrera:', g.carrera),
    filaEtiquetaValor('Nombre del proyecto:', g.proyecto_nombre),
    filaEtiquetaValor('Nombre del líder del proyecto:', g.lider_nombre),
  ];
  if (rol === 'supervisor') filasGenerales.push(filaEtiquetaValor('Supervisor:', g.supervisor_nombre));
  filasGenerales.push(filaEtiquetaValor('Fecha emisión:', g.fecha_emision));
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filasGenerales }));

  children.push(new Paragraph({ text: '2.1 Desarrollo de Actividades', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }));
  if (datos.actividades.length === 0) {
    children.push(new Paragraph({ text: 'No se registraron actividades este mes.' }));
  } else {
    datos.actividades.forEach(linea => children.push(new Paragraph({ text: `• ${linea}`, spacing: { after: 60 } })));
  }

  children.push(new Paragraph({ text: '2.2 Beneficiarios por Espacio', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }));
  const filasBeneficiarios = [
    new TableRow({ children: [celdaEncabezado('Espacio'), celdaEncabezado('Total'), celdaEncabezado('Mujeres'), celdaEncabezado('Hombres')] }),
  ];
  if (datos.espacios.length === 0) {
    filasBeneficiarios.push(new TableRow({ children: [new TableCell({ borders: CELL_BORDER, columnSpan: 4, children: [new Paragraph({ text: 'No hay espacios asignados.', alignment: AlignmentType.CENTER })] })] }));
  } else {
    datos.espacios.forEach(espacio => filasBeneficiarios.push(new TableRow({
      children: [celdaTexto(espacio.nombre), celdaTexto(String(espacio.total), true), celdaTexto(String(espacio.mujeres), true), celdaTexto(String(espacio.hombres), true)],
    })));
  }
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filasBeneficiarios }));
  children.push(new Paragraph({ text: `Total de beneficiarios: ${g.total_beneficiarios}`, spacing: { before: 100 } }));

  children.push(new Paragraph({ text: '2.3 Zona donde se Realiza la Vinculación', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }));
  const filasZona = [
    new TableRow({ children: [celdaEncabezado('Espacio'), celdaEncabezado('Cantón'), celdaEncabezado('Parroquia'), celdaEncabezado('Barrio/Sector'), celdaEncabezado('Ubicación')] }),
  ];
  if (datos.espacios.length === 0) {
    filasZona.push(new TableRow({ children: [new TableCell({ borders: CELL_BORDER, columnSpan: 5, children: [new Paragraph({ text: 'No hay espacios asignados.', alignment: AlignmentType.CENTER })] })] }));
  } else {
    datos.espacios.forEach(espacio => filasZona.push(new TableRow({
      children: [celdaTexto(espacio.nombre), celdaTexto(espacio.zona.canton || '—'), celdaTexto(espacio.zona.parroquia || '—'), celdaTexto(espacio.zona.barrio || '—'), celdaTexto(espacio.zona.ubicacion || '—')],
    })));
  }
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filasZona }));

  children.push(new Paragraph({ text: 'Evidencias', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }));
  if (datos.evidencias.length === 0) {
    children.push(new Paragraph({ text: 'No hay fotografías de sesiones aprobadas en el mes seleccionado.' }));
  } else {
    for (const foto of datos.evidencias) {
      const imagen = await descargarImagen(foto.url);
      if (!imagen) continue;
      children.push(new Paragraph({
        children: [new ImageRun({ data: imagen, transformation: { width: 350, height: 220 }, type: 'jpg' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 50 },
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: `${foto.espacio_nombre} · ${foto.fecha} · ${foto.num_pasantes} estudiante(s), ${foto.num_beneficiarios} beneficiario(s)`, italics: true, size: 16, color: '555555' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 150 },
      }));
    }
  }

  children.push(new Paragraph({ text: 'Observaciones', heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }));
  children.push(new Paragraph({ text: datos.observaciones || 'Ninguna.' }));

  children.push(new Paragraph({ text: '', spacing: { before: 600 } }));
  const firmas = rol === 'supervisor'
    ? [
        new TableCell({ borders: CELL_BORDER, children: [
          new Paragraph({ text: '____________________________', alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: g.lider_nombre || '', bold: true })], alignment: AlignmentType.CENTER }),
          new Paragraph({ text: 'Líder de Proyecto', alignment: AlignmentType.CENTER }),
        ] }),
        new TableCell({ borders: CELL_BORDER, children: [
          new Paragraph({ text: '____________________________', alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: g.supervisor_nombre || '', bold: true })], alignment: AlignmentType.CENTER }),
          new Paragraph({ text: 'Docente Supervisor', alignment: AlignmentType.CENTER }),
        ] }),
      ]
    : [
        new TableCell({ borders: CELL_BORDER, children: [
          new Paragraph({ text: '____________________________', alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [new TextRun({ text: g.lider_nombre || '', bold: true })], alignment: AlignmentType.CENTER }),
          new Paragraph({ text: 'Líder de Proyecto', alignment: AlignmentType.CENTER }),
        ] }),
      ];
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, alignment: AlignmentType.CENTER, rows: [new TableRow({ children: firmas })] }));

  const doc = new Document({
    sections: [{ children: [headerTable, new Paragraph({ text: '', spacing: { before: 100 } }), ...children] }],
  });

  return Packer.toBuffer(doc);
}
