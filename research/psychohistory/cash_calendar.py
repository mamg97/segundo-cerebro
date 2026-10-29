"""Bounded NYSE cash-session calendar; see SP500_CALENDAR_AMENDMENT.md sources.

Not a general exchange-calendar service. Dates outside 2016--2026 fail closed.
Early closes are sessions; time-of-day issuance requires a separate contract.
"""
from datetime import date, timedelta


def holidays(year):
    if not 2016 <= year <= 2026:
        raise ValueError('Calendar year outside verified 2016-2026 coverage')
    def nth(month, weekday, n):
        d = date(year, month, 1)
        return d + timedelta(days=(weekday-d.weekday()) % 7 + 7*(n-1))
    def observed(month, day):
        d = date(year, month, day)
        return d + timedelta(days=-1 if d.weekday() == 5 else 1 if d.weekday() == 6 else 0)
    # Gregorian computus; Good Friday is two days before Easter Sunday.
    a, b, c = year % 19, year // 100, year % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19*a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2*e + 2*i - h - k) % 7
    m = (a + 11*h + 22*l) // 451
    v = h + l - 7*m + 114
    good_friday = date(year, v // 31, v % 31 + 1) - timedelta(days=2)
    may_end = date(year, 5, 31)
    result = {nth(1, 0, 3), nth(2, 0, 3), good_friday,
              may_end-timedelta(days=may_end.weekday()), observed(7, 4),
              nth(9, 0, 1), nth(11, 3, 4), observed(12, 25)}
    if date(year, 1, 1).weekday() != 5:
        result.add(observed(1, 1))
    if year >= 2022:
        result.add(observed(6, 19))
    if year == 2018:
        result.add(date(2018, 12, 5))
    if year == 2025:
        result.add(date(2025, 1, 9))
    return result


def sessions(first, last):
    if first > last:
        raise ValueError('Reversed calendar bounds')
    closed = set().union(*(holidays(y) for y in range(first.year, last.year+1)))
    return [first+timedelta(days=i) for i in range((last-first).days+1)
            if (first+timedelta(days=i)).weekday() < 5 and first+timedelta(days=i) not in closed]
