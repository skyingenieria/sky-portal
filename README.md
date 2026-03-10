# SKY Ingeniería — Portal IA

Portal interno de herramientas de automatización para SKY Ingeniería, deployado en GitHub Pages.

## 🚀 Deploy en 3 pasos

### 1. Crear repositorio en GitHub
```
Nombre sugerido: sky-portal  (quedará en https://skyingenieria.github.io/sky-portal)
Visibilidad: Private (recomendado para uso interno)
```

### 2. Subir archivos
```bash
git init
git add .
git commit -m "Initial portal"
git remote add origin https://github.com/skyingenieria/sky-portal.git
git push -u origin main
```

### 3. Activar GitHub Pages
```
Settings → Pages → Source: Deploy from branch → main → / (root) → Save
```
Tu portal queda en: `https://skyingenieria.github.io/sky-portal`

---

## 🔐 Configurar Google OAuth (una sola vez)

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto → **APIs y servicios** → **Habilitar APIs**
   - Habilitar **Google Drive API**
   - Habilitar **Google Sheets API**
3. **Credenciales** → **Crear credencial** → **ID de cliente OAuth 2.0**
   - Tipo: **Aplicación web**
   - Nombre: SKY Portal
   - Orígenes autorizados: `https://skyingenieria.github.io`
   - URI de redireccionamiento: `https://skyingenieria.github.io/sky-portal`
4. Copiar el **Client ID** generado
5. En `index.html`, reemplazar `YOUR_GOOGLE_CLIENT_ID` con tu Client ID real
6. Hacer commit y push → el portal queda funcional

---

## 🏗️ Agentes incluidos

| Agente | Estado | Descripción |
|--------|--------|-------------|
| CYPE → GSheets | ✅ Live | Lee PDF de CYPECAD y vuelca datos en Sheet de metraje |
| Generador de Presupuestos | 🔜 Pronto | Genera presupuesto desde cómputo |
| Control de Avance | 🔜 Pronto | Actualiza cronograma desde reporte |
| Revisión de Documentación | 🔜 Pronto | Checklist automático de documentos |
| Resumen de Reuniones | 🔜 Pronto | Acta automática desde audio/texto |
