package com.bmw.manager.ui

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.HttpException
import java.io.IOException

private val json = Json { ignoreUnknownKeys = true }

/** Turn a thrown exception into a human message, unwrapping FastAPI's detail. */
fun friendly(t: Throwable): String = when (t) {
    is HttpException -> {
        val body = t.response()?.errorBody()?.string()
        parseDetail(body) ?: "Request failed (${t.code()})"
    }
    is IOException -> "Can't reach the server. Is the backend running and adb reverse set?"
    else -> t.message ?: "Something went wrong"
}

private fun parseDetail(body: String?): String? {
    if (body.isNullOrBlank()) return null
    return runCatching {
        val detail = json.parseToJsonElement(body).jsonObject["detail"] ?: return null
        runCatching { detail.jsonPrimitive.content }.getOrNull()
            ?: runCatching {
                detail.jsonArray.joinToString(", ") {
                    it.jsonObject["msg"]?.jsonPrimitive?.content ?: ""
                }
            }.getOrNull()
    }.getOrNull()
}
