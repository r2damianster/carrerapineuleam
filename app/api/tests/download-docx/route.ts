import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { mcerQuestions } from '@/lib/questions';

export async function GET() {
  try {
    const children = [
      new Paragraph({
        text: "Test de Nivelación MCER - Proyecto PINE",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 300 }
      }),
      new Paragraph({
        text: "Nombre del Beneficiario: ____________________________________",
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: "Fecha: ________________________  Puntaje: _______/20",
        spacing: { after: 400 }
      }),
    ];

    mcerQuestions.forEach((q, i) => {
      // Pregunta
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. ${q.text}`, bold: true }),
            new TextRun({ text: ` (${q.level})`, color: "888888" }),
          ],
          spacing: { before: 200, after: 100 }
        })
      );
      
      // Opciones
      Object.entries(q.options).map(([key, value]) => {
        children.push(
          new Paragraph({
            text: `    ( ${key.toUpperCase()} ) ${value}`,
            spacing: { after: 50 }
          })
        );
      });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="Test_MCER_PINE.docx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    });

  } catch (error: any) {
    console.error('Error generating DOCX:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}
