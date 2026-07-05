package com.bmw.manager.ui.screens

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import com.bmw.manager.ui.theme.Accent
import com.bmw.manager.ui.theme.Canvas
import com.bmw.manager.ui.theme.Ink

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ListScaffold(
    title: String,
    onAdd: (() -> Unit)? = null,
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        containerColor = Canvas,
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text(title, style = MaterialTheme.typography.titleLarge) },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = Canvas,
                    titleContentColor = Ink,
                ),
            )
        },
        floatingActionButton = {
            if (onAdd != null) {
                FloatingActionButton(
                    onClick = onAdd,
                    containerColor = Accent,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ) { Icon(Icons.Filled.Add, contentDescription = "Add") }
            }
        },
    ) { inner ->
        content(
            PaddingValues(
                top = inner.calculateTopPadding(),
                bottom = inner.calculateBottomPadding() + 12.dp,
            )
        )
    }
}
