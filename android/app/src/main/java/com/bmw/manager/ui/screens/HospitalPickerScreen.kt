package com.bmw.manager.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.collectAsState
import com.bmw.manager.data.AppGraph
import com.bmw.manager.ui.Pill
import com.bmw.manager.ui.Tone
import com.bmw.manager.ui.titleCase
import com.bmw.manager.ui.theme.Canvas
import com.bmw.manager.ui.theme.Ink2
import com.bmw.manager.ui.theme.Ink3
import kotlinx.coroutines.launch

@Composable
fun HospitalPickerScreen(onSelected: () -> Unit) {
    val scope = rememberCoroutineScope()
    val me by AppGraph.session.me.collectAsState()

    Box(Modifier.fillMaxSize().padding(24.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.padding(top = 48.dp)) {
            Text("Choose a hospital", style = MaterialTheme.typography.headlineMedium)
            Text("You have access to more than one.", style = MaterialTheme.typography.bodyMedium, color = Ink2)

            (me?.memberships ?: emptyList()).forEach { m ->
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surface,
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                    onClick = { scope.launch { AppGraph.repo.selectHospital(m.hospital_id); onSelected() } },
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                ) {
                    Row(
                        Modifier.padding(16.dp).fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(m.hospital_name, style = MaterialTheme.typography.titleLarge)
                            Text(titleCase(m.role), style = MaterialTheme.typography.bodySmall, color = Ink2)
                        }
                        Icon(Icons.Filled.ChevronRight, contentDescription = null, tint = Ink3)
                    }
                }
            }
        }
    }
}
