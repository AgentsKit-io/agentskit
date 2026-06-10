import { httpJson, type HttpToolOptions } from '../../http'
import { defineAction } from '../../contract'

interface AcuityRuntimeConfig {
  userId: string
  apiKey: string
}

function opts(config: unknown, fetch: typeof globalThis.fetch): HttpToolOptions {
  const cfg = config as AcuityRuntimeConfig
  const auth = `Basic ${Buffer.from(`${cfg.userId}:${cfg.apiKey}`).toString('base64')}`
  return { baseUrl: 'https://acuityscheduling.com/api/v1', headers: { authorization: auth }, fetch }
}

export const acuityListAppointments = defineAction({
  name: 'acuity_list_appointments',
  description: 'List Acuity Scheduling appointments.',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { max: { type: 'number' }, calendarID: { type: 'number' } },
  },
  async execute(args, { fetch, config }) {
    const result = await httpJson<Array<{ id: number; firstName: string; lastName: string; datetime: string; type: string }>>(opts(config, fetch), {
      method: 'GET',
      path: '/appointments',
      query: { max: typeof args.max === 'number' ? args.max : 25, calendarID: typeof args.calendarID === 'number' ? args.calendarID : undefined },
    })
    return (result ?? []).map((a) => ({ id: a.id, name: `${a.firstName} ${a.lastName}`.trim(), datetime: a.datetime, type: a.type }))
  },
})

export const acuityListAppointmentTypes = defineAction({
  name: 'acuity_list_appointment_types',
  description: 'List Acuity appointment types.',
  sideEffect: 'read',
  schema: { type: 'object', properties: {} },
  async execute(_args, { fetch, config }) {
    const result = await httpJson<Array<{ id: number; name: string; duration: number; price: string }>>(opts(config, fetch), {
      method: 'GET',
      path: '/appointment-types',
    })
    return (result ?? []).map((t) => ({ id: t.id, name: t.name, duration: t.duration, price: t.price }))
  },
})

export const acuityActions = [acuityListAppointments, acuityListAppointmentTypes]
