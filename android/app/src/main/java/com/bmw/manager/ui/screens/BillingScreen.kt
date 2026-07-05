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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.bmw.manager.data.AppGraph
import com.bmw.manager.data.Invoice
import com.bmw.manager.data.InvoiceCreate
import com.bmw.manager.data.Patient
import com.bmw.manager.data.PaymentCreate
import com.bmw.manager.ui.AppCard
import com.bmw.manager.ui.AppTextField
import com.bmw.manager.ui.EmptyState
import com.bmw.manager.ui.ErrorText
import com.bmw.manager.ui.LoadingBox
import com.bmw.manager.ui.Pill
import com.bmw.manager.ui.PrimaryButton
import com.bmw.manager.ui.SecondaryButton
import com.bmw.manager.ui.Tone
import com.bmw.manager.ui.base64ToImageBitmap
import com.bmw.manager.ui.friendly
import com.bmw.manager.ui.inr
import com.bmw.manager.ui.statusTone
import com.bmw.manager.ui.theme.Accent
import com.bmw.manager.ui.theme.Ink2
import com.bmw.manager.ui.theme.Ink3
import com.bmw.manager.ui.theme.Orange
import com.bmw.manager.ui.titleCase
import kotlinx.coroutines.launch

class BillingViewModel : ViewModel() {
    var loading by mutableStateOf(true); private set
    var invoices by mutableStateOf<List<Invoice>>(emptyList()); private set
    var patients by mutableStateOf<Map<Int, Patient>>(emptyMap()); private set

    fun load() {
        loading = true
        viewModelScope.launch {
            runCatching {
                val invs = AppGraph.repo.invoices()
                val p = AppGraph.repo.patients().associateBy { it.id }
                invs to p
            }.onSuccess { (invs, p) -> invoices = invs; patients = p }
            loading = false
        }
    }

    fun patientName(id: Int) = patients[id]?.full_name ?: "#$id"
}

@Composable
fun BillingScreen(vm: BillingViewModel = viewModel()) {
    var showCreate by remember { mutableStateOf(false) }
    var openId by remember { mutableStateOf<Int?>(null) }
    LaunchedEffect(Unit) { vm.load() }

    ListScaffold(title = "Billing", onAdd = { showCreate = true }) { inner ->
        if (vm.loading) {
            LoadingBox()
        } else {
            LazyColumn(
                contentPadding = inner,
                modifier = Modifier.padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (vm.invoices.isEmpty()) {
                    item { EmptyState("No invoices", "Tap + to create an invoice for a patient.") }
                }
                items(vm.invoices, key = { it.id }) { inv ->
                    InvoiceRow(inv, vm.patientName(inv.patient_id)) { openId = inv.id }
                }
            }
        }
    }

    if (showCreate) {
        CreateInvoiceSheet(
            patients = vm.patients.values.toList(),
            onDismiss = { showCreate = false },
            onCreated = { id -> showCreate = false; vm.load(); openId = id },
        )
    }
    openId?.let { id ->
        InvoiceDetailSheet(
            invoiceId = id,
            patientName = vm.patientName(vm.invoices.find { it.id == id }?.patient_id ?: -1),
            onDismiss = { openId = null },
            onChanged = { vm.load() },
        )
    }
}

@Composable
private fun InvoiceRow(inv: Invoice, patientName: String, onClick: () -> Unit) {
    AppCard(onClick = onClick) {
        Row(
            Modifier.padding(14.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Column(Modifier.weight(1f)) {
                Text(inv.invoice_number, style = MaterialTheme.typography.titleMedium)
                Text(patientName, style = MaterialTheme.typography.bodySmall, color = Ink2)
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(inr(inv.total_amount), style = MaterialTheme.typography.titleMedium)
                Pill(titleCase(inv.status), statusTone(inv.status))
            }
        }
    }
}
