import unittest
from datetime import datetime, timezone

import version_manager


class VersionManagerTests(unittest.TestCase):
    def test_only_stable_tags_determine_candidate(self) -> None:
        tags = [
            "2026.11.2",
            "v2026.11.3-nightly.20261114.1200",
            "v2026.11.3-beta",
        ]
        now = datetime(2026, 11, 15, 12, 0, tzinfo=timezone.utc)

        self.assertEqual(
            version_manager.calculate_next_version("stable", tags, now),
            "2026.11.3",
        )

    def test_nightly_and_stable_share_candidate_but_nightly_is_unique(self) -> None:
        tags = ["v2026.11.2", "v2026.11.3-nightly.20261114.1200.101"]
        now = datetime(2026, 11, 15, 12, 0, tzinfo=timezone.utc)

        first = version_manager.calculate_next_version("nightly", tags, now, "101.1")
        second = version_manager.calculate_next_version("nightly", tags, now, "101.2")
        stable = version_manager.calculate_next_version("stable", tags, now)

        self.assertTrue(first.startswith(f"{stable}-nightly."))
        self.assertTrue(second.startswith(f"{stable}-nightly."))
        self.assertNotEqual(first, second)

    def test_only_a_new_stable_tag_advances_the_next_candidate(self) -> None:
        tags = ["v2026.11.3", "v2026.11.4-nightly.20261114.1200.102"]
        now = datetime(2026, 11, 15, 12, 0, tzinfo=timezone.utc)

        self.assertEqual(
            version_manager.calculate_next_version("stable", tags, now),
            "2026.11.4",
        )

    def test_new_month_starts_at_patch_one(self) -> None:
        tags = ["v2026.10.8", "2026.11.5"]
        now = datetime(2026, 12, 1, 0, 0, tzinfo=timezone.utc)

        self.assertEqual(
            version_manager.calculate_next_version("stable", tags, now),
            "2026.12.1",
        )

    def test_legacy_unprefixed_stable_tags_are_supported(self) -> None:
        self.assertEqual(version_manager.parse_stable_tag("2026.11.7"), (2026, 11, 7))
        self.assertIsNone(version_manager.parse_stable_tag("v2026.11.7-rc.1"))

    def test_beta_and_rc_are_not_release_types(self) -> None:
        with self.assertRaises(ValueError):
            version_manager.calculate_next_version(
                "beta",
                [],
                datetime(2026, 11, 15, tzinfo=timezone.utc),
            )

    def test_future_stable_tag_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            version_manager.calculate_next_version(
                "stable",
                ["v2026.12.1"],
                datetime(2026, 11, 15, tzinfo=timezone.utc),
            )


if __name__ == "__main__":
    unittest.main()
