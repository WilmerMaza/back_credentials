import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRepository } from "../domain/user.repository";
import { User } from "../domain/user.entity";

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({ where: { email } });
    if (!found) return null;
    return {
      id: found.id,
      email: found.email,
      passwordHash: found.password,
      personId: found.personId ?? undefined,
    };
  }

  async findById(id: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({ where: { id } });
    if (!found) return null;
    return {
      id: found.id,
      email: found.email,
      passwordHash: found.password,
      personId: found.personId ?? undefined,
    };
  }

  async create(user: Omit<User, "id">): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        email: user.email,
        password: user.passwordHash,
        personId: user.personId,
      },
    });
    return {
      id: created.id,
      email: created.email,
      passwordHash: created.password,
      personId: created.personId ?? undefined,
    };
  }
}
