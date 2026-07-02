import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";
import { CsrfService } from "./csrf.service";
import { CSRF_COOKIE_NAME } from "./csrf.constants";

describe("CsrfService", () => {
  let service: CsrfService;

  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        NODE_ENV: "test",
        AUTH_COOKIE_SAMESITE: "lax",
        AUTH_COOKIE_SECURE: "false",
      };
      return values[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsrfService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(CsrfService);
  });

  it("generates and validates matching tokens", () => {
    const token = service.generateToken();
    expect(service.validate(token, token)).toBe(true);
  });

  it("rejects mismatched tokens", () => {
    expect(service.validate("a", "b")).toBe(false);
  });

  it("issues cookie and returns token", () => {
    const response = {
      cookie: jest.fn(),
    } as unknown as Response;

    const token = service.issueToken(response);
    expect(token).toBeTruthy();
    expect(response.cookie).toHaveBeenCalledWith(
      CSRF_COOKIE_NAME,
      token,
      expect.objectContaining({ httpOnly: false }),
    );
  });
});
