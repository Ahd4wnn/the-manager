package com.bmw.manager.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.bmw.manager.ui.Avatar
import com.bmw.manager.ui.Pill
import com.bmw.manager.ui.SecondaryButton
import com.bmw.manager.ui.Tone
import com.bmw.manager.ui.titleCase
import com.bmw.manager.ui.theme.Accent
import com.bmw.manager.ui.theme.Ink2
import kotlinx.coroutines.launch

@Composable
fun ProfileScreen(onLoggedOut: () -> Unit) {
    val scope = rememberCoroutineScope()
    val me by AppGraph.session.me.collectAsState()
    val activeHospital by AppGraph.session.hospital.collectAsState()
    val memberships = me?.memberships ?: emptyList()

    ListScaffold(title = "Profile") { inner ->
        Column(
            Modifier.padding(inner).padding(horizontal = 20.dp).fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            Row(
                Modifier.padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Avatar(me?.full_name ?: "?", size = 54)
                Column {
                    Text(me?.full_name ?: "", style = MaterialTheme.typography.titleLarge)
                    Text(me?.phone ?: "", style = MaterialTheme.typography.bodyMedium, color = Ink2)
                }
            }

            if (memberships.isNotEmpty()) {
                Text("Hospitals", style = MaterialTheme.typography.titleMedium)
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    memberships.forEach { m ->
                        val selected = m.hospital_id == activeHospital
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surface,
                            border = androidx.compose.foundation.BorderStroke(
                                1.dp,
                                if (selected) Accent else MaterialTheme.colorScheme.outlineVariant,
                            ),
                            onClick = { scope.launch { AppGraph.repo.selectHospital(m.hospital_id) } },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                Modifier.padding(14.dp).fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(Modifier.weight(1f)) {
                                    Text(m.hospital_name, style = MaterialTheme.typography.titleMedium)
                                    Text(titleCase(m.role), style = MaterialTheme.typography.bodySmall, color = Ink2)
                                }
                                if (selected) Pill("Active", Tone.Blue)
                            }
                        }
                    }
                }
            }

            SecondaryButton(text = "Sign out", modifier = Modifier.fillMaxWidth()) {
                scope.launch {
                    AppGraph.repo.logout()
                    onLoggedOut()
                }
            }
        }
    }
}
