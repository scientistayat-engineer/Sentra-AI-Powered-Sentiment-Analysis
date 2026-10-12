import unittest

from backend.app.preprocess import clean_text


class CleanTextTests(unittest.TestCase):
    def test_lowercases_and_strips(self):
        self.assertEqual(clean_text("  GREAT Product!!  "), "great product!!")

    def test_removes_urls_and_mentions(self):
        out = clean_text("@bob see https://example.com now")
        self.assertNotIn("http", out)
        self.assertNotIn("@", out)

    def test_keeps_negations(self):
        self.assertIn("not", clean_text("This is NOT good"))

    def test_collapses_repeated_letters(self):
        self.assertEqual(clean_text("soooooo good"), "soo good")

    def test_non_string_returns_empty(self):
        self.assertEqual(clean_text(None), "")


if __name__ == "__main__":
    unittest.main()
