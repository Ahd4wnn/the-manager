package com.bmw.manager.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first

private val Context.dataStore by preferencesDataStore(name = "bmw_session")

private val KEY_TOKEN = stringPreferencesKey("token")
private val KEY_HOSPITAL = intPreferencesKey("hospital_id")

/**
 * Holds the auth token, active hospital and the signed-in user. Token and
 * hospital id are read synchronously by the OkHttp interceptor, and persisted
 * to DataStore so the session survives restarts.
 */
class Session(private val appContext: Context) {

    @Volatile var token: String? = null
        private set

    @Volatile var hospitalId: Int? = null
        private set

    private val _me = MutableStateFlow<Me?>(null)
    val me: StateFlow<Me?> = _me

    private val _authed = MutableStateFlow(false)
    val authed: StateFlow<Boolean> = _authed

    private val _hospital = MutableStateFlow<Int?>(null)
    val hospital: StateFlow<Int?> = _hospital

    suspend fun load() {
        val prefs = appContext.dataStore.data.first()
        token = prefs[KEY_TOKEN]
        hospitalId = prefs[KEY_HOSPITAL]
        _hospital.value = hospitalId
        _authed.value = token != null
    }

    suspend fun setToken(value: String) {
        token = value
        _authed.value = true
        appContext.dataStore.edit { it[KEY_TOKEN] = value }
    }

    suspend fun setHospital(id: Int) {
        hospitalId = id
        _hospital.value = id
        appContext.dataStore.edit { it[KEY_HOSPITAL] = id }
    }

    fun setMe(me: Me?) {
        _me.value = me
    }

    suspend fun clear() {
        token = null
        hospitalId = null
        _me.value = null
        _hospital.value = null
        _authed.value = false
        appContext.dataStore.edit { it.clear() }
    }
}
