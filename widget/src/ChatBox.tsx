import { useEffect, useState } from "react";

export default function ({
	username,
	api: { rest, webSocket }
}: {
	username: string;
	api: {
		rest: {
			host: string;
			port: number;
		};
		webSocket: {
			host: string;
			port: number;
		};
	};
}) {
	const [messages, setMessages] = useState<Record<string, Record<string, any>>>({}),
		[message, setMessage] = useState("");

	const sendMessage = async (message: string) => {
		setMessage("");

		await fetch(`${rest.host}:${rest.port}/create-message?username=${encodeURIComponent(username)}&message=${encodeURIComponent(message)}`).catch(
			() => null
		);
	};

	useEffect(() => {
		setInterval(() => {
			const messagesElement = document.querySelector("#messages");
			if (messagesElement) messagesElement.scrollTop = messagesElement.scrollHeight;
		});

		fetch(`${rest.host}:${rest.port}/get-messages`)
			.then(res => res.json())
			.then(_json => {
				setMessages(_json);

				const ws = new WebSocket(`${webSocket.host}:${webSocket.port}`);

				ws.onerror = console.error;
				ws.onopen = () => console.info("Connected to WebSocket API.");

				ws.onmessage = ({ data }) => {
					const { t, d }: Record<string, any> = JSON.parse(data),
						_messages = JSON.parse(JSON.stringify(messages));

					switch (t) {
						case "MESSAGE_CREATE":
						case "MESSAGE_UPDATE":
							_messages[d.id] = d;

							break;

						case "MESSAGE_DELETE":
							_messages[d.id] = null;
							break;
					}

					setMessages(_previousValue => ({ ..._previousValue, ..._messages }));
				};
			})
			.catch(() => null);
	}, []);

	return (
		<div className="fixed w-full h-full bg-[#36393f] p-4">
			<div className="h-[90%] overflow-hidden" id="messages">
				{Object.values(messages)
					.filter(Boolean)
					.map((_message, _index) => (
						<div className="flex text-white p-4" key={_index}>
							<img
								className="w-10 h-10 mt-2 mr-2 rounded-full"
								src={
									_message.author.avatar
										? `https://cdn.discordapp.com/avatars/${_message.author.id}/${_message.author.avatar}?size=256`
										: `https://cdn.discordapp.com/embed/avatars/${_message.author.discriminator % 4}.png`
								}
							/>
							<div>
								<div>
									<span className="font-bold mr-1" title={`${_message.author.username}#${_message.author.discriminator}`}>
										{_message.author.username}
									</span>
									{_message.author.bot && <span className="w-2 bg-[#5865f2] text-xs m-1 px-1 py-0.5 rounded-sm">BOT</span>}
									<small className="m-1">{new Date(_message.timestamp).toLocaleString()}</small>
								</div>
								<div className="whitespace-pre-wrap break-all">
									{_message.content}
									{_message.edited_timestamp && (
										<span className="text-[10px] text-[#aaa] ml-1" title={new Date(_message.edited_timestamp).toLocaleString()}>
											(edited)
										</span>
									)}
								</div>
							</div>

							<hr />
						</div>
					))}
			</div>
			<div className="flex h-[10%] p-4">
				<textarea
					className="w-full resize-none p-4"
					value={message}
					onChange={_event => setMessage(_event.target.value)}
					onKeyDown={_event => {
						if (_event.key !== "Enter") return;
						_event.preventDefault();
						sendMessage(_event.currentTarget.value);
					}}
				/>
				<div className="flex items-center bg-[#222] text-white p-4 rounded-lg cursor-pointer" onClick={() => sendMessage(message)}>
					Send
				</div>
			</div>
		</div>
	);
}
