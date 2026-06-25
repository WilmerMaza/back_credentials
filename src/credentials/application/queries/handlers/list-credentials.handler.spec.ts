import { ListCredentialsHandler } from "./list-credentials.handler";
import {
  CredentialRepository,
  CredentialStatusSummary,
} from "../../../domain/credential.repository";
import { ListCredentialsQuery } from "../list-credentials.query";

describe("ListCredentialsHandler", () => {
  it("expira credenciales antes de listar y calcular el summary", async () => {
    const summary: CredentialStatusSummary = {
      activas: 1,
      inactivas: 2,
      pendientes: 0,
      expiradas: 1,
    };

    const repository: CredentialRepository = {
      expireActiveCredentials: jest.fn().mockResolvedValue(1),
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      countByStatus: jest.fn().mockResolvedValue(summary),
      findAllTypes: jest.fn(),
      findTypeByCode: jest.fn(),
    };

    const handler = new ListCredentialsHandler(repository);
    const result = await handler.execute(new ListCredentialsQuery(1, 10));

    expect(repository.expireActiveCredentials).toHaveBeenCalledTimes(1);
    expect(repository.findAll).toHaveBeenCalledWith(1, 10, undefined);
    expect(repository.countByStatus).toHaveBeenCalledTimes(1);
    expect(result.summary).toEqual(summary);

    const expireOrder = (repository.expireActiveCredentials as jest.Mock).mock
      .invocationCallOrder[0];
    const findAllOrder = (repository.findAll as jest.Mock).mock
      .invocationCallOrder[0];
    const summaryOrder = (repository.countByStatus as jest.Mock).mock
      .invocationCallOrder[0];

    expect(expireOrder).toBeLessThan(findAllOrder);
    expect(expireOrder).toBeLessThan(summaryOrder);
  });

  it("pasa el filtro de status al repositorio", async () => {
    const summary: CredentialStatusSummary = {
      activas: 0,
      inactivas: 0,
      pendientes: 0,
      expiradas: 0,
    };

    const repository: CredentialRepository = {
      expireActiveCredentials: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      countByStatus: jest.fn().mockResolvedValue(summary),
      findAllTypes: jest.fn(),
      findTypeByCode: jest.fn(),
    };

    const handler = new ListCredentialsHandler(repository);
    await handler.execute(new ListCredentialsQuery(1, 10, "EXPIRED"));

    expect(repository.findAll).toHaveBeenCalledWith(1, 10, "EXPIRED");
  });
});
