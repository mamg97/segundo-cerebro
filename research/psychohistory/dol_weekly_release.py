"""Extract one DOL advance SA initial-claims value from pinned private PDF bytes.

Narrative and regular-state-program table must agree on date/value. This is a
candidate extraction, not proof of actual release time, first edition or issuance.
"""
from __future__ import annotations
import argparse
import calendar
from datetime import date, datetime, timedelta, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import re
from zoneinfo import ZoneInfo
from issue_2027_preflight import safe_private_file
from prospective_draft_ledger import private_root
from weekly_reference_pilot import resolution_candidate, utc

EASTERN = ZoneInfo('America/New_York')
MONTHS = {name:i for i,name in enumerate(calendar.month_name) if name}
MONTH = '('+'|'.join(MONTHS)+')'
NUMBER = r'(?:0|[1-9][0-9]{0,2}(?:,[0-9]{3})*)'


def one(matches, description):
    if len(matches) != 1:
        raise ValueError('Missing or ambiguous '+description)
    return matches[0]


def count(value):
    if not re.fullmatch(NUMBER, value):
        raise ValueError('Noncanonical count')
    return int(value.replace(',', ''))


def month_day(month, day, reference):
    # Resolve December/January from release date, never from today's year.
    candidates=[]
    for year in (reference.year-1, reference.year):
        try:
            candidate=date(year, MONTHS[month], int(day))
        except ValueError:
            continue
        if timedelta(0) < reference-candidate <= timedelta(days=14):
            candidates.append(candidate)
    return one(candidates, 'target year/date')


def extract(pages, *, target, release_date):
    if (not isinstance(pages,list) or not 4<=len(pages)<=15 or
            any(not isinstance(page,str) or len(page)>200_000 for page in pages)):
        raise ValueError('Complete bounded PDF page texts required')
    day, week = date.fromisoformat(release_date), date.fromisoformat(target)
    if day.isoformat()!=release_date or week.isoformat()!=target or week.weekday()!=5:
        raise ValueError('ISO release date and Saturday target required')
    first=' '.join(pages[0].split())
    if 'UNEMPLOYMENT INSURANCE WEEKLY CLAIMS' not in first:
        raise ValueError('Wrong report identity')
    pattern = (r'8:30 A\.M\. \(Eastern\) (Monday|Tuesday|Wednesday|Thursday|Friday), '
               +MONTH+r' ([0-9]{1,2}), ([0-9]{4})')
    weekday, month, dom, year = one(re.findall(pattern, first), 'embargo header')
    reported=date(int(year),MONTHS[month],int(dom))
    if reported!=day or calendar.day_name[day.weekday()]!=weekday:
        raise ValueError('Release header date/weekday mismatch')
    # Delimit SA narrative; do not search NSA, insured unemployment or averages.
    if first.count('SEASONALLY ADJUSTED DATA')!=1:
        raise ValueError('Ambiguous seasonally adjusted narrative')
    section=first.split('SEASONALLY ADJUSTED DATA',1)[1]
    pattern=(r'In the week ending '+MONTH+r' ([0-9]{1,2}), the advance figure for '
             r'seasonally adjusted initial claims was ('+NUMBER+r'),')
    month, dom, value = one(re.findall(pattern,section),'advance SA initial claims narrative')
    if month_day(month,dom,day)!=week:
        raise ValueError('Narrative target differs')
    narrative_value=count(value)
    table_pages=[(i,p) for i,p in enumerate(pages)
                 if 'UNEMPLOYMENT INSURANCE DATA FOR REGULAR STATE PROGRAMS' in p]
    index, table=one(table_pages,'regular-state-program table page')
    lines=[line.strip() for line in table.splitlines() if line.strip()]
    indexes=[i for i,line in enumerate(lines) if line.startswith('Initial Claims (SA)')]
    position=one(indexes,'SA initial claims row')
    if position==0:
        raise ValueError('Table target header absent')
    header=lines[position-1]
    dates=re.fullmatch(r'WEEK ENDING '+MONTH+r' ([0-9]{1,2}) '+MONTH+
                       r' ([0-9]{1,2}) Change '+MONTH+r' ([0-9]{1,2}) Prior Year1?',header)
    if not dates:
        raise ValueError('Table header layout changed')
    groups=dates.groups()
    for n, expected in enumerate((week,week-timedelta(days=7),week-timedelta(days=14))):
        if (MONTHS[groups[2*n]],int(groups[2*n+1]))!=(expected.month,expected.day):
            raise ValueError('Table dates differ from target/previous weeks')
    row=re.fullmatch(r'Initial Claims \(SA\) ('+NUMBER+r') ('+NUMBER+r') ([+-]?'+
                     NUMBER+r') ('+NUMBER+r') ('+NUMBER+r')',lines[position])
    if not row:
        raise ValueError('Table value layout changed')
    current, previous, change, older, prior_year=row.groups()
    current,previous=count(current),count(previous)
    delta=int(change.replace(',',''))
    if current!=narrative_value or current-previous!=delta:
        raise ValueError('Narrative/table or table change disagree')
    nominal=datetime.combine(day,datetime.min.time(),EASTERN).replace(hour=8,minute=30)
    return dict(schema='psychohistory.dol_advance_extraction.v1',
                status='EXTRACTED_CANDIDATE_NOT_ADMITTED', target_week=target,
                release_date=release_date, advance_initial_claims_sa=current,
                previous_week_revised_sa=previous, change_from_revised=delta,
                table_page=index+1, nominal_embargo_utc=nominal.astimezone(timezone.utc).isoformat(),
                source_first_edition_verified=False, actual_release_time_verified=False,
                forecast_issued=False, evaluation_eligible=False)


def inspect_pdf(raw, *, expected_sha256, target, release_date):
    if (not isinstance(raw,bytes) or not raw.startswith(b'%PDF-') or len(raw)>15_000_000 or
            not re.fullmatch(r'[0-9a-f]{64}',expected_sha256) or
            hashlib.sha256(raw).hexdigest()!=expected_sha256):
        raise ValueError('Pinned original PDF required')
    import pdfplumber  # Optional PDF runtime only; pure extraction tests use text fixtures.
    with pdfplumber.open(io.BytesIO(raw)) as pdf:
        if not 4<=len(pdf.pages)<=15:
            raise ValueError('Unexpected PDF page count')
        pages=[page.extract_text() or '' for page in pdf.pages]
    result=extract(pages,target=target,release_date=release_date)
    result.update(source_pdf_sha256=expected_sha256,pdfplumber_version=pdfplumber.__version__,
                  extracted_pages_sha256=hashlib.sha256(json.dumps(pages,ensure_ascii=False).encode()).hexdigest())
    return result


def candidate_from_pdf(plan, raw, *, expected_sha256, release_at, captured_at):
    """Reuse the frozen threshold, but do not admit a plan as actually issued."""
    release=utc(release_at)
    result=inspect_pdf(raw,expected_sha256=expected_sha256,target=plan['target_week'],
                       release_date=release.astimezone(EASTERN).date().isoformat())
    if release<utc(result['nominal_embargo_utc']):
        raise ValueError('Observed release cannot precede its nominal embargo')
    return dict(resolution_candidate(plan,target=result['target_week'],
                                    value=result['advance_initial_claims_sa'],
                                    release_at=release_at,captured_at=captured_at,source_pdf=raw),
                extraction=result, evaluation_eligible=False)


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--pdf',required=True,type=Path)
    cli.add_argument('--sha256',required=True)
    cli.add_argument('--target',required=True)
    cli.add_argument('--release-date',required=True)
    cli.add_argument('--out',required=True,type=Path)
    args=cli.parse_args()
    private_root(args.out.parent)
    if args.out.exists() or args.out.is_symlink() or not args.out.parent.is_dir():
        cli.error('New private output required')
    result=inspect_pdf(safe_private_file(args.pdf).read_bytes(),expected_sha256=args.sha256,
                       target=args.target,release_date=args.release_date)
    result['code_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    with os.fdopen(os.open(args.out,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600),'w') as output:
        json.dump(result,output,indent=2,allow_nan=False);output.write('\n')
        output.flush();os.fsync(output.fileno())
    print(json.dumps({k:result[k] for k in ('status','target_week','evaluation_eligible')}))


if __name__=='__main__':main()
