"""Outcome-blind source-name comparison; never certify geographic identity."""
from __future__ import annotations
import csv
import io
import unicodedata
from datetime import date, timedelta
from collections import defaultdict
from cow_gw_token_review import _records, _membership


def _name(x):
    if not isinstance(x, str) or not x.strip():
        raise ValueError('Blank state label')
    return ' '.join(unicodedata.normalize('NFKC', x).casefold().split())


def _source(raw, kind):
    interval_rows = _records(raw, kind)
    if kind == 'cow':
        reader = csv.DictReader(io.StringIO(raw.decode('utf-8-sig'), newline=''))
        field = 'statenme'
    else:
        try:
            txt = raw.decode('utf-8-sig')
        except UnicodeDecodeError:
            txt = raw.decode('cp1252')
        reader = csv.DictReader(io.StringIO(txt, newline=''), delimiter='\t')
        field = 'countryname'
    labels = [_name(row[field]) for row in reader]
    if len(labels) != len(interval_rows):
        raise ValueError('Source membership and names differ')
    return [(code, token, start, end, label)
            for (code, token, start, end), label in zip(interval_rows, labels)]
