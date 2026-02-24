import Api from "../helpers/Api";
import Misc from "../helpers/Misc";
import Log from "../constants/Log";

/**
 * Muestra una notificación pequeña y NO bloqueante en la esquina
 * pidiendo al usuario que descargue cualquier archivo de Wuolah
 * para resolver el captcha.
 *
 * Monitoriza captchaCounter y se auto-cierra cuando vuelve a ser > 0.
 * No bloquea la interacción con la página: el usuario puede navegar
 * y descargar archivos normalmente.
 */
export default class CaptchaHelperUI {
    private container: HTMLDivElement | null = null;
    private statusEl: HTMLSpanElement | null = null;
    private pollTimer: number | null = null;
    private resolved = false;
    private closed = false;

    /**
     * Muestra el helper de CAPTCHA y devuelve una Promise que se resuelve
     * con `true` cuando el CAPTCHA ha sido resuelto, o `false` si el
     * usuario cierra/cancela manualmente.
     */
    show(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            this.createNotification(resolve);
            this.startPolling(resolve);
        });
    }

    private createNotification(resolve: (v: boolean) => void) {
        // Limpiar anterior si existe
        const existing = document.getElementById("wuolahextra-captcha-helper");
        if (existing) existing.remove();

        // Animación
        if (!document.getElementById("wuolahextra-captcha-style")) {
            const style = document.createElement("style");
            style.id = "wuolahextra-captcha-style";
            style.textContent = `
        @keyframes wuolahextra-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes wuolahextra-slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
            document.head.appendChild(style);
        }

        this.container = document.createElement("div");
        this.container.id = "wuolahextra-captcha-helper";
        Object.assign(this.container.style, {
            position: "fixed",
            right: "16px",
            top: "16px",
            zIndex: "2147483647",
            background: "rgba(20, 20, 20, 0.97)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "12px",
            padding: "0",
            width: "340px",
            fontFamily:
                "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif",
            fontSize: "13px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            animation: "wuolahextra-slideIn 0.3s ease-out",
            overflow: "hidden",
        });

        // Header
        const header = document.createElement("div");
        Object.assign(header.style, {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: "rgba(239, 68, 68, 0.15)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
        });

        const titleEl = document.createElement("div");
        titleEl.style.fontWeight = "600";
        titleEl.textContent = "🔒 Captcha requerido";

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "✕";
        Object.assign(closeBtn.style, {
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            fontSize: "14px",
            padding: "2px 4px",
            lineHeight: "1",
        });
        closeBtn.addEventListener("click", () => {
            this.close();
            if (!this.resolved) resolve(false);
        });

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        // Body
        const body = document.createElement("div");
        Object.assign(body.style, {
            padding: "12px 14px",
        });

        const instructions = document.createElement("div");
        Object.assign(instructions.style, {
            color: "rgba(255,255,255,0.85)",
            lineHeight: "1.5",
            marginBottom: "10px",
        });
        instructions.innerHTML = `
      La descarga se ha pausado por un captcha.<br>
      <strong>Descarga cualquier archivo</strong> de esta página
      para que aparezca el captcha, resuélvelo y el script
      continuará automáticamente.
    `;

        // Estado
        const statusRow = document.createElement("div");
        Object.assign(statusRow.style, {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "rgba(255,255,255,0.5)",
            fontSize: "12px",
        });

        const spinner = document.createElement("div");
        Object.assign(spinner.style, {
            width: "10px",
            height: "10px",
            border: "2px solid rgba(255,255,255,0.15)",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "wuolahextra-spin 0.8s linear infinite",
            flexShrink: "0",
        });

        this.statusEl = document.createElement("span");
        this.statusEl.textContent = "Esperando resolución…";

        statusRow.appendChild(spinner);
        statusRow.appendChild(this.statusEl);

        body.appendChild(instructions);
        body.appendChild(statusRow);

        this.container.appendChild(header);
        this.container.appendChild(body);

        document.body.appendChild(this.container);
    }

    /**
     * Polling: comprueba captchaCounter cada 2s.
     * Cuando vuelve a ser > 0, resuelve la Promise y cierra todo.
     */
    private startPolling(resolve: (v: boolean) => void) {
        this.pollTimer = window.setInterval(async () => {
            if (this.closed) {
                this.stopPolling();
                return;
            }

            try {
                const me = await Api.me();
                const counter = typeof me.captchaCounter === "number" ? me.captchaCounter : null;

                if (this.statusEl && counter !== null) {
                    this.statusEl.textContent = counter > 0
                        ? `✅ Captcha resuelto! (${counter} descargas disponibles)`
                        : `Descargas disponibles: ${counter} — resuelve el captcha…`;
                    this.statusEl.style.color = counter > 0 ? "#86efac" : "";
                }

                if (counter !== null && counter > 0) {
                    Misc.log(`Captcha resuelto, captchaCounter = ${counter}`, Log.INFO);
                    this.resolved = true;

                    // Efecto visual de éxito antes de cerrar
                    if (this.container) {
                        const header = this.container.querySelector("div") as HTMLElement;
                        if (header) header.style.background = "rgba(34,197,94,0.15)";
                    }

                    this.stopPolling();
                    setTimeout(() => {
                        this.close();
                        resolve(true);
                    }, 1200);
                }
            } catch (e) {
                Misc.log(`Error polling captchaCounter: ${e}`, Log.DEBUG);
            }
        }, 2000) as unknown as number;
    }

    private stopPolling() {
        if (this.pollTimer !== null) {
            window.clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    close() {
        this.closed = true;
        this.stopPolling();

        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}
