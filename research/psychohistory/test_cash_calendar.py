import unittest
from datetime import date
from decimal import Decimal
from cash_calendar import sessions, holidays
from sp500_vix_transfer import verify_dates, START, END


class CashCalendarTests(unittest.TestCase):
    def test_official_good_fridays_and_exceptional_closures(self):
        for year, md in {2016:'03-25',2017:'04-14',2018:'03-30',2019:'04-19',2020:'04-10',
                         2021:'04-02',2022:'04-15',2023:'04-07',2024:'03-29',2025:'04-18',2026:'04-03'}.items():
            self.assertIn(date.fromisoformat(f'{year}-{md}'), holidays(year))
        self.assertIn(date(2018,12,5), holidays(2018))
        self.assertIn(date(2025,1,9), holidays(2025))

    def test_juneteenth_start_saturday_new_year_and_short_sessions(self):
        self.assertNotIn(date(2021,6,18), holidays(2021))
        self.assertIn(date(2022,6,20), holidays(2022))
        self.assertEqual(sessions(date(2021,12,31),date(2022,1,3)), [date(2021,12,31),date(2022,1,3)])
        self.assertIn(date(2026,11,27), sessions(date(2026,11,26),date(2026,11,30)))
        for year in [2015,2027]:
            with self.assertRaises(ValueError):holidays(year)

    def test_cash_calendar_rejects_shared_holes_and_retains_vix_holidays(self):
        days = sessions(date.fromisoformat(START), date.fromisoformat(END))
        prices = [(d,Decimal(100)) for d in days]
        vix = {d:20 for d in days}
        holiday = date(2022,6,20)
        vix[holiday] = 22
        self.assertEqual(verify_dates(prices,vix,[holiday],'nyse-2016-2026'),[holiday])
        with self.assertRaises(ValueError):verify_dates(prices,vix,[holiday])
        bad = vix.copy();bad.pop(days[100])
        with self.assertRaises(ValueError):verify_dates(prices[:100]+prices[101:],bad,[],'nyse-2016-2026')
        with self.assertRaises(ValueError):verify_dates(prices[1:],vix,[],'nyse-2016-2026')
        with self.assertRaises(ValueError):verify_dates(prices,vix,[],'unknown')


if __name__ == '__main__':unittest.main()
