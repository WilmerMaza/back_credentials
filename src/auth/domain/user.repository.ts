import { User } from "./user.entity";

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: Omit<User, "id">): Promise<User>;
}

export const USER_REPOSITORY = "USER_REPOSITORY";
