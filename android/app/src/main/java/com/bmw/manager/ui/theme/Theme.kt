package com.bmw.manager.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = Accent,
    onPrimary = Surface,
    primaryContainer = AccentSoft,
    onPrimaryContainer = Accent,
    secondary = Ink2,
    background = Canvas,
    onBackground = Ink,
    surface = Surface,
    onSurface = Ink,
    surfaceVariant = Surface2,
    onSurfaceVariant = Ink2,
    outline = BorderStrong,
    outlineVariant = BorderColor,
    error = Red,
    onError = Surface,
    errorContainer = RedSoft,
    onErrorContainer = Red,
)

@Composable
fun TheManagerTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = AppTypography,
        content = content,
    )
}
