package com.bmw.manager.data

import retrofit2.http.Body
import retrofit2.http.Field
import retrofit2.http.FormUrlEncoded
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface Api {
    @FormUrlEncoded
    @POST("auth/login")
    suspend fun login(
        @Field("username") phone: String,
        @Field("password") password: String,
    ): TokenResponse

    @GET("auth/me")
    suspend fun me(): Me

    @GET("patients")
    suspend fun patients(@Query("q") q: String? = null): List<Patient>

    @POST("patients")
    suspend fun createPatient(@Body body: PatientCreate): Patient

    @GET("appointments")
    suspend fun appointments(): List<Appointment>

    @POST("appointments")
    suspend fun createAppointment(@Body body: AppointmentCreate): Appointment

    @PATCH("appointments/{id}")
    suspend fun updateAppointment(@Path("id") id: Int, @Body body: AppointmentUpdate): Appointment

    @GET("treatments/catalog")
    suspend fun catalog(@Query("active_only") activeOnly: Boolean = true): List<Treatment>

    @POST("treatments/encounters")
    suspend fun recordEncounter(@Body body: EncounterCreate)

    @GET("billing")
    suspend fun invoices(): List<Invoice>

    @GET("billing/{id}")
    suspend fun invoice(@Path("id") id: Int): Invoice

    @POST("billing")
    suspend fun createInvoice(@Body body: InvoiceCreate): Invoice

    @POST("billing/{id}/issue")
    suspend fun issueInvoice(@Path("id") id: Int): Invoice

    @POST("billing/{id}/payments")
    suspend fun addPayment(@Path("id") id: Int, @Body body: PaymentCreate)

    @GET("billing/{id}/upi-qr")
    suspend fun upiQr(@Path("id") id: Int): UpiQr
}
