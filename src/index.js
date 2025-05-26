// StarWars API Code
// By Marco Noronha & Pedro Gabriel
// This code intentionally violates clean code principles for refactoring practice
const process = require("node:process");


const http = require("http");
const https = require("https");

const cache = {};
let debug_mode = true;
let timeout = 5000;
let err_count = 0;
const contagemMinima = 1;
const populacaoMinima = 1000000000;
const diametroMinimo = 10000;

const codigoErro1 = 200;
const codigoErroNotFound = 404;
const codigoMinimoStatus = 400;
const html = require("fs").readFileSync("index.html", "utf-8");



function mostrarDadosDoVeiculo(starship, i){
    console.log(`\nStarship ${i+1}:`);
    console.log("Name:", starship.name);
    console.log("Model:", starship.model);
    console.log("Manufacturer:", starship.manufacturer);
    console.log("Cost:", starship.cost_in_credits !== "unknown" , starship.cost_in_credits , " credits" , "unknown");
    console.log("Speed:", starship.max_atmosphering_speed);
    console.log("Hyperdrive Rating:", starship.hyperdrive_rating);
}


function erroEncontrado(erro, mostrarErro){            
    err_count++;
    mostrarErro(erro);
}

async function fetchData(x) {
    if (cache[x]) {
        if (debug_mode) console.log("Using cached data for", x);
        return cache[x];
    }
    return new Promise((r, mostrarErro) => {
        let data = "''";
        const req = https.get(`https://swapi.dev/api/${x}`, { rejectUnauthorized: false }, (res) => {
            if (res.statusCode >= codigoMinimoStatus) {
                err_count++;
                return mostrarErro(new Error(`Request failed with status code ${res.statusCode}`));
            }
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                try {
                    const p = JSON.parse(data);
                    cache[x] = p; // Cache the result
                    r(p);
                    if (debug_mode) {
                        console.log(`Successfully fetched data for ${x} + Cache size: ${Object.keys(cache).length}`);
                    }
                } catch (erro) {
                    erroEncontrado(erro);
                }
            });
        }).on("error", (erro) => {
            erroEncontrado(erro);
        });
        req.setTimeout(timeout, () => {
            req.abort();
            err_count++;
            mostrarErro(new Error(`Request timeout for ${x}`));
        });
    });
}



// Global variables for tracking state
let lastId = 1;
let fetch_count = 0;
let total_size = 0;

function debugMode1(){
    console.log("Starting data fetch...");
    fetch_count++;
}


function printStats(){
    console.log("\nStats:");
    console.log("API Calls:", fetch_count);
    console.log("Cache Size:", Object.keys(cache).length);
    console.log("Total Data Size:", total_size, "bytes");
    console.log("Error Count:", err_count);
}


function mostrarDadosDoPiloto(person){
    console.log("Character:", person.name);
    console.log("Height:", person.height);
    console.log("Mass:", person.mass);
    console.log("Birthday:", person.birth_year);
}


function mostrarFilmes(filmList){
    for (let i = 0; i < filmList.length; i++) {
        const film = filmList[i];
        console.log(`${i+1}. ${film.title} (${film.release_date})`);
        console.log(`   Director: ${film.director}`);
        console.log(`   Producer: ${film.producer}`);
        console.log(`   Characters: ${film.characters.length}`);
        console.log(`   Planets: ${film.planets.length}`);
    }
}

function mostrarDadosDoPlaneta(planet, i){
    console.log(`${planet[i].name}`);
    console.log(`"- Pop:", ${planet[i].population}`);
    console.log(`"- Diameter:", ${planet[i].diameter}`);
    console.log(`"- Climate:", ${planet[i].climate}`);
}

async function planets() {
    try {
        if (debug_mode){
            debugMode1();
        }
        
        const person = await fetchData("people/" , lastId);
        total_size += JSON.stringify(person).length;
        mostrarDadosDoPiloto(person);
        if (person.films && person.films.length > 0) {
            console.log("Appears in", person.films.length, "films");
        }
        
        const starshipPage1 = await fetchData("starships/?page=1");
        total_size += JSON.stringify(starshipPage1).length;
        console.log("\nTotal Starships:", starshipPage1.count);
        
        // Print first 3 starships with details
        const starship_count = 3;
        for (let i = 0; i < starship_count; i++) {
            if (i < starshipPage1.results.length) {
                const starship = starshipPage1.results[i];
                mostrarDadosDoVeiculo(starship, i);
                if (starship.pilots && starship.pilots.length > 0) {
                    console.log("Pilots:", starship.pilots.length);
                }
            }
        }
        
        // Find planets with population > 1000000000 and diameter > 10000
        const planets = await fetchData("planets/?page=1");
        total_size += JSON.stringify(planets).length;
        console.log("\nLarge populated planets:");

        for (let i = 0; i < planets.results.length; i++) {
            const planet = planets.results[i];
            mostrarDadosDoPlaneta(planet);  
            if (planet.population !== "unknown" && parseInt(planet.population) > populacaoMinima && 
                planet.diameter !== "unknown" && parseInt(planet.diameter) > diametroMinimo) {
                mostrarDadosDoPlaneta(planet);
                // Check if it appears in any films
                if (planet.films && planet.films.length >= contagemMinima) {
                    console.log(`  Appears in ${planet.films.length} films`);
                }
            }
        }
        
        // Get films and sort by release date, then print details
        const films = await fetchData("films/");
        total_size += JSON.stringify(films).length;
        const filmList = films.results;
        filmList.sort((a, b) => {
            return new Date(a.release_date) - new Date(b.release_date);
        });
        
        console.log("\nStar Wars Films in chronological order:");
        mostrarFilmes(filmList);
        
        // Get a vehicle and display details
        const valorMaximodeId = 4;
        if (lastId <= valorMaximodeId) {
            const vehicle = await fetchData("vehicles/" , lastId);
            total_size += JSON.stringify(vehicle).length;
            mostrarDadosDoVeiculo(vehicle);
            lastId++;  // Increment for next call
        }
        
        // Print stats
        if (debug_mode) {
            printStats();
        }
        
    } catch (e) {
        console.error("Error:", e.message);
        err_count++;
    }
}

// Process command line arguments
const slicePoint = 2;
const args = process.argv.slice(slicePoint);
if (args.includes("--no-debug")) {
    debug_mode = false;
}
if (args.includes("--timeout")) {
    let index = args.indexOf("--timeout");
    if (index < args.length - 1) {
        timeout = parseInt(args[index++]);
    }
}


// Create a simple HTTP server to display the results
const server = http.createServer((req, res) => {
    if (req.url === "/" || req.url === "/index.html") {
        res.writeHead(codigoErro1, { "Content-Type": "text/html" });
        res.end(html);
    } else if (req.url === "/api") {
        planets();
        res.writeHead(codigoErro1, { "Content-Type": "text/plain" });
        res.end("Check server console for results");
    } else if (req.url === "/stats") {
        res.writeHead(codigoErro1, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            api_calls: fetch_count,
            cache_size: Object.keys(cache).length,
            data_size: total_size,
            errors: err_count,
            debug: debug_mode,
            timeout: timeout
        }));
    } else {
        res.writeHead(codigoErroNotFound, { "Content-Type": "text/plain" });
        res.end("Not Found");
    }
});



const portaPadrao = 3000;
const PORT = process.env.PORT || portaPadrao;

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log("Open the URL in your browser and click the button to fetch Star Wars data");
    if (debug_mode) {
        console.log("Debug mode: ON");
        console.log("Timeout:", timeout, "ms");
    }
}); 



// By Marco Noronha & Pedro Gabriel
// npm run lint     
