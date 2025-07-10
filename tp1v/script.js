async function saveToStrapi(director, movies) {
  const token = "TU_TOKEN_ACÁ" // reemplazalo por tu token real
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }

  // Dividir nombre y apellido
  const fullName = director.name.trim().split(" ")
  const apellido = fullName.pop()
  const nombre = fullName.join(" ")

  try {
    // 1. Verificar si el director ya existe
    const query = `${strapiUrl}/api/g26-directors?filters[Nombre][$eq]=${encodeURIComponent(nombre)}&filters[Apellido][$eq]=${encodeURIComponent(apellido)}`
    const checkRes = await fetch(query, { headers })
    const checkData = await checkRes.json()

    let directorId
    if (checkData.data && checkData.data.length > 0) {
      directorId = checkData.data[0].id
      console.log(`✅ Director ya existe en Strapi con ID ${directorId}`)
    } else {
      // 2. Crear director si no existe
      const newDirector = {
        data: { Nombre: nombre, Apellido: apellido },
      }
      const res = await fetch(`${strapiUrl}/api/g26-directors`, {
        method: "POST",
        headers,
        body: JSON.stringify(newDirector),
      })
      const created = await res.json()
      directorId = created.data.id
      console.log(`🆕 Director creado con ID ${directorId}`)
    }

    // 3. Crear películas relacionadas
    for (const movie of movies) {
      const peliculaData = {
        data: {
          Nombre: movie.title,
          Valoracion: movie.vote_average,
          Descripcion: movie.overview || "Sin descripción",
          Anio: movie.release_date ? parseInt(movie.release_date.slice(0, 4)) : 0,
          g_26_director: directorId,
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