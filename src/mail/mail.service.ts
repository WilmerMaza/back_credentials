import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export interface EmailPdfAttachment {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter!: Transporter;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const user = this.configService.get<string>("GMAIL_USER");
    const pass = this.configService.get<string>("GMAIL_PASS");

    if (!user || !pass) {
      this.logger.warn(
        "GMAIL_USER o GMAIL_PASS no configurados; el envío de correo fallará",
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user, pass },
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    pdf: EmailPdfAttachment,
  ): Promise<void> {
    if (!this.transporter) {
      throw new InternalServerErrorException(
        "Servicio de correo no configurado",
      );
    }

    const fromEmail =
      this.configService.get<string>("MAIL_FROM") ??
      this.configService.get<string>("GMAIL_USER");
    const fromName =
      this.configService.get<string>("MAIL_FROM_NAME") ?? "Notificaciones";
    const from = `"${fromName}" <${fromEmail}>`;

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
        attachments: [
          {
            filename: pdf.filename,
            content: pdf.buffer,
            contentType: "application/pdf",
          },
        ],
      });
    } catch (error: unknown) {
      this.logger.error("Error enviando correo", error);
      const err = error as { code?: string };
      if (err.code === "EAUTH") {
        throw new InternalServerErrorException(
          "Credenciales de Gmail inválidas. Usa una contraseña de aplicación en GMAIL_PASS y reinicia el servidor.",
        );
      }
      throw new InternalServerErrorException("No se pudo enviar el correo");
    }
  }
}
