import { randomUUID } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { extname } from "path";
import { diskStorage } from "multer";
import type { Request } from "express";
import type { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";

type NestMulterFileFilterCallback = (
  error: Error | null,
  acceptFile: boolean
) => void;

function getUploadRoot(): string {
  return process.env.UPLOADS_DIR ?? "uploads/credentials";
}

function ensureUploadDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

export const multerOptions: MulterOptions = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const uploadRoot = getUploadRoot();
      ensureUploadDir(uploadRoot);
      cb(null, uploadRoot);
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname);
      const name = `${Date.now()}-${randomUUID()}${ext}`;
      cb(null, name);
    },
  }),

  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    callback: NestMulterFileFilterCallback
  ): void => {
    if (!file.mimetype.startsWith("image/")) {
      return callback(new Error("Only image files are allowed"), false);
    }
    callback(null, true);
  },

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
};
