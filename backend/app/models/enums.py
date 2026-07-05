import enum


class Role(str, enum.Enum):
    admin = "admin"      # platform admin — creates hospitals & owners
    owner = "owner"      # owns one or more hospitals
    manager = "manager"  # runs a hospital
    staff = "staff"      # reception / nurse
    doctor = "doctor"    # future


class PatientType(str, enum.Enum):
    internal = "internal"  # admitted / in-house / registered
    outside = "outside"    # walk-in / referral / one-off


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class AppointmentStatus(str, enum.Enum):
    booked = "booked"
    checked_in = "checked_in"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    issued = "issued"
    partially_paid = "partially_paid"
    paid = "paid"
    cancelled = "cancelled"


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    card = "card"
    upi = "upi"
    bank_transfer = "bank_transfer"
    insurance = "insurance"
    other = "other"


class MedicineLogAction(str, enum.Enum):
    restock = "restock"        # new stock added
    open_packet = "open_packet"  # a new packet/strip was opened
    use = "use"                # dispensed / consumed (optionally for a patient)
    adjust = "adjust"          # manual correction
