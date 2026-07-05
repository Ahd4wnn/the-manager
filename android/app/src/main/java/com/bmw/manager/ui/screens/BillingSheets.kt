package com.bmw.manager.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.bmw.manager.data.AppGraph
import com.bmw.manager.data.Invoice
import com.bmw.manager.data.InvoiceCreate
import com.bmw.manager.data.Patient
import com.bmw.manager.data.PaymentCreate
import com.bmw.manager.ui.AppTextField
import com.bmw.manager.ui.ErrorText
import com.bmw.manager.ui.LoadingBox
import com.bmw.manager.ui.Pill
import com.bmw.manager.ui.PrimaryButton
import com.bmw.manager.ui.SecondaryButton
import com.bmw.manager.ui.base64ToImageBitmap
import com.bmw.manager.ui.friendly
import com.bmw.manager.ui.inr
import com.bmw.manager.ui.statusTone
import com.bmw.manager.ui.theme.Accent
import com.bmw.manager.ui.theme.Green
import com.bmw.manager.ui.theme.Ink2
import com.bmw.manager.ui.theme.Ink3
import com.bmw.manager.ui.theme.Orange
import com.bmw.manager.ui.titleCase
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateInvoiceSheet(
    patients: List<Patient>,
    onDismiss: () -> Unit,
    onCreated: (Int) -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    var patient by remember { mutableStateOf<Patient?>(null) }
    var pull by remember { mutableStateOf(true) }
    var discount by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            Modifier.padding(20.dp).padding(bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("New invoice", style = MaterialTheme.typography.titleLarge)
            PatientSelect(patients, patient) { patient = it }

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    Modifier.padding(14.dp).fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text("Pull recorded treatments", style = MaterialTheme.typography.titleMedium)
                        Text(
                            "Add this patient's un-billed treatments.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Ink2,
                        )
                    }
                    Switch(checked = pull, onCheckedChange = { pull = it })
                }
            }

            AppTextField(discount, { discount = it }, "Discount ₹ (optional)", keyboardType = KeyboardType.Decimal)
            ErrorText(error)
            PrimaryButton(text = "Create invoice", loading = busy, modifier = Modifier.fillMaxWidth()) {
                val p = patient
                if (p == null) { error = "Pick a patient"; return@PrimaryButton }
                busy = true; error = null
                scope.launch {
                    runCatching {
                        AppGraph.repo.createInvoice(
                            InvoiceCreate(
                                patient_id = p.id,
                                pull_encounter_treatments = pull,
                                discount_amount = discount.ifBlank { "0" },
                            )
                        )
                    }.onSuccess { onCreated(it.id) }
                        .onFailure { error = friendly(it); busy = false }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InvoiceDetailSheet(
    invoiceId: Int,
    patientName: String,
    onDismiss: () -> Unit,
    onChanged: () -> Unit,
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    var invoice by remember { mutableStateOf<Invoice?>(null) }
    var qr by remember { mutableStateOf<ImageBitmap?>(null) }
    var qrAmount by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var showPay by remember { mutableStateOf(false) }

    suspend fun reload() {
        runCatching { AppGraph.repo.invoice(invoiceId) }
            .onSuccess { invoice = it }
            .onFailure { error = friendly(it) }
    }
    LaunchedEffect(invoiceId) { reload() }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        val inv = invoice
        if (inv == null) {
            Column(Modifier.height(240.dp)) { LoadingBox() }
        } else {
            Column(
                Modifier.padding(20.dp).padding(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(inv.invoice_number, style = MaterialTheme.typography.titleLarge)
                        Text(patientName, style = MaterialTheme.typography.bodyMedium, color = Ink2)
                    }
                    Pill(titleCase(inv.status), statusTone(inv.status))
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(Modifier.padding(14.dp)) {
                        inv.items.forEach { it2 ->
                            Row(Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
                                Column(Modifier.weight(1f)) {
                                    Text(it2.description, style = MaterialTheme.typography.bodyLarge)
                                    Text(
                                        "${it2.quantity} × ${inr(it2.unit_price)} · GST ${it2.gst_rate.toDoubleOrNull()?.toInt() ?: 0}%",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Ink3,
                                    )
                                }
                                Text(inr(it2.line_total), style = MaterialTheme.typography.bodyLarge)
                            }
                        }
                        HorizontalDivider(Modifier.padding(vertical = 8.dp))
                        TotalLine("Subtotal", inr(inv.subtotal))
                        if ((inv.discount_amount.toDoubleOrNull() ?: 0.0) > 0)
                            TotalLine("Discount", "− ${inr(inv.discount_amount)}")
                        TotalLine("GST", inr(inv.tax_amount))
                        TotalLine("Total", inr(inv.total_amount), strong = true)
                        TotalLine("Paid", inr(inv.amount_paid))
                        TotalLine(
                            "Balance due",
                            inr(inv.balance_due),
                            strong = true,
                            color = if ((inv.balance_due.toDoubleOrNull() ?: 0.0) > 0) Orange else Green,
                        )
                    }
                }

                qr?.let { bmp ->
                    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                        Image(bmp, contentDescription = "UPI QR", modifier = Modifier.size(196.dp))
                        Text(
                            "Scan to pay ${inr(qrAmount)} · share this screen on WhatsApp",
                            style = MaterialTheme.typography.bodySmall,
                            color = Ink2,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                }
                ErrorText(error)

                val balance = inv.balance_due.toDoubleOrNull() ?: 0.0
                if (showPay && balance > 0) {
                    PaymentForm(
                        maxAmount = inv.balance_due,
                        onCancel = { showPay = false },
                        onSubmit = { amount, method, ref ->
                            scope.launch {
                                runCatching {
                                    AppGraph.repo.addPayment(invoiceId, PaymentCreate(amount, method, ref))
                                }.onSuccess {
                                    showPay = false; qr = null; reload(); onChanged()
                                }.onFailure { error = friendly(it) }
                            }
                        },
                    )
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (inv.status == "draft") {
                            SecondaryButton(text = "Issue") {
                                scope.launch {
                                    runCatching { AppGraph.repo.issueInvoice(invoiceId) }
                                        .onSuccess { reload(); onChanged() }
                                        .onFailure { error = friendly(it) }
                                }
                            }
                        }
                        if (balance > 0 && inv.status != "cancelled") {
                            SecondaryButton(text = "UPI QR") {
                                scope.launch {
                                    runCatching { AppGraph.repo.upiQr(invoiceId) }
                                        .onSuccess { q ->
                                            qr = base64ToImageBitmap(q.qr_png_base64)
                                            qrAmount = q.amount
                                            error = null
                                        }
                                        .onFailure { error = friendly(it) }
                                }
                            }
                            PrimaryButton(text = "Record payment", modifier = Modifier.weight(1f)) { showPay = true }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TotalLine(label: String, value: String, strong: Boolean = false, color: androidx.compose.ui.graphics.Color? = null) {
    Row(Modifier.fillMaxWidth().padding(vertical = 3.dp)) {
        Text(
            label,
            style = if (strong) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            color = if (strong) MaterialTheme.colorScheme.onSurface else Ink2,
            modifier = Modifier.weight(1f),
        )
        Text(
            value,
            style = if (strong) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            fontWeight = if (strong) FontWeight.SemiBold else FontWeight.Normal,
            color = color ?: MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun PaymentForm(
    maxAmount: String,
    onCancel: () -> Unit,
    onSubmit: (amount: String, method: String, reference: String?) -> Unit,
) {
    var amount by remember { mutableStateOf(maxAmount) }
    var method by remember { mutableStateOf("cash") }
    var reference by remember { mutableStateOf("") }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Record payment", style = MaterialTheme.typography.titleMedium)
        AppTextField(amount, { amount = it }, "Amount ₹", keyboardType = KeyboardType.Decimal)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("cash", "upi", "card").forEach { m ->
                SegChip(titleCase(m), method == m) { method = m }
            }
        }
        if (method != "cash") {
            AppTextField(reference, { reference = it }, "Reference (optional)")
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            SecondaryButton(text = "Cancel", modifier = Modifier.weight(1f)) { onCancel() }
            PrimaryButton(text = "Save", modifier = Modifier.weight(1f)) {
                onSubmit(amount.ifBlank { "0" }, method, reference.ifBlank { null })
            }
        }
    }
}
