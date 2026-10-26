1. Add `types` first to angular exports. 2. Remove angular from typecheck exemption in the packed-consumer harness so the packed tarball is type-checked under bundler and NodeNext (the harness is the existing consumer test). 3. Refresh public-api baseline and doc-bridge index. 4. Patch changeset.
Departure: reused the existing packed-consumer fixture rather than a new temp-project test.
