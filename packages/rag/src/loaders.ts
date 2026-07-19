/**
 * Document loaders: small async functions returning `InputDocument[]` ready to
 * pipe into `RAG.ingest`. Framework-agnostic; each accepts a custom `fetch`.
 *
 * Implementation lives under `./loaders/`; this module is the stable re-export
 * surface imported by index, Node override, and tests.
 */

export type { LoaderOptions } from './loaders/shared'

export {
  loadUrl,
  loadGitHubFile,
  loadGitHubTree,
  loadNotionPage,
  loadConfluencePage,
  loadGoogleDriveFile,
  loadPdf,
} from './loaders/documents'
export type {
  UrlLoaderOptions,
  GitHubLoaderOptions,
  GitHubTreeOptions,
  NotionLoaderOptions,
  ConfluenceLoaderOptions,
  DriveLoaderOptions,
  PdfLoaderOptions,
} from './loaders/documents'

export { loadS3 } from './loaders/s3'
export type { S3LoaderOptions, S3LikeClient } from './loaders/s3'

export {
  loadGcs,
  loadDropbox,
  loadOneDrive,
} from './loaders/cloud'
export type {
  GcsLoaderOptions,
  DropboxLoaderOptions,
  OneDriveLoaderOptions,
} from './loaders/cloud'
