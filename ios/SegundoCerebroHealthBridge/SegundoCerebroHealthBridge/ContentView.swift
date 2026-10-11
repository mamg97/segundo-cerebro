import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    statusRow(
                        title: "HealthKit",
                        value: HealthKitService.shared.isAvailable ? "Disponible" : "No disponible",
                        ok: HealthKitService.shared.isAvailable
                    )
                    statusRow(
                        title: "Token privado",
                        value: state.hasToken ? "Configurado" : "Pendiente",
                        ok: state.hasToken
                    )
                    statusRow(
                        title: "Permisos de Salud",
                        value: state.didRequestHealthAuthorization ? "Solicitados" : "Pendientes",
                        ok: state.didRequestHealthAuthorization
                    )

                    if let last = state.lastSuccessfulSync {
                        LabeledContent("Última sincronización") {
                            Text(last, format: .dateTime.day().month().hour().minute())
                                .foregroundStyle(.secondary)
                        }

                        LabeledContent("Origen") {
                            Text(state.lastSyncTriggerLabel)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.trailing)
                        }

                        if let summary = state.lastSyncSummary {
                            Text(summary)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    LabeledContent("Cadencia automática") {
                        Text("Hasta 3 veces al día")
                            .foregroundStyle(.secondary)
                    }

                    if let earliest = state.nextBackgroundRefreshEarliest {
                        LabeledContent("Próxima solicitud") {
                            Text(earliest, format: .dateTime.day().month().hour().minute())
                                .foregroundStyle(.secondary)
                        }
                    }
                } header: {
                    Text("Estado")
                } footer: {
                    Text("La fecha es el primer momento permitido. iOS decide cuándo concede realmente la ejecución.")
                }

                Section {
                    if state.hasToken {
                        HStack {
                            Image(systemName: "lock.shield.fill")
                                .foregroundStyle(.green)
                            Text("El token está guardado en Keychain y no se muestra.")
                                .font(.footnote)
                        }

                        Button("Sustituir token") {
                            state.replaceToken()
                        }
                        .foregroundStyle(.orange)
                    } else {
                        SecureField("Token HEALTH_INGEST_TOKEN", text: $state.tokenDraft)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()

                        Button("Guardar token") {
                            state.saveToken()
                        }
                        .disabled(state.tokenDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    }

                    LabeledContent("Destino") {
                        Text("Segundo Cerebro")
                            .foregroundStyle(.secondary)
                    }
                } header: {
                    Text("Conexión privada")
                } footer: {
                    Text("El token nunca se versiona ni se guarda en UserDefaults.")
                }

                Section {
                    Button {
                        Task { await state.requestHealthAuthorization() }
                    } label: {
                        Label(
                            state.didRequestHealthAuthorization ? "Revisar permisos de Salud" : "Conceder acceso a Apple Health",
                            systemImage: "heart.text.square"
                        )
                    }

                    Button {
                        Task { await state.syncNow() }
                    } label: {
                        HStack {
                            Label("Sincronizar ahora", systemImage: "arrow.triangle.2.circlepath")
                            Spacer()
                            if state.isSyncing {
                                ProgressView()
                            }
                        }
                    }
                    .disabled(!state.hasToken || !state.didRequestHealthAuthorization || state.isSyncing)
                } header: {
                    Text("Acciones")
                } footer: {
                    Text("La sincronización manual actualiza hoy y ayer. Después HealthKit puede despertar la app cuando existan datos nuevos; iOS decide el momento exacto.")
                }

                Section {
                    metric("Actividad", "Energía activa y basal, pasos, minutos de ejercicio y entrenamientos")
                    metric("Composición", "Peso, grasa corporal, IMC y masa magra")
                    metric("Recuperación", "FC en reposo, HRV, frecuencia respiratoria, SpO₂ y VO₂ máx.")
                    metric("Sueño", "Tiempo dormido, en cama, despierto, Core, Deep y REM")
                    metric("Temperatura", "Temperatura de muñeca durante el sueño, cuando el reloj la genere")
                    metric("Cardiovascular", "Pulso diario, recuperación cardiaca, presión, glucosa y carga de fibrilación cuando existan")
                    metric("Movilidad y deporte", "Distancias, desnivel, marcha, carrera, natación y ciclismo compatibles")
                    metric("Entorno y nutrición", "Ruido, luz diurna, profundidad, agua y nutrientes escritos en Apple Health")
                } header: {
                    Text("Datos recogidos")
                } footer: {
                    Text("Los tipos sin muestras reales simplemente quedan vacíos. No se inventan valores.")
                }

                Section {
                    Text(state.statusMessage)
                        .font(.footnote)
                        .foregroundStyle(state.statusMessage.localizedCaseInsensitiveContains("fallida") ? .red : .secondary)
                        .textSelection(.enabled)
                } header: {
                    Text("Diagnóstico")
                }
            }
            .navigationTitle("Health Bridge")
            .onChange(of: scenePhase) { _, phase in
                if phase == .active {
                    state.refreshDiagnostics()
                }
            }
        }
    }

    @ViewBuilder
    private func statusRow(title: String, value: String, ok: Bool) -> some View {
        LabeledContent(title) {
            HStack(spacing: 6) {
                Circle()
                    .fill(ok ? Color.green : Color.orange)
                    .frame(width: 8, height: 8)
                Text(value)
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private func metric(_ title: String, _ detail: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.body.weight(.semibold))
            Text(detail)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}
