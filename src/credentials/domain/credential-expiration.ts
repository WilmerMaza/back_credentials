import { isCredentialExpired } from "../../common/utils/bogota-date";
import { CredentialStatus } from "./credential-status";

/** Si está ACTIVE pero la vigencia ya pasó, persiste como EXPIRED. */
export function applyExpirationToStatus(
  status: CredentialStatus,
  expirationDate: Date | null | undefined,
  now?: Date,
): CredentialStatus {
  if (status === "ACTIVE" && isCredentialExpired(expirationDate, now)) {
    return "EXPIRED";
  }

  return status;
}
