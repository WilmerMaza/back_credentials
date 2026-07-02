import { User } from "./user.entity";

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: Omit<User, "id">): Promise<User>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}

export const USER_REPOSITORY = "USER_REPOSITORY";
