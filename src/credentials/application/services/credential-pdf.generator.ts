import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import * as PDFDocument from "pdfkit";
import * as QRCode from "qrcode";
import { PassThrough } from "stream";
import { Credential } from "../../domain/credential.entity";
import type {
  CredentialTypeSchema,
} from "../../domain/credential-type-schema";

interface PdfRow {
  label: string;
  value: string;
}

@Injectable()
export class CredentialPdfGenerator {
  constructor(private readonly configService: ConfigService) {}

  async generate(credential: Credential): Promise<Buffer> {
    const verifyUrl = this.buildVerifyUrl(credential);
    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 140,
      margin: 1,
    });
    const photoBuffer = this.readPhotoBuffer(credential.imagePath);

    return this.renderDocument(credential, qrBuffer, photoBuffer);
  }

  private buildVerifyUrl(credential: Credential): string {
    const baseUrl = (
      this.configService.get<string>("PUBLIC_APP_URL") ?? "http://localhost"
    ).replace(/\/$/, "");
    const identity = encodeURIComponent(credential.person.identityNumber);
    const type = encodeURIComponent(credential.type.code);
    return `${baseUrl}/verify/${identity}?type=${type}`;
  }

  private readPhotoBuffer(imagePath: string | null): Buffer | null {
    if (!imagePath) return null;

    const normalized = imagePath.replace(/\\/g, "/");
    const filePath = normalized.startsWith("/")
      ? normalized
      : join(process.cwd(), normalized);

    if (!existsSync(filePath)) return null;

    try {
      return readFileSync(filePath);
    } catch {
      return null;
    }
  }

  private async renderDocument(
    credential: Credential,
    qrBuffer: Buffer,
    photoBuffer: Buffer | null,
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve, reject) => {
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });

    doc.pipe(stream);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    doc
      .fillColor("#0c2e57")
      .rect(0, 0, doc.page.width, 72)
      .fill();

    doc
      .fillColor("#ffffff")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("ESCUELA NAVAL DE CADETES", left, 24, { width: pageWidth, align: "center" });

    doc
      .fontSize(10)
      .font("Helvetica")
      .text("ALMIRANTE PADILLA — Credencial digital", left, 46, {
        width: pageWidth,
        align: "center",
      });

    doc.fillColor("#0a1628");
    let y = 96;

    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(this.getCredentialTitle(credential.type.code), left, y, { width: pageWidth });
    y += 24;

    const photoX = left;
    const photoY = y;
    const photoWidth = 110;
    const photoHeight = 135;

    if (photoBuffer) {
      doc.image(photoBuffer, photoX, photoY, {
        fit: [photoWidth, photoHeight],
        align: "center",
        valign: "center",
      });
      doc.rect(photoX, photoY, photoWidth, photoHeight).stroke("#cbd5e1");
    } else {
      doc
        .rect(photoX, photoY, photoWidth, photoHeight)
        .fillAndStroke("#f1f5f9", "#cbd5e1");
      doc
        .fillColor("#64748b")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("FOTO", photoX, photoY + 60, {
          width: photoWidth,
          align: "center",
        });
    }

    const infoX = left + photoWidth + 20;
    const infoWidth = pageWidth - photoWidth - 20;
    let infoY = photoY;

    const rows = this.buildRows(credential);
    for (const row of rows) {
      infoY = this.drawRow(doc, row, infoX, infoY, infoWidth);
    }

    y = Math.max(photoY + photoHeight + 24, infoY + 12);

    doc
      .roundedRect(left, y, pageWidth, 150, 8)
      .fillAndStroke("#f8fafc", "#cbd5e1");

    doc.image(qrBuffer, left + 16, y + 16, { width: 100, height: 100 });

    doc
      .fillColor("#0a1628")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("CÓDIGO DE VERIFICACIÓN", left + 130, y + 20, { width: pageWidth - 146 });

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#475569")
      .text(
        "Escanee el código QR para validar la autenticidad de esta credencial en el sistema oficial.",
        left + 130,
        y + 40,
        { width: pageWidth - 146 },
      );

    doc
      .fontSize(8)
      .fillColor("#64748b")
      .text(this.buildVerifyUrl(credential), left + 130, y + 88, {
        width: pageWidth - 146,
      });

    y += 170;

    const emission = formatDisplayDate(
      credential.issueDate ?? credential.createdAt,
    );
    const validUntil = formatDisplayDate(credential.expirationDate);

    doc
      .fontSize(10)
      .fillColor("#0a1628")
      .font("Helvetica-Bold")
      .text(`FECHA EMISIÓN: ${emission}`, left, y);
    doc.text(`VÁLIDO HASTA: ${validUntil}`, left, y + 16);

    doc.end();
    return done;
  }

  private drawRow(
    doc: InstanceType<typeof PDFDocument>,
    row: PdfRow,
    x: number,
    y: number,
    width: number,
  ): number {
    doc
      .fillColor("#64748b")
      .fontSize(8)
      .font("Helvetica-Bold")
      .text(row.label.toUpperCase(), x, y, { width });

    doc
      .fillColor("#0a1628")
      .fontSize(11)
      .font("Helvetica")
      .text(row.value, x, y + 12, { width });

    return y + 34;
  }

  private buildRows(credential: Credential): PdfRow[] {
    const rows: PdfRow[] = [
      { label: "Nombre completo", value: credential.person.fullName },
      { label: "Tipo de registro", value: credential.type.name },
      { label: "Identificación", value: credential.person.identityNumber },
      {
        label: "Tipo de identificación",
        value: credential.person.typeIdentity,
      },
      {
        label: "Fecha de nacimiento",
        value: formatDisplayDate(credential.person.birthDate),
      },
    ];

    if (credential.person.institutionalEmail) {
      rows.push({
        label: "Correo institucional",
        value: credential.person.institutionalEmail,
      });
    }

    rows.push(...this.getMetadataRows(credential));

    rows.push({
      label: "Estado",
      value: this.getStatusLabel(credential.status),
    });

    return rows;
  }

  private getMetadataRows(credential: Credential): PdfRow[] {
    const schema = credential.type.schema as CredentialTypeSchema | undefined;
    const metadata = credential.metadata ?? {};
    const fields = schema?.fields ?? [];
    const rows: PdfRow[] = [];

    if (fields.length > 0) {
      for (const field of fields) {
        const value = formatMetadataValue(metadata[field.name]);
        if (!value) continue;
        rows.push({ label: field.label, value });
      }
      return rows;
    }

    for (const [key, raw] of Object.entries(metadata)) {
      const value = formatMetadataValue(raw);
      if (!value) continue;
      rows.push({ label: humanizeKey(key), value });
    }

    return rows;
  }

  private getCredentialTitle(typeCode: string): string {
    const normalized = typeCode.trim().toLowerCase();
    if (normalized.includes("cadete") || normalized.includes("inter")) {
      return "CREDENCIAL CADETES";
    }
    if (normalized.includes("civil")) {
      return "CREDENCIAL PERSONAL CIVIL";
    }
    return "CREDENCIAL DE IDENTIFICACIÓN";
  }

  private getStatusLabel(status: Credential["status"]): string {
    switch (status) {
      case "ACTIVE":
        return "Activo";
      case "PENDING":
        return "Pendiente";
      case "EXPIRED":
        return "Expirado";
      case "REVOKED":
        return "Revocado";
      case "SUSPENDED":
        return "Suspendido";
      default:
        return status;
    }
  }
}

function formatDisplayDate(value: Date | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMetadataValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  const text = String(value).trim();
  return text;
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
