import "dotenv/config.js"
import express from 'express'
import SmeeClient from 'smee-client'
import cors from 'cors'
import path from 'path'
import GitWrapper from '../api/GitWrapper.js';
import verifySignature from '../utils/verifySignature.js';


// СЕРВЕР

// 1. Сервер получает данные от API Github
// 2. Сервер обрабатывает эти данные
// 3. Сервер сохраняет данные в кеш
// 4. Сервер делает данные в кеше доступными по API эндпойнту
// 5. Клиент сохраняет

const host = 'localhost'
const port = 8000;
const githubToken = process.env.GITHUB_TOKEN_CLASSIC
const webhookSecret = process.env.WEBHOOK_SECRET;

const app = express()
const wrapper = new GitWrapper(githubToken, 'https://api.github.com/repos/nikitosych/space-station14-public/contents/')
new SmeeClient({
    source: 'https://smee.io/notY0ETb5IwGYM',
    target: `http://${host}:${port}/webhook`,
    logger: console
}).start()

let cachedMap = null
let webhookData = []

app.use(cors())

app.use(express.static(path.resolve(process.cwd(), 'public')))

// 1. Сервер получает данные от API Github
// 2. Сервер обрабатывает эти данные
// 3. Сервер делает данные в доступными по API эндпойнту
// 4. Создается подписка на вебхук-событие изменения любого из файлов
// 5. Клиент получает данные по API из шага 3
// 6. Клиент формирует таблицу из полученных данных
// Если произошло событие (4.), то повторяются шаги 1 и 2


async function fetchData() {
    try {
        const { entities } = await wrapper.getEntityByPath('Resources/Prototypes/Entities/Clothing/')
        const entries = await wrapper.findFilesByPattern(entities, /\.*y(a?)ml\b/)
        const entitiesArray = await wrapper.fetchEntitiesContent(entries)
        await wrapper.parseYamlToJson(entitiesArray) // TODO: эта херня пропускает многие файлы из-за ошибок, вызванных синтаксическим сахаром для движка СС14, исправить
        const entitiesMap = await wrapper.objectToMap(entitiesArray)
        const firstEntityPath = entitiesMap.keys().next().value
        wrapper.getParsedEntity(new URL(firstEntityPath, wrapper.baseURL))

        return entitiesMap
    }
    catch (e) {
        console.error('Error fetching data: ', e);
        throw e
    }
}


fetchData().then(res => cachedMap = res).catch((error) => {
    console.error('Initial fetch failed:', error);
});; // Init fetch

app.get('/api/data', (req, res) => {
    if (cachedMap) {
        console.log(`Sending cached data to client: ${typeof cachedMap}${(Array.isArray(cachedMap) || typeof cachedMap === 'object') ? '[' + cachedMap.length + ']' : null}`);

        res.json(cachedMap)
    } else {
        res.sendStatus(404)
    }
})

app.get('/api/webhook', (req, res) => {
    if (webhookData) {
        console.log(`Sending webhook data to client: ${typeof webhookData}${(Array.isArray(webhookData) || typeof webhookData === 'object') ? '[' + webhookData.length + ']' : null}`);

        res.json(webhookData)
    } else {
        res.sendStatus(404)
    }
}) // for test purposes

app.post('/webhook', express.json({ type: 'application/json' }), async (req, res) => {
    try {
        const verified = await verifySignature(webhookSecret, req.headers['x-hub-signature-256'], JSON.stringify(req.body));

        if (!verified) {
            return res.sendStatus(401); // если подпись не прошла валидацию
        }

        const event = req.headers['x-github-event'];
        const commits = event === 'push' ? req.body.commits : [];

        console.log(req.body);
        console.log(req.headers);

        webhookData.push({ body: req.body });

        if (commits && commits.length > 0) {
            for (const commit of commits) {
                if (commit.added.length > 0) {
                    console.log('New files have been added via push: ', commit.added); // Я не придумал че делать, когда новые файлы добавляются в репо. 
                }

                if (commit.modified.length > 0) {
                    for (const filePath of commit.modified) {
                        if (cachedMap.has(filePath)) {
                            console.log(`Trying to update ${filePath} entity... : `, cachedMap.get(filePath));
                            try {
                                const newEntity = await wrapper.getParsedEntity(new URL(filePath, wrapper.baseURL));
                                cachedMap.set(filePath, newEntity);
                                console.log(`Gotcha! Updated entity ${filePath} is: `, cachedMap.get(filePath));
                            } catch (e) {
                                console.error(`Error updating entity ${filePath}`, e);
                            }
                        }
                    }
                }
            }
        }

        res.sendStatus(202); // Завершаем запрос после выполнения всей логики

    } catch (error) {
        console.error("Error in webhook handler:", error);
        res.sendStatus(500); // Internal Server Error
    }
});




app.listen(port, () => console.log(`Listening on ${port}`))