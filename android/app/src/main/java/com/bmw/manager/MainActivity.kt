package com.bmw.manager

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.bmw.manager.data.AppGraph
import com.bmw.manager.data.Network
import com.bmw.manager.data.Session
import com.bmw.manager.ui.LoadingBox
import com.bmw.manager.ui.SecondaryButton
import com.bmw.manager.ui.screens.HomeScreen
import com.bmw.manager.ui.screens.HospitalPickerScreen
import com.bmw.manager.ui.screens.LoginScreen
import com.bmw.manager.ui.theme.Canvas
import com.bmw.manager.ui.theme.Ink2
import com.bmw.manager.ui.theme.TheManagerTheme
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        AppGraph.init(Session(applicationContext))
        // Any 401 clears the session; the UI reacts via the authed flow.
        Network.onUnauthorized = { MainScope().launch { AppGraph.session.clear() } }

        setContent {
            TheManagerTheme {
                Surface(color = Canvas) { Root() }
            }
        }
    }
}

@Composable
private fun Root() {
    var booted by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        AppGraph.session.load()
        booted = true
    }

    val authed by AppGraph.session.authed.collectAsState()
    val me by AppGraph.session.me.collectAsState()
    val hospital by AppGraph.session.hospital.collectAsState()

    // Fetch profile if we have a token but no cached user (cold start).
    LaunchedEffect(authed, me) {
        if (authed && me == null) {
            runCatching { AppGraph.repo.refreshMe() }
        }
    }
    // Auto-select the only hospital.
    LaunchedEffect(me, hospital) {
        val single = me?.memberships?.singleOrNull()
        if (hospital == null && single != null) AppGraph.repo.selectHospital(single.hospital_id)
    }

    if (!booted) {
        Box(Modifier.fillMaxSize()) { LoadingBox() }
        return
    }

    when {
        !authed -> LoginScreen(onLoggedIn = {})
        me == null -> Box(Modifier.fillMaxSize()) { LoadingBox() }
        me!!.is_platform_admin && me!!.memberships.isEmpty() -> AdminNotice()
        hospital == null && (me!!.memberships.size) > 1 -> HospitalPickerScreen(onSelected = {})
        hospital == null -> Box(Modifier.fillMaxSize()) { LoadingBox() }
        else -> HomeScreen(onLoggedOut = {})
    }
}

@Composable
private fun AdminNotice() {
    Box(Modifier.fillMaxSize().padding(28.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Platform admin", style = MaterialTheme.typography.headlineMedium)
            Text(
                "Use the web console to manage hospitals and owners. This app is for clinic staff.",
                style = MaterialTheme.typography.bodyMedium,
                color = Ink2,
                modifier = Modifier.padding(top = 8.dp, bottom = 22.dp),
            )
            SecondaryButton(text = "Sign out") {
                MainScope().launch { AppGraph.session.clear() }
            }
        }
    }
}
