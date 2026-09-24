import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import * as PDFDocument from "pdfkit";
import * as QRCode from "qrcode";
import { PassThrough } from "stream";
import { Credential } from "../../domain/credential.entity";
import type { CredentialTypeSchema } from "../../domain/credential-type-schema";
import { resolveCredentialStatusName } from "../../domain/credential-status";

interface PdfRow {
  label: string;
  value: string;
}

/** Paleta institucional ENAP */
const C = {
  navy: "#0a2548",
  navyDeep: "#061830",
  header: "#0c2e57",
  gold: "#c5a46e",
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
  soft: "#f8fafc",
  white: "#ffffff",
  okBg: "#ecfdf5",
  okInk: "#065f46",
  warnBg: "#fff7ed",
  warnInk: "#9a3412",
} as const;

@Injectable()
export class CredentialPdfGenerator implements OnModuleInit {
  private readonly logger = new Logger(CredentialPdfGenerator.name);
  private logoBuffer: Buffer | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.logoBuffer = this.readLogoBuffer();
    const baseUrl = this.resolvePublicAppUrl();
    if (baseUrl.includes("localhost")) {
      this.logger.warn(
        "PUBLIC_APP_URL no definida o apunta a localhost: el QR del PDF del backend usará una URL no pública",
      );
      return;
    }
    this.logger.log(`PDF backend: QR de verificación → ${baseUrl}/verify/...`);
  }

  async generate(credential: Credential): Promise<Buffer> {
    const verifyUrl = this.buildVerifyUrl(credential);
    this.logger.debug(`Generando PDF con QR: ${verifyUrl}`);
    const qrBuffer = await QRCode.toBuffer(verifyUrl, {
      width: 220,
      margin: 1,
      color: { dark: "#0a2548", light: "#ffffff" },
      errorCorrectionLevel: "M",
    });
    const photoBuffer = this.readPhotoBuffer(credential.imagePath);

    return this.renderDocument(credential, qrBuffer, photoBuffer, verifyUrl);
  }

  /** URL pública del front (misma que publicAppUrl en Angular). */
  private resolvePublicAppUrl(): string {
    const configured = this.configService.get<string>("PUBLIC_APP_URL")?.trim();
    return (configured || "http://localhost").replace(/\/$/, "");
  }

  private buildVerifyUrl(credential: Credential): string {
    const baseUrl = this.resolvePublicAppUrl();
    const identity = encodeURIComponent(credential.person.identityNumber);
    const type = encodeURIComponent(credential.type.code);
    return `${baseUrl}/verify/${identity}?type=${type}`;
  }

  private readLogoBuffer(): Buffer | null {
    const candidates = [
      join(process.cwd(), "assets", "ENAP.png"),
      join(__dirname, "..", "..", "..", "..", "assets", "ENAP.png"),
    ];
    for (const filePath of candidates) {
      if (!existsSync(filePath)) continue;
      try {
        return readFileSync(filePath);
      } catch {
        /* try next */
      }
    }
    this.logger.warn("Logo ENAP.png no encontrado en assets/; el PDF irá sin escudo");
    return null;
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
    verifyUrl: string,
  ): Promise<Buffer> {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: {
        Title: `Credencial — ${credential.person.fullName}`,
        Author: "Escuela Naval de Cadetes Almirante Padilla",
        Subject: "Credencial digital oficial",
      },
    });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer) => chunks.push(chunk));

    const done = new Promise<Buffer>((resolve, reject) => {
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });

    doc.pipe(stream);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const marginX = 40;
    const contentW = pageW - marginX * 2;

    // ——— Cabecera institucional ———
    const headerH = 88;
    doc.rect(0, 0, pageW, headerH).fill(C.header);

    const logo = this.logoBuffer;
    if (logo) {
      doc.image(logo, marginX, 16, { fit: [56, 56], align: "center", valign: "center" });
    }

    const titleX = logo ? marginX + 68 : marginX;
    const titleW = contentW - (logo ? 68 : 0);

    doc
      .fillColor(C.white)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("ESCUELA NAVAL DE CADETES", titleX, 28, {
        width: titleW,
        align: "left",
      });

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#dbeafe")
      .text("ALMIRANTE PADILLA", titleX, 48, { width: titleW, align: "left" });

    doc
      .fontSize(8)
      .fillColor("#94a3b8")
      .text("Credencial digital oficial", titleX, 64, { width: titleW, align: "left" });

    // Franja dorada
    doc.rect(0, headerH, pageW, 4).fill(C.gold);

    // Fondo suave del cuerpo
    doc.rect(0, headerH + 4, pageW, pageH - headerH - 4).fill(C.white);

    let y = headerH + 28;

    // ——— Título de credencial + estado ———
    const credTitle = this.getCredentialTitle(credential.type.code);
    doc
      .fillColor(C.navy)
      .font("Helvetica-Bold")
      .fontSize(15)
      .text(credTitle, marginX, y, { width: contentW, align: "center" });
    y += 26;

    const statusLabel = this.getStatusLabel(credential.status);
    const statusW = Math.min(180, doc.widthOfString(statusLabel) + 28);
    const statusX = marginX + (contentW - statusW) / 2;
    const isOk =
      statusLabel.toUpperCase().includes("ACTIVO") ||
      statusLabel.toUpperCase().includes("VIGENTE");
    doc.roundedRect(statusX, y, statusW, 22, 11).fill(isOk ? C.okBg : C.warnBg);
    doc
      .fillColor(isOk ? C.okInk : C.warnInk)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(statusLabel.toUpperCase(), statusX, y + 6, {
        width: statusW,
        align: "center",
      });
    y += 36;

    // ——— Dos columnas: datos | verificación ———
    const gap = 24;
    const colW = (contentW - gap) / 2;
    const leftX = marginX;
    const rightX = marginX + colW + gap;
    const colsTop = y;

    // Columna izquierda: foto + filas
    const photoW = 118;
    const photoH = 148;
    const photoX = leftX + (colW - photoW) / 2;

    doc.roundedRect(photoX - 3, colsTop - 3, photoW + 6, photoH + 6, 6).fill(C.line);

    if (photoBuffer) {
      doc.image(photoBuffer, photoX, colsTop, {
        fit: [photoW, photoH],
        align: "center",
        valign: "center",
      });
      doc.roundedRect(photoX, colsTop, photoW, photoH, 4).stroke(C.line);
    } else {
      doc.roundedRect(photoX, colsTop, photoW, photoH, 4).fillAndStroke(C.soft, C.line);
      doc
        .fillColor(C.muted)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("FOTO", photoX, colsTop + photoH / 2 - 8, {
          width: photoW,
          align: "center",
        });
    }

    let leftY = colsTop + photoH + 18;
    const rows = this.buildRows(credential);

    for (const row of rows) {
      leftY = this.drawField(doc, row, leftX, leftY, colW);
      if (leftY > pageH - 120) break;
    }

    // Separador vertical sutil
    const sepX = marginX + colW + gap / 2;
    doc
      .moveTo(sepX, colsTop)
      .lineTo(sepX, Math.max(leftY, colsTop + 280))
      .strokeColor(C.line)
      .lineWidth(1)
      .stroke();

    // Columna derecha: panel QR
    const panelPad = 16;
    const panelTop = colsTop;
    const qrSize = 132;
    const panelInnerW = colW - panelPad * 2;

    doc.roundedRect(rightX, panelTop, colW, 280, 10).fillAndStroke(C.soft, C.line);

    doc
      .fillColor(C.navy)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("CÓDIGO DE VERIFICACIÓN", rightX + panelPad, panelTop + 16, {
        width: panelInnerW,
        align: "center",
      });

    // Accent bajo el título
    const accentW = 48;
    doc
      .rect(
        rightX + (colW - accentW) / 2,
        panelTop + 34,
        accentW,
        3,
      )
      .fill(C.gold);

    const qrX = rightX + (colW - qrSize) / 2;
    const qrY = panelTop + 48;
    doc.roundedRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 8).fill(C.white);
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    doc
      .fillColor(C.muted)
      .font("Helvetica")
      .fontSize(8.5)
      .text(
        "Escanee el código QR para validar la autenticidad de esta credencial en el sistema oficial de la institución.",
        rightX + panelPad,
        qrY + qrSize + 14,
        { width: panelInnerW, align: "center", lineGap: 2 },
      );

    doc
      .fillColor("#94a3b8")
      .fontSize(6.5)
      .text(verifyUrl, rightX + panelPad, panelTop + 252, {
        width: panelInnerW,
        align: "center",
      });

    // ——— Pie: vigencia ———
    const emission = formatDisplayDate(
      credential.issueDate ?? credential.createdAt,
    );
    const validUntil = formatDisplayDate(credential.expirationDate);
    const footerH = 64;
    const footerY = pageH - footerH;

    doc.rect(0, footerY, pageW, footerH).fill(C.navyDeep);
    doc.rect(0, footerY, pageW, 3).fill(C.gold);

    const half = contentW / 2;
    doc
      .fillColor("#94a3b8")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("FECHA DE EMISIÓN", marginX, footerY + 16, { width: half - 12 });
    doc
      .fillColor(C.white)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(emission, marginX, footerY + 32, { width: half - 12 });

    doc
      .fillColor("#94a3b8")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("VÁLIDO HASTA", marginX + half + 12, footerY + 16, {
        width: half - 12,
        align: "right",
      });
    doc
      .fillColor(C.white)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(validUntil, marginX + half + 12, footerY + 32, {
        width: half - 12,
        align: "right",
      });

    doc.end();
    return done;
  }

  private drawField(
    doc: InstanceType<typeof PDFDocument>,
    row: PdfRow,
    x: number,
    y: number,
    width: number,
  ): number {
    doc
      .fillColor(C.muted)
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .text(row.label.toUpperCase(), x, y, { width });

    const valueY = y + 11;
    doc
      .fillColor(C.ink)
      .font("Helvetica")
      .fontSize(10.5)
      .text(row.value || "—", x, valueY, { width, lineGap: 1 });

    const valueH = doc.heightOfString(row.value || "—", {
      width,
      lineGap: 1,
    });

    const nextY = valueY + Math.max(valueH, 12) + 10;
    doc
      .moveTo(x, nextY - 5)
      .lineTo(x + width, nextY - 5)
      .strokeColor(C.line)
      .lineWidth(0.6)
      .stroke();

    return nextY;
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
    if (normalized.includes("baena")) {
      return "CREDENCIAL ALUMNOS BAENA";
    }
    if (normalized.includes("civil")) {
      return "CREDENCIAL PERSONAL CIVIL";
    }
    return "CREDENCIAL DE IDENTIFICACIÓN";
  }

  private getStatusLabel(status: Credential["status"]): string {
    return resolveCredentialStatusName(status);
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
