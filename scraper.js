// variables
let api_version = 2;

/////// scraper ///////
const axios = require('axios');
const fs = require('fs');
const mongo = require('mongodb');
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/";

const pokeapi = 'https://pokeapi.co/api/v' + api_version;

async function getFromApi(x) {
  let count = await axios.get(pokeapi + '/' + x);
  // count = 1;
  count = count.data.count;
  

  // split into batches to avoid timeout error from server
  let arr = await axios.get(pokeapi + '/' + x + '/?limit=' + count);
  let a = [];
  while(arr.data.results.length) {
    a.push(arr.data.results.splice(0, 20));
  }

  let results = [];
  for(let i = 0; i < a.length; i++){
    // 'await Promise all' waits for all the promised objects to be mapped
    let partialResult = await Promise.all(a[i].map(async pokeobj => {
      let config = {
          responseType: 'stream'
      }
      pokeobj = await axios.get(pokeobj.url)
        .then(async res => {
          if(res.data.sprites.front_default){
            let imgFront = await axios.get(res.data.sprites.front_default, config);
            await imgFront.data.pipe(fs.createWriteStream('images/' + res.data.name + '_front.png'));
          }
          if(res.data.sprites.back_default){
            let imgBack = await axios.get(res.data.sprites.back_default, config);
            await imgBack.data.pipe(fs.createWriteStream('images/' + res.data.name + '_back.png'));
          } 
          return await res.data
        });

      if(!pokeobj) return null;

      let species = await axios.get(pokeobj.species.url)
        .then(async res => {
          return {
            id: await res.data.id,
            name: await res.data.name,
            capture_rate: await res.data.capture_rate,
            order: await res.data.order,
            evolution: await res.data.evolution_chain
          }
        });

      if(!species.evolution){
        pokeobj.species = species;
        return pokeobj;
      };

      let evolution = await axios.get(species.evolution.url)
        .then(async res => await res.data);

      // pokemon->species->evolution
      if(species && evolution) species.evolution = evolution;
      if(species) pokeobj.species = species;

      // console.log(pokeobj);
      return pokeobj;
    }));

    results = results.concat(partialResult);
    // results.push(partialResult);
  }
      
  return results;
}


async function main() {
  let pokemon = await getFromApi('pokemon');
  
  // console.log(pokemon[1], pokemon.length);
  MongoClient.connect(url, function(err, res) {
    if (err) throw err;
    let db = res.db("pokemondb");
    for(let i = 0; i < pokemon.length; i++){
      db.collection("pokemon").insertOne(pokemon[i], (err, res) => {
        if(err) throw err;

        // console.log("pokemon inserted");
      });
    }
    console.log("mongodb populated");
  });

}

main();