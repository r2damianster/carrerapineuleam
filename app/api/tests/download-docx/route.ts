import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { mcerQuestions } from '@/lib/questions';

// tipo=pretest (default): formato para Registrar y Evaluar Beneficiario — trae
// también los campos de datos del beneficiario en blanco, porque en el
// pretest el registro y la evaluación van juntos (sin registro no hay pretest).
// tipo=postest: formato para Evaluación Final — el beneficiario ya está
// registrado de antes, solo lleva su nombre + MCER + la encuesta de
// satisfacción en blanco al final (misma fusión postest+encuesta del sistema).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') === 'postest' ? 'postest' : 'pretest';

    const children = tipo === 'pretest'
      ? [
          new Paragraph({
            text: "Registro y Pre-Test MCER - Proyecto PINE",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 300 }
          }),
          new Paragraph({ text: "Nombres: ________________________________  Apellidos: ________________________________", spacing: { after: 150 } }),
          new Paragraph({ text: "Género: Femenino ( )  Masculino ( )  Otro ( )  Prefiero no decir ( )", spacing: { after: 150 } }),
          new Paragraph({ text: "Contacto: _____________________________  Email (opcional): _____________________________", spacing: { after: 150 } }),
          new Paragraph({ text: "Edad: ________  Tiene discapacidad: Sí ( ) No ( )  ¿Cuál?: ________________________________", spacing: { after: 150 } }),
          new Paragraph({ text: "Situación ocupacional: Solo estudia ( )  Estudia y trabaja ( )  Solo trabaja ( )  Desempleado y no estudia ( )", spacing: { after: 150 } }),
          new Paragraph({ text: "Si trabaja — Rol que ejerce: ________________________________", spacing: { after: 150 } }),
          new Paragraph({ text: "Si estudia — Nivel educativo: Universidad ( )  Colegio ( )  Escuela ( )   Carrera: ______________  Curso/semestre: ______________", spacing: { after: 200 } }),
          new Paragraph({
            text: "Fecha: ________________________  Puntaje: _______/100 (promedio Gramática + Lectura + Oral)",
            spacing: { after: 400 }
          }),
        ]
      : [
          new Paragraph({
            text: "Evaluación Final (Post-Test MCER + Encuesta) - Proyecto PINE",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 300 }
          }),
          new Paragraph({
            text: "Nombre del Beneficiario: ____________________________________",
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: "Fecha: ________________________  Puntaje: _______/100 (promedio Gramática + Lectura + Oral)",
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

      if (q.passage) {
        children.splice(children.length - 1, 0, new Paragraph({
          children: [new TextRun({ text: q.passage, italics: true, color: "555555" })],
          spacing: { before: 100, after: 100 }
        }));
      }

      if (q.type === 'audio') {
        children.push(
          new Paragraph({
            text: "    (Pregunta oral — no aplica en la versión impresa, se administra desde el sistema digital)",
            spacing: { after: 50 }
          })
        );
        return;
      }

      // Opciones
      Object.entries(q.options ?? {}).map(([key, value]) => {
        children.push(
          new Paragraph({
            text: `    ( ${key.toUpperCase()} ) ${value}`,
            spacing: { after: 50 }
          })
        );
      });
    });

    if (tipo === 'postest') {
      children.push(
        new Paragraph({
          text: "Encuesta de Satisfacción",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({ text: "¿Qué tan satisfecho está el beneficiario con el programa? (1-5): _______", spacing: { after: 100 } }),
        new Paragraph({ text: "¿Sintió que aprendió? (1-5): _______", spacing: { after: 100 } }),
        new Paragraph({ text: "¿Sintió que mejoró su nivel de inglés? (1-5): _______", spacing: { after: 100 } }),
        new Paragraph({ text: "¿Cómo calificaría los recursos/materiales usados? (1-5): _______", spacing: { after: 200 } }),
        new Paragraph({ text: "Comentarios adicionales: ____________________________________________________________", spacing: { after: 100 } }),
        new Paragraph({ text: "____________________________________________________________________________________", spacing: { after: 100 } }),
      );
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = tipo === 'postest' ? 'Evaluacion_Final_PINE.docx' : 'Registro_PreTest_PINE.docx';

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    });

  } catch (error: any) {
    console.error('Error generating DOCX:', error);
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 });
  }
}
