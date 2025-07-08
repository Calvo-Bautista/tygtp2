// Configuración actualizada para el Content Type g26
const STRAPI_CONFIG = {
  url: "https://gestionweb.frlp.utn.edu.ar",
  contentType: "g26s", // Plural del Content Type
  apiPath: "/api/g26s", // Ruta de la API

  // Estructura esperada del Content Type g26
  expectedFields: [
    "name", // Nombre del director
    "tmdb_id", // ID de TMDB
    "profile_path", // Ruta del perfil
    "popularity", // Popularidad
    "movies", // Películas (JSON)
    "grupo", // Identificador del grupo
    "created_at", // Fecha de creación
  ],

  // Datos de ejemplo para el Content Type
  sampleData: {
    name: "Christopher Nolan",
    tmdb_id: 525,
    profile_path: "/xuAIuYSmsUzKlUMBFGVZaWsY3DZ.jpg",
    popularity: 15.678,
    grupo: "Grupo 26",
    movies: [
      {
        title: "Inception",
        tmdb_id: 27205,
        vote_average: 8.4,
        vote_count: 31000,
        release_date: "2010-07-16",
        overview: "Dom Cobb is a skilled thief...",
        poster_path: "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
        popularity: 42.123,
      },
    ],
    created_at: new Date().toISOString(),
  },
}

// Función para verificar si Strapi está disponible con el Content Type correcto
async function checkG26ContentType() {
  try {
    const response = await fetch(`${STRAPI_CONFIG.url}${STRAPI_CONFIG.apiPath}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      const data = await response.json()
      console.log("✅ Content Type g26 disponible:", data)
      return true
    } else if (response.status === 404) {
      console.error("❌ Content Type g26 no encontrado")
      return false
    } else {
      console.warn("⚠️ Strapi responde pero con error:", response.status)
      return false
    }
  } catch (error) {
    console.error("❌ Error conectando con Strapi:", error)
    return false
  }
}

// Exportar configuración
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STRAPI_CONFIG, checkG26ContentType }
}
