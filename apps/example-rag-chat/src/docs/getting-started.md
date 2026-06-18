# Getting started with Nimbus

Nimbus is a small object-storage service for developers. This guide gets you
from zero to your first uploaded file in about five minutes.

## Create an account

Sign up at https://nimbus.example.com/signup. Every new account starts on the
**Free** plan, which includes 5 GB of storage and 50 GB of egress per month.
No credit card is required to start.

## Get your API key

Open **Settings → API keys** and click **Create key**. A key looks like
`nmb_live_xxxxxxxxxxxx`. Treat it like a password — it grants full access to
your buckets. You can revoke a key at any time from the same screen.

## Create your first bucket

Buckets are the top-level containers for your files. Create one with the CLI:

```bash
nimbus bucket create my-first-bucket --region us-east-1
```

Bucket names are globally unique and must be lowercase. Once created, a bucket
cannot be renamed — you would delete it and create a new one.

## Upload a file

```bash
nimbus cp ./photo.png nimbus://my-first-bucket/photo.png
```

Files are private by default. See the **Access control** guide to make a file
public or to generate a temporary signed URL.
