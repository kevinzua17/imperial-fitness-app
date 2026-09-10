from datetime import date

from app.routers import memberships


def test_manual_membership_status_has_priority_until_expiry(monkeypatch):
    monkeypatch.setattr(memberships, "_today", lambda: date(2026, 7, 25))
    account = {
        "manual_status": "active",
        "manual_status_until": date(2026, 7, 26),
        "trial_ends_at": date(2026, 7, 1),
        "next_payment_due": date(2026, 7, 1),
        "last_payment_at": date(2026, 6, 1),
    }

    assert memberships._status_from_dates(account, has_pending_payment=True) == "active"


def test_expired_manual_status_returns_to_automatic_rules(monkeypatch):
    monkeypatch.setattr(memberships, "_today", lambda: date(2026, 7, 25))
    account = {
        "manual_status": "active",
        "manual_status_until": date(2026, 7, 24),
        "trial_ends_at": date(2026, 7, 1),
        "next_payment_due": date(2026, 7, 20),
        "last_payment_at": date(2026, 6, 20),
    }

    assert memberships._status_from_dates(account, has_pending_payment=True) == "pending_validation"
    assert memberships._status_from_dates(account, has_pending_payment=False, grace_days=3, suspension_days=7) == "limited"
