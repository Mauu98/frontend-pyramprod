import i18n from '@/i18n'

/** Stable, language-agnostic error contract returned by the backend (`ApiError`). */
interface FieldViolation {
  field: string
  rule: string
  params?: Record<string, unknown>
}

interface ApiErrorBody {
  code?: string
  message?: string
  params?: Record<string, unknown>
  fieldErrors?: FieldViolation[]
}

const VALIDATION_ERROR = 'VALIDATION_ERROR'
const NETWORK_KEY = 'generic.network'
const UNKNOWN_KEY = 'generic.unknown'

/** Extracts the backend error body from an axios-like error, or undefined when there was no response. */
function readBody(err: unknown): ApiErrorBody | undefined {
  const data = (err as { response?: { data?: unknown } } | null)?.response?.data
  return data !== null && typeof data === 'object' ? (data as ApiErrorBody) : undefined
}

/** Params whose backend value is a stable enum name, mapped to their `enums.*` translation group. */
const ENUM_PARAMS: Record<string, string> = { method: 'weightMethod' }

/** Translates entity and enum params so they can be interpolated as natural text. */
function localizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const localized = { ...params }
  if (typeof params.entity === 'string') {
    localized.entity = translateOr(`entities.${params.entity}`, params.entity)
  }
  for (const [key, group] of Object.entries(ENUM_PARAMS)) {
    const value = params[key]
    if (typeof value === 'string') localized[key] = translateOr(`enums.${group}.${value}`, value)
  }
  return localized
}

/** Returns the string translation of `key`, or undefined when the key is missing or is a group object. */
function translateString(key: string, options: Record<string, unknown> = {}): string | undefined {
  if (!i18n.exists(key, options)) return undefined
  const value: unknown = i18n.t(key, { ...options, returnObjects: true })
  return typeof value === 'string' ? value : undefined
}

/** Like translateString but returns `fallback` when no string translation exists. */
function translateOr(key: string, fallback: string): string {
  return translateString(key) ?? fallback
}

/** Translates a business/generic code, using `scope` as an i18next context variant when provided. */
function translateCode(code: string, params: Record<string, unknown>): string | undefined {
  let context = typeof params.scope === 'string' ? params.scope : undefined
  if (code === 'NOT_FOUND' && !params.entity) context = 'generic'
  return translateString(code, { ...localizeParams(params), context })
}

/** Translates one field violation: field+rule specific key first, then the generic rule key. */
function translateViolation(violation: FieldViolation): string {
  const field = violation.field.split('.').pop()?.replace(/\[\d+\]$/, '') ?? violation.field
  const label = translateOr(`fields.${field}`, field)
  const params = { ...violation.params, field: label }
  const keys = [`validation.${field}.${violation.rule}`, `validation.${violation.rule}`, 'validation.Invalid']
  for (const key of keys) {
    const text = translateString(key, params)
    if (text) return text
  }
  return label
}

/**
 * Turns any thrown API error into user-facing text in the active language.
 * Order: network failure, validation field errors, known code (+ params), backend message, fallback.
 */
export function translateApiError(err: unknown, fallbackKey?: string): string {
  const body = readBody(err)
  if (!body) return i18n.t(NETWORK_KEY)

  if (body.code === VALIDATION_ERROR && body.fieldErrors?.length) {
    return `${body.fieldErrors.map(v => translateViolation(v).replace(/\.$/, '')).join('. ')}.`
  }

  if (body.code) {
    const translated = translateCode(body.code, body.params ?? {})
    if (translated) return translated
  }

  if (typeof body.message === 'string' && body.message.length > 0) return body.message
  return translateString(fallbackKey ?? UNKNOWN_KEY) ?? i18n.t(UNKNOWN_KEY)
}
