"""Read-only issuer NAV/distribution intake. Candidate source, never a forecast."""
import argparse
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
import hashlib
import io
import json
import os
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

from equities_drawdown_research import private_path

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
MONTHS = dict(zip(('Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'),range(1,13)))
DIST_HEADERS = ['FUND NAME','TICKER','CUSIP','EX-DATE','RECORD DATE','PAYABLE DATE',
                'DIVIDEND ($)','SHORT TERM CAPITAL GAIN ($)','LONG TERM CAPITAL GAIN ($)','FREQUENCY']


def workbook(raw, sha, name):
    if not re.fullmatch(r'[0-9a-f]{64}', sha or '') or hashlib.sha256(raw).hexdigest() != sha:
        raise ValueError('Workbook SHA mismatch')
    if len(raw) > 16_000_000:
        raise ValueError('Oversized workbook')
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        if len(z.namelist()) != len(set(z.namelist())) or sum(x.file_size for x in z.infolist()) > 64_000_000:
            raise ValueError('Duplicate/oversized ZIP members')
        def xml(path):
            info = z.getinfo(path)
            if info.file_size > 24_000_000:
                raise ValueError('Oversized XML')
            body = z.read(path)
            if b'<!DOCTYPE' in body or b'<!ENTITY' in body:
                raise ValueError('XML entity declarations forbidden')
            return ET.fromstring(body)
        sheets = xml('xl/workbook.xml').find(NS+'sheets')
        if len(sheets) != 1 or sheets[0].get('name') != name:
            raise ValueError('Unexpected worksheet identity')
        links = xml('xl/_rels/workbook.xml.rels')
        matches = [r for r in links if r.get('Id') == sheets[0].get(REL)]
        if len(matches) != 1 or matches[0].get('TargetMode') == 'External':
            raise ValueError('Ambiguous/external worksheet')
        target = matches[0].get('Target', '')
        if re.fullmatch(r'worksheets/sheet\d+\.xml', target):
            target = 'xl/'+target
        elif re.fullmatch(r'/xl/worksheets/sheet\d+\.xml', target):
            target = target[1:]
        else:
            raise ValueError('Unexpected worksheet path')
        strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            strings = [''.join(x.itertext()) for x in xml('xl/sharedStrings.xml')]
        output = []
        for row in xml(target).findall('.//'+NS+'sheetData/'+NS+'row'):
            row_number = row.get('r','')
            if not row_number.isdigit() or not len(output) < int(row_number) <= 50_000:
                raise ValueError('Invalid/duplicate worksheet row')
            output.extend({} for _ in range(int(row_number)-len(output)-1))
            values = {}
            for cell in row:
                address = cell.get('r', '')
                match = re.fullmatch(r'([A-Z]{1,2})([1-9]\d*)', address)
                if (not match or match[2] != row_number or match[1] in values
                        or cell.find(NS+'f') is not None):
                    raise ValueError('Invalid/duplicate/formula cell')
                kind = cell.get('t', 'n')
                value = cell.findtext(NS+'v', '')
                if kind == 's':
                    if not value.isdigit() or int(value) >= len(strings):
                        raise ValueError('Invalid shared string')
                    value = strings[int(value)]
                elif kind == 'inlineStr':
                    value = ''.join(cell.find(NS+'is').itertext())
                elif kind not in ('n', 'str'):
                    raise ValueError('Unsupported cell type')
                values[match[1]] = value.strip()
            output.append(values)
    return output


def decimal(value, blank_zero=False):
    try:
        number = Decimal('0' if blank_zero and value == '' else value)
    except InvalidOperation as exc:
        raise ValueError('Invalid monetary value') from exc
    if not number.is_finite() or number < 0:
        raise ValueError('Negative/nonfinite monetary value')
    return number


def nav_day(text):
    m = re.fullmatch(r'(\d{2})-([A-Z][a-z]{2})-(\d{4})', text)
    if not m or m[2] not in MONTHS:
        raise ValueError('Invalid NAV date')
    return date(int(m[3]), MONTHS[m[2]], int(m[1]))


def distribution_day(text):
    if not re.fullmatch(r'\d{2}/\d{2}/\d{4}', text):
        raise ValueError('Invalid distribution date')
    month, day, year = map(int, text.split('/'))
    return date(year, month, day)


def intake(nav_raw, nav_sha, dist_raw, dist_sha, ticker, captured_on):
    if not re.fullmatch(r'[A-Z][A-Z0-9.-]{0,20}', ticker):
        raise ValueError('Invalid ticker')
    cutoff = date.fromisoformat(captured_on)
    rows = workbook(nav_raw, nav_sha, 'navhist')
    if (len(rows)<5 or rows[0].get('A')!='Fund Name:' or not rows[0].get('B')
            or rows[1].get('A')!='Ticker Symbol:' or rows[1].get('B')!=ticker
            or [rows[3].get(c) for c in 'ABCD']!=['Date','NAV','Shares Outstanding','Total Net Assets']):
        raise ValueError('Unexpected fund or NAV schema')
    nav, prior, ended = {}, None, False
    for row in rows[4:]:
        text, value = row.get('A',''), row.get('B','')
        if not value:
            ended = True
            continue
        day, amount = nav_day(text), decimal(value)
        if ended or amount <= 0 or day > cutoff or prior is not None and day >= prior:
            raise ValueError('NAV duplicates, order, footer, future or nonpositive value')
        nav[day], prior = amount, day
    if len(nav) < 2:
        raise ValueError('Insufficient NAV observations')
    dist = workbook(dist_raw, dist_sha, 'dividend')
    if [dist[0].get(c,'') for c in 'ABCDEFGHIJ'] != DIST_HEADERS:
        raise ValueError('Unexpected distribution schema')
    payments, date_issues = {}, []
    for row in dist[1:]:
        if row.get('B') != ticker:
            continue
        ex, record, pay = [distribution_day(row.get(c,'')) for c in 'DEF']
        if ex in payments or ex > cutoff or row.get('J') != 'Quarterly':
            raise ValueError('Duplicate/invalid distribution dates or frequency')
        if not ex <= record <= pay:
            date_issues.append(dict(ex_date=ex.isoformat(),record_date=record.isoformat(),
                                    payable_date=pay.isoformat(),issue='DISTRIBUTION_DATE_ORDER'))
        payments[ex] = sum((decimal(row.get(c,''), blank_zero=True) for c in 'GHI'), Decimal(0))
    days = sorted(nav)
    effective = {d:v for d,v in payments.items() if days[0] < d <= days[-1]}
    if not payments or any(d not in nav for d in effective):
        raise ValueError('Distribution lacks NAV session or source coverage')
    quarters = {(d.year,(d.month-1)//3+1) for d in payments}
    for year in range(days[0].year,days[-1].year+1):
        for q in range(1,5):
            lo = date(year,3*q-2,1)
            hi = date(year+int(q==4),1 if q==4 else 3*q+1,1)
            if days[0] <= lo and hi <= days[-1]+timedelta(days=1) and (year,q) not in quarters:
                raise ValueError('Missing distribution quarter; never assume zero')
    wealth, result = Decimal(100), []
    for i, day in enumerate(days):
        if i:
            ratio = nav[day]/nav[days[i-1]]
            if abs(ratio-1) > Decimal('.30'):
                raise ValueError('Corporate action or large NAV move requires review')
            wealth *= (nav[day]+effective.get(day,Decimal(0)))/nav[days[i-1]]
        result.append(dict(date=day.isoformat(),nav=str(nav[day]),
                           distribution=str(effective.get(day,Decimal(0))),wealth_proxy=str(wealth)))
    return dict(schema='psychohistory.etf_issuer_source.v1',
                status='SOURCE_METADATA_BLOCKED' if date_issues else 'CANDIDATE_SOURCE_ONLY',
                ticker=ticker,nav_sha256=nav_sha,distributions_sha256=dist_sha,
                captured_on=captured_on,observed_from=days[0].isoformat(),observed_to=days[-1].isoformat(),
                sessions=len(days),distributions_in_nav_period=len(effective),rows=result,
                definition='NAV with cash distributions reinvested at ex-date NAV; not market price',
                date_issues=date_issues,transformation_is_diagnostic_only=True,
                source_admitted=False,historical_asof_verified=False,corporate_action_history_verified=False,
                issuer_performance_reconciled=False,forecast_issued=False,current_risk_estimated=False)


def reconcile(report, published):
    """Compare externally transcribed issuer returns; never infer source admission."""
    if (report.get('source_admitted') is not False or not isinstance(published,list)
            or not published):
        raise ValueError('Candidate report and explicit issuer comparisons required')
    wealth = {row['date']:Decimal(row['wealth_proxy']) for row in report['rows']}
    checks, identities = [], set()
    for item in published:
        start, end, years = item['start'], item['end'], item['years']
        date.fromisoformat(start);date.fromisoformat(end)
        if (start >= end or start not in wealth or end not in wealth or isinstance(years,bool)
                or not isinstance(years,int) or years < 0 or years > 100
                or (start,end,years) in identities):
            raise ValueError('Invalid/duplicate performance window')
        identities.add((start,end,years))
        expected = Decimal(item['percent'])
        if not expected.is_finite():
            raise ValueError('Invalid issuer return')
        ratio = wealth[end]/wealth[start]
        value = (ratio**(Decimal(1)/years)-1)*100 if years else (ratio-1)*100
        difference = value-expected
        checks.append(dict(start=start,end=end,years=years,issuer_percent=str(expected),
                           derived_percent=str(value),difference_pp=str(difference),
                           within_tolerance=abs(difference)<=Decimal('.03')))
    passed = all(row['within_tolerance'] for row in checks)
    out = dict(report,issuer_return_checks=checks,issuer_performance_reconciled=passed)
    if not passed:
        out['status'] = 'SOURCE_METADATA_AND_PERFORMANCE_BLOCKED' if report['date_issues'] else 'SOURCE_PERFORMANCE_BLOCKED'
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    for name in ('nav','distributions','output'):
        ap.add_argument('--'+name,type=Path,required=True)
    for name in ('nav-sha256','distributions-sha256','ticker','captured-on'):
        ap.add_argument('--'+name,required=True)
    ap.add_argument('--published-returns',type=Path)
    ap.add_argument('--published-returns-sha256')
    a = ap.parse_args()
    nav = private_path(a.nav).read_bytes()
    distributions = private_path(a.distributions).read_bytes()
    output = private_path(a.output,create=True)
    report = intake(nav,a.nav_sha256,distributions,a.distributions_sha256,a.ticker,a.captured_on)
    if bool(a.published_returns) != bool(a.published_returns_sha256):
        raise ValueError('Pin published comparisons together')
    if a.published_returns:
        raw = private_path(a.published_returns).read_bytes()
        if hashlib.sha256(raw).hexdigest()!=a.published_returns_sha256:
            raise ValueError('Published comparisons SHA mismatch')
        report = reconcile(report,json.loads(raw))
    fd = os.open(output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w') as f:
        json.dump(report,f,indent=2,allow_nan=False)
        f.write('\n')
    print(json.dumps({k:report[k] for k in ('status','sessions','source_admitted','forecast_issued')}))


if __name__=='__main__':
    main()
