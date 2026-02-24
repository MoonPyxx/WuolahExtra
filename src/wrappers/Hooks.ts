import Api from "../helpers/Api";
import Misc from "../helpers/Misc";
import { HookAfter, HookBefore } from "../types/Hooks";
import Log from "../constants/Log";
import BatchDownload from "../helpers/BatchDownload";
import Doc from "../types/Doc";
import { DocSelectionUI } from "../ui";

declare const unsafeWindow: Window & typeof globalThis;

/**
 * Hooks de Fetch
 */
export default class Hooks {
  /**
   * Hooks que se ejecutan antes de enviar una solicitud
   */
  static BEFORE: HookBefore[] = [
    {
      id: "no-analytics",
      endpoint: /^\/v2\/events$/,
      func: Hooks.noAnalytics,
      cond: () => GM_config.get("no_analytics"),
    },
  ];

  /**
   * Hooks que se ejecutan después de enviar una solicitud
   */
  static AFTER: HookAfter[] = [
    {
      id: "make-pro",
      endpoint: /^\/v2\/me$/,
      func: Hooks.makePro,
    },
    {
      id: "force-dark",
      endpoint: /^\/v2\/user-preferences\/me$/,
      func: Hooks.forceDark,
      cond: () => GM_config.get("force_dark"),
    },
    {
      id: "no-ui-ads",
      endpoint: /^\/v2\/a-d-s$/,
      func: Hooks.noUiAds,
      cond: () => GM_config.get("clean_ui"),
    },
    {
      id: "folder-download",
      endpoint: /^\/v2\/group-downloads\/uploads/,
      func: Hooks.folderDownload,
      cond: () => GM_config.get("folder_download"),
    },
    {
      id: "subject-detect",
      endpoint: /v2\/.*subjects?\/\d+/,
      func: Hooks.subjectDetect,
      cond: () => GM_config.get("folder_download"),
    }
  ];

  /**
   * Intenta encontrar el ID de la asignatura en window.__NEXT_DATA__
   */
  static initSubjectDetection() {
    if (!GM_config.get("folder_download")) return;

    const check = () => {
      try {
        const nextData = (unsafeWindow as any).__NEXT_DATA__;
        const subjectId = nextData?.props?.pageProps?.subject?.id;
        if (subjectId) {
          Misc.log(`Asignatura detectada vía __NEXT_DATA__: ${subjectId}`, Log.INFO);
          Hooks.startSubjectInjectionObserver(subjectId);
        }
      } catch (e) {
        // ignore
      }
    };

    // Varias pasadas por si el objeto no está listo
    check();
    setTimeout(check, 1000);
    setTimeout(check, 3000);

    // También observar cambios de URL (SPA)
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        check();
      }
    }, 2000);
  }

  // -- Before -- //
  /**
   * Eliminar analíticas de Wuolah
   * Mitigación: ya no vaciamos la lista de eventos para evitar logout por heartbeat faltante
   */
  static noAnalytics(_input: RequestInfo | URL, init?: RequestInit) {
    if (init) {
      Misc.log("Analíticas detectadas", Log.DEBUG);
      // init.body = JSON.stringify({
      //   events: [],
      // });
    }
  }

  // -- After -- //
  /**
   * Reemplaza solicitud de /me
   *
   * Hace usuario PRO y le da suscripción PRO+
   */
  static makePro(res: Response) {
    if (res.ok) {
      Misc.log("Haciendo usuario pro client-side", Log.INFO);
      const json = () =>
        res
          .clone()
          .json()
          .then((d) => ({ ...d, isPro: true, subscriptionId: "prod_OiP9d4lmwvm0Ba", subscriptionTier: "tier_3", verifiedSubscriptionTier: true }));
      res.json = json;
    }
  }

  /**
   * Fuerza modo oscuro en el nuevo frontend de Wuolah
   */
  static forceDark(res: Response) {
    if (res.ok) {
      Misc.log("Forzando tema oscuro", Log.INFO);
      const json = () =>
        res
          .clone()
          .json()
          .then((d) => ({
            ...d, item: {
              theme: {
                id: "wuolah-theme-dark",
                properties: {
                  colorSchemeAlias: "wuolah-color-scheme-dark",
                  previewUrl: "https://cdn.wuolahservices.com/features/themes/default/preview.png"
                }
              }
            }
          }));
      res.json = json;
    }
  }

  /**
   * Elimina anuncios de la UI
   */
  static noUiAds(res: Response) {
    if (res.ok) {
      Misc.log("Eliminando ui ads", Log.INFO);

      const json = async () => {
        return { items: [] };
      };

      res.json = json;
    }
  }

  /**
   * Detecta ID de asignatura en la respuesta de anuncios
   */
  static subjectDetectAds(res: Response) {
    if (!res.ok) return;
    const url = res.url;
    const match = url.match(/filter\[subjectId\]=(\d+)/);
    if (match) {
      const id = parseInt(match[1]);
      Misc.log(`Asignatura detectada vía Ads: ${id}`, Log.INFO);
      Hooks.startSubjectInjectionObserver(id);
    }
  }

  /**
   * Detecta cuando se entra en una asignatura para inyectar botón de descarga
   */
  static subjectDetect(res: Response) {
    if (!res.ok) return;

    const url = res.url;
    // Extraer ID de la URL. Buscamos cualquier patrón "subjects/ID"
    const match = url.match(/subjects?\/(\d+)/);
    if (!match) return;

    const id = parseInt(match[1]);
    if (isNaN(id)) return;

    // Validación de ID: los IDs de asignatura en Wuolah suelen ser de 5-6 dígitos.
    // IDs de 7+ dígitos suelen ser comunidades, estudios o anuncios (como el 3080899 detectado).
    if (id > 999999) {
      Misc.log(`Detección ignorada (ID sospechoso): ${id}`, Log.DEBUG);
      return;
    }

    const nextData = (unsafeWindow as any).__NEXT_DATA__;
    const mainId = nextData?.props?.pageProps?.subject?.id;

    if (mainId && mainId !== id) {
      // Si ya tenemos el ID principal de NextData, no dejamos que una API secundaria lo pise
      return;
    }

    Misc.log(`Asignatura detectada vía API (${id}). Intentando inyectar botón...`, Log.INFO);
    Hooks.startSubjectInjectionObserver(id);
  }

  private static injectionObserver: MutationObserver | null = null;
  private static lastSubjectId: number | null = null;

  static startSubjectInjectionObserver(subjectId: number) {
    // Si el ID cambia de uno sospechoso a uno bueno, permitimos re-observar
    const isFirstTime = !Hooks.injectionObserver;
    const isNewId = Hooks.lastSubjectId !== subjectId;

    if (!isFirstTime && !isNewId) return;

    // Limpiar anterior si existe
    if (Hooks.injectionObserver) {
      Hooks.injectionObserver.disconnect();
    }

    Hooks.lastSubjectId = subjectId;

    // Si el ID es nuevo, permitimos que se sobreescriba el botón anterior
    if (isNewId) {
      const oldBtn = document.getElementById("wuolahextra-subject-download");
      if (oldBtn) oldBtn.remove();
    }

    const inject = () => Hooks.injectSubjectButton(subjectId);

    // Intentos de inyección
    setTimeout(inject, 500);
    setTimeout(inject, 1500);
    setTimeout(inject, 3000);

    Hooks.injectionObserver = new MutationObserver(() => {
      if (!document.getElementById("wuolahextra-subject-download")) {
        inject();
      }
    });

    Hooks.injectionObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  static injectSubjectButton(subjectId: number) {
    if (document.getElementById("wuolahextra-subject-download")) return;

    // Selectores variados para el header o zona de acciones
    const selectors = [
      ".f-header__actions",
      "header div:last-child",
      ".HorizontallyScrollableContainer_content__z7jRH", // Filter bar
      "[class*='SubjectMobileShortcuts']", // Mobile shortcuts
      "[class*='header__actions']",
      "div.MaterialButton_container__a1bub", // Parent of follow button
      "h1" // Last resort: next to the title
    ];

    let target: Element | null = null;
    for (const selector of selectors) {
      target = document.querySelector(selector);
      if (target) break;
    }

    // Fallback: buscar botón "Seguir" y usar su padre
    if (!target) {
      const buttons = Array.from(document.querySelectorAll("button"));
      const followBtn = buttons.find(b => b.textContent?.includes("Seguir"));
      if (followBtn) {
        target = followBtn.parentElement;
      }
    }

    if (!target) {
      Misc.log("No se pudo encontrar sitio para inyectar botón de asignatura", Log.DEBUG);
      return;
    }

    Misc.log("Inyectando botón en selector: " + target.className, Log.DEBUG);

    const btn = document.createElement("button");
    btn.id = "wuolahextra-subject-download";
    btn.textContent = "Descargar Asignatura";
    btn.style.background = "#ff5e4b";
    btn.style.color = "white";
    btn.style.border = "none";
    btn.style.borderRadius = "20px";
    btn.style.padding = "8px 16px";
    btn.style.marginLeft = "10px";
    btn.style.fontWeight = "bold";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "14px";
    btn.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
    btn.style.zIndex = "1000";

    btn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const originalText = btn.textContent || "";
      btn.textContent = "Obteniendo archivos...";
      btn.disabled = true;

      try {
        let name = "";
        try {
          const info = await Api.subjectInfo(subjectId);
          name = info.name;
        } catch (err) {
          Misc.log("Error al obtener info de asignatura vía API, usando fallback", Log.DEBUG);
          // Fallback a __NEXT_DATA__ o al título de la página
          const nextData = (unsafeWindow as any).__NEXT_DATA__;
          name = nextData?.props?.pageProps?.subject?.name ||
            document.querySelector("h1")?.textContent?.trim() ||
            `Asignatura_${subjectId}`;
        }

        Misc.log(`Obteniendo documentos para la asignatura ${subjectId}...`, Log.INFO);
        let docs = await Api.subject(subjectId);

        if (!docs || docs.length === 0) {
          alert("No se encontraron documentos en esta asignatura o no tienes permisos para verlos.");
          return;
        }

        // Filtrado de archivos en carpetas si la opción está activada
        if (GM_config.get("exclude_folders")) {
          const uploadCounts: Record<number, number> = {};
          docs.forEach(d => {
            if (d.uploadId) {
              uploadCounts[d.uploadId] = (uploadCounts[d.uploadId] || 0) + 1;
            }
          });

          const originalCount = docs.length;
          docs = docs.filter(d => !d.uploadId || uploadCounts[d.uploadId] === 1);
          const filteredCount = docs.length;

          if (filteredCount === 0 && originalCount > 0) {
            alert("Todos los archivos de esta asignatura están en carpetas y han sido filtrados por tu configuración.");
            return;
          }
          Misc.log(`Filtrados ${originalCount - filteredCount} archivos por estar en carpetas`, Log.INFO);
        }

        // Populate upload names for folder groups (docs with uploadId but no upload.name)
        const uploadIdsToFetch = new Map<number, Doc[]>();
        docs.forEach(d => {
          if (d.uploadId && !d.upload?.name) {
            if (!uploadIdsToFetch.has(d.uploadId)) uploadIdsToFetch.set(d.uploadId, []);
            uploadIdsToFetch.get(d.uploadId)!.push(d);
          }
        });

        // Only fetch info for uploads that are actual folders (2+ files)
        const folderUploadIds = [...uploadIdsToFetch.entries()].filter(([, arr]) => arr.length >= 2);
        if (folderUploadIds.length > 0) {
          btn.textContent = "Obteniendo nombres de carpetas...";
          await Promise.all(folderUploadIds.map(async ([uploadId, docsInUpload]) => {
            try {
              const info = await Api.uploadInfo(uploadId);
              const uploadName = (info as any).name || (info as any).title || "";
              if (uploadName) {
                docsInUpload.forEach(d => {
                  d.upload = { id: uploadId, name: uploadName };
                });
              }
            } catch (e) {
              Misc.log(`No se pudo obtener info del upload ${uploadId}: ${e}`, Log.DEBUG);
            }
          }));
        }

        const selectedDocs = await DocSelectionUI.promptSelection(docs, name);
        if (selectedDocs && selectedDocs.length > 0) {
          BatchDownload.start(selectedDocs, name);
        }
      } catch (err) {
        alert("Error crítico al obtener documentos de la asignatura.");
        Misc.log(err, Log.ERROR);
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    };

    target.appendChild(btn);
  }

  /**
   * Descarga carpetas
   * @todo Gestionar captchas
   */
  static folderDownload(res: Response) {
    const url = res.url;
    const id = parseInt(url.substring(url.lastIndexOf("/") + 1));

    if (isNaN(id)) {
      Misc.log("¡Error al obtener id de la carpeta!", Log.INFO);
      return;
    }

    Misc.log(`Descargando carpeta ${id}`, Log.INFO);

    Api.uploadInfo(id).then((info) => {
      const folderName = (info?.name || id.toString()).replace(/[\\/:*?\"<>|]+/g, "_").trim() || id.toString();
      Api.folder(id).then(async (docs) => {
        const selectedDocs = await DocSelectionUI.promptSelection(docs, folderName);
        if (selectedDocs && selectedDocs.length > 0) {
          BatchDownload.start(selectedDocs, folderName);
        }
      });
    }).catch(err => {
      Misc.log(`Error al obtener info de la carpeta: ${err}`, Log.ERROR);
    });
  }
}
