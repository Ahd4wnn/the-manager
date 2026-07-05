package com.bmw.manager.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bmw.manager.data.Patient
import com.bmw.manager.ui.Avatar
import com.bmw.manager.ui.theme.Accent
import com.bmw.manager.ui.theme.Ink3

/** Search + pick a patient. Shows the selection with a "Change" affordance. */
@Composable
fun PatientSelect(
    patients: List<Patient>,
    selected: Patient?,
    onSelect: (Patient?) -> Unit,
) {
    if (selected != null) {
        Surface(
            shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(
                Modifier.padding(12.dp).fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Avatar(selected.full_name, size = 32)
                Column(Modifier.weight(1f)) {
                    Text(selected.full_name, style = MaterialTheme.typography.titleMedium)
                    Text(selected.mrn, style = MaterialTheme.typography.bodySmall, color = Ink3)
                }
                Text(
                    "Change",
                    color = Accent,
                    style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier
                        .padding(end = 4.dp)
                        .clickable { onSelect(null) },
                )
            }
        }
        return
    }

    var query by remember { mutableStateOf("") }
    SearchField(query, { query = it })
    val q = query.trim().lowercase()
    val filtered = (if (q.isEmpty()) patients
    else patients.filter {
        it.full_name.lowercase().contains(q) || it.mrn.lowercase().contains(q)
    }).take(5)

    LazyColumn(
        Modifier.fillMaxWidth().heightIn(max = 220.dp).padding(top = 8.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        items(filtered, key = { it.id }) { p ->
            Surface(
                shape = androidx.compose.foundation.shape.RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                onClick = { onSelect(p) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    Modifier.padding(10.dp).fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Avatar(p.full_name, size = 28)
                    Text(p.full_name, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                    Text(p.mrn, style = MaterialTheme.typography.bodySmall, color = Ink3)
                }
            }
        }
    }
}
