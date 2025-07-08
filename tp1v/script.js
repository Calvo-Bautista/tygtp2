class MovieDirectorApp {
  constructor() {
    this.tmdbApiToken =
      "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyMGM0ZDJhZWYxODVhMmYwM2IyYTFmNjkxOWQ3N2RiNSIsIm5iZiI6MTc1MjAwMjMzNy4wNjQsInN1YiI6IjY4NmQ2ZjIxYTVhOTM3MGNlMzEwM2ZiMSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ._3z6L5dGVrLNfZ13QBDsqnPPFKWOuV60e4IJTtWH3cM"
    this.strapiUrl = "https://gestionweb.frlp.utn.edu.ar"
    this.currentDirectorData = null

    this.initializeEventListeners()
    this.loadSavedDirectors()
  }

  initializeEventListeners() {
    document.getElementById("loadDataBtn").addEventListener("click", () => this.loadAndSaveData())
    document.getElementById("visualizeBtn").addEventListener("click", () => this.visualizeData())
    document.getElementById("savedDirectors").addEventListener("change", (e) => this.loadDirectorData(e.target.value))

    // Enter key support for director name input
    document.getElementById("directorName").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.loadAndSaveData()
      }
    })
  }

  async loadAndSaveData() {
    const directorName = document.getElementById("directorName").value.trim()
    if (!directorName) {
      this.showError("Por favor ingresa el nombre de un director")
      return
    }

    this.showLoading(true)
    this.hideError()

    try {
      // 1. Buscar el director
      const director = await this.searchDirector(directorName)
      if (!director) {
        throw new Error("Director no encontrado")
      }

      // 2. Obtener películas del director
      const movies = await this.getDirectorMovies(director.id)
      if (movies.length === 0) {
        throw new Error("No se encontraron películas para este director")
      }

      // 3. Obtener las 5 mejor valoradas
      const topMovies = this.getTopRatedMovies(movies, 5)

      // 4. Guardar en Strapi
      await this.saveToStrapi(director, topMovies)

      // 5. Mostrar resultados
      this.displayResults(director, topMovies)
      this.createChart(topMovies)

      // 6. Actualizar lista de directores guardados
      this.loadSavedDirectors()
    } catch (error) {
      console.error("Error:", error)
      this.showError(`Error: ${error.message}`)
    } finally {
      this.showLoading(false)
    }
  }

  async searchDirector(name) {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(name)}&language=es-ES`,
      {
        headers: {
          Authorization: `Bearer ${this.tmdbApiToken}`,
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Error en la búsqueda: ${response.status}`)
    }

    const data = await response.json()

    // Buscar directores en los resultados
    const directors = data.results.filter(
      (person) =>
        person.known_for_department === "Directing" ||
        person.known_for.some((movie) => movie.genre_ids && movie.genre_ids.length > 0),
    )

    return directors[0] || null
  }

  async getDirectorMovies(directorId) {
    const response = await fetch(`https://api.themoviedb.org/3/person/${directorId}/movie_credits?language=es-ES`, {
      headers: {
        Authorization: `Bearer ${this.tmdbApiToken}`,
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

  getTopRatedMovies(movies, count) {
    return movies.sort((a, b) => b.vote_average - a.vote_average).slice(0, count)
  }

  async saveToStrapi(director, movies) {
    try {
      // Crear o actualizar el registro del director
      const directorData = {
        data: {
          name: director.name,
          tmdb_id: director.id,
          profile_path: director.profile_path,
          popularity: director.popularity,
          movies: movies.map((movie) => ({
            title: movie.title,
            tmdb_id: movie.id,
            vote_average: movie.vote_average,
            vote_count: movie.vote_count,
            release_date: movie.release_date,
            overview: movie.overview,
            poster_path: movie.poster_path,
            popularity: movie.popularity,
          })),
          created_at: new Date().toISOString(),
        },
      }

      // TODO: Implementar llamada real a Strapi
      // const strapiResponse = await fetch(`${this.strapiUrl}/api/directors`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(directorData)
      // })

      console.log("Datos preparados para Strapi:", directorData)

      // Guardar en localStorage como fallback
      const savedData = JSON.parse(localStorage.getItem("movieDirectors") || "[]")
      const existingIndex = savedData.findIndex((d) => d.name === director.name)

      if (existingIndex >= 0) {
        savedData[existingIndex] = { name: director.name, ...directorData.data }
      } else {
        savedData.push({ name: director.name, ...directorData.data })
      }

      localStorage.setItem("movieDirectors", JSON.stringify(savedData))

      console.log(`✅ Datos de ${director.name} guardados exitosamente`)
    } catch (error) {
      console.error("Error guardando en Strapi:", error)
      throw new Error("Error al guardar los datos")
    }
  }

  async loadSavedDirectors() {
    try {
      // Cargar desde localStorage (reemplazar con llamada a Strapi)
      const savedData = JSON.parse(localStorage.getItem("movieDirectors") || "[]")

      const select = document.getElementById("savedDirectors")
      select.innerHTML = '<option value="">Seleccionar director...</option>'

      savedData.forEach((director) => {
        const option = document.createElement("option")
        option.value = director.name
        option.textContent = director.name
        select.appendChild(option)
      })
    } catch (error) {
      console.error("Error cargando directores:", error)
    }
  }

  async loadDirectorData(directorName) {
    if (!directorName) return

    try {
      const savedData = JSON.parse(localStorage.getItem("movieDirectors") || "[]")
      const director = savedData.find((d) => d.name === directorName)

      if (director) {
        this.displayResults(director, director.movies)
        this.createChart(director.movies)
      }
    } catch (error) {
      console.error("Error cargando datos del director:", error)
    }
  }

  visualizeData() {
    const directorName = document.getElementById("savedDirectors").value
    if (directorName) {
      this.loadDirectorData(directorName)
    } else {
      this.showError("Por favor selecciona un director de la lista")
    }
  }

  displayResults(director, movies) {
    const welcomeMessage = document.getElementById("welcomeMessage")
    const resultsContainer = document.getElementById("resultsContainer")
    const resultsTitle = document.getElementById("resultsTitle")
    const moviesList = document.getElementById("moviesList")

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

  createChart(movies) {
    const chartContainer = document.getElementById("chartContainer")
    const canvas = document.getElementById("ratingsChart")
    const ctx = canvas.getContext("2d")

    chartContainer.classList.remove("hidden")

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Configuración del gráfico
    const padding = 60
    const chartWidth = canvas.width - 2 * padding
    const chartHeight = canvas.height - 2 * padding
    const barWidth = chartWidth / movies.length
    const maxRating = 10

    // Dibujar ejes
    ctx.strokeStyle = "#333"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, canvas.height - padding)
    ctx.lineTo(canvas.width - padding, canvas.height - padding)
    ctx.stroke()

    // Dibujar barras
    movies.forEach((movie, index) => {
      const barHeight = (movie.vote_average / maxRating) * chartHeight
      const x = padding + index * barWidth + barWidth * 0.1
      const y = canvas.height - padding - barHeight
      const width = barWidth * 0.8

      // Barra
      ctx.fillStyle = "#4a7c7c"
      ctx.fillRect(x, y, width, barHeight)

      // Valor
      ctx.fillStyle = "#333"
      ctx.font = "12px Arial"
      ctx.textAlign = "center"
      ctx.fillText(movie.vote_average.toFixed(1), x + width / 2, y - 5)

      // Título de la película (rotado)
      ctx.save()
      ctx.translate(x + width / 2, canvas.height - padding + 15)
      ctx.rotate(-Math.PI / 4)
      ctx.textAlign = "right"
      ctx.fillText(movie.title.substring(0, 20) + (movie.title.length > 20 ? "..." : ""), 0, 0)
      ctx.restore()
    })

    // Título del gráfico
    ctx.fillStyle = "#2c5555"
    ctx.font = "bold 16px Arial"
    ctx.textAlign = "center"
    ctx.fillText("Valoraciones TMDB", canvas.width / 2, 30)

    // Etiqueta del eje Y
    ctx.save()
    ctx.translate(20, canvas.height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillStyle = "#333"
    ctx.font = "14px Arial"
    ctx.textAlign = "center"
    ctx.fillText("Valoración (0-10)", 0, 0)
    ctx.restore()
  }

  showLoading(show) {
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

  showError(message) {
    const errorDiv = document.getElementById("errorMessage")
    errorDiv.textContent = message
    errorDiv.classList.remove("hidden")
  }

  hideError() {
    const errorDiv = document.getElementById("errorMessage")
    errorDiv.classList.add("hidden")
  }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener("DOMContentLoaded", () => {
  new MovieDirectorApp()
})
