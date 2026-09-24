import { Injectable, Logger } from "@nestjs/common";
import { MailService } from "../../../mail/mail.service";
import { Credential } from "../../domain/credential.entity";
import { CredentialPdfGenerator } from "./credential-pdf.generator";

@Injectable()
export class CredentialNotificationService {
  private readonly logger = new Logger(CredentialNotificationService.name);

  constructor(
    private readonly pdfGenerator: CredentialPdfGenerator,
    private readonly mailService: MailService,
  ) {}

  /** Encola el envío sin bloquear la respuesta HTTP del create. */
  scheduleCredentialEmail(credential: Credential): void {
    void this.sendCredentialEmail(credential).catch((error: unknown) => {
      if (error instanceof Error && error.message === "NO_INSTITUTIONAL_EMAIL") {
        return;
      }
      this.logger.error(
        `No se pudo enviar la credencial ${credential.id} por correo`,
        error instanceof Error ? error.stack : String(error),
      );
    });
  }

  /**
   * Genera el PDF oficial (PDFKit) y lo envía al correo institucional.
   * Mismo documento que descarga GET /credentials/:id/pdf y el mail de registro.
   * @returns correo destinatario
   */
  async sendCredentialEmail(credential: Credential): Promise<string> {
    const email = credential.person.institutionalEmail?.trim().toLowerCase();
    if (!email) {
      this.logger.warn(
        `Credencial ${credential.id} sin correo institucional; se omite envío`,
      );
      throw new Error("NO_INSTITUTIONAL_EMAIL");
    }

    const pdfBuffer = await this.pdfGenerator.generate(credential);
    const fullName = credential.person.fullName.trim();
    const subject = fullName ? `Tu credencial - ${fullName}` : "Tu credencial";
    const html =
      "<p>Adjunta encontrarás tu credencial digital oficial.</p>" +
      "<p>Puede verificar su autenticidad escaneando el código QR del documento.</p>";

    await this.mailService.sendEmail(email, subject, html, {
      buffer: pdfBuffer,
      filename: `credencial-${credential.person.identityNumber}.pdf`,
    });

    this.logger.log(`Credencial ${credential.id} enviada a ${email}`);
    return email;
  }
}
