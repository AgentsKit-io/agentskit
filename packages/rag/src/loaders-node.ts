import { RagError, RagErrorCodes } from './errors'
import { loadS3 as loadS3Universal } from './loaders'
import type { InputDocument } from './types'
import type { S3LoaderOptions } from './loaders'

export * from './loaders'

type S3Commands = NonNullable<S3LoaderOptions['commands']>

let cachedS3Sdk: Promise<S3Commands> | null = null
const importOptionalPeer = (moduleId: string): Promise<unknown> => import(/* @vite-ignore */ moduleId)

async function loadS3Sdk(): Promise<S3Commands> {
  if (!cachedS3Sdk) {
    cachedS3Sdk = (async () => {
      try {
        return (await importOptionalPeer('@aws-sdk/client-s3')) as S3Commands
      } catch {
        throw new RagError({
          code: RagErrorCodes.AK_RAG_PEER_MISSING,
          message: 'Install @aws-sdk/client-s3 to use loadS3: npm install @aws-sdk/client-s3',
          hint: 'loadS3 uses the optional peer "@aws-sdk/client-s3".',
        })
      }
    })()
  }
  return cachedS3Sdk
}

export async function loadS3(options: S3LoaderOptions): Promise<InputDocument[]> {
  const commands = options.commands ?? await loadS3Sdk()
  return loadS3Universal({ ...options, commands })
}
