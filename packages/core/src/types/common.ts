/** Accept a value returned synchronously or through a promise. */
export type MaybePromise<T> = T | Promise<T>

/** Cloud region used to describe where a service stores or processes data. */
export type DataRegion = 'eu' | 'us' | 'apac'
