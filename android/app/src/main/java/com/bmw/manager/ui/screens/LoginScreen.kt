package com.bmw.manager.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MonitorHeart
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.bmw.manager.data.AppGraph
import com.bmw.manager.ui.AppCard
import com.bmw.manager.ui.AppTextField
import com.bmw.manager.ui.ErrorText
import com.bmw.manager.ui.PrimaryButton
import com.bmw.manager.ui.friendly
import com.bmw.manager.ui.theme.Accent
import com.bmw.manager.ui.theme.AccentPress
import com.bmw.manager.ui.theme.Canvas
import com.bmw.manager.ui.theme.Ink2
import androidx.compose.ui.graphics.Brush
import kotlinx.coroutines.launch

class LoginViewModel : ViewModel() {
    var phone by mutableStateOf("")
    var password by mutableStateOf("")
    var loading by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    fun submit(onDone: () -> Unit) {
        if (phone.isBlank() || password.isBlank()) {
            error = "Enter phone and password"
            return
        }
        loading = true
        error = null
        viewModelScope.launch {
            runCatching { AppGraph.repo.login(phone.trim(), password) }
                .onSuccess { onDone() }
                .onFailure { error = friendly(it) }
            loading = false
        }
    }
}

@Composable
fun LoginScreen(onLoggedIn: () -> Unit, vm: LoginViewModel = viewModel()) {
    Box(
        Modifier.fillMaxSize().background(Canvas),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(28.dp).width(400.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(58.dp)
                    .background(Brush.linearGradient(listOf(Accent, AccentPress)), RoundedCornerShape(16.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.MonitorHeart, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(30.dp))
            }
            Text("The Manager", style = MaterialTheme.typography.headlineMedium, modifier = Modifier.padding(top = 16.dp))
            Text("Sign in to your clinic", style = MaterialTheme.typography.bodyMedium, color = Ink2, modifier = Modifier.padding(top = 2.dp))

            AppCard(modifier = Modifier.padding(top = 24.dp)) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    AppTextField(vm.phone, { vm.phone = it }, "Phone number", keyboardType = KeyboardType.Phone)
                    AppTextField(vm.password, { vm.password = it }, "Password", password = true)
                    ErrorText(vm.error)
                    PrimaryButton(
                        text = "Sign in",
                        loading = vm.loading,
                        modifier = Modifier.fillMaxWidth(),
                        onClick = { vm.submit(onLoggedIn) },
                    )
                }
            }
            Text(
                "Hospital management, made calm.",
                style = MaterialTheme.typography.bodySmall,
                color = Ink2,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 18.dp),
            )
        }
    }
}
