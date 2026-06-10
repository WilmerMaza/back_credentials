import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientSecretCredential } from "@azure/identity";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const SMTP_SCOPE = "https://outlook.office365.com/.default";

export interface EmailPdfAttachment {
  buffer: Buffer;
  filename: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private credential: ClientSecretCredential | null = null;
  private senderEmail: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const tenantId = this.configService.get<string>("AZURE_TENANT_ID");
    const clientId = this.configService.get<string>("AZURE_CLIENT_ID");
    const clientSecret = this.configService.get<string>("AZURE_CLIENT_SECRET");
    this.senderEmail =
      this.configService.get<string>("AZURE_SENDER_EMAIL") ?? null;

    if (!tenantId || !clientId || !clientSecret || !this.senderEmail) {
      this.logger.warn(
        "AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET o AZURE_SENDER_EMAIL no configurados; el envío de correo fallará",
      );
      return;
    }

    this.credential = new ClientSecretCredential(
      tenantId,
      clientId,
      clientSecret,
    );
  }

  private async createTransporter(): Promise<Transporter> {
    if (!this.credential || !this.senderEmail) {
      throw new InternalServerErrorException(
        "Servicio de correo no configurado",
      );
    }

    const token = await this.credential.getToken(SMTP_SCOPE);
    if (!token?.token) {
      throw new InternalServerErrorException(
        "No se pudo obtener token de Azure",
      );
    }

    return nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: {
        type: "OAuth2",
        user: this.senderEmail,
        accessToken: token.token,
      },
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    pdf: EmailPdfAttachment,
  ): Promise<void> {
    if (!this.credential || !this.senderEmail) {
      throw new InternalServerErrorException(
        "Servicio de correo no configurado",
      );
    }

    const fromName =
      this.configService.get<string>("MAIL_FROM_NAME") ?? "Notificaciones";
    const from = `"${fromName}" <${this.senderEmail}>`;

    try {
      const transporter = await this.createTransporter();

      await transporter.sendMail({
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
      this.logger.error("Error enviando correo via SMTP OAuth2", error);
      const err = error as { code?: string; responseCode?: number };

      if (err.code === "EAUTH" || err.responseCode === 535) {
        throw new InternalServerErrorException(
          "Credenciales de Azure inválidas o permisos SMTP insuficientes (requiere SMTP.Send en la app registrada).",
        );
      }

      throw new InternalServerErrorException("No se pudo enviar el correo");
    }
  }
}
