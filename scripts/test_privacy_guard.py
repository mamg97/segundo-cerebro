import unittest
from privacy_guard import findings, path_findings

class PrivacyGuardTests(unittest.TestCase):
    def test_synthetic_generic_code_allowed(self):
        patch = '+++ b/private-cloudflare/src/demo.js\n@@ -0,0 +1 @@\n+const url = "/api/objects/demo/image/processed";'
        self.assertEqual(findings(patch, ["private-cloudflare/src/demo.js"]), [])

    def test_private_photo_and_document_disallowed(self):
        self.assertIn("PRIVATE_DIRECTORY", path_findings("app/gym-photos/front.webp"))
        self.assertIn("UNREVIEWED_MEDIA", path_findings("app/gym-photos/front.webp"))
        self.assertIn("PRIVATE_ATTACHMENT", path_findings("uploads/records.xlsx"))
        self.assertEqual(path_findings("app/assets/gym-animations/bench.webp"), [])

    def test_redacted_token_finding(self):
        secret = "ghp_" + "X" * 25
        patch = '+++ b/app/new.js\n@@ -0,0 +1 @@\n+const token="' + secret + '";'
        issues = findings(patch, ["app/new.js"])
        self.assertIn(("app/new.js", 1, "GITHUB_TOKEN"), issues)
        self.assertNotIn(secret, str(issues))

    def test_personal_email_detected(self):
        email = "a_user" + "@" + "gmail.com"
        issues = findings("+++ b/docs/example.md\n@@ -0,0 +1 @@\n+" + email)
        self.assertEqual(issues[0][2], "PRIVATE_EMAIL")

if __name__ == "__main__":
    unittest.main()
