import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { PersonRepository } from "../domain/person.repository";

@Injectable()
export class PersonPrismaRepository implements PersonRepository {
  constructor(private readonly prisma: PrismaService) {}

  async existsByInstitutionalEmail(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return false;
    }

    const found = await this.prisma.person.findFirst({
      where: {
        institutionalEmail: {
          equals: normalized,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    return found !== null;
  }

  async existsByIdentityNumber(identityNumber: string): Promise<boolean> {
    const normalized = identityNumber.trim();
    if (!normalized) {
      return false;
    }

    const found = await this.prisma.person.findFirst({
      where: {
        identityNumber: {
          equals: normalized,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    return found !== null;
  }
}
