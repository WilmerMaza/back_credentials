import { BadRequestException, Injectable } from "@nestjs/common";
import {
  CredentialFieldSchema,
  CredentialFieldType,
  CredentialMetadata,
  CredentialTypeSchema,
} from "../../domain/credential-type-schema";

const SUPPORTED_TYPES: CredentialFieldType[] = [
  "text",
  "textarea",
  "number",
  "date",
  "email",
  "select",
  "radio",
  "checkbox",
  "boolean",
];

@Injectable()
export class MetadataSchemaValidator {
  validate(
    schema: CredentialTypeSchema | null | undefined,
    metadata: CredentialMetadata,
  ): CredentialMetadata {
    const fields = schema?.fields ?? [];
    const errors: string[] = [];
    const normalized: CredentialMetadata = {};

    for (const field of fields) {
      this.assertValidFieldDefinition(field, errors);
      const rawValue = metadata[field.name];
      const isEmpty =
        rawValue === undefined ||
        rawValue === null ||
        rawValue === "" ||
        (Array.isArray(rawValue) && rawValue.length === 0);

      if (field.required && isEmpty) {
        errors.push(`El campo "${field.label}" es requerido`);
        continue;
      }

      if (isEmpty) {
        continue;
      }

      try {
        normalized[field.name] = this.validateFieldValue(field, rawValue);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Valor inválido";
        errors.push(`${field.label}: ${message}`);
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: "Validación de metadata fallida",
        errors,
      });
    }

    return normalized;
  }

  private assertValidFieldDefinition(
    field: CredentialFieldSchema,
    errors: string[],
  ): void {
    if (!field.name?.trim()) {
      errors.push("Un campo del schema no tiene name");
      return;
    }

    if (!SUPPORTED_TYPES.includes(field.type)) {
      errors.push(
        `El campo "${field.name}" usa un type no soportado: ${field.type}`,
      );
    }
  }

  private validateFieldValue(
    field: CredentialFieldSchema,
    rawValue: unknown,
  ): unknown {
    switch (field.type) {
      case "boolean":
        return this.validateBoolean(rawValue, field.label);
      case "number":
        return this.validateNumber(rawValue, field);
      case "date":
        return this.validateDate(rawValue, field.label);
      case "email":
        return this.validateEmail(rawValue, field);
      case "select":
      case "radio":
        return this.validateOption(rawValue, field);
      case "checkbox":
        return this.validateCheckbox(rawValue, field);
      case "textarea":
      case "text":
      default:
        return this.validateText(rawValue, field);
    }
  }

  private validateBoolean(rawValue: unknown, label: string): boolean {
    if (typeof rawValue === "boolean") {
      return rawValue;
    }

    if (rawValue === "true" || rawValue === "1" || rawValue === 1) {
      return true;
    }

    if (rawValue === "false" || rawValue === "0" || rawValue === 0) {
      return false;
    }

    throw new Error(`${label} debe ser booleano`);
  }

  private validateNumber(
    rawValue: unknown,
    field: CredentialFieldSchema,
  ): number {
    const value =
      typeof rawValue === "number" ? rawValue : Number(String(rawValue));

    if (Number.isNaN(value)) {
      throw new Error("debe ser numérico");
    }

    if (field.min !== undefined && value < field.min) {
      throw new Error(`debe ser mayor o igual a ${field.min}`);
    }

    if (field.max !== undefined && value > field.max) {
      throw new Error(`debe ser menor o igual a ${field.max}`);
    }

    return value;
  }

  private validateDate(rawValue: unknown, label: string): string {
    const value = String(rawValue).trim();
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error(`${label} debe ser una fecha válida`);
    }

    return date.toISOString();
  }

  private validateEmail(
    rawValue: unknown,
    field: CredentialFieldSchema,
  ): string {
    const value = this.validateText(rawValue, field);
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(value)) {
      throw new Error("debe ser un correo válido");
    }

    return value;
  }

  private validateOption(
    rawValue: unknown,
    field: CredentialFieldSchema,
  ): string {
    const value = String(rawValue).trim();
    const options = field.options ?? [];

    if (options.length > 0 && !options.includes(value)) {
      throw new Error(`debe ser una de las opciones permitidas`);
    }

    return value;
  }

  private validateCheckbox(
    rawValue: unknown,
    field: CredentialFieldSchema,
  ): string[] {
    const values = Array.isArray(rawValue)
      ? rawValue.map((item) => String(item).trim())
      : [String(rawValue).trim()];
    const options = field.options ?? [];

    if (options.length > 0) {
      const invalid = values.filter((value) => !options.includes(value));
      if (invalid.length > 0) {
        throw new Error("contiene opciones no permitidas");
      }
    }

    return values;
  }

  private validateText(
    rawValue: unknown,
    field: CredentialFieldSchema,
  ): string {
    const value = String(rawValue).trim();

    if (field.minLength !== undefined && value.length < field.minLength) {
      throw new Error(`debe tener al menos ${field.minLength} caracteres`);
    }

    if (field.maxLength !== undefined && value.length > field.maxLength) {
      throw new Error(`debe tener máximo ${field.maxLength} caracteres`);
    }

    if (field.pattern) {
      const regex = new RegExp(field.pattern);
      if (!regex.test(value)) {
        throw new Error("no cumple el formato requerido");
      }
    }

    return value;
  }
}
