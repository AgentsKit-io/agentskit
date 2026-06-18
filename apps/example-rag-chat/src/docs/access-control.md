# Access control in Nimbus

Every object in Nimbus is **private by default**. There are three ways to grant
access: signed URLs, public objects, and IAM policies.

## Signed URLs

A signed URL grants temporary read (or write) access to a single object without
exposing your API key. Generate one with the CLI:

```bash
nimbus sign nimbus://my-bucket/report.pdf --expires 1h
```

The maximum expiry is **7 days**. Signed URLs cannot be revoked individually —
they simply stop working when they expire. To cut off all signed URLs early,
rotate the bucket's signing key under **Bucket → Security**.

## Public objects

Mark a single object public:

```bash
nimbus acl set nimbus://my-bucket/logo.png public-read
```

Public objects are served over a CDN and are cacheable for up to 1 hour. To make
an entire bucket public, set the bucket policy to `public-read` instead.

## IAM policies

For machine-to-machine access, create a scoped key under **Settings → IAM**.
A scoped key can be limited to specific buckets and actions, for example
read-only access to a single bucket. Scoped keys are the recommended way to give
a production service access — never ship a full `nmb_live_` key in client code.
