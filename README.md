# PintAma Web

Primera base web para crear documentos desde movil o PC y exportarlos como JSON compatible con PintAma PC.

## Que hace esta version

- Crear presupuesto o factura.
- Rellenar cliente, fecha, IVA, validez y notas.
- Anadir conceptos/materiales.
- Usar precio cerrado con total final manual.
- Guardar borrador en el navegador con `localStorage`.
- Exportar un archivo `.json` compatible con el boton `Importar doc.` de PintAma PC.
- Importar un JSON anterior para seguir editandolo.

## Como probarla

Abre este archivo en el navegador:

```text
C:\Users\SAGO\Desktop\PintAmaWeb\index.html
```

No necesita instalar nada.

## Como funciona la compatibilidad con PintAma PC

La web exporta este formato:

```json
{
  "_tipo": "pintama_documento",
  "_version": 1,
  "presupuesto": {}
}
```

El campo `numeroDocumento` se exporta como `0`. Asi PintAma PC asigna el numero correcto al importar, respetando las series separadas de presupuestos y facturas.

## Como subirla a GitHub Pages

1. Copia estos archivos al repositorio web:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `README.md`
2. Haz commit y push.
3. En GitHub: `Settings` > `Pages`.
4. Selecciona la rama principal y la carpeta raiz.
5. Abre la URL que te de GitHub Pages.

## Siguientes mejoras recomendadas

- Catalogo de materiales compartido con la app PC.
- Plantillas rapidas de trabajos frecuentes.
- Importacion directa desde la app PC con una extension propia.
- Sincronizacion en la nube con Supabase o Firebase.
- Login de usuarios.
- Version instalable como PWA para abrirla desde el movil como app.
