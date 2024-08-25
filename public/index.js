// КЛИЕНТ


const serverURL = "http://localhost:8000/";

function main() {
    fetch(new URL("/api/data", serverURL))
        .then((res) => res.json())
        .then((data) => console.log(data))
        .catch((e) => console.error("Clientside fetch error occured:", e));
    fetch(new URL("/api/webhook", serverURL))
        .then((res) => res.json())
        .then((data) => console.log(data))
        .catch((e) => console.error("Clientside fetch error occured:", e));
}

document.addEventListener("DOMContentLoaded", main);
