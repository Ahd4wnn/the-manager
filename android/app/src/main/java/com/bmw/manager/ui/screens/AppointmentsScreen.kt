package com.bmw.manager.ui.screens

import android.app.DatePickerDialog
import android.app.TimePickerDialog
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.bmw.manager.data.Appointment
import com.bmw.manager.data.AppointmentCreate
import com.bmw.manager.data.AppGraph
import com.bmw.manager.data.Patient
import com.bmw.manager.ui.AppCard
import com.bmw.manager.ui.AppTextField
import com.bmw.manager.ui.EmptyState
import com.bmw.manager.ui.ErrorText
import com.bmw.manager.ui.LoadingBox
import com.bmw.manager.ui.Pill
import com.bmw.manager.ui.PrimaryButton
import com.bmw.manager.ui.SecondaryButton
import com.bmw.manager.ui.friendly
import com.bmw.manager.ui.prettyDateTime
import com.bmw.manager.ui.statusTone
import com.bmw.manager.ui.theme.Ink2
import com.bmw.manager.ui.titleCase
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val nextStatus = mapOf(
    "booked" to ("checked_in" to "Check in"),
    "checked_in" to ("in_progress" to "Start"),
    "in_progress" to ("completed" to "Complete"),
)

class AppointmentsViewModel : ViewModel() {
    var loading by mutableStateOf(true); private set
    var appts by mutableStateOf<List<Appointment>>(emptyList()); private set
    var patients by mutableStateOf<Map<Int, Patient>>(emptyMap()); private set

    fun load() {
        loading = true
        viewModelScope.launch {
            runCatching {
                val a = AppGraph.repo.appointments()
                val p = AppGraph.repo.patients().associateBy { it.id }
                a to p
            }.onSuccess { (a, p) -> appts = a.sortedBy { it.scheduled_start }; patients = p }
            loading = false
        }
    }

    fun advance(a: Appointment, to: String) {
        viewModelScope.launch {
            runCatching { AppGraph.repo.updateAppointmentStatus(a.id, to) }.onSuccess { load() }
        }
    }
}

@Composable
fun AppointmentsScreen(vm: AppointmentsViewModel = viewModel()) {
    var showAdd by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { vm.load() }

    ListScaffold(title = "Appointments", onAdd = { showAdd = true }) { inner ->
        if (vm.loading) {
            LoadingBox()
        } else {
            LazyColumn(
                contentPadding = inner,
                modifier = Modifier.padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (vm.appts.isEmpty()) {
                    item { EmptyState("No appointments", "Tap + to book a slot for a patient.") }
                }
                items(vm.appts, key = { it.id }) { a ->
                    AppointmentRow(a, vm.patients[a.patient_id]?.full_name ?: "#${a.patient_id}") { to ->
                        vm.advance(a, to)
                    }
                }
            }
        }
    }

    if (showAdd) {
        BookingSheet(
            patients = vm.patients.values.toList(),
            onDismiss = { showAdd = false },
            onSaved = { showAdd = false; vm.load() },
        )
    }
}

@Composable
private fun AppointmentRow(a: Appointment, patientName: String, onAdvance: (String) -> Unit) {
    AppCard {
        Row(
            Modifier.padding(14.dp).fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Column(Modifier.weight(1f)) {
                Text(patientName, style = MaterialTheme.typography.titleMedium)
                Text(prettyDateTime(a.scheduled_start), style = MaterialTheme.typography.bodySmall, color = Ink2)
                if (!a.reason.isNullOrBlank()) {
                    Text(a.reason, style = MaterialTheme.typography.bodySmall, color = Ink2)
                }
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Pill(titleCase(a.status), statusTone(a.status))
                nextStatus[a.status]?.let { (to, label) ->
                    SecondaryButton(text = label) { onAdvance(to) }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BookingSheet(patients: List<Patient>, onDismiss: () -> Unit, onSaved: () -> Unit) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    val context = LocalContext.current

    var patient by remember { mutableStateOf<Patient?>(null) }
    var dateTime by remember { mutableStateOf(LocalDateTime.now().plusHours(1).withMinute(0).withSecond(0)) }
    var reason by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    val fmt = remember { DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm") }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            Modifier.padding(20.dp).padding(bottom = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("New booking", style = MaterialTheme.typography.titleLarge)
            PatientSelect(patients, patient) { patient = it }

            SecondaryButton(text = "When · ${dateTime.format(fmt)}", modifier = Modifier.fillMaxWidth()) {
                val d = dateTime
                DatePickerDialog(
                    context,
                    { _, y, m, day ->
                        val date = LocalDate.of(y, m + 1, day)
                        TimePickerDialog(
                            context,
                            { _, h, min ->
                                dateTime = LocalDateTime.of(date, LocalTime.of(h, min))
                            },
                            d.hour, d.minute, true,
                        ).show()
                    },
                    d.year, d.monthValue - 1, d.dayOfMonth,
                ).show()
            }

            AppTextField(reason, { reason = it }, "Reason (optional)")
            ErrorText(error)
            PrimaryButton(text = "Book appointment", loading = busy, modifier = Modifier.fillMaxWidth()) {
                val p = patient
                if (p == null) { error = "Pick a patient"; return@PrimaryButton }
                busy = true; error = null
                val iso = dateTime.atZone(ZoneId.systemDefault()).toInstant().toString()
                scope.launch {
                    runCatching {
                        AppGraph.repo.createAppointment(
                            AppointmentCreate(patient_id = p.id, scheduled_start = iso, reason = reason.ifBlank { null })
                        )
                    }.onSuccess { onSaved() }
                        .onFailure { error = friendly(it); busy = false }
                }
            }
        }
    }
}
