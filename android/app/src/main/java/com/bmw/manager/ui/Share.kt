package com.bmw.manager.ui

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.bmw.manager.data.AppGraph
import java.io.File

/** Download an invoice PDF to cache and open the Android share sheet (e.g. WhatsApp). */
suspend fun shareInvoicePdf(context: Context, invoiceId: Int, invoiceNumber: String) {
    val body = AppGraph.repo.invoicePdf(invoiceId)
    val dir = File(context.cacheDir, "invoices").apply { mkdirs() }
    val file = File(dir, "$invoiceNumber.pdf")
    body.byteStream().use { input ->
        file.outputStream().use { output -> input.copyTo(output) }
    }
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val share = Intent(Intent.ACTION_SEND).apply {
        type = "application/pdf"
        putExtra(Intent.EXTRA_STREAM, uri)
        putExtra(Intent.EXTRA_SUBJECT, "Invoice $invoiceNumber")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(share, "Share invoice").apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    })
}
