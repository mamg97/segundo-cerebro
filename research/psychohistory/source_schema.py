"""Strict aliases for the official UCDP OrganizedViolenceCY country-year CSV.

The 26.1 codebook documents *_cy columns; the historical benchmark uses
shorter internal names. This adapter only changes FIELD NAMES, never values,
and must only be called AFTER checking pinned ZIP and PDF SHA-256 hashes.
A missing Version column is bound to the independently pinned edition,
not treated as evidence of its historical publication date.
"""
from __future__ import annotations

CANONICAL_TO_CODEBOOK = {
    'country': 'country_cy',
    'country_id': 'country_id_cy',
    'year': 'year_cy',
    'region': 'region_cy',
    'sb_total_deaths_best': 'sb_total_deaths_best_cy',
    'sb_total_deaths_low': 'sb_total_deaths_low_cy',
    'sb_total_deaths_high': 'sb_total_deaths_high_cy',
    'ns_total_deaths_best': 'ns_total_deaths_best_cy',
    'os_total_deaths_best': 'os_total_deaths_best_cy',
}
CANONICAL_FIELDS = set(CANONICAL_TO_CODEBOOK) | {'Version'}
CODEBOOK_FIELDS = set(CANONICAL_TO_CODEBOOK.values())


def normalized_source_rows(reader, *, pinned_version):
    """Yield canonical rows; reject partial, mixed, malformed and ambiguous schemas.

    The caller MUST have already validated both original source hashes.
    Preserve all other columns and the original numeric values as strings.
    """
    fields = reader.fieldnames or []
    if len(fields) != len(set(fields)):
        raise ValueError('Duplicate source header')
    present = set(fields)
    if CODEBOOK_FIELDS.issubset(present) and not (present & set(CANONICAL_TO_CODEBOOK)):
        mode = 'codebook'
    elif CANONICAL_FIELDS.issubset(present) and not (present & CODEBOOK_FIELDS):
        mode = 'canonical'
    else:
        raise ValueError('Source schema is incomplete, mixed or ambiguous')

    for raw in reader:
        if None in raw or any(value is None for value in raw.values()):
            raise ValueError('Malformed source CSV row')
        if mode == 'canonical':
            if raw['Version'] != pinned_version:
                raise ValueError('Source edition differs from pinned protocol')
            yield raw
        else:
            if 'Version' in raw and raw['Version'] != pinned_version:
                raise ValueError('Source edition differs from pinned protocol')
            result = dict(raw)
            for canonical, official in CANONICAL_TO_CODEBOOK.items():
                result[canonical] = result.pop(official)
            result['Version'] = pinned_version
            yield result
