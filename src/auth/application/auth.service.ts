import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { USER_REPOSITORY, UserRepository } from "../domain/user.repository";
import { Response } from "express";
import { RegisterDto } from "../infrastructure/dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.userRepository.findByEmail(email);

    // Protección contra ataques de tiempo: siempre realizamos la comparación de hash
    // incluso si el usuario no existe, usando un hash de referencia.
    const hashToCompare = user
      ? user.passwordHash
      : "$2b$10$r9VlO7pTf.S19v.S19v.S19v.S19v.S19v.S19v.S19v.S19v.S";

    const isMatch = await bcrypt.compare(pass, hashToCompare);

    if (user && isMatch) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async register(data: RegisterDto) {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictException("Email already registered");
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.userRepository.create({
      email: data.email,
      passwordHash,
      personId: data.personId,
    });
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async findById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) return null;
    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: any, response: Response) {
    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    response.cookie("access_token", access_token, {
      httpOnly: true,
      secure: false,
      //secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600000, // 1h
    });

    return {
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        personId: user.personId,
      },
    };
  }
}
