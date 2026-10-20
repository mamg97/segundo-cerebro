import unittest
import re
from pathlib import Path
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

    def test_embedded_image_is_blocked_without_leaking_bytes(self):
        payload = "data:image/png;base64," + "A" * 750
        patch = "+++ b/app/old-icon.js\\n@@ -0,0 +1 @@\\n+const image='" + payload + "';"
        patch = patch.replace("\\n", "\n")
        issues = findings(patch, ["app/old-icon.js"])
        self.assertIn(("app/old-icon.js", 1, "INLINE_IMAGE_BYTES"), issues)
        self.assertNotIn(payload, str(issues))

    def test_public_calendar_legend_has_generic_labels(self):
        # The public demo must never hardcode people's or account names.
        html = (Path(__file__).resolve().parents[1] / "app" / "index.html").read_text(encoding="utf-8")
        for source, label in (("partner", "Compartido"), ("gemini", "Asistente")):
            values = re.findall(
                rf'<span><i class="calendar-legend-dot {source}"></i>([^<]*)</span>',
                html,
            )
            self.assertEqual(values, [label], f"Non-generic public calendar legend: {source}")

if __name__ == "__main__":
    unittest.main()
