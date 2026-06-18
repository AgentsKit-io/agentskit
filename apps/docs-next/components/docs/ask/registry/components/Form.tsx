'use client'

import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { UiToolProps } from '../define-ui-tool'

type FieldType = 'text' | 'password' | 'select' | 'number'

interface Field {
  name: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
  options?: string[]
}

/** `renderForm` tool args — see `renderFormTool` in `protocol.ts`. */
interface FormArgs {
  title?: string
  fields: Field[]
  submitLabel: string
  action: string
}

const FIELD_TYPES: ReadonlySet<FieldType> = new Set([
  'text',
  'password',
  'select',
  'number',
])

function narrow(args: unknown): FormArgs | null {
  if (typeof args !== 'object' || args === null) return null
  const o = args as Record<string, unknown>
  if (
    !Array.isArray(o.fields) ||
    typeof o.submitLabel !== 'string' ||
    typeof o.action !== 'string'
  ) {
    return null
  }
  const fields: Field[] = []
  for (const f of o.fields) {
    if (typeof f !== 'object' || f === null) continue
    const r = f as Record<string, unknown>
    if (typeof r.name !== 'string' || typeof r.label !== 'string') continue
    const type = FIELD_TYPES.has(r.type as FieldType) ? (r.type as FieldType) : 'text'
    fields.push({
      name: r.name,
      label: r.label,
      type,
      placeholder: typeof r.placeholder === 'string' ? r.placeholder : undefined,
      required: r.required === true,
      options: Array.isArray(r.options)
        ? r.options.filter((x): x is string => typeof x === 'string')
        : undefined,
    })
  }
  if (fields.length === 0) return null
  return {
    title: typeof o.title === 'string' ? o.title : undefined,
    fields,
    submitLabel: o.submitLabel,
    action: o.action,
  }
}

const FIELD_CLASS =
  'w-full rounded-md border border-ak-border bg-ak-midnight px-2.5 py-1.5 font-mono text-xs text-ak-foam outline-none transition-colors focus:border-ak-blue'

/**
 * Renders a small input form. Submitting calls `ctx.onSubmit(action, values)`.
 * Local controlled state keeps the form usable; the host owns the action.
 */
export function Form({ args, ctx }: UiToolProps<unknown>) {
  const a = narrow(args)
  const initial = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const f of a?.fields ?? []) m[f.name] = ''
    return m
  }, [a])
  const [values, setValues] = useState<Record<string, string>>(initial)

  const set = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (a) ctx.onSubmit?.(a.action, values)
    },
    [a, ctx, values],
  )

  if (!a) return null

  return (
    <form
      data-ak-tool="renderForm"
      onSubmit={onSubmit}
      className="my-1 flex flex-col gap-2 rounded-lg border border-ak-border bg-ak-surface p-3"
    >
      {a.title ? (
        <div className="font-display text-sm font-semibold text-ak-foam">{a.title}</div>
      ) : null}
      {a.fields.map((f) => (
        <label key={f.name} className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ak-graphite">
            {f.label}
            {f.required ? <span className="text-ak-red"> *</span> : null}
          </span>
          {f.type === 'select' ? (
            <select
              data-ak-field={f.name}
              required={f.required}
              value={values[f.name] ?? ''}
              onChange={(e) => set(f.name, e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="" disabled>
                {f.placeholder ?? 'Select…'}
              </option>
              {(f.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              data-ak-field={f.name}
              type={f.type === 'number' ? 'number' : f.type === 'password' ? 'password' : 'text'}
              required={f.required}
              placeholder={f.placeholder}
              value={values[f.name] ?? ''}
              onChange={(e) => set(f.name, e.target.value)}
              className={FIELD_CLASS}
            />
          )}
        </label>
      ))}
      <button
        type="submit"
        data-ak-submit=""
        className="mt-1 self-start rounded-md bg-ak-blue px-3 py-1.5 font-mono text-xs font-semibold text-ak-midnight transition-colors hover:bg-ak-foam"
      >
        {a.submitLabel}
      </button>
    </form>
  )
}
