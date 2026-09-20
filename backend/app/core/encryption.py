from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os
import json
from app.core.config import settings

def get_master_key() -> bytes:
    try:
        key = open(settings.MASTER_KEY_PATH, "rb").read().strip()
        if len(key) != 64:  # Hex string 32 bytes = 64 characters
            # In testing, we might pass binary directly, but let's assume hex in prod.
            # We'll convert it from hex string to bytes
            if len(key) == 32: # Already bytes
                return key
        return bytes.fromhex(key.decode('utf-8'))
    except Exception:
        # Fallback for local dev if not set
        return bytes.fromhex("0" * 64)

def encrypt_credential(plaintext_dict: dict, master_key: bytes) -> bytes:
    """Encrypt JSON credential payload using AES-256-GCM."""
    nonce = os.urandom(12)  # GCM nonce
    cipher = AESGCM(master_key)
    plaintext_json = json.dumps(plaintext_dict)
    ciphertext = cipher.encrypt(nonce, plaintext_json.encode(), None)
    return nonce + ciphertext  # Prepend nonce for storage

def decrypt_credential(encrypted_blob: bytes, master_key: bytes) -> dict:
    """Decrypt credential blob."""
    nonce = encrypted_blob[:12]
    ciphertext = encrypted_blob[12:]
    cipher = AESGCM(master_key)
    plaintext_json = cipher.decrypt(nonce, ciphertext, None)
    return json.loads(plaintext_json)
