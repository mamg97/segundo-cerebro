import unittest
from shadow_observatory_2027_integrity import inspect

class ObservatoryTests(unittest.TestCase):
    def test_invalid_input(self):
        with self.assertRaises(ValueError):
            inspect('invalid content')

if __name__ == '__main__':
    unittest.main()
