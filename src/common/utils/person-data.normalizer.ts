export interface RawPersonInput {
  firstName: string;
  lastName: string;
  typeIdentity: string;
  identityNumber: string;
  institutionalEmail: string;
}

export interface NormalizedPersonData extends RawPersonInput {
  fullName: string;
}

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function toTitleCaseWords(value: string): string {
  return collapseWhitespace(value)
    .toLowerCase()
    .split(" ")
    .map((word) =>
      word.length > 0
        ? `${word.charAt(0).toUpperCase()}${word.slice(1)}`
        : word,
    )
    .join(" ");
}

export function normalizePersonData(input: RawPersonInput): NormalizedPersonData {
  const firstName = toTitleCaseWords(input.firstName);
  const lastName = toTitleCaseWords(input.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return {
    firstName,
    lastName,
    fullName,
    typeIdentity: input.typeIdentity.trim().toUpperCase(),
    identityNumber: input.identityNumber.trim().replace(/\s+/g, ""),
    institutionalEmail: input.institutionalEmail.trim().toLowerCase(),
  };
}
