// Variables globales
const tmdbApiToken = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyMGM0ZDJhZWYxODVhMmYwM2IyYTFmNjkxOWQ3N2RiNSIsIm5iZiI6MTc1MjAwMjMzNy4wNjQsInN1YiI6IjY4NmQ2ZjIxYTVhOTM3MGNlMzEwM2ZiMSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ._3z6L5dGVrLNfZ13QBDsqnPPFKWOuV60e4IJTtWH3cM"
const strapiUrl = "https://gestionweb.frlp.utn.edu.ar"
let currentDirectorData = null

// Inicialización cuando se carga la página
document.addEventListener("DOMContentLoaded", function() {
  initializeEventListeners()

})

function initializeEventListeners() {
  document.getElementById("loadDataBtn").addEventListener("click", loadAndSaveData)
  document.getElementById("visualizeBtn").addEventListener("click", visualizeData)

  
  // Evento de clic al logo para recargar la página
  document.getElementById("logo").addEventListener("click", function() {
    location.reload()
  })
  
  // Enter key support for director name input
  document.getElementById("directorName").addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
      loadAndSaveData()
    }
  })
}

async function loadAndSaveData() {
  const directorName = document.getElementById("directorName").value.trim()
  if (!directorName) {
    showError("Por favor ingresa el nombre de un director")
    return
  }

  showLoading(true)
  hideError()

  try {
    // 1. Buscar el director
    const director = await searchDirector(directorName)
    if (!director) {
      throw new Error("Director no encontrado")
    }

    // 2. Obtener películas del director
    const movies = await getDirectorMovies(director.id)
    if (movies.length === 0) {
      throw new Error("No se encontraron películas para este director")
    }

    // 3. Obtener las 5 mejor valoradas
    const topMovies = getTopRatedMovies(movies, 5)

    // 4. Guardar en Strapi
    await saveToStrapi(director, topMovies)

    // 5. Mostrar resultados
    displayResults(director, topMovies)

  } catch (error) {
    console.error("Error:", error)
    showError(`Error: ${error.message}`)
  } finally {
    showLoading(false)
  }
}

async function searchDirector(name) {
  const response = await fetch(
    `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(name)}&language=es-ES`,
    {
      headers: {
        Authorization: `Bearer ${tmdbApiToken}`,
        "Content-Type": "application/json",
      },
    },
  )

  if (!response.ok) {
    throw new Error(`Error en la búsqueda: ${response.status}`)
  }

  const data = await response.json()
  console.log(data)

  // Buscar directores en los resultados
  const directors = data.results.filter(
    (person) =>
      person.known_for_department === "Directing" ||
      person.known_for.some((movie) => movie.genre_ids && movie.genre_ids.length > 0),
  )

  return directors[0] || null
}

async function getDirectorMovies(directorId) {
  const response = await fetch(`https://api.themoviedb.org/3/person/${directorId}/movie_credits?language=es-ES`, {
    headers: {
      Authorization: `Bearer ${tmdbApiToken}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Error obteniendo películas: ${response.status}`)
  }

  const data = await response.json()

  // Filtrar solo las películas donde aparece como director
  return data.crew.filter((movie) => movie.job === "Director" && movie.vote_average > 0)
}

function getTopRatedMovies(movies, count) {
  return movies.sort((a, b) => b.vote_average - a.vote_average).slice(0, count)
}

async function saveToStrapi(director, movies) {
  const token = "099da4cc6cbb36bf7af8de6f1f241f8c81e49fce15709c4cfcae1313090fa2c1ac8703b0179863b4eb2739ea65ae435e90999adb870d49f9f94dcadd88999763119edca01a6b34c25be92a80ed30db1bcacb20df40e4e7f45542bd501f059201ad578c18a11e4f5cd592cb25d6c31a054409caa99f11b6d2391440e9c72611ea"
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }

  // Dividir nombre y apellido
  const fullName = director.name.trim().split(" ")
  const apellido = fullName.pop()
  const nombre = fullName.join(" ")
  const directorID = Number(director.id) // TMDB id como número

  try {
    // 1. Verificar si el director ya existe por directorID
    let directorStrapiId = null;
    const query = `${strapiUrl}/api/g26-directors?filters[directorID][$eq]=${encodeURIComponent(directorID)}`
    let checkRes = await fetch(query, { headers })
    let checkData = await checkRes.json()

    if (checkData.data && checkData.data.length > 0) {
      directorStrapiId = checkData.data[0].id
      console.log(`✅ Director ya existe en Strapi con directorID ${directorID}`)
    } else {
      // 2. Crear director si no existe
      const newDirector = {
        data: { nombre, apellido, directorID },
      }
      const res = await fetch(`${strapiUrl}/api/g26-directors`, {
        method: "POST",
        headers,
        body: JSON.stringify(newDirector),
      })
      const created = await res.json()
      console.log(created)
      directorStrapiId = created.data.id
      console.log(`🆕 Director creado con directorID ${directorID}`)
    }

    // 3. Crear películas relacionadas
    for (const movie of movies) {
      const peliculaID = Number(movie.id) // TMDB id como número

      // Buscar si la película ya existe por peliculaID
      const peliQuery = `${strapiUrl}/api/g26-peliculas?filters[peliculaID][$eq]=${encodeURIComponent(peliculaID)}`
      const peliRes = await fetch(peliQuery, { headers })
      const peliData = await peliRes.json()
      if (peliData.data && peliData.data.length > 0) {
        console.log(`⚠️ Película con peliculaID ${peliculaID} ya existe, no se crea de nuevo.`)
        continue // Salta a la siguiente película
      }

      // Buscar el director por directorID para obtener su id interno de Strapi
      const dirQuery = `${strapiUrl}/api/g26-directors?filters[directorID][$eq]=${encodeURIComponent(directorID)}`
      const dirRes = await fetch(dirQuery, { headers })
      const dirData = await dirRes.json()
      let directorStrapiIdForMovie = null;
      if (dirData.data && dirData.data.length > 0) {
        directorStrapiIdForMovie = dirData.data[0].id
      } else {
        throw new Error("No se encontró el director en Strapi al crear la película")
      }
      const peliculaData = {
        data: {
          nombre: movie.title,
          valoracion: movie.vote_average,
          descripcion: movie.overview || "Sin descripción",
          anio: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : 0,
          g_26_director: directorStrapiIdForMovie,
          peliculaID,
        },
      }

      const res = await fetch(`${strapiUrl}/api/g26-peliculas`, {
        method: "POST",
        headers,
        body: JSON.stringify(peliculaData),
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error("❌ Error al guardar película:", errText)
      }
    }

    console.log("✅ Películas guardadas en Strapi")
  } catch (error) {
    console.error("❌ Error general en saveToStrapi:", error)
    throw new Error("Error al guardar en Strapi")
  }
}



async function visualizeData() {
  hideError();
  showLoading(true);
  try {
    // Obtener todas las películas de Strapi
    const token = "099da4cc6cbb36bf7af8de6f1f241f8c81e49fce15709c4cfcae1313090fa2c1ac8703b0179863b4eb2739ea65ae435e90999adb870d49f9f94dcadd88999763119edca01a6b34c25be92a80ed30db1bcacb20df40e4e7f45542bd501f059201ad578c18a11e4f5cd592cb25d6c31a054409caa99f11b6d2391440e9c72611ea";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    const res = await fetch(`${strapiUrl}/api/g26-peliculas?populate=g_26_director`, { headers });
    const data = await res.json();
    console.log('Películas recibidas de Strapi:', data.data);
    if (data.data && data.data.length > 0) {
      console.log("Estructura de cada item:", data.data);
      const peliculas = data.data
        .filter(item => item && (item.attributes || item.nombre)) // Permite ambos casos
        .map(item => {
          // Intenta acceder por attributes, si no existe usa el objeto directo
          const pel = item.attributes || item;
          return {
            title: pel.nombre,
            vote_average: pel.valoracion,
            overview: pel.descripcion,
            release_date: pel.anio ? pel.anio.toString() : '',
            peliculaID: pel.peliculaID,
          };
        });
      console.log("Películas mapeadas:", peliculas);
      // Filtrar películas no repetidas por peliculaID
      const peliculasUnicas = peliculas.filter((pel, idx, arr) =>
        arr.findIndex(p => p.peliculaID === pel.peliculaID) === idx
      );
      // Extraer directores únicos y mostrarlos
      const directoresUnicos = [];
      const idsAgregados = new Set();
      data.data.forEach(item => {
        
        const g26dir = item.g_26_director;
        if (
          g26dir &&
          g26dir.data &&
          g26dir.data.attributes &&
          typeof g26dir.data.attributes.directorID !== 'undefined'
        ) {
          const dir = g26dir.data.attributes;
          const dirID = dir.directorID;
          if (!idsAgregados.has(dirID)) {
            directoresUnicos.push({
              nombre: dir.nombre,
              apellido: dir.apellido,
              directorID: dirID
            });
            idsAgregados.add(dirID);
          }
        }
      });
      displayDirectors(directoresUnicos);
      displayResults({ name: 'Todos los directores' }, peliculasUnicas);
    } else {
      console.log('No hay películas guardadas en Strapi.');
      showError('No hay películas guardadas en Strapi.');
    }
  } catch (error) {
    showError('Error al cargar películas guardadas.');
    console.error(error);
  } finally {
    showLoading(false);
  }
}

function displayResults(director, movies) {
  const welcomeMessage = document.getElementById("welcomeMessage")
  const resultsContainer = document.getElementById("resultsContainer")
  const resultsTitle = document.getElementById("resultsTitle")
  const moviesList = document.getElementById("moviesList")
  console.log("Películas a mostrar:", movies);

  welcomeMessage.classList.add("hidden")
  resultsContainer.classList.remove("hidden")

  resultsTitle.textContent = `Top 5 Películas de ${director.name}`

  moviesList.innerHTML = movies
    .map(
      (movie, index) => `
          <div class="movie-card">
              <h3>${index + 1}. ${movie.title}</h3>
              <div class="movie-info">
                  <span class="rating">⭐ ${movie.vote_average.toFixed(1)}/10</span>
                  <span>📅 ${movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A"}</span>
              </div>
              <div class="movie-overview">
                  ${movie.overview || "Sin descripción disponible"}
              </div>
          </div>
      `,
    )
    .join("")
}

function displayDirectors(directors) {
  const directorsList = document.getElementById("directorsList");
  if (!directors || directors.length === 0) {
    directorsList.innerHTML = "";
    return;
  }
  directorsList.innerHTML = directors.map(dir =>
    `<div class="director-card">
      <h4>${dir.nombre} ${dir.apellido}</h4>
      <div><b>ID TMDB:</b> ${dir.directorID}</div>
    </div>`
  ).join("");
}


function showLoading(show) {
  const indicator = document.getElementById("loadingIndicator")
  const button = document.getElementById("loadDataBtn")

  if (show) {
    indicator.classList.remove("hidden")
    button.disabled = true
    button.textContent = "Cargando..."
  } else {
    indicator.classList.add("hidden")
    button.disabled = false
    button.textContent = "Cargar y Guardar Datos"
  }
}

function showError(message) {
  const errorDiv = document.getElementById("errorMessage")
  errorDiv.textContent = message
  errorDiv.classList.remove("hidden")
}

function hideError() {
  const errorDiv = document.getElementById("errorMessage")
  errorDiv.classList.add("hidden")
}
