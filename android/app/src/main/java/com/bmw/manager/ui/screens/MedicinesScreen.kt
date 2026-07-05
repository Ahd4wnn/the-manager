package com.bmw.manager.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
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
import com.bmw.manager.data.Medicine
import com.bmw.manager.data.MedicineCreate
import com.bmw.manager.data.MedicineLogCreate
import com.bmw.manager.ui.AppCard
import com.bmw.manager.ui.AppTextField
import com.bmw.manager.ui.EmptyState
import com.bmw.manager.ui.ErrorText
import com.bmw.manager.ui.LoadingBox
import com.bmw.manager.ui.Pill
import com.bmw.manager.ui.PrimaryButton
import com.bmw.manager.ui.SecondaryButton
import com.bmw.manager.ui.Tone
import com.bmw.manager.ui.friendly
import com.bmw.manager.ui.theme.Ink2
import com.bmw.manager.ui.titleCase
import kotlinx.coroutines.launch

class MedicinesViewModel : ViewModel() {
    var loading by mutableStateOf(true); private set
    var medicines by mutableStateOf<List<Medicine>>(emptyList()); private set

    fun load() {
        loading = true
        viewModelScope.launch {
            runCatching { AppGraph.repo.medicines() }.onSuccess { medicines = it }
            loading = false
        }
    }
}

@Composable
fun MedicinesScreen(vm: MedicinesViewModel = viewModel()) {
    val me by AppGraph.session.me.collectAsState()
    val hospital by AppGraph.session.hospital.collectAsState()
    val role = me?.memberships?.find { it.hospital_id == hospital }?.role
    val manage = role == "owner" || role == "manager"

    var showAdd by remember { mutableStateOf(false) }
    var logFor by remember { mutableStateOf<Medicine?>(null) }
    LaunchedEffect(Unit) { vm.load() }

    ListScaffold(title = "Medicines", onAdd = if (manage) ({ showAdd = true }) else null) { inner ->
        if (vm.loading) {
            LoadingBox()
        } else {
            LazyColumn(
                contentPadding = inner,
                modifier = Modifier.padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (vm.medicines.isEmpty()) {
                    item { EmptyState("No medicines", "Track stock as packets are opened and used.") }
                }
                items(vm.medicines, key = { it.id }) { m ->
                    MedicineRow(m) { logFor = m }
                }
            }
        }
    }

    if (showAdd) {
        AddMedicineSheet(onDismiss = { showAdd = false }, onSaved = { showAdd = false; vm.load() })
    }
    logFor?.let { med ->
        LogStockSheet(med, onDismiss = { logFor = null }, onSaved = { logFor = null; vm.load() })
    }
}

@Composable
private fun MedicineRow(m: Medicine, onLog: () -> Unit) {
    val low = (m.current_stock.toDoubleOrNull() ?: 0.0) <=
        (m.low_stock_threshold.toDoubleOrNull() ?: 0.0) &&
        (m.low_stock_threshold.toDoubleOrNull() ?: 0.0) > 0.0
    AppCard {
        Row(
            Modifier.padding(14.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Column(Modifier.weight(1f)) {
                Text(m.name, style = MaterialTheme.typography.titleMedium)
                Text(
                    "${m.current_stock.toDoubleOrNull()?.toInt() ?: 0} ${m.unit} in stock",
                    style = MaterialTheme.typography.bodySmall,
                    color = Ink2,
                )
            }
            if (low) Pill("Low", Tone.Orange)
            SecondaryButton(text = "Log") { onLog() }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddMedicineSheet(onDismiss: () -> Unit, onSaved: () -> Unit) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var unit by remember { mutableStateOf("tablet") }
    var stock by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            Modifier.padding(20.dp).padding(bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("New medicine", style = MaterialTheme.typography.titleLarge)
            AppTextField(name, { name = it }, "Name")
            AppTextField(unit, { unit = it }, "Unit (tablet, ml…)")
            AppTextField(stock, { stock = it }, "Opening stock", keyboardType = KeyboardType.Decimal)
            ErrorText(error)
            PrimaryButton(text = "Add medicine", loading = busy, modifier = Modifier.fillMaxWidth()) {
                if (name.isBlank()) { error = "Enter a name"; return@PrimaryButton }
                busy = true; error = null
                scope.launch {
                    runCatching {
                        AppGraph.repo.createMedicine(
                            MedicineCreate(name = name.trim(), unit = unit.ifBlank { "unit" }, current_stock = stock.ifBlank { "0" })
                        )
                    }.onSuccess { onSaved() }.onFailure { error = friendly(it); busy = false }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LogStockSheet(medicine: Medicine, onDismiss: () -> Unit, onSaved: () -> Unit) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    var action by remember { mutableStateOf("restock") }
    var quantity by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val actions = listOf("restock", "open_packet", "use", "adjust")

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            Modifier.padding(20.dp).padding(bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("Log stock · ${medicine.name}", style = MaterialTheme.typography.titleLarge)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                actions.take(2).forEach { a -> SegChip(titleCase(a), action == a) { action = a } }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                actions.drop(2).forEach { a -> SegChip(titleCase(a), action == a) { action = a } }
            }
            if (action != "open_packet") {
                AppTextField(quantity, { quantity = it }, "Quantity (${medicine.unit})", keyboardType = KeyboardType.Decimal)
            }
            AppTextField(note, { note = it }, "Note (optional)")
            ErrorText(error)
            PrimaryButton(text = "Record", loading = busy, modifier = Modifier.fillMaxWidth()) {
                busy = true; error = null
                scope.launch {
                    runCatching {
                        AppGraph.repo.addMedicineLog(
                            MedicineLogCreate(
                                medicine_id = medicine.id,
                                action = action,
                                quantity = quantity.ifBlank { "0" },
                                note = note.ifBlank { null },
                            )
                        )
                    }.onSuccess { onSaved() }.onFailure { error = friendly(it); busy = false }
                }
            }
        }
    }
}
