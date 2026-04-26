"""Run once to generate VAPID keys. Output goes into .env."""
from py_vapid import Vapid
import base64
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

v = Vapid()
v.generate_keys()

pub = base64.urlsafe_b64encode(
    v.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
).decode().rstrip("=")

priv_pem = v.private_pem().decode()

print(f"VAPID_PUBLIC_KEY={pub}")
print(f'VAPID_PRIVATE_KEY="""{priv_pem}"""')
print()
print("# Paste the above two lines into backend/.env")
