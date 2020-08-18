pokemon data obtained from: https://pokeapi.co/

1. npm start 
    - scrape data, import to local mongodb
2. mongoexport --collection=pokemon --db=pokemondb --out=pokemon.json 
    - to convert to json
3. split -l 1 pokemon.json --additional-suffix=.json
    - split each pokemon json into separate files