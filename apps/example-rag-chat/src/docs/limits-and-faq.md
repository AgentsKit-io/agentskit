# Limits and FAQ

## Hard limits

- Maximum object size: **5 TB** per object.
- Maximum bucket count: 100 per project (contact support to raise this).
- Maximum key length: 1024 characters.
- API rate limit: 1000 requests per second per account, bursting to 2000.

Requests that exceed the rate limit receive an HTTP `429` with a `Retry-After`
header. The CLI retries `429` responses automatically with exponential backoff.

## Frequently asked questions

### How do I delete a bucket?

A bucket must be empty before it can be deleted. Empty it, then run:

```bash
nimbus bucket delete my-bucket
```

### Can I move data between regions?

There is no in-place region move. Copy the objects to a bucket in the target
region with `nimbus cp --recursive`, then delete the source bucket. Cross-region
copies count as egress and are billed accordingly.

### What happens if I hit my storage quota on the Free plan?

Uploads start failing with an HTTP `507` once you exceed 5 GB. Existing files
remain readable. Upgrade to Pro or delete files to resume uploads.

### Is data encrypted?

Yes. All objects are encrypted at rest with AES-256, and all traffic is served
over TLS 1.2 or higher. Encryption is always on and cannot be disabled.
