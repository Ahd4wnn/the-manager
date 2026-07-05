package com.bmw.manager.data

/** Thin wrapper over [Api] that also keeps [Session] in sync. */
class Repository(val session: Session) {
    private val api: Api = Network.buildApi(session)

    suspend fun login(phone: String, password: String) {
        val token = api.login(phone, password)
        session.setToken(token.access_token)
        val me = api.me()
        session.setMe(me)
        // Auto-select a hospital when there is exactly one.
        if (session.hospitalId == null && me.memberships.size == 1) {
            session.setHospital(me.memberships.first().hospital_id)
        }
    }

    suspend fun refreshMe(): Me {
        val me = api.me()
        session.setMe(me)
        return me
    }

    suspend fun selectHospital(id: Int) = session.setHospital(id)
    suspend fun logout() = session.clear()

    suspend fun patients(q: String? = null) = api.patients(q?.ifBlank { null })
    suspend fun createPatient(body: PatientCreate) = api.createPatient(body)

    suspend fun appointments() = api.appointments()
    suspend fun createAppointment(body: AppointmentCreate) = api.createAppointment(body)
    suspend fun updateAppointmentStatus(id: Int, status: String) =
        api.updateAppointment(id, AppointmentUpdate(status))

    suspend fun catalog() = api.catalog()
    suspend fun recordEncounter(body: EncounterCreate) = api.recordEncounter(body)

    suspend fun invoices() = api.invoices()
    suspend fun invoice(id: Int) = api.invoice(id)
    suspend fun createInvoice(body: InvoiceCreate) = api.createInvoice(body)
    suspend fun issueInvoice(id: Int) = api.issueInvoice(id)
    suspend fun addPayment(id: Int, body: PaymentCreate) = api.addPayment(id, body)
    suspend fun upiQr(id: Int) = api.upiQr(id)
    suspend fun invoicePdf(id: Int) = api.invoicePdf(id)

    suspend fun medicines() = api.medicines()
    suspend fun createMedicine(body: MedicineCreate) = api.createMedicine(body)
    suspend fun addMedicineLog(body: MedicineLogCreate) = api.addMedicineLog(body)
}

/** Tiny service locator, initialised once in MainActivity. */
object AppGraph {
    lateinit var session: Session
        private set
    lateinit var repo: Repository
        private set

    fun init(session: Session) {
        this.session = session
        this.repo = Repository(session)
    }
}
