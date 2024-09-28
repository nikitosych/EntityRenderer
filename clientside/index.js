// КЛИЕНТ
// Должен из получаемых от сервера данных рендерить таблицу с предметами с минимальными задержками и подгруженной локализацией.

const serverURL = "http://localhost:8000/";

function extractContents(obj) {
    const extracted = []
    for (let key in obj) {
        console.log(key);

        if (key === 'contents') {
            extracted.push(obj[key])
        } else if (typeof obj[key] === 'object' && obj[key] != null) {
            extractContents(obj[key])
        }
    }
    return extracted
}

function createTable(obj, container) {
    const contents = Object.values(obj).map(i => i.content)
    const headers = Object.keys(obj)

    const table = document.createElement('table')
    table.classList.add(`table-entities`);

    const thead = document.createElement('thead');
    thead.classList.add(`thead-entities`);

    const tbody = document.createElement('tbody');
    tbody.classList.add(`tbody-entities`);

    const headerRow = document.createElement('tr');
    headerRow.classList.add(`header-row-entities`);

    Object.keys().forEach(key => {
        const th = document.createElement('th')
        th.classList.add('th-entities')

    })

    thead.appendChild(headerRow);
    table.appendChild(thead);
    table.appendChild(tbody)
    container.appendChild(table)
}

async function main() {
    const clothing = await (await fetch(new URL(`/api/data?timestamp=${Date.now()}`, serverURL))).json() // Date.now для избежания возможного использования браузером кешированных данных

    const clothingOrganised = {}

    for (let entityKey in clothing) { // Меняем структуру объекта для удобства

        const entity = clothing[entityKey]

        if (/\.[^\/]+$/.test(entity.entType)) continue; // без этого в объекте будет ключ base_clothing.yaml или другие файлы с расширением

        if (!clothingOrganised[entity.entType])
            clothingOrganised[entity.entType] = {}

        clothingOrganised[entity.entType][entityKey] = entity
    }

    console.log(clothing);



    fetch(new URL("/api/webhook", serverURL))
        .then((res) => res.json())
        .then((data) => console.log(data))
        .catch((e) => console.error("Clientside fetch error occured:", e));
}

document.addEventListener("DOMContentLoaded", main);
