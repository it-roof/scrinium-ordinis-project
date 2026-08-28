import {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import { bodyBlocks, type LetterDocumentModel } from "./document-model";

const NUMBER_REF = "letter-numbers";

function textParagraph(
  text: string,
  options?: { bold?: boolean; spaceAfter?: number }
) {
  return new Paragraph({
    spacing: { after: options?.spaceAfter ?? 200 },
    children: [
      new TextRun({
        text,
        bold: options?.bold,
        font: "Times New Roman",
        size: 24,
      }),
    ],
  });
}

export async function buildLetterDocx(
  model: LetterDocumentModel
): Promise<Buffer> {
  const children: Paragraph[] = [];

  if (model.subject.trim()) {
    children.push(
      textParagraph(`Betreff: ${model.subject.trim()}`, {
        bold: true,
        spaceAfter: 280,
      })
    );
  }

  if (model.salutation.trim()) {
    children.push(textParagraph(model.salutation.trim(), { spaceAfter: 240 }));
  }

  for (const block of bodyBlocks(model.body)) {
    if (block.type === "heading") {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 160 },
          children: [
            new TextRun({
              text: block.text,
              bold: true,
              font: "Times New Roman",
              size: 24,
            }),
          ],
        })
      );
      continue;
    }

    if (block.type === "bullet") {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: block.text,
              font: "Times New Roman",
              size: 24,
            }),
          ],
        })
      );
      continue;
    }

    if (block.type === "numbered") {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          numbering: { reference: NUMBER_REF, level: 0 },
          children: [
            new TextRun({
              text: block.text,
              font: "Times New Roman",
              size: 24,
            }),
          ],
        })
      );
      continue;
    }

    children.push(
      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.BOTH,
        children: [
          new TextRun({
            text: block.text,
            font: "Times New Roman",
            size: 24,
          }),
        ],
      })
    );
  }

  if (model.closing.trim()) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 200 },
        children: [
          new TextRun({
            text: model.closing.trim(),
            font: "Times New Roman",
            size: 24,
          }),
        ],
      })
    );
  }

  if (children.length === 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: model.title || "Schreiben" })],
      })
    );
  }

  const document = new Document({
    numbering: {
      config: [
        {
          reference: NUMBER_REF,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,
              bottom: 1134,
              left: 1134,
              right: 1134,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}
