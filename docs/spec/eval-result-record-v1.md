# Eval result record v1

The `@agentskit/eval/provenance` API exposes `ResultRecordInput`, `ResultRecord`,
`ResultMetric`, `createResultRecord`, `serializeResultRecord`,
`verifyResultRecord`, and `precisionRecall`.

An input contains non-empty string `suiteId`, lowercase SHA-256 `caseSetDigest`,
`subject` with non-empty string `revision` and lowercase SHA-256 `digest`,
non-empty string `runnerVersion`, a JSON object `metrics`, and optional string
`timestamp`. SHA-256 digests are exactly 64 lowercase hexadecimal characters.
Metrics may contain nested JSON values, including per-unit counts and ratios.
No timestamp is generated implicitly.

Creation validates provenance, removes timestamp and any existing digest, serializes the remaining
content with core RFC 8785 canonical JSON, and computes its UTF-8 SHA-256 digest.
The returned envelope snapshots that content and adds `digest` and the optional
timestamp. Additional enumerable input fields, if supplied, are also hashed.
Core JSON semantics apply; undefined object properties are omitted and undefined
array elements become null. Non-finite numbers and circular references fail.

Serialization returns canonical JSON of the entire envelope, including digest
and timestamp. Reruns with identical content and identical or absent timestamps
produce identical bytes. Different timestamps preserve the content digest but
change serialized bytes.

Verification accepts an unknown value, validates provenance, excludes timestamp
and digest, and recomputes the digest. Invalid input or a mismatch returns false.
This is an integrity check, not a signature or proof of artifact identity.

Precision is `tp / (tp + fp)` and recall is `tp / (tp + fn)`. A zero denominator
returns zero. Counts must be non-negative safe integers; invalid counts throw.
