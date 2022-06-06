import { createServer } from "http";
import { RestClient, WebsocketShard } from "tiny-discord";
import { WebSocket, WebSocketServer } from "ws";

const config = require("../config"),
	cache: {
		webhook: Record<string, any>;
		messages: Record<string, Record<string, any>>;
		wsClients: Array<WebSocket>;
	} = {
		webhook: { id: null },
		messages: {},
		wsClients: []
	};

//
//
//
// WebSocket API
//
//
//

new WebSocketServer({ port: config.apiPorts.webSocket })
	.on("listening", () => console.info(`WebSocket API started on port ${config.apiPorts.webSocket}.`))
	.on("connection", ws => cache.wsClients.push(ws));

//
//
//
// Bot
//
//
//

const shard = new WebsocketShard({
	token: config.botToken,
	id: 0,
	intents: 33280 // GUILD_MESSAGES, MESSAGE_CONTENT
});

shard
	.on("ready", () => console.info("Bot started."))
	.on("event", async ({ t, d }) => {
		if (d.channel_id !== config.channelID) return;

		cache.wsClients.forEach(_ws => _ws.send(JSON.stringify({ t, d })));

		switch (t) {
			case "MESSAGE_CREATE":
			case "MESSAGE_UPDATE":
				cache.messages[d.id] = d;
				break;

			case "MESSAGE_DELETE":
				delete cache.messages[d.id];
				break;
		}
	})
	.on("close", () => setTimeout(() => shard.connect(), 5000))
	.connect();

//
//
//
// Bot REST Client
//
//
//

const rest = new RestClient({ token: config.botToken, version: 10 });

//
//
//
// REST API
//
//
//

createServer(async (req, res) => {
	const path = req.url?.split("?")[0].slice(1);

	switch (path) {
		case "create-message": {
			if (!cache.webhook.id) {
				console.info("Webhook not cached, trying to find it...");

				const body = (await rest.get(`channels/${config.channelID}/webhooks`).catch(() => null))?.body as Record<string, any>;
				if (!body || body?.message) return console.error(`Could not fetch channel webhooks: ${body?.message ?? "Unknown."}`);

				let webhook = body.find((_webhook: Record<string, any>) => _webhook.application_id === config.botID);

				if (webhook) {
					cache.webhook = webhook;
					console.info("Webhook found from list and cached, no need to create a new one.");
				} else {
					console.info("Webhook not found from list, creating one...");

					webhook = (await rest.post(`channels/${config.channelID}/webhooks`, { name: "Discord Widget" }).catch(() => null))
						?.body as Record<string, any>;

					if (!webhook || webhook?.message) return console.error(`Could not create bot webhook: ${webhook?.message ?? "Unknown."}`);

					console.info("Webhook created and cached.");
					cache.webhook = webhook;
				}
			}

			const { username, message } = Object.fromEntries([...new URL(`http://${req.headers.host}${req.url}`).searchParams.entries()]);
			if (!username || !message) return res.writeHead(400, { "access-control-allow-origin": "*" }).end();

			await rest
				.post(`webhooks/${cache.webhook.id}/${cache.webhook.token}`, {
					username,
					content: message.slice(0, 1024)
				})
				.catch(() => res.writeHead(500, { "access-control-allow-origin": "*" }).end())
				.then(() => res.writeHead(200, { "access-control-allow-origin": "*" }));

			break;
		}

		case "get-messages": {
			if (!Object.keys(cache.messages).length) {
				const fetchedMessages = (await rest.get(`channels/${config.channelID}/messages?limit=100`).catch(() => null))?.body;

				if (Array.isArray(fetchedMessages)) {
					cache.messages = Object.fromEntries(fetchedMessages.reverse().map(_message => [_message.id, _message]));
					console.info("Cached last 100 messages.");
				}
			}

			const messages = Object.entries(cache.messages);
			res.writeHead(200, { "access-control-allow-origin": "*" }).end(JSON.stringify(Object.fromEntries(messages.slice(messages.length - 100))));

			break;
		}
	}
}).listen(config.apiPorts.rest, () => console.info(`REST API started on port ${config.apiPorts.rest}.`));
