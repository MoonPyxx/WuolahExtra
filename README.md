# WuolahExtra (Fork)
Userscript para Wuolah.

Para usar este programa necesitas un gestor de userscripts (por ejemplo, [ViolentMonkey](https://violentmonkey.github.io)) instalado en tu navegador.

## Funciones implementadas
* Quita anuncios de los pdfs
* Client-side PRO
  * Puedes descargar carpetas dando un click (EN DESARROLLO)
* Limpiar partes de la interfaz innecesarias
  * Publicidad en el fondo
  * Vídeos antes de descargar
* Forzar modo oscuro

* **Descarga de Carpetas**: 
  * Descarga carpetas completas con un solo click.
  * Organización automática en subcarpetas según el autor de la subida.
* **Filtros en descarga masiva**:
  * Filtrar archivos por **fecha** (desde/hasta) — ideal para asignaturas con cientos de archivos.
  * Filtrar por **nombre** con palabras clave separadas por comas:
    * 🔍 **Incluir**: solo muestra archivos que contengan alguna de las palabras (ej: `examen, parcial, tema 1`).
    * 🚫 **Excluir**: oculta archivos que contengan alguna de las palabras (ej: `solución, borrador`).
  * Búsqueda **insensible a mayúsculas y tildes** (`practica` = `Práctica` = `PRÁCTICA`).
## Instalación
Una vez hayas descargado tu gestor de userscripts, descarga el script desde la sección de [Releases](https://github.com/pablouser1/WuolahExtra/releases), ¡y listo!

## Configuración
Puedes acceder a la configuración del script desde tu gestor de userscripts en el icono de tu barra de herramientas ([más info](https://wiki.greasespot.net/Greasemonkey_Manual:Monkey_Menu#The_Menu))

### Debug
Muestra información para desarrolladores en la consola

### Métodos de limpieza de PDFs
| Método | Estado | Detalles | Config ID | + info |
| :--: | :--: | :--: | :--: | :--: |
| GulagCleaner | ✅ | **Activado por defecto**, buenos resultados | gulag | [Source](https://github.com/YM162/gulagcleaner) |
| TrolahCleaner | ❌ | **AVISO: CÓDIGO CERRADO**, buenos resultados | trolah | [Web](https://trolah.pp.ua) |
| PDFLib | ❌ | En desarrollo | pdflib | [Source](https://github.com/Hopding/pdf-lib)
| Ninguno | - | Deshabilita todos los sitemas de eliminación de anuncios | none | -

#### TrolahCleaner no funciona
Quizás la web está caída, prueba a acceder directamente para comprobarlo.

### Limpiar UI
Elimina elementos de la interfaz como patrocinios, enlaces sociales...

## Desarrollo
### Instalar dependencias
```bash
yarn install
```

### Modo desarrollo
```bash
yarn dev
```

### Modo producción
```bash
yarn build
```

## TODO
* Para los métodos GULAG / PDFLib
  * Eliminar los anuncios de los pdfs contenidos en los zips
  * ~~Encontrar la forma de sacar el nombre original del archivo~~ (Completado)
* Eliminar dependencia `GM_config` e implementar la configuración usando exclusivamente `GM.getValue` y `GM.setValue`

## Créditos
* [GM_Config](https://github.com/sizzlemctwizzle/GM_config) | [LICENSE](https://github.com/sizzlemctwizzle/GM_config/blob/master/LICENSE)
* [pdflib](https://github.com/Hopding/pdf-lib) | [LICENSE](https://github.com/Hopding/pdf-lib/blob/master/LICENSE.md)
* [gulagcleaner](https://github.com/YM162/gulagcleaner) | [LICENSE](https://github.com/YM162/gulagcleaner/blob/master/LICENSE)
