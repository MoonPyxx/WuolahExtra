import JSZip from "jszip";
import Api from "./Api";
import Misc from "./Misc";
import { ProgressUI, CaptchaHelperUI } from "../ui";
import handlePDF from "./Cleaner";
import Log from "../constants/Log";
import Doc from "../types/Doc";

export default class BatchDownload {
    static async start(docs: Doc[], batchName: string) {
        const zip = new JSZip();
        const progress = new ProgressUI(`Descargando ${batchName}`);

        progress.setStatus("Iniciando descarga por lotes…");
        progress.setTotal(docs.length);
        progress.setProgress(0, docs.length);

        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

        const getCaptchaCounter = async (): Promise<number | null> => {
            try {
                const me = await Api.me();
                return typeof me.captchaCounter === "number" ? me.captchaCounter : null;
            } catch {
                return null;
            }
        };

        const showCaptchaHelper = async (): Promise<boolean> => {
            const helper = new CaptchaHelperUI();
            progress.onCancel(() => helper.close());
            const resolved = await helper.show();
            return resolved;
        };
        try {
            progress.setStatus("Comprobando captchaCounter…");
            const me = await Api.me();
            const counter = typeof me.captchaCounter === "number" ? me.captchaCounter : null;
            if (counter !== null && docs.length > counter) {
                alert(
                    `Aviso: esta descarga tiene ${docs.length} archivos, pero ahora mismo solo puedes descargar ${counter} archivos seguidos antes de que Wuolah te pida una verificación (captcha).\n\n` +
                    `La descarga se parará a la mitad. Cuando ocurra, el script te indicará qué hacer para continuar.`
                );
            }
        } catch (e) {
            Misc.log(`No se pudo comprobar captchaCounter: ${e}`, Log.DEBUG);
        }

        let isPaused = false;
        let availableTokens: number | null = await getCaptchaCounter();
        let pausePromise: Promise<boolean> | null = null;
        let pauseResolver: ((v: boolean) => void) | null = null;

        let completed = 0;
        let failed = false;
        let fatalError: string | null = null;
        const skippedDocs: { name: string; reason: string }[] = [];

        const setStatusSafe = (text: string) => {
            if (!isPaused && !failed && !progress.isCancelled()) {
                progress.setStatus(text);
            }
        };

        const refreshTokens = async () => {
            const t = await getCaptchaCounter();
            availableTokens = t;
            return t;
        };

        const waitIfPaused = async (): Promise<boolean> => {
            if (isPaused && pausePromise) {
                return pausePromise;
            }
            return true;
        };

        const triggerPause = async (docName?: string): Promise<boolean> => {
            if (isPaused) return waitIfPaused();

            isPaused = true;
            pausePromise = new Promise<boolean>((resolve) => {
                pauseResolver = resolve;
            });

            await refreshTokens();

            progress.setError(
                `Esperando captcha${docName ? `: ${docName}` : ""}\n` +
                `Resuelve el captcha en la ventana que ha aparecido.`
            );

            const resumed = await showCaptchaHelper();
            await refreshTokens();

            isPaused = false;
            pauseResolver?.(resumed);
            return resumed;
        };

        let nextDocIndex = 0;
        const maxConcurrency = 4;
        const concurrency = Math.max(1, Math.min(maxConcurrency, docs.length));

        const workers = Array.from({ length: concurrency }, async () => {
            while (nextDocIndex < docs.length) {
                if (completed + (failed ? 1 : 0) >= docs.length) break;
                if (progress.isCancelled() || failed) return;

                const myIndex = nextDocIndex++;
                if (myIndex >= docs.length) break;
                const doc = docs[myIndex];

                let success = false;
                while (!success && !failed && !progress.isCancelled()) {
                    if (isPaused) {
                        if (!await waitIfPaused()) return;
                    }

                    if (availableTokens !== null && availableTokens <= 0) {
                        if (!await triggerPause(doc.name)) return;
                        continue;
                    }

                    if (availableTokens !== null) availableTokens--;

                    try {
                        setStatusSafe(`Descargando ${completed + 1}/${docs.length}: ${doc.name}`);
                        const dl = await Api.docUrlResult(doc.id);

                        if (dl.url !== null) {
                            let buf = await Api.docData(dl.url);

                            // Log de depuración para ver tamaños
                            Misc.log(`Descargado ${doc.name} (ID: ${doc.id}): ${buf.byteLength} bytes`, Log.DEBUG);

                            if (doc.fileType === "pdf") {
                                setStatusSafe(`Limpiando PDF (${completed + 1}/${docs.length}): ${doc.name}`);
                                buf = await handlePDF(buf);
                                Misc.log(`PDF limpiado para ${doc.name}: ${buf.byteLength} bytes`, Log.DEBUG);
                            }

                            // Asegurar nombre de archivo con extensión correcta
                            let fileName = doc.name;
                            let extension = (doc.extension || doc.fileType || "bin").toLowerCase();

                            // Normalizar extensiones comunes
                            if (extension.includes("pdf")) extension = "pdf";
                            else if (extension.includes("python")) extension = "py";
                            else if (extension.includes("text_plain") || extension === "txt") extension = "txt";
                            else if (extension.includes("word") || extension.includes("docx")) extension = "docx";
                            else if (extension.includes("powerpoint") || extension.includes("pptx")) extension = "pptx";
                            else if (extension.includes("excel") || extension.includes("xlsx")) extension = "xlsx";
                            else if (extension.includes("zip")) extension = "zip";
                            else if (extension.includes("_")) extension = extension.split("_").pop() || "bin";
                            else if (extension.includes("/")) extension = extension.split("/").pop() || "bin";

                            const finalExtension = `.${extension}`;

                            // Si el nombre ya termina en la extensión (ej. .pdf), no la repetimos
                            if (!fileName.toLowerCase().endsWith(finalExtension)) {
                                // No añadir .txt o .bin si el archivo ya parece tener una extensión (ej. .cpp, .js)
                                const hasExt = /\.[a-z0-9]{2,4}$/i.test(fileName);
                                if (!(hasExt && (extension === "txt" || extension === "bin"))) {
                                    fileName += finalExtension;
                                }
                            }

                            // Limpiar caracteres no permitidos en el nombre
                            fileName = fileName.replace(/[\\/:*?\"<>|]+/g, "_").trim();

                            let pathInZip = fileName;

                            // Clasificar por carpetas si está activado
                            if (GM_config.get("folder_organization")) {
                                let folderPath = "";
                                const uploaderName = doc.uploader?.nickname || doc.profile?.nickname || "Anonimo";
                                const uploadName = doc.upload?.name || "";

                                // Sanitizar nombres para carpetas
                                const authorFolder = uploaderName.replace(/[\\/:*?\"<>|]+/g, "_").trim();
                                const subFolder = uploadName.replace(/[\\/:*?\"<>|]+/g, "_").trim();

                                if (subFolder) {
                                    // Prioridad: La carpeta que agrupa los archivos (ej. PRÁCTICA 1)
                                    folderPath = `${subFolder}/`;
                                } else if (authorFolder !== "Anonimo") {
                                    // Si no hay carpeta pero sí autor, usamos el autor
                                    folderPath = `${authorFolder}/`;
                                } else {
                                    folderPath = "Sin_Clasificar/";
                                }
                                pathInZip = `${folderPath}${fileName}`;
                            }

                            zip.file(pathInZip, buf, { binary: true });
                            completed++;
                            progress.setProgress(completed, docs.length);
                            setStatusSafe(`Completado ${completed}/${docs.length}`);
                            success = true;
                        } else {
                            if (availableTokens !== null) availableTokens++;

                            if (dl.status === 429 && dl.code === "FI008") {
                                if (!await triggerPause(doc.name)) return;
                            } else {
                                // Error irrecuperable para este archivo (ej. 400/DW002) => saltar
                                const reason = `status ${dl.status}${dl.code ? `, code ${dl.code}` : ""}`;
                                Misc.log(`Saltando ${doc.name}: ${reason}`, Log.INFO);
                                skippedDocs.push({ name: doc.name, reason });
                                completed++;
                                progress.setProgress(completed, docs.length);
                                setStatusSafe(`Completado ${completed}/${docs.length} (${doc.name} no disponible)`);
                                success = true; // marcar como "procesado" para continuar
                            }
                        }
                    } catch (e) {
                        // Error de red u otro error inesperado para este archivo => saltar
                        const reason = e instanceof Error ? e.message : String(e);
                        Misc.log(`Error descargando ${doc.name}: ${reason}`, Log.ERROR);
                        skippedDocs.push({ name: doc.name, reason });
                        completed++;
                        progress.setProgress(completed, docs.length);
                        setStatusSafe(`Completado ${completed}/${docs.length} (error en ${doc.name})`);
                        success = true;
                    }
                }
            }
        });

        await Promise.all(workers);

        if (progress.isCancelled()) {
            progress.setError("Descarga cancelada por el usuario");
            return;
        }

        const totalOk = completed - skippedDocs.length;

        if (totalOk === 0) {
            const skipList = skippedDocs.map(s => `• ${s.name}: ${s.reason}`).join("\n");
            progress.setError(
                `No se pudo descargar ningún archivo.\n${skipList}`
            );
            return;
        }

        progress.setStatus("Generando ZIP…");
        progress.setProgress(docs.length, docs.length);
        zip.generateAsync({ type: "base64" }).then((bs64: string) => {
            const a = document.createElement('a');
            a.href = "data:application/zip;base64," + bs64;
            a.setAttribute("download", `${batchName}.zip`);
            a.click();
            a.remove();

            let msg = `ZIP listo: ${batchName}.zip (${totalOk} archivos)`;
            if (skippedDocs.length > 0) {
                msg += `\n⚠️ ${skippedDocs.length} archivo(s) no disponible(s):`;
                for (const s of skippedDocs) {
                    msg += `\n  • ${s.name}`;
                }
            }

            if (skippedDocs.length > 0) {
                progress.setError(msg);
            } else {
                progress.done(msg);
            }
            setTimeout(() => progress.remove(), skippedDocs.length > 0 ? 10000 : 5000);
        }).catch((err: any) => {
            Misc.log(err, Log.ERROR);
            progress.setError("Error generando el ZIP");
        })
    }
}
