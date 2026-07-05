"""Smoke test for the new role features against a running local server."""

import json
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://localhost:8000/api/v1"


def req(method, path, token=None, hospital_id=None, data=None, form=None, raw=False):
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
            content = resp.read()
            return resp.status, (content if raw else json.loads(content or "null")), resp.headers
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or "null"), e.headers


def ok(label, cond, extra=""):
    print(f"[{'PASS' if cond else 'FAIL'}] {label} {extra}")
    assert cond, label


s, r, _ = req("POST", "/auth/login", form={"username": "8888888888", "password": "owner12345"})
ok("owner login", s == 200, s)
token = r["access_token"]
s, me, _ = req("GET", "/auth/me", token=token)
hid = me["memberships"][0]["hospital_id"]
print("hospital_id", hid)

# Staff with salary + designation
s, r, _ = req("POST", "/users", token=token, hospital_id=hid, data={
    "phone": "7010000001", "full_name": "Cook Kumar", "password": "cook12345",
    "role": "staff", "designation": "Cook", "monthly_salary": "18000.00",
})
ok("create staff w/ salary", s == 201, f"{r.get('designation')} {r.get('monthly_salary')}")
ok("salary persisted", str(r.get("monthly_salary")) == "18000.00", r.get("monthly_salary"))

# Expenses
s, r, _ = req("POST", "/expenses", token=token, hospital_id=hid, data={
    "category": "Supplies", "amount": "1250.50", "spent_on": "2026-07-06", "note": "Gloves",
})
ok("create expense", s == 201, s)
s, r, _ = req("GET", "/expenses", token=token, hospital_id=hid)
ok("list expenses", s == 200 and len(r) >= 1, len(r))

# Medicines + stock logs
s, r, _ = req("POST", "/medicines", token=token, hospital_id=hid, data={
    "name": "Paracetamol 500", "unit": "tablet", "pack_size": 10, "current_stock": "0",
})
ok("create medicine", s == 201, s)
mid = r["id"]
s, r, _ = req("POST", "/medicines/logs", token=token, hospital_id=hid, data={
    "medicine_id": mid, "action": "restock", "quantity": "50",
})
ok("restock +50", s == 201, s)
s, r, _ = req("POST", "/medicines/logs", token=token, hospital_id=hid, data={
    "medicine_id": mid, "action": "open_packet", "quantity": "0", "note": "opened a strip",
})
ok("open packet log", s == 201, s)
s, r, _ = req("POST", "/medicines/logs", token=token, hospital_id=hid, data={
    "medicine_id": mid, "action": "use", "quantity": "3",
})
ok("use -3", s == 201, s)
s, r, _ = req("GET", "/medicines", token=token, hospital_id=hid)
med = [m for m in r if m["id"] == mid][0]
ok("stock is 47", str(med["current_stock"]) == "47.00", med["current_stock"])

# Reports
s, r, _ = req("GET", "/reports/financial?granularity=daily", token=token, hospital_id=hid)
ok("financial report", s == 200, f"rev={r.get('total_revenue')} exp={r.get('total_expenses')} net={r.get('net')}")
ok("expenses in report", float(r["total_expenses"]) >= 1250.50, r["total_expenses"])

s, r, _ = req("GET", "/reports/staff-performance", token=token, hospital_id=hid)
ok("staff performance", s == 200 and "staff" in r, len(r.get("staff", [])))

# Excel
s, content, headers = req("GET", "/reports/excel", token=token, hospital_id=hid, raw=True)
ok("excel 200", s == 200, headers.get("Content-Type"))
ok("excel is xlsx (PK zip)", content[:2] == b"PK", content[:2])

# Invoice PDF
s, invs, _ = req("GET", "/billing", token=token, hospital_id=hid)
if invs:
    iid = invs[0]["id"]
else:
    s, pt, _ = req("GET", "/patients", token=token, hospital_id=hid)
    s, inv, _ = req("POST", "/billing", token=token, hospital_id=hid, data={
        "patient_id": pt[0]["id"], "pull_encounter_treatments": False,
        "items": [{"description": "Consult", "quantity": 1, "unit_price": "300", "gst_rate": "0"}],
    })
    iid = inv["id"]
s, content, headers = req("GET", f"/billing/{iid}/pdf", token=token, hospital_id=hid, raw=True)
ok("invoice pdf 200", s == 200, headers.get("Content-Type"))
ok("pdf magic %PDF", content[:4] == b"%PDF", content[:4])

print("\nALL NEW-FEATURE SMOKE TESTS PASSED")
