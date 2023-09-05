const getTypeColor = type => {
  const normal = '#F5F5F5'
  return {
    normal,
    fire: '#FDDFDF',
    grass: '#DEFDE0',
    electric: '#FCF7DE',
    ice: '#DEF3FD',
    water: '#DEF3FD',
    ground: '#F4E7DA',
    rock: '#D5D5D4',
    fairy: '#FCEAFF',
    poison: '#98D7A5',
    bug: '#F8D5A3',
    ghost: '#CAC0F7',
    dragon: '#97B3E6',
    psychic: '#EAEDA1',
    fighting: '#E6E0D4'
  }[type] || normal
}

const getOnlyFulfilled = async ({ func, arr }) => {
  const promises = arr.map(func)
  const responses = await Promise.allSettled(promises)
  return responses.filter(response => response.status === 'fulfilled')
}
// aqui e so para exibir os tipos de pokemons
const getPokemonsType = async pokeApiResults => {
  const fulfilled = await getOnlyFulfilled({ arr: pokeApiResults, func: result => fetch(result.url) })
  const pokePromises = fulfilled.map(url => url.value.json())
  const pokemons = await Promise.all(pokePromises)
  return pokemons.map(fulfilled => fulfilled.types.map(info => DOMPurify.sanitize(info.type.name)))
}
//pegando os (ID's) dos pokemons para pode pega as imagens
// insolando a logica dos (ID's) dos pokemons
const getPokemonsIds = pokeApiResults => pokeApiResults.map(({ url }) => {
  const urlAsArray = DOMPurify.sanitize(url).split('/')
  return urlAsArray[urlAsArray.length - 2]
})

// pegando as imagens dos pokemons
const getPokemonsImgs = async ids => {
  const fulfilled = await getOnlyFulfilled({ arr: ids, func: id => fetch(`./assets/img/${id}.png`) })
  return fulfilled.map(response => response.value.url)

}

const paginationInfo = (() => {
  // IIFE., Espressão alto executavel 
  const limit = 15
  let offset = 0

  const getLimit = () => limit
  const getOffset = () => offset
  const incrementOffset = () => offset += limit

  return { getLimit, getOffset, incrementOffset }

})()


// aqui e para fazer as riquisições da api
const getPokemons = async () => {
  try {
    const { getLimit, getOffset, incrementOffset } = paginationInfo
    const response = await
      fetch(`https://pokeapi.co/api/v2/pokemon?limit=${getLimit()}&offset=${getOffset()}`)

    if (!response.ok) {
      throw new Error('Não foi possivel obter as informações')
    }

    // aqui foi separadas as reponsabilidades
    const { results: pokeApiResults } = await response.json()
    const types = await getPokemonsType(pokeApiResults)

    // envocando a funsão dos (ID's) dos pokemons 
    const ids = getPokemonsIds(pokeApiResults)
    const imgs = await getPokemonsImgs(ids)

    // aqui vai ser o array de objetos para renderizar as imagens dos pokemons
    const pokemons = ids.map((id, i) => ({
      id, name: pokeApiResults[i].name,
      types: types[i],
      imgUrl: imgs[i]
    }))

    incrementOffset()

    return pokemons
  } catch (error) {
    console.log('Algo deu errado:', error)

  }
}

// Essa função recebe os pokemons como paramentro.
// Ela cria e adiciona as (li) dos pokemons no (fragment)
const renderPokemons = pokemons => {
  const ul = document.querySelector('[data-js="pokemons-list"]')
  const fragment = document.createDocumentFragment()
  console.log(fragment)

  pokemons.forEach(({ id, name, types, imgUrl }) => {
    const li = document.createElement('li')
    const img = document.createElement('img')
    const nameContainer = document.createElement('h2')
    const typeContainer = document.createElement('p')
    const [firstType] = types


    img.setAttribute('src', imgUrl)
    img.setAttribute('alt', name)
    img.setAttribute('class', 'card-image')
    li.setAttribute('class', `card ${firstType}`)
    li.style.setProperty('--type-color', getTypeColor(firstType))

    nameContainer.textContent = `${id}. ${name[0].toUpperCase()}${name.slice(1)}`
    typeContainer.textContent = types.length > 1 ? types.join(' | ') : firstType
    li.append(img, nameContainer, typeContainer)

    fragment.append(li)
  })

  // Aqui inclui o fragment na (ul).
  ul.append(fragment)
}

//aqui a função vai selecionar o ultimo pokemons e observalo.
const observeLastPokemon = pokemonsObserver => {
  const lastPokemon = document.querySelector('[data-js="pokemons-list"]').lastChild
  pokemonsObserver.observe(lastPokemon)

}

const handleNextPokemonsRender = () => {
  const pokemonsObserver = new IntersectionObserver(async ([lastPokemon], observer) => {
    if (!lastPokemon.isIntersecting) {
      return
    }

    observer.unobserve(lastPokemon.target)
    // o getPokemons não vai renderizar alem dos 150 pokemons
    if (paginationInfo.getOffset() === 150) {
      return
    }


    const pokemons = await getPokemons()
    renderPokemons(pokemons)
    observeLastPokemon(pokemonsObserver)
  }, { rootMargin: '500px' })

  observeLastPokemon(pokemonsObserver)


}

const handlePageLoaded = async () => {
  const pokemons = await getPokemons()

  renderPokemons(pokemons)
  handleNextPokemonsRender()
}

handlePageLoaded()
