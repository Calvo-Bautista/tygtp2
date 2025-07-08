# Aplicación de Películas por Director

Esta aplicación permite buscar las 5 películas mejor valoradas de un director específico utilizando la API de The Movie Database (TMDB) y almacenar los datos en Strapi.

## Configuración

1. **API Key de TMDB**: 
   - Regístrate en https://www.themoviedb.org/
   - Obtén tu API key
   - Reemplaza `YOUR_TMDB_API_KEY` en `script.js` con tu clave real

2. **Strapi**:
   - La aplicación está configurada para usar la instancia de Strapi en `https://gestionweb.frlp.utn.edu.ar`
   - Actualmente usa localStorage como fallback para el almacenamiento

## Funcionalidades

### Cargar datos de APIs
- Ingresa el nombre de un director
- La aplicación busca al director en TMDB
- Obtiene sus películas y selecciona las 5 mejor valoradas
- Guarda los datos en Strapi (o localStorage como fallback)

### Visualizar datos
- Muestra los directores previamente guardados
- Permite seleccionar un director para ver sus películas
- Genera un gráfico de barras con las valoraciones

## Estructura del Proyecto

- `index.html`: Estructura principal de la aplicación
- `styles.css`: Estilos que siguen el layout proporcionado
- `script.js`: Lógica de la aplicación, integración con APIs
- `README.md`: Documentación del proyecto

## Uso

1. Abre `index.html` en un navegador
2. Ingresa el nombre de un director (ej: "Christopher Nolan")
3. Haz clic en "Cargar y Guardar Datos"
4. Los resultados se mostrarán con las 5 películas mejor valoradas
5. Usa la sección "Visualizar datos" para ver directores guardados previamente

## Notas Técnicas

- La aplicación usa vanilla JavaScript sin frameworks
- Implementa manejo de errores y estados de carga
- Responsive design para diferentes tamaños de pantalla
- Gráfico de barras creado con Canvas API
- Almacenamiento local como fallback para Strapi
