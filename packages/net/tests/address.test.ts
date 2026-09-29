import { describe, expect, it } from 'vitest'
import { assertPublicUrl, classifyAddress, isPublicAddress } from '../src/address'

describe('isPublicAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '255.255.255.255',
    '224.0.0.1',
    '::1',
    '::',
    'fe80::1',
    'fc00::1',
    'fd12:3456::1',
    '::ffff:10.0.0.1',
    '::ffff:127.0.0.1',
    '64:ff9b::a00:1',
    '[::1]',
  ])('rejects non-public %s', address => {
    expect(isPublicAddress(address)).toBe(false)
  })

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'])('accepts public %s', address => {
    expect(isPublicAddress(address)).toBe(true)
  })

  it('returns undefined for non-addresses', () => {
    expect(classifyAddress('example.com')).toBeUndefined()
    expect(isPublicAddress('not an ip')).toBe(false)
  })
})

describe('assertPublicUrl', () => {
  const lookupTo = (...addresses: string[]) => async () => addresses

  it('accepts public URLs and reports resolved addresses', async () => {
    await expect(assertPublicUrl('https://8.8.8.8/x')).resolves.toMatchObject({ addresses: ['8.8.8.8'] })
    await expect(assertPublicUrl('https://example.com', { lookup: lookupTo('93.184.216.34') })).resolves.toMatchObject({
      addresses: ['93.184.216.34'],
    })
    await expect(assertPublicUrl('https://example.com')).resolves.toMatchObject({ addresses: [] })
  })

  it.each([
    'http://127.0.0.1/',
    'http://0x7f.1/',
    'http://2130706433/',
    'http://[::1]/',
    'http://[::ffff:169.254.169.254]/',
    'http://169.254.169.254/latest/meta-data',
    'http://localhost:3000',
    'http://api.localhost/',
    'http://printer.local/',
    'http://db.internal./',
  ])('blocks %s', async url => {
    await expect(assertPublicUrl(url)).rejects.toMatchObject({ code: 'AK_NET_BLOCKED_ADDRESS' })
  })

  it('blocks hosts that resolve to any private address', async () => {
    await expect(assertPublicUrl('https://evil.test', { lookup: lookupTo('93.184.216.34', '10.0.0.5') })).rejects.toMatchObject({
      code: 'AK_NET_BLOCKED_ADDRESS',
    })
    await expect(assertPublicUrl('https://empty.test', { lookup: lookupTo() })).rejects.toMatchObject({ code: 'AK_NET_BLOCKED_ADDRESS' })
  })

  it('blocks other protocols and invalid URLs', async () => {
    await expect(assertPublicUrl('file:///etc/passwd')).rejects.toMatchObject({ code: 'AK_NET_BLOCKED_ADDRESS' })
    await expect(assertPublicUrl('ftp://8.8.8.8/')).rejects.toMatchObject({ code: 'AK_NET_BLOCKED_ADDRESS' })
    await expect(assertPublicUrl('not a url')).rejects.toMatchObject({ code: 'AK_NET_INVALID_INPUT' })
  })

  it('lets explicitly trusted hosts through', async () => {
    await expect(assertPublicUrl('http://localhost:8080', { allowHosts: ['localhost'] })).resolves.toMatchObject({ addresses: [] })
  })
})
