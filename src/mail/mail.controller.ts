import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiTags,
} from "@nestjs/swagger";
import { THROTTLE_MAIL } from "../common/config/throttle.config";
import { SendEmailDto, SendEmailRequestDto } from "./dto/send-email.dto";
import { pdfMulterOptions } from "./infrastructure/storage/pdf-multer-options";
import { MailService } from "./mail.service";

@ApiTags("mail")
@Controller("mail")
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Throttle(THROTTLE_MAIL)
  @Post("send-email")
  @ApiConsumes("multipart/form-data")
  @ApiBody({ type: SendEmailRequestDto })
  @ApiCreatedResponse({
    schema: {
      example: { success: true, message: "Correo enviado correctamente" },
    },
  })
  @UseInterceptors(FileInterceptor("pdf", pdfMulterOptions))
  async sendEmail(
    @Body() dto: SendEmailDto,
    @UploadedFile() pdf: Express.Multer.File,
  ) {
    if (!pdf) {
      throw new BadRequestException(
        "El PDF de la credencial es obligatorio (campo pdf)",
      );
    }

    const filename =
      dto.pdfFileName?.trim() || pdf.originalname || "credencial.pdf";
    const safeFilename = filename.toLowerCase().endsWith(".pdf")
      ? filename
      : `${filename}.pdf`;

    await this.mailService.sendEmail(dto.to, dto.subject, dto.message, {
      buffer: pdf.buffer,
      filename: safeFilename,
    });

    return { success: true, message: "Correo enviado correctamente" };
  }
}
