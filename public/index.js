// КЛИЕНТ


const serverURL = "http://localhost:8000/";

async function main() {
    const response = await fetch(new URL("/api/data?timestamp=" + Date.now(), serverURL)) // timestamp нужен для предотвращения загрузки кешированных данных браузером
    const body = await response.json()

    console.log(body);


    fetch(new URL("/api/webhook", serverURL))
        .then((res) => res.json())
        .then((data) => console.log(data))
        .catch((e) => console.error("Clientside fetch error occured:", e));
}

document.addEventListener("DOMContentLoaded", main);
