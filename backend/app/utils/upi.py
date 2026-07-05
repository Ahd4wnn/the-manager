"""UPI payment string + QR generation (manual sharing — no messaging API)."""

import base64
from decimal import Decimal
from io import BytesIO
from urllib.parse import quote

import qrcode


def build_upi_uri(
    vpa: str, payee_name: str, amount: Decimal, note: str | None = None
) -> str:
    params = [
        f"pa={quote(vpa)}",
        f"pn={quote(payee_name)}",
        f"am={amount:.2f}",
        "cu=INR",
    ]
    if note:
        params.append(f"tn={quote(note)}")
    return "upi://pay?" + "&".join(params)


def qr_png_base64(data: str) -> str:
    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")
