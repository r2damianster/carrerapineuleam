import {
  Document,
  Paragraph,
  TextRun,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  VerticalAlign,
  PageOrientation,
  VerticalAlignSection,
} from 'docx';
import type { CertificateData } from '@/types';
import { ULEAM_LOGO_PATH, SECONDARY_LOGO_PATHS } from '@/components/CertificateTemplate';

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

const BLUE = '003366';
const GOLD = 'B8860B'; // dorado legible sobre fondo blanco en Word

const ENTITY_LABELS: Record<CertificateData['entity'], string> = {
  carrera: 'Carrera de Pedagogía de los Idiomas Nacionales y Extranjeros (PINE)',
  proyecto: 'Proyecto de Innovaciones Pedagógicas e Internacionalización',
  grupo_investigacion:
    'Grupo de Investigación: Innovaciones pedagógicas para el desarrollo sostenible: inclusión, interculturalidad e interdisciplinaridad',
};

type ImageFormat = 'jpg' | 'png' | 'gif' | 'bmp';

interface LoadedImage {
  data: ArrayBuffer;
  width: number;
  height: number;
  type: ImageFormat;
}

function formatFromPath(path: string): ImageFormat {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'jpeg' || ext === 'jpg') return 'jpg';
  if (ext === 'gif') return 'gif';
  if (ext === 'bmp') return 'bmp';
  return 'png';
}

async function loadImage(path: string, targetHeight = 90): Promise<LoadedImage | null> {
  try {
    const [buffer, dims] = await Promise.all([
      fetch(path).then((res) => res.arrayBuffer()),
      new Promise<{ width: number; height: number }>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = reject;
        img.src = path;
      }),
    ]);
    return {
      data: buffer,
      width: Math.round((dims.width / dims.height) * targetHeight),
      height: targetHeight,
      type: formatFromPath(path),
    };
  } catch {
    return null;
  }
}

function bodyText(data: CertificateData): { intro: string; showMotive: boolean } {
  switch (data.type) {
    case 'participacion':
      return {
        intro: `Por su participación destacada en ${data.eventName || 'el evento'}, con la ponencia titulada:`,
        showMotive: true,
      };
    case 'expositor':
      return {
        intro: `Por su destacada participación como expositor(a) en ${data.eventName || 'el evento'}, presentando:`,
        showMotive: true,
      };
    case 'reconocimiento':
      return {
        intro: `En reconocimiento a ${data.motiveText || 'su valioso aporte y compromiso'}${data.eventName ? ` en ${data.eventName}` : ''}.`,
        showMotive: false,
      };
    case 'asistencia':
      return {
        intro: `Por su asistencia a ${data.eventName || 'el evento'}.`,
        showMotive: false,
      };
    case 'capacitador':
      return {
        intro: `Por su destacada labor como capacitador(a) en ${data.eventName || 'el evento'}, impartiendo:`,
        showMotive: true,
      };
    case 'voluntariado':
      return {
        intro: `Por su valiosa labor de voluntariado en ${data.eventName || 'el evento'}.`,
        showMotive: false,
      };
  }
}

function imageRun(img: LoadedImage) {
  return new ImageRun({
    data: img.data,
    transformation: { width: img.width, height: img.height },
    type: img.type,
  });
}

function signerCell(signer: { name: string; role: string }) {
  return new TableCell({
    width: { size: 100 / 3, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.BOTTOM,
    margins: { top: 100, bottom: 0, left: 100, right: 100 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: BLUE },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80 },
        children: [new TextRun({ text: signer.name || 'Nombre del firmante', bold: true, color: BLUE, size: 20 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: signer.role || 'Cargo', color: '1a1a1a', size: 18 })],
      }),
    ],
  });
}

export async function buildCertificateDocument(data: CertificateData, recipientName: string): Promise<Document> {
  const secondaryPath = SECONDARY_LOGO_PATHS[data.secondaryLogo];
  const [uleamLogo, secondaryLogo] = await Promise.all([
    loadImage(ULEAM_LOGO_PATH),
    secondaryPath ? loadImage(secondaryPath) : Promise.resolve(null),
  ]);

  const { intro, showMotive } = bodyText(data);

  const logos = [uleamLogo, secondaryLogo].filter((img): img is LoadedImage => img !== null);
  let logoBlock: Paragraph | Table | null = null;
  if (logos.length === 1) {
    logoBlock = new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [imageRun(logos[0])],
    });
  } else if (logos.length === 2) {
    logoBlock = new Table({
      width: { size: 60, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      borders: { ...NO_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
      rows: [
        new TableRow({
          children: logos.map(
            (img) =>
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                borders: NO_BORDERS,
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [imageRun(img)] })],
              }),
          ),
        }),
      ],
    });
  }

  const signerRow = new TableRow({ children: data.signers.map(signerCell) });
  const signerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { ...NO_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
    rows: [signerRow],
  });

  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, bottom: 720, left: 1080, right: 1080 },
          },
          verticalAlign: VerticalAlignSection.CENTER,
        },
        children: [
          ...(logoBlock ? [logoBlock, new Paragraph({ children: [], spacing: { after: 160 } })] : []),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'CERTIFICADO', bold: true, color: BLUE, size: 44, characterSpacing: 60 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160 },
            children: [
              new TextRun({
                text: 'Facultad de Educación y Turismo de la Universidad Laica Eloy Alfaro de Manabí',
                color: BLUE,
                size: 20,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: ENTITY_LABELS[data.entity], bold: true, color: BLUE, size: 20 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 320 },
            children: [new TextRun({ text: 'Otorgado a', color: '1a1a1a', size: 22 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 80 },
            children: [new TextRun({ text: recipientName || 'Nombre del participante', bold: true, color: GOLD, size: 36 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240 },
            children: [new TextRun({ text: intro, color: '1a1a1a', size: 22 })],
          }),
          ...(showMotive
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 80 },
                  children: [
                    new TextRun({ text: `“${data.motiveText || 'Título de la ponencia'}”`, italics: true, bold: true, color: BLUE, size: 22 }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240 },
            children: [new TextRun({ text: `${data.place || 'Manta'}, ${data.date || 'fecha'}`, color: '1a1a1a', size: 20 })],
          }),
          new Paragraph({ spacing: { before: 280 }, children: [] }),
          signerTable,
        ],
      },
    ],
  });
}
