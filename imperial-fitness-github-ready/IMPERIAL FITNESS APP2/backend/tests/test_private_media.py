from app.core.private_files import is_private_asset_reference, private_asset_belongs_to_folder
from app.core.uploads import cloudinary_authenticated_reference


def test_cloudinary_private_reference_keeps_owner_folder():
    reference = cloudinary_authenticated_reference("image", "imperial-fitness/progress-user-42/abc123", "jpg")
    assert is_private_asset_reference(reference)
    assert private_asset_belongs_to_folder(reference, "progress-user-42")
    assert not private_asset_belongs_to_folder(reference, "progress-user-7")


def test_local_private_reference_keeps_owner_folder():
    reference = "private://payment-receipts-user-9/receipt.webp"
    assert private_asset_belongs_to_folder(reference, "payment-receipts-user-9")
    assert not private_asset_belongs_to_folder(reference, "payment-receipts-user-10")
