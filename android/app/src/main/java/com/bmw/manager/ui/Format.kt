package com.bmw.manager.ui

import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import java.text.NumberFormat
import java.util.Locale

private val inrFormat: NumberFormat = NumberFormat.getNumberInstance(Locale("en", "IN")).apply {
    minimumFractionDigits = 2
    maximumFractionDigits = 2
}

fun inr(amount: String?): String {
    val value = amount?.toDoubleOrNull() ?: 0.0
    return "₹" + inrFormat.format(value)
}

fun initials(name: String): String =
    name.trim().split(Regex("\\s+")).take(2)
        .mapNotNull { it.firstOrNull()?.uppercaseChar() }
        .joinToString("")

fun titleCase(s: String): String =
    s.replace('_', ' ').split(' ')
        .joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }

fun base64ToImageBitmap(b64: String): ImageBitmap? = runCatching {
    val bytes = Base64.decode(b64, Base64.DEFAULT)
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size).asImageBitmap()
}.getOrNull()

/** "2026-07-10T10:00:00Z" -> "10 Jul, 10:00". Best-effort, no external libs. */
fun prettyDateTime(iso: String?): String {
    if (iso.isNullOrBlank()) return "—"
    return runCatching {
        val date = iso.substring(0, 10)
        val (y, m, d) = date.split("-")
        val months = listOf("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec")
        val time = if (iso.length >= 16) iso.substring(11, 16) else ""
        "${d.toInt()} ${months[m.toInt() - 1]}${if (time.isNotEmpty()) ", $time" else ""}"
    }.getOrDefault(iso)
}
