package com.bmw.manager.data

import kotlinx.serialization.Serializable

@Serializable
data class TokenResponse(val access_token: String, val token_type: String = "bearer")

@Serializable
data class MembershipInfo(
    val hospital_id: Int,
    val hospital_name: String,
    val role: String,
)

@Serializable
data class Me(
    val id: Int,
    val phone: String,
    val full_name: String,
    val email: String? = null,
    val is_platform_admin: Boolean = false,
    val memberships: List<MembershipInfo> = emptyList(),
)

@Serializable
data class Patient(
    val id: Int,
    val hospital_id: Int,
    val mrn: String,
    val patient_type: String,
    val full_name: String,
    val gender: String? = null,
    val date_of_birth: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val address: String? = null,
    val blood_group: String? = null,
    val allergies: String? = null,
)

@Serializable
data class PatientCreate(
    val full_name: String,
    val patient_type: String,
    val gender: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val blood_group: String? = null,
)

@Serializable
data class Appointment(
    val id: Int,
    val hospital_id: Int,
    val patient_id: Int,
    val provider_id: Int? = null,
    val scheduled_start: String,
    val scheduled_end: String? = null,
    val status: String,
    val reason: String? = null,
    val notes: String? = null,
)

@Serializable
data class AppointmentCreate(
    val patient_id: Int,
    val scheduled_start: String,
    val reason: String? = null,
)

@Serializable
data class AppointmentUpdate(val status: String)

@Serializable
data class Treatment(
    val id: Int,
    val hospital_id: Int,
    val name: String,
    val category: String? = null,
    val default_price: String,
    val gst_rate: String,
    val is_active: Boolean = true,
)

@Serializable
data class EncounterCreate(
    val patient_id: Int,
    val treatment_id: Int? = null,
    val quantity: Int = 1,
)

@Serializable
data class InvoiceItem(
    val id: Int,
    val description: String,
    val quantity: Int,
    val unit_price: String,
    val gst_rate: String,
    val line_total: String,
    val tax_amount: String,
)

@Serializable
data class Payment(
    val id: Int,
    val invoice_id: Int,
    val amount: String,
    val method: String,
    val reference: String? = null,
    val received_at: String,
)

@Serializable
data class Invoice(
    val id: Int,
    val hospital_id: Int,
    val patient_id: Int,
    val invoice_number: String,
    val status: String,
    val subtotal: String,
    val discount_amount: String,
    val tax_amount: String,
    val total_amount: String,
    val amount_paid: String,
    val balance_due: String,
    val issued_at: String? = null,
    val items: List<InvoiceItem> = emptyList(),
    val payments: List<Payment> = emptyList(),
)

@Serializable
data class InvoiceCreate(
    val patient_id: Int,
    val pull_encounter_treatments: Boolean = true,
    val discount_amount: String = "0",
)

@Serializable
data class PaymentCreate(
    val amount: String,
    val method: String,
    val reference: String? = null,
)

@Serializable
data class UpiQr(
    val invoice_number: String,
    val amount: String,
    val upi_uri: String,
    val qr_png_base64: String,
)

@Serializable
data class Medicine(
    val id: Int,
    val hospital_id: Int,
    val name: String,
    val unit: String,
    val pack_size: Int? = null,
    val current_stock: String,
    val low_stock_threshold: String,
    val is_active: Boolean = true,
)

@Serializable
data class MedicineCreate(
    val name: String,
    val unit: String = "unit",
    val pack_size: Int? = null,
    val current_stock: String = "0",
    val low_stock_threshold: String = "0",
)

@Serializable
data class MedicineLogCreate(
    val medicine_id: Int,
    val action: String,   // restock | open_packet | use | adjust
    val quantity: String = "0",
    val patient_id: Int? = null,
    val note: String? = null,
)

@Serializable
data class MedicineLog(
    val id: Int,
    val medicine_id: Int,
    val action: String,
    val quantity: String,
    val note: String? = null,
    val happened_at: String,
)
