import { origFetch } from "../originals";
import ApiRes from "../types/ApiRes";
import Doc from "../types/Doc";
import DocUrl from "../types/DocUrl";
import DownloadBody from "../types/DownloadBody";
import Log from "../constants/Log";
import Misc from "./Misc";

declare const unsafeWindow: Window & typeof globalThis;
declare const GM: any;

interface VMScriptResponseObject<T> {
  status: number;
  responseText: string;
  response: T;
}

/**
 * Wuolah API
 */
export default class Api {
  static BASE_URL = "https://api.wuolah.com/v2";
  static TOKEN_KEY = "token";

  /**
   * Realiza una petición usando GM.xmlHttpRequest para saltarse CORS y enviar cookies
   */
  private static async _request<T>(details: {
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: any;
    headers?: Record<string, string>;
  }): Promise<{ data: T; status: number }> {
    const token = Api._getToken();
    const headers = details.headers || {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: details.method || "GET",
        url: details.url,
        data: details.body ? JSON.stringify(details.body) : undefined,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        onload: (res: VMScriptResponseObject<any>) => {
          try {
            const data = JSON.parse(res.responseText);
            resolve({ data, status: res.status });
          } catch (e) {
            // Si no se puede parsear JSON pero el status es OK, devolver vacío o error
            if (res.status >= 200 && res.status < 300) {
              resolve({ data: {} as T, status: res.status });
            } else {
              reject(new Error(`Failed to parse response: ${res.responseText}`));
            }
          }
        },
        onerror: (err: any) => reject(err),
      });
    });
  }

  /**
   * Devuelve el perfil del usuario actual.
   */
  static async me(): Promise<{ captchaCounter?: number } & Record<string, unknown>> {
    const res = await Api._request<{ captchaCounter?: number } & Record<string, unknown>>({
      url: `${Api.BASE_URL}/me`
    });
    return res.data;
  }

  /**
   * Lista todos los documentos de una carpeta o asignatura
   * @param id Id carpeta
   * @returns Todos los documentos pertenecientes a la carpeta
   */
  static async folder(id: number): Promise<Doc[]> {
    const params = new URLSearchParams();
    params.append("filter[uploadId]", id.toString());
    params.append("pagination[page]", "0");
    params.append("pagination[pageSize]", "9999");
    params.append("pagination[withCount]", "false");
    params.append("include", "uploader,upload,profile"); // Asegurar que viene el autor y la carpeta

    const res = await Api._request<ApiRes<Doc[]>>({
      url: `${Api.BASE_URL}/documents?${params.toString()}`
    });
    return res.data.data;
  }

  /**
   * Lista todos los documentos de una asignatura
   * @param subjectId Id asignatura
   * @returns Todos los documentos
   */
  static async subject(subjectId: number): Promise<Doc[]> {
    const params = new URLSearchParams();
    params.append("filter[subjectId]", subjectId.toString());
    params.append("pagination[page]", "0");
    params.append("pagination[pageSize]", "9999");
    params.append("pagination[withCount]", "false");
    params.append("include", "uploader,upload,profile"); // Asegurar que viene el autor y la carpeta

    const res = await Api._request<ApiRes<Doc[]>>({
      url: `${Api.BASE_URL}/documents?${params.toString()}`
    });
    return res.data.data;
  }

  /**
   * Obtiene la información de una subida (carpeta o archivo)
   * @param id Id de la subida
   * @returns Datos de la subida
   */
  static async uploadInfo(id: number): Promise<Doc> {
    const res = await Api._request<Doc>({
      url: `${Api.BASE_URL}/uploads/${id}`
    });
    return res.data;
  }

  /**
   * Obtiene información de una asignatura
   * @param id Id asignatura
   */
  static async subjectInfo(id: number): Promise<{ name: string }> {
    const res = await Api._request<{ name: string }>({
      url: `${Api.BASE_URL}/subjects/${id}`
    });
    if (res.status === 404) {
      throw new Error("Subject not found");
    }
    return res.data;
  }

  /**
   * Consigue URL del documento a partir de su ID
   * @param id Id documento
   * @returns Url para descargar documento
   */
  static async docUrl(id: number): Promise<string | null> {
    const result = await Api.docUrlResult(id);
    return result.url;
  }

  /**
   * Igual que `docUrl`, pero devuelve información extra cuando falla.
   * Útil para detectar captchas (p.ej. 429 + { code: "FI008" }).
   */
  static async docUrlResult(
    id: number
  ): Promise<{ url: string | null; status: number; code?: string }> {
    const body: DownloadBody = {
      adblockDetected: false,
      ads: [],
      fileId: id,
      machineId: "",
      noAdsWithCoins: false,
      qrData: null,
      referralCode: "",
      ubication17ExpectedPubs: 0,
      ubication17RequestedPubs: 0,
      ubication1ExpectedPubs: 0,
      ubication1RequestedPubs: 0,
      ubication2ExpectedPubs: 0,
      ubication2RequestedPubs: 0,
      ubication3ExpectedPubs: 0,
      ubication3RequestedPubs: 0,
    };

    const res = await Api._request<DocUrl & { code?: string }>({
      url: `${Api.BASE_URL}/download`,
      method: "POST",
      body
    });

    if (res.status !== 200) {
      return { url: null, status: res.status, code: res.data.code };
    }

    return { url: res.data.url, status: res.status };
  }

  /**
   * Descarga un documento
   * @param url Url del documento
   * @returns Documento ya descargado como `ArrayBuffer`
   */
  static async docData(url: string): Promise<ArrayBuffer> {
    try {
      const res = await origFetch(url);
      if (res.ok) {
        return await res.arrayBuffer();
      }
    } catch (e) {
      Misc.log("fallo fetch original para docData, reintentando con GM.xmlHttpRequest", Log.DEBUG);
    }

    return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
        method: "GET",
        url: url,
        responseType: "arraybuffer",
        onload: (res: VMScriptResponseObject<ArrayBuffer>) => {
          if (res.status >= 200 && res.status < 300) {
            resolve(res.response);
          } else {
            reject(new Error(`Failed to download file: status ${res.status}`));
          }
        },
        onerror: (err: any) => reject(err),
      });
    });
  }

  private static _getToken(): string {
    try {
      const token = (unsafeWindow as any).localStorage.getItem("wuolah-token");
      if (token) return token;
    } catch { }

    return Misc.getCookie(Api.TOKEN_KEY);
  }
}
