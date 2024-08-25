import YAML from 'yaml'

export default class GitWrapper {
    constructor(token, baseURL = 'https://api.github.com/repos/imperial-space/space-station14-public/contents/') {
        this.token = token;
        this.baseURL = baseURL

        this.headers = new Headers({
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github+json'
        })
    }

    async sendRequest(url, method = 'GET', body = {}, headers = {}) { // Запросы на любой url. Возвращает: Promise с необработанным телом ответа.
        const options = {
            method,
            headers: Object.assign(this.headers, headers)
        }

        if (!['GET', 'HEAD'].includes(method)) {
            options.body = body;
        }

        console.log(`${method}:`, url, headers, body);


        const successCodes = [200, 302, 304, 201, 202, 204]
        const response = fetch(url, options)
        const responseBody = (await response)

        if (!successCodes.includes(responseBody.status)) {
            console.log(responseBody);
            throw new Error('An error has occurred during the request.')
        }

        return response
    }

    async getEntityByPath(path) { // Получение энтити по path. Возвращает: преобразованный в JSON объект с ответом от API. Объект содержит: path - путь поиска, entities - найденные энтити. Entities содержит объекты 
        console.log(path);


        if (/\.[^\/]+$/.test(path)) {
            throw new Error('Only folders can be fetched')
        }

        return this.sendRequest(new URL(path, this.baseURL).toString())
            .then(r => r.json())
            .then(r => r.reduce((acc, v) => Object.assign(acc, {
                entities: acc.entities.concat(
                    Object.assign(v, {
                        category: v.path.replace(/.*Entities\//, '').split('/')[0] // TODO: Сделать так, чтобы каждому энтити присваивался его тип назначения (маска, униформа, жилет и т.д.)
                    }))
            }),
                {
                    path,
                    entities: []
                }
            )
            )
    }

    async findFilesByPattern(entities, regex) {
        return Promise.all(
            entities.map(async v => {
                if (v.type === 'file' && regex.test(v.name)) {
                    return v;
                } else if (v.type === 'dir') {
                    return this.findFilesByPattern(await this.getEntityByPath(v.url).then(r => r.entities), regex)
                }

                throw new Error('Not a file or directory')
            })
        ).then(r => r.flat(Infinity))
    }

    async fetchEntitiesContent(entities) {
        return Promise.all(
            entities.map(v =>
                this.sendRequest(new URL(v.url).toString())
                    .then(r => r.json())
                    .then(({ content }) => Object.assign(v, { content }))
            )
        )
    }

    parseYamlToJson(entities) {
        return entities.forEach(entity => {
            try {
                entity.content = YAML.parse(Buffer.from(entity.content, 'base64').toString('utf-8'))
            } catch (error) {
                console.error(`Failed to parse ${entity.name} as yaml, skipping with error: ${error}`)
            }
        })
    }

    async objectToMap(obj) {
        return new Promise(res => {
            const map = new Map()

            for (let key in obj) {
                map.set(obj[key].path, obj[key])
            }

            res(map)
        })
    }

    async getParsedEntity(url, method = 'GET', headers = {}) {
        const entity = await (await this.sendRequest(url, method, headers)).json()

        if (entity.type !== 'file') {
            throw new Error(`Failed to parse "${entity.path}", only files can be fetched.`)
        }

        await this.parseYamlToJson([entity])

        return entity

    }
}