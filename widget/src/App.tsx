import ChatBox from "ChatBox";

export default function () {
	return (
		<ChatBox
			username="Bot"
			api={{
				rest: {
					host: "http://localhost",
					port: 2493
				},
				webSocket: {
					host: "ws://localhost",
					port: 2494
				}
			}}
		/>
	);
}
