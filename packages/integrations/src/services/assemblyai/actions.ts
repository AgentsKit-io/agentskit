import { defineAction } from '../../contract'

export const assemblyaiTranscribe = defineAction({
  name: 'assemblyai_transcribe',
  description: 'Submit an audio URL to AssemblyAI for transcription; returns the transcript id + status.',
  sideEffect: 'external',
  schema: {
    type: 'object',
    properties: {
      audio_url: { type: 'string' },
      language_code: { type: 'string' },
    },
    required: ['audio_url'],
  },
  async execute(args, { http }) {
    const result = await http<{ id: string; status: string }>({
      method: 'POST',
      path: '/transcript',
      body: { audio_url: args.audio_url, language_code: args.language_code },
    })
    return { id: result.id, status: result.status }
  },
})

export const assemblyaiGetTranscript = defineAction({
  name: 'assemblyai_get_transcript',
  description: 'Fetch an AssemblyAI transcript by id (poll until status is completed).',
  sideEffect: 'read',
  schema: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
  async execute(args, { http }) {
    const result = await http<{ id: string; status: string; text?: string }>({
      method: 'GET',
      path: `/transcript/${args.id}`,
    })
    return { id: result.id, status: result.status, text: result.text }
  },
})

export const assemblyaiActions = [assemblyaiTranscribe, assemblyaiGetTranscript]
