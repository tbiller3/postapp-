# POSTAPP source decryption script
  # Run this in ChatGPT Advanced Data Analysis after uploading postapp-source.enc
  import hashlib, struct
  from Crypto.Cipher import AES
  from Crypto.Protocol.KDF import PBKDF2

  PASSWORD = "6c2f1c497a3cda1f0709096a26fa8e0d"

  with open("postapp-source.enc", "rb") as f:
      data = f.read()

  salt = data[:16]
  iv   = data[16:32]
  enc  = data[32:]

  key = PBKDF2(PASSWORD.encode(), salt, dkLen=32, count=100000, prf=lambda p,s: __import__('hmac').new(p,s,__import__('hashlib').sha256).digest())
  cipher = AES.new(key, AES.MODE_CBC, iv)
  decrypted = cipher.decrypt(enc)
  # Strip PKCS7 padding
  pad = decrypted[-1]
  decrypted = decrypted[:-pad]

  with open("postapp-source.tar.gz", "wb") as f:
      f.write(decrypted)

  import tarfile
  with tarfile.open("postapp-source.tar.gz") as t:
      t.extractall("postapp-source")

  import os
  for root, dirs, files in os.walk("postapp-source"):
      for name in files:
          print(os.path.join(root, name))
  print("Done! All source files extracted.")
  