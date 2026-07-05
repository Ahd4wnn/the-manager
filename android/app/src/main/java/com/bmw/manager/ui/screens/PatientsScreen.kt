package com.bmw.manager.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
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
import com.bmw.manager.data.Patient
import com.bmw.manager.data.PatientCreate
import com.bmw.manager.ui.AppCard
import com.bmw.manager.ui.AppTextField
import com.bmw.manager.ui.Avatar
import com.bmw.manager.ui.EmptyState
import com.bmw.manager.ui.ErrorText
import com.bmw.manager.ui.LoadingBox
import com.bmw.manager.ui.Pill
import com.bmw.manager.ui.PrimaryButton
import com.bmw.manager.ui.Tone
import com.bmw.manager.ui.friendly
import com.bmw.manager.ui.theme.Accent
import com.bmw.manager.ui.theme.Ink2
import com.bmw.manager.ui.theme.Ink3
import kotlinx.coroutines.launch

class PatientsViewModel : ViewModel() {
    var loading by mutableStateOf(true); private set
    var patients by mutableStateOf<List<Patient>>(emptyList()); private set
    var query by mutableStateOf("")

    fun load() {
        loading = true
        viewModelScope.launch {
            runCatching { AppGraph.repo.patients() }.onSuccess { patients = it }
            loading = false
        }
    }

    fun filtered(): List<Patient> {
        val q = query.trim().lowercase()
        if (q.isEmpty()) return patients
        return patients.filter {
            it.full_name.lowercase().contains(q) ||
                it.mrn.lowercase().contains(q) ||
                (it.phone ?: "").contains(q)
        }
    }
}

@Composable
fun PatientsScreen(vm: PatientsViewModel = viewModel()) {
    var showAdd by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { vm.load() }

    ListScaffold(title = "Patients", onAdd = { showAdd = true }) { inner ->
        if (vm.loading) {
            LoadingBox()
        } else {
            LazyColumn(
                contentPadding = inner,
                modifier = Modifier.padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item {
                    SearchField(vm.query, { vm.query = it })
                    Spacer(Modifier.size(4.dp))
                }
                val list = vm.filtered()
                if (list.isEmpty()) {
                    item { EmptyState("No patients", "Tap + to register your first patient.") }
                }
                items(list, key = { it.id }) { p -> PatientRow(p) }
            }
        }
    }

    if (showAdd) {
        AddPatientSheet(onDismiss = { showAdd = false }, onSaved = { showAdd = false; vm.load() })
    }
}

@Composable
private fun PatientRow(p: Patient) {
    AppCard {
        Row(
            Modifier.padding(14.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Avatar(p.full_name)
            Column(Modifier.weight(1f)) {
                Text(p.full_name, style = MaterialTheme.typography.titleMedium)
                Text(p.mrn, style = MaterialTheme.typography.bodySmall, color = Ink3)
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Pill(
                    if (p.patient_type == "internal") "Internal" else "Outside",
                    if (p.patient_type == "internal") Tone.Blue else Tone.Gray,
                )
                Text(p.phone ?: "—", style = MaterialTheme.typography.bodySmall, color = Ink2)
            }
        }
    }
}

@Composable
fun SearchField(value: String, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        placeholder = { Text("Search name, MRN or phone") },
        leadingIcon = { Icon(Icons.Filled.Search, null, tint = Ink3) },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Accent,
            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
        ),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddPatientSheet(onDismiss: () -> Unit, onSaved: () -> Unit) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("outside") }
    var phone by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            Modifier.padding(20.dp).padding(bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("New patient", style = MaterialTheme.typography.titleLarge)
            AppTextField(name, { name = it }, "Full name")
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SegChip("Outside", type == "outside") { type = "outside" }
                SegChip("Internal", type == "internal") { type = "internal" }
            }
            AppTextField(phone, { phone = it }, "Phone", keyboardType = KeyboardType.Phone)
            ErrorText(error)
            PrimaryButton(text = "Register patient", loading = busy, modifier = Modifier.fillMaxWidth()) {
                if (name.isBlank()) { error = "Enter a name"; return@PrimaryButton }
                busy = true; error = null
                scope.launch {
                    runCatching {
                        AppGraph.repo.createPatient(
                            PatientCreate(
                                full_name = name.trim(),
                                patient_type = type,
                                phone = phone.ifBlank { null },
                            )
                        )
                    }.onSuccess { onSaved() }
                        .onFailure { error = friendly(it); busy = false }
                }
            }
        }
    }
}

@Composable
fun SegChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val bg = if (selected) Accent else MaterialTheme.colorScheme.surfaceVariant
    val fg = if (selected) MaterialTheme.colorScheme.onPrimary else Ink2
    Surface(color = bg, shape = RoundedCornerShape(10.dp), onClick = onClick) {
        Text(
            label,
            color = fg,
            style = MaterialTheme.typography.labelLarge,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 9.dp),
        )
    }
}
