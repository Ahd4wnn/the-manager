package com.bmw.manager.ui.screens

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Group
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.bmw.manager.ui.theme.Accent
import com.bmw.manager.ui.theme.AccentSoft
import com.bmw.manager.ui.theme.Canvas
import com.bmw.manager.ui.theme.Ink3

private data class Tab(val label: String, val icon: ImageVector)

@Composable
fun HomeScreen(onLoggedOut: () -> Unit) {
    var index by remember { mutableIntStateOf(0) }
    val tabs = listOf(
        Tab("Patients", Icons.Outlined.Person),
        Tab("Bookings", Icons.Outlined.CalendarMonth),
        Tab("Billing", Icons.Outlined.ReceiptLong),
        Tab("Profile", Icons.Outlined.Group),
    )

    Scaffold(
        containerColor = Canvas,
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 0.dp) {
                tabs.forEachIndexed { i, tab ->
                    NavigationBarItem(
                        selected = index == i,
                        onClick = { index = i },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label, style = MaterialTheme.typography.labelMedium) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Accent,
                            selectedTextColor = Accent,
                            indicatorColor = AccentSoft,
                            unselectedIconColor = Ink3,
                            unselectedTextColor = Ink3,
                        ),
                    )
                }
            }
        },
    ) { inner ->
        androidx.compose.foundation.layout.Box(Modifier.padding(bottom = inner.calculateBottomPadding())) {
            when (index) {
                0 -> PatientsScreen()
                1 -> AppointmentsScreen()
                2 -> BillingScreen()
                else -> ProfileScreen(onLoggedOut)
            }
        }
    }
}
