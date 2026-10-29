# Recoverable local observation of public issuer files

`issuer_observation.py` captures the two contracted issuer XLSX endpoints into
one new private directory. It reuses the source intake gate, archives original
bytes with observed SHA-256, records retrieval start/end and bounded response
headers, and writes an explicit complete/incomplete manifest. No authentication,
upload, paid service, scheduler, external time authority or forecast is used.

Only the contracted HTTPS URLs are permitted. Redirects require contract review.
The caller supplies a new private path outside Git. Originals and manifest use
create-only writes, directory mode 0700 and file mode 0600. A partial download
retains received bounded bytes and an incomplete manifest. HTML is quarantined;
it cannot become a successful source capture. Original source metadata issues
are retained and still block scientific source admission.

```sh
python3 research/psychohistory/issuer_observation.py --out-dir /PRIVATE/new-observation
```

The CLI has no date override. Directory names and HTTP Date/Last-Modified headers
are not independent evidence of when exact bytes first became public. Local
capture times support recovery and comparison with a later capture; they do
not establish historical point-in-time availability or a trusted cryptographic
stamp. Full contemporaneous provenance remains a separate gate.

`LOCAL_OBSERVATION_COMPLETE` means both responses were preserved and parsed.
It does not mean `SOURCE_ADMITTED`, a market-price reconstruction, model
validation, current-risk estimate, or an issued forecast. NAV is not an
executable market price. Repeated identical captures are observations, not new
research samples or new evidence of model skill.

Synthetic tests exercise original bytes/checksums, create-only permissions,
private-path and endpoint restrictions, partial network failure, HTML quarantine,
response-header filtering and preservation of source anomalies. Real snapshots
and provenance records remain private. The helper is on demand; this change
creates no recurring automation or public dataset mirror.
