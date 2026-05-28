import type { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import type { Request } from "express";
import { memoryStorage } from "multer";

const maxPdfSizeMb = parseInt(process.env.MAX_PDF_SIZE_MB ?? "25", 10);

type MulterFileFilterCallback = (
  error: Error | null,
  acceptFile: boolean,
) => void;

export const pdfMulterOptions: MulterOptions = {
  storage: memoryStorage(),
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    callback: MulterFileFilterCallback,
  ): void => {
    if (file.mimetype !== "application/pdf") {
      return callback(new Error("Solo se permiten archivos PDF"), false);
    }
    callback(null, true);
  },
  limits: {
    fileSize: maxPdfSizeMb * 1024 * 1024,
  },
};
