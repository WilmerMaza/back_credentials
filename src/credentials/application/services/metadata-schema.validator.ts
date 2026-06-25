import { BadRequestException, Injectable } from "@nestjs/common";
import {
  CredentialFieldOptionGroup,
  CredentialFieldSchema,
  CredentialFieldType,
  CredentialMetadata,
  CredentialTypeSchema,
} from "../../domain/credential-type-schema";
import { normalizeLegacyInput } from "./metadata-legacy.normalizer";

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
    options: { allowPartial?: boolean } = {},
  ): CredentialMetadata {
    const fields = schema?.fields ?? [];
    const input = normalizeLegacyInput(metadata);
    const errors: string[] = [];
    const normalized: CredentialMetadata = {};
    const allowPartial = options.allowPartial ?? false;

    for (const field of fields) {
      this.assertValidFieldDefinition(field, fields, errors);

      if (this.isHidden(field, normalized)) {
        this.applyAutoValueOrValidate(
          field,
          input[field.name],
          normalized,
          errors,
          undefined,
          allowPartial,
        );
        continue;
      }

      const autoValue = this.resolveAutoValue(field, normalized);
      const rawValue = input[field.name];

      if (autoValue !== undefined) {
        this.applyAutoValueOrValidate(
          field,
          rawValue,
          normalized,
          errors,
          autoValue,
          allowPartial,
        );
        continue;
      }

      if (field.required && this.isEmpty(rawValue) && !allowPartial) {
        errors.push(`El campo "${field.label}" es requerido`);
        continue;
      }

      if (this.isEmpty(rawValue)) {
        continue;
      }

      try {
        normalized[field.name] = this.validateFieldValue(
          field,
          rawValue,
          normalized,
        );
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
    fields: CredentialFieldSchema[],
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

    const fieldNames = new Set(fields.map((item) => item.name));
    const fieldIndex = fields.findIndex((item) => item.name === field.name);
    const previousFields = new Set(
      fields.slice(0, fieldIndex).map((item) => item.name),
    );

    if (field.dependsOn && !previousFields.has(field.dependsOn)) {
      errors.push(
        `El campo "${field.name}" depende de "${field.dependsOn}", que debe definirse antes en el schema`,
      );
    }

    if (field.hiddenWhen && !fieldNames.has(field.hiddenWhen.field)) {
      errors.push(
        `El campo "${field.name}" referencia hiddenWhen.field inexistente: ${field.hiddenWhen.field}`,
      );
    }

    if (field.autoValueWhen && !fieldNames.has(field.autoValueWhen.field)) {
      errors.push(
        `El campo "${field.name}" referencia autoValueWhen.field inexistente: ${field.autoValueWhen.field}`,
      );
    }
  }

  private applyAutoValueOrValidate(
    field: CredentialFieldSchema,
    rawValue: unknown,
    normalized: CredentialMetadata,
    errors: string[],
    autoValue?: string,
    allowPartial = false,
  ): void {
    const resolvedAutoValue =
      autoValue ?? this.resolveAutoValue(field, normalized);

    if (resolvedAutoValue === undefined) {
      if (field.required && !allowPartial) {
        errors.push(`El campo "${field.label}" es requerido`);
      }
      return;
    }

    if (this.isEmpty(rawValue)) {
      normalized[field.name] = resolvedAutoValue;
      return;
    }

    const value = String(rawValue).trim();
    if (value !== resolvedAutoValue) {
      errors.push(
        `${field.label}: el valor no coincide con la regla automática del formulario`,
      );
      return;
    }

    normalized[field.name] = resolvedAutoValue;
  }

  private isHidden(
    field: CredentialFieldSchema,
    metadata: CredentialMetadata,
  ): boolean {
    if (!field.hiddenWhen) {
      return false;
    }

    const parentValue = metadata[field.hiddenWhen.field];
    if (parentValue === undefined || parentValue === null) {
      return false;
    }

    return field.hiddenWhen.values.includes(String(parentValue));
  }

  private resolveAutoValue(
    field: CredentialFieldSchema,
    metadata: CredentialMetadata,
  ): string | undefined {
    if (!field.autoValueWhen) {
      return undefined;
    }

    const parentValue = metadata[field.autoValueWhen.field];
    if (parentValue === undefined || parentValue === null) {
      return undefined;
    }

    return field.autoValueWhen.values[String(parentValue)];
  }

  private resolveAllowedOptions(
    field: CredentialFieldSchema,
    metadata: CredentialMetadata,
  ): string[] {
    if (field.dependsOn) {
      const parentValue = metadata[field.dependsOn];
      if (
        parentValue === undefined ||
        parentValue === null ||
        parentValue === ""
      ) {
        return [];
      }

      const parentKey = String(parentValue);
      const groups = field.optionGroupsByParent?.[parentKey];
      if (groups?.length) {
        return this.flattenOptionGroups(groups);
      }

      const options = field.optionsByParent?.[parentKey];
      if (options?.length) {
        return options;
      }

      return [];
    }

    return field.options ?? [];
  }

  private flattenOptionGroups(groups: CredentialFieldOptionGroup[]): string[] {
    return groups.flatMap((group) =>
      group.options.map((option) => option.value),
    );
  }

  private isEmpty(rawValue: unknown): boolean {
    return (
      rawValue === undefined ||
      rawValue === null ||
      rawValue === "" ||
      (Array.isArray(rawValue) && rawValue.length === 0)
    );
  }

  private validateFieldValue(
    field: CredentialFieldSchema,
    rawValue: unknown,
    metadata: CredentialMetadata,
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
        return this.validateOption(rawValue, field, metadata);
      case "checkbox":
        return this.validateCheckbox(rawValue, field, metadata);
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
    metadata: CredentialMetadata,
  ): string {
    const value = String(rawValue).trim();
    const options = this.resolveAllowedOptions(field, metadata);

    if (options.length > 0 && !options.includes(value)) {
      throw new Error("debe ser una de las opciones permitidas");
    }

    if (
      options.length === 0 &&
      field.dependsOn &&
      field.required !== false
    ) {
      throw new Error("no hay opciones válidas para la selección actual");
    }

    return value;
  }

  private validateCheckbox(
    rawValue: unknown,
    field: CredentialFieldSchema,
    metadata: CredentialMetadata,
  ): string[] {
    const values = Array.isArray(rawValue)
      ? rawValue.map((item) => String(item).trim())
      : [String(rawValue).trim()];
    const options = this.resolveAllowedOptions(field, metadata);

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
