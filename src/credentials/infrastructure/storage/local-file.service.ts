import { Injectable } from '@nestjs/common';
import { join } from 'path';

@Injectable()
export class LocalFileService {
  private getUploadRoot(): string {
    return process.env.UPLOADS_DIR ?? 'uploads/credentials';
  }

  toStoragePath(file: Express.Multer.File): string {
    const relativePath = join(this.getUploadRoot(), file.filename);
    return relativePath.replace(/\\/g, '/');
  }
}
