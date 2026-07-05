"""End-to-end smoke test against a running server on :8000. Uses stdlib only."""

import json
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://localhost:8000/api/v1"


def req(method, path, token=None, hospital_id=None, data=None, form=None):
    url = BASE + path
    headers = {}
    body = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if hospital_id:
        headers["X-Hospital-Id"] = str(hospital_id)
    if form is not None:
        body = urllib.parse.urlencode(form).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    elif data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read() or "null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or "null")


def ok(label, cond, extra=""):
    print(f"[{'PASS' if cond else 'FAIL'}] {label} {extra}")
    assert cond, label


# 1. Admin login
s, r = req("POST", "/auth/login", form={"username": "9999999999", "password": "admin12345"})
ok("admin login", s == 200, s)
admin_token = r["access_token"]

# 2. Create hospital
s, r = req("POST", "/hospitals", token=admin_token, data={
    "name": "City Care Clinic", "code": "CITY01", "city": "Pune", "state": "MH",
    "gstin": "27ABCDE1234F1Z5", "upi_vpa": "citycare@okhdfc", "upi_payee_name": "City Care Clinic",
})
ok("create hospital", s == 201, s)
hid = r["id"]

# 3. Create owner attached to hospital
s, r = req("POST", "/users/owners", token=admin_token, data={
    "phone": "8888888888", "full_name": "Dr Owner", "password": "owner12345",
    "hospital_id": hid,
})
ok("create owner", s == 201, s)

# 4. Owner login
s, r = req("POST", "/auth/login", form={"username": "8888888888", "password": "owner12345"})
ok("owner login", s == 200, s)
owner_token = r["access_token"]

# 5. Owner creates staff
s, r = req("POST", "/users", token=owner_token, hospital_id=hid, data={
    "phone": "7777777777", "full_name": "Reception Rita", "password": "staff12345",
    "role": "staff",
})
ok("create staff", s == 201, s)

# 6. Staff login + create patients (internal & outside)
s, r = req("POST", "/auth/login", form={"username": "7777777777", "password": "staff12345"})
staff_token = r["access_token"]
s, r = req("POST", "/patients", token=staff_token, hospital_id=hid, data={
    "full_name": "Anil Kumar", "patient_type": "internal", "gender": "male", "phone": "9812345678",
})
ok("create internal patient", s == 201, f"MRN={r.get('mrn')}")
pid = r["id"]
ok("MRN format", r["mrn"] == "CITY01-000001", r["mrn"])

s, r = req("POST", "/patients", token=staff_token, hospital_id=hid, data={
    "full_name": "Walk In Wanda", "patient_type": "outside",
})
ok("create outside patient", s == 201, f"MRN={r.get('mrn')}")
ok("MRN increments", r["mrn"] == "CITY01-000002", r["mrn"])

# 7. Patient search
s, r = req("GET", "/patients?q=Anil", token=staff_token, hospital_id=hid)
ok("patient search", s == 200 and len(r) == 1, len(r))

# 8. Treatment catalog (manager/owner) + record encounter
s, r = req("POST", "/treatments/catalog", token=owner_token, hospital_id=hid, data={
    "name": "Consultation", "default_price": "500.00", "gst_rate": "18.00", "category": "OPD",
})
ok("create treatment", s == 201, s)
tid = r["id"]

s, r = req("POST", "/treatments/encounters", token=staff_token, hospital_id=hid, data={
    "patient_id": pid, "treatment_id": tid, "quantity": 1,
})
ok("record encounter treatment", s == 201, f"price={r.get('unit_price')} gst={r.get('gst_rate')}")

# 9. Appointment
s, r = req("POST", "/appointments", token=staff_token, hospital_id=hid, data={
    "patient_id": pid, "scheduled_start": "2026-07-10T10:00:00Z", "reason": "Follow-up",
})
ok("create appointment", s == 201, s)

# 10. Invoice (pulls the uninvoiced encounter treatment)
s, r = req("POST", "/billing", token=staff_token, hospital_id=hid, data={
    "patient_id": pid, "pull_encounter_treatments": True,
})
ok("create invoice", s == 201, f"no={r.get('invoice_number')}")
inv = r
# 500 + 18% GST = 590
ok("invoice subtotal 500", str(inv["subtotal"]) == "500.00", inv["subtotal"])
ok("invoice tax 90", str(inv["tax_amount"]) == "90.00", inv["tax_amount"])
ok("invoice total 590", str(inv["total_amount"]) == "590.00", inv["total_amount"])
iid = inv["id"]

# 11. UPI QR
s, r = req("GET", f"/billing/{iid}/upi-qr", token=staff_token, hospital_id=hid)
ok("upi qr generated", s == 200 and r["upi_uri"].startswith("upi://pay?"), r.get("upi_uri", "")[:60])
ok("upi amount = balance 590", str(r["amount"]) == "590.00", r["amount"])
ok("qr png present", len(r["qr_png_base64"]) > 100, len(r["qr_png_base64"]))

# 12. Partial + full payment
s, r = req("POST", f"/billing/{iid}/payments", token=staff_token, hospital_id=hid, data={
    "amount": "90.00", "method": "cash",
})
ok("partial payment", s == 201, s)
s, r = req("GET", f"/billing/{iid}", token=staff_token, hospital_id=hid)
ok("status partially_paid", r["status"] == "partially_paid", r["status"])
ok("balance due 500", str(r["balance_due"]) == "500.00", r["balance_due"])

s, r = req("POST", f"/billing/{iid}/payments", token=staff_token, hospital_id=hid, data={
    "amount": "500.00", "method": "upi", "reference": "UPI123",
})
s, r = req("GET", f"/billing/{iid}", token=staff_token, hospital_id=hid)
ok("status paid", r["status"] == "paid", r["status"])
ok("balance due 0", str(r["balance_due"]) == "0.00", r["balance_due"])

# 13. Tenant isolation: staff without X-Hospital-Id header is rejected
s, r = req("GET", "/patients", token=staff_token)
ok("missing hospital header rejected", s == 422, s)

# 14. RBAC: staff cannot create treatments (manager/owner only)
s, r = req("POST", "/treatments/catalog", token=staff_token, hospital_id=hid, data={
    "name": "X", "default_price": "1",
})
ok("staff blocked from catalog create", s == 403, s)

# 15. Cross-tenant: owner cannot touch a hospital they don't belong to
s, r = req("GET", "/patients", token=owner_token, hospital_id=99999)
ok("unknown hospital rejected", s == 404, s)

print("\nALL SMOKE TESTS PASSED")
