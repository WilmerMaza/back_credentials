/**
 * Contrato del schema JSON almacenado en `CredentialType.schema` (JSONB).
 *
 * El schema describe el formulario dinámico de cada tipo de credencial.
 * El frontend lo consume vía GET /credential-types/:code para renderizar campos.
 * El backend valida `metadata` contra este contrato en POST/PATCH /credentials.
 *
 * @see docs/CREDENTIALS_METADATA.md — referencia completa del JSON
 * @see src/credentials/domain/credential-type-schemas.ts — catálogos por tipo
 */

/** Tipos de control soportados en el formulario dinámico. */
export type CredentialFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "email"
  | "select"
  | "radio"
  | "checkbox"
  | "boolean";

/** Opción con valor persistido y etiqueta visible (usado en optionGroupsByParent). */
export interface CredentialFieldOption {
  /** Valor que se guarda en metadata. */
  value: string;
  /** Texto mostrado al usuario. */
  label: string;
}

/** Grupo de opciones para un &lt;optgroup&gt; en selects dependientes. */
export interface CredentialFieldOptionGroup {
  /** Nombre del grupo (ej. "Oficiales", "Suboficiales"). */
  name: string;
  options: CredentialFieldOption[];
}

/**
 * Oculta el campo cuando otro campo tiene uno de los valores indicados.
 * El usuario no selecciona manualmente; usar junto con autoValueWhen si aplica.
 */
export interface CredentialFieldHiddenWhen {
  /** Nombre del campo que se evalúa (debe existir antes en schema.fields). */
  field: string;
  /** Valores del campo referenciado que activan el ocultamiento. */
  values: string[];
}

/**
 * Asigna un valor fijo a este campo según el valor de otro campo.
 * Usado, por ejemplo, cuando category = IMP → grades auto-asignado.
 */
export interface CredentialFieldAutoValueWhen {
  /** Nombre del campo padre cuyo valor dispara la asignación. */
  field: string;
  /** Mapa valorPadre → valor a persistir en este campo. */
  values: Record<string, string>;
}

/**
 * Definición de un campo del formulario dinámico.
 *
 * Campos planos: usar `options` para listas fijas (select/radio/checkbox).
 * Campos en cascada: usar `dependsOn` + `optionsByParent` o `optionGroupsByParent`.
 */
export interface CredentialFieldSchema {
  /** Clave persistida en metadata (ej. "force", "category", "grades"). */
  name: string;
  /** Etiqueta visible en el formulario. */
  label: string;
  type: CredentialFieldType;

  // --- Validación básica ---
  /** Si true, el campo debe enviarse en metadata (salvo reglas hiddenWhen/autoValueWhen). */
  required?: boolean;
  /** Longitud mínima (text, textarea). */
  minLength?: number;
  /** Longitud máxima (text, textarea). */
  maxLength?: number;
  /** Valor numérico mínimo (number). */
  min?: number;
  /** Valor numérico máximo (number). */
  max?: number;
  /** Expresión regular para validar texto. */
  pattern?: string;
  /**
   * Opciones fijas cuando el campo NO depende de otro.
   * Para selects en cascada, preferir optionsByParent / optionGroupsByParent.
   */
  options?: string[];

  // --- Cascada (opcional, retrocompatible) ---
  /**
   * Nombre del campo padre que filtra las opciones de este campo.
   * El padre debe aparecer antes en schema.fields.
   * Si el padre está vacío, el hijo no tiene opciones válidas.
   */
  dependsOn?: string;
  /**
   * Mapa valorPadre → lista de opciones permitidas (select plano).
   * Ej.: { "ejercito": ["ArmyOfficer", "ArmySubofficer", "IMP"] }
   */
  optionsByParent?: Record<string, string[]>;
  /**
   * Mapa valorPadre → grupos con optgroups (prioridad sobre optionsByParent).
   * Usado en Armada para agrupar Oficiales / Suboficiales / IMP.
   */
  optionGroupsByParent?: Record<string, CredentialFieldOptionGroup[]>;
  /**
   * Mapa value → label para mostrar texto legible de códigos internos.
   * No cambia lo que se persiste; solo ayuda al frontend.
   */
  optionLabels?: Record<string, string>;
  /** Si aplica, el campo no es seleccionable por el usuario. */
  hiddenWhen?: CredentialFieldHiddenWhen;
  /** Valor automático a persistir cuando hiddenWhen aplica o coincide el padre. */
  autoValueWhen?: CredentialFieldAutoValueWhen;
  /**
   * Valor sugerido en el formulario cuando el campo padre coincide.
   * El frontend debe preseleccionarlo al cambiar el padre (ej. grado → aspirante).
   */
  defaultValueWhen?: CredentialFieldAutoValueWhen;
}

/** Raíz del JSON en CredentialType.schema. */
export interface CredentialTypeSchema {
  /** Orden de fields = orden del formulario y de resolución de dependsOn. */
  fields: CredentialFieldSchema[];
}

/** Valores dinámicos persistidos en Credential.metadata (JSONB). */
export type CredentialMetadata = Record<string, unknown>;

/**
 * Alias legacy aceptados en escritura y normalizados antes de validar.
 * Las respuestas de lectura usan siempre las claves canónicas.
 */
export const LEGACY_METADATA_ALIASES = {
  categorie: "category",
  rank: "grades",
} as const;

/** Códigos de tipo legacy aceptados en escritura. */
export const LEGACY_CREDENTIAL_TYPE_CODES: Record<string, string> = {
  cadetes: "alumnos_baena",
  "inter-escuelas": "alumnos_baena",
  inter_escuelas: "alumnos_baena",
};

export function normalizeCredentialTypeCode(code: string): string {
  const normalized = code.trim().toLowerCase();
  return LEGACY_CREDENTIAL_TYPE_CODES[normalized] ?? normalized;
}
