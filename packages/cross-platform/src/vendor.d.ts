// cross-spawn ships its cmd.exe escaping helpers without type declarations.
declare module 'cross-spawn/lib/util/escape.js' {
  const escape: {
    command: (command: string) => string
    argument: (argument: string, doubleEscapeMetaChars: boolean) => string
  }
  export default escape
}
