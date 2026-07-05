"""Invoice PDF generation via reportlab (for manual WhatsApp sharing)."""

from decimal import Decimal
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from app.models.billing import Invoice
from app.models.hospital import Hospital
from app.models.patient import Patient

ACCENT = colors.HexColor("#0071E3")
INK = colors.HexColor("#1C1C1E")
MUTED = colors.HexColor("#6E6E73")
LINE = colors.HexColor("#E3E8EF")


def _rupee(value: Decimal) -> str:
    return "Rs. " + f"{Decimal(value):,.2f}"


def build_invoice_pdf(hospital: Hospital, patient: Patient, invoice: Invoice) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    x = 20 * mm
    y = h - 24 * mm

    # Header
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(x, y, hospital.name)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    y -= 6 * mm
    line = ", ".join(p for p in [hospital.city, hospital.state] if p)
    if line:
        c.drawString(x, y, line)
        y -= 4.5 * mm
    if hospital.gstin:
        c.drawString(x, y, f"GSTIN: {hospital.gstin}")
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 22)
    c.drawRightString(w - 20 * mm, h - 24 * mm, "INVOICE")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 10)
    c.drawRightString(w - 20 * mm, h - 30 * mm, invoice.invoice_number)

    # Divider
    y -= 8 * mm
    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.line(x, y, w - 20 * mm, y)
    y -= 10 * mm

    # Bill-to
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(x, y, "BILLED TO")
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    y -= 6 * mm
    c.drawString(x, y, patient.full_name)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    y -= 5 * mm
    c.drawString(x, y, f"MRN: {patient.mrn}")
    if patient.phone:
        c.drawString(x + 60 * mm, y, f"Phone: {patient.phone}")

    # Table header
    y -= 12 * mm
    c.setFillColor(ACCENT)
    c.rect(x, y - 2 * mm, w - 40 * mm, 8 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x + 2 * mm, y, "DESCRIPTION")
    c.drawRightString(x + 110 * mm, y, "QTY")
    c.drawRightString(x + 140 * mm, y, "RATE")
    c.drawRightString(w - 22 * mm, y, "AMOUNT")
    y -= 9 * mm

    c.setFont("Helvetica", 10)
    for item in invoice.items:
        c.setFillColor(INK)
        desc = item.description[:52]
        c.drawString(x + 2 * mm, y, desc)
        c.drawRightString(x + 110 * mm, y, str(item.quantity))
        c.drawRightString(x + 140 * mm, y, _rupee(item.unit_price))
        c.drawRightString(w - 22 * mm, y, _rupee(item.line_total))
        c.setStrokeColor(LINE)
        c.line(x, y - 3 * mm, w - 20 * mm, y - 3 * mm)
        y -= 9 * mm
        if y < 60 * mm:
            c.showPage()
            y = h - 30 * mm

    # Totals
    y -= 4 * mm
    tx = w - 80 * mm

    def total_row(label, value, bold=False, color=INK):
        nonlocal y
        c.setFillColor(MUTED if not bold else color)
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 11 if bold else 10)
        c.drawString(tx, y, label)
        c.setFillColor(color if bold else INK)
        c.drawRightString(w - 22 * mm, y, _rupee(value))
        y -= 7 * mm

    total_row("Subtotal", invoice.subtotal)
    if Decimal(invoice.discount_amount) > 0:
        total_row("Discount", -Decimal(invoice.discount_amount))
    total_row("GST", invoice.tax_amount)
    y -= 1 * mm
    c.setStrokeColor(LINE)
    c.line(tx, y + 3 * mm, w - 20 * mm, y + 3 * mm)
    total_row("Total", invoice.total_amount, bold=True, color=INK)
    total_row("Paid", invoice.amount_paid)
    total_row(
        "Balance due",
        invoice.balance_due,
        bold=True,
        color=ACCENT if Decimal(invoice.balance_due) > 0 else colors.HexColor("#248A3D"),
    )

    # Footer
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawCentredString(w / 2, 18 * mm, f"{hospital.name} · Thank you")
    if hospital.upi_vpa:
        c.drawCentredString(w / 2, 14 * mm, f"Pay via UPI: {hospital.upi_vpa}")

    c.showPage()
    c.save()
    return buf.getvalue()
