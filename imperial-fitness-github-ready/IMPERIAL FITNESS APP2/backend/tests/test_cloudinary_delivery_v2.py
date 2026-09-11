import sys
from types import ModuleType

from app.core.uploads import _public_delivery_width, optimized_cloudinary_public_url


def test_public_delivery_widths_are_bounded_by_asset_purpose():
    assert _public_delivery_width("avatars") == 512
    assert _public_delivery_width("logos") == 800
    assert _public_delivery_width("branding") == 1920
    assert _public_delivery_width("exercises") == 1200
    assert _public_delivery_width("other") == 1600


def test_optimized_url_uses_non_destructive_delivery_transformations(monkeypatch):
    captured = {}
    cloudinary_package = ModuleType("cloudinary")
    cloudinary_utils = ModuleType("cloudinary.utils")

    def fake_cloudinary_url(public_id, **options):
        captured["public_id"] = public_id
        captured["options"] = options
        return "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_512/v123/imperial-fitness/avatars/a", options

    cloudinary_utils.cloudinary_url = fake_cloudinary_url
    cloudinary_package.utils = cloudinary_utils
    monkeypatch.setitem(sys.modules, "cloudinary", cloudinary_package)
    monkeypatch.setitem(sys.modules, "cloudinary.utils", cloudinary_utils)

    url = optimized_cloudinary_public_url(
        {
            "public_id": "imperial-fitness/avatars/a",
            "version": 123,
            "secure_url": "https://res.cloudinary.com/demo/image/upload/v123/a.jpg",
        },
        "avatars",
    )

    assert url and url.startswith("https://")
    assert captured["public_id"] == "imperial-fitness/avatars/a"
    assert captured["options"]["fetch_format"] == "auto"
    assert captured["options"]["quality"] == "auto"
    assert captured["options"]["crop"] == "limit"
    assert captured["options"]["width"] == 512
    assert captured["options"]["version"] == 123


def test_optimized_url_falls_back_to_secure_url_without_public_id():
    assert optimized_cloudinary_public_url({"secure_url": "https://cdn.example/image.jpg"}, "foods") == "https://cdn.example/image.jpg"
