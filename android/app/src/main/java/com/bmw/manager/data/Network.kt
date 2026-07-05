package com.bmw.manager.data

import com.bmw.manager.BuildConfig
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit

object Network {
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        coerceInputValues = true
    }

    /** Invoked when the backend returns 401 so the app can log out. */
    var onUnauthorized: (() -> Unit)? = null

    fun buildApi(session: Session): Api {
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val builder = chain.request().newBuilder()
                session.token?.let { builder.header("Authorization", "Bearer $it") }
                session.hospitalId?.let { builder.header("X-Hospital-Id", it.toString()) }
                val response = chain.proceed(builder.build())
                if (response.code == 401) onUnauthorized?.invoke()
                response
            }
            .build()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(Api::class.java)
    }
}
